
sfx.on = prefs.sound !== 'off';

/* =====================================================================
   STATE + HUD
   ===================================================================== */
let mode = 'loading', active = null, busy = false, hovered = null, focus = null, kbNav = false, pendingRelayout = false;
let hoverPart = null, playStart = 0, lastInfoKey = '', infoEdit = false, infoOpen = false;
const pointer = { x: 0, y: 0, cx: 0, cy: 0, type: 'mouse', down: null };
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const coarse = matchMedia('(pointer: coarse)').matches;
let shelfPicks = [];
function buildShelfPicks() { shelfPicks = navOrder.flatMap(c => [c.shell, c.lid, c.spine, c.wrap].filter(Boolean)); }
function hit(list) {
  ndc.set(pointer.x, pointer.y); ray.setFromCamera(ndc, camera);
  list = list || (mode === 'shelf' ? shelfPicks : active ? [active.shell, active.lid, active.spine, active.wrap, active.tabHit, ...(active.strip ? active.path.map(p => p.mesh) : []), ...(active.disc ? active.disc.children : []), active.manual].filter(Boolean) : []);
  const h = ray.intersectObjects(list, false)[0];
  return h ? { case: h.object.userData.case, part: h.object.userData.part || null, point: h.point } : null;
}
function setHovered(c) { if (hovered === c) return; if (hovered) hovered.hoverT = 0; hovered = c; if (c) { c.hoverT = 1; if (kbNav) sfx.tick(); } renderTip(); }
const tipEl = $('#tip');
function renderTip() {
  const c = mode === 'shelf' ? hovered : null;
  if (!c) { tipEl.hidden = true; return; }
  const g = c.g, idle = g.last === null || g.last === undefined ? g.added : g.last;
  const extra = g.wrapped ? ' · precintado' : g.dust > .3 && idle != null ? ` · ${spanText(idle)} sin tocar` : '';
  tipEl.innerHTML = `<b>${esc(g.t)}</b><span>${fmtH(g.hours)} · ${esc(g.status || 'Sin estado')}${extra}</span>`; tipEl.hidden = false; placeTip();
}
const _tipV = new V3();
function placeTip() {
  if (tipEl.hidden || !hovered) return;
  hovered.root.getWorldPosition(_tipV); _tipV.y += hovered.dim.h / 2 + .8; _tipV.project(camera);
  const x = (_tipV.x * .5 + .5) * innerWidth, y = (-_tipV.y * .5 + .5) * innerHeight, w = tipEl.offsetWidth / 2 + 12;
  tipEl.style.left = clamp(x, w, innerWidth - w) + 'px'; tipEl.style.top = Math.max(y, tipEl.offsetHeight + 70) + 'px';
}
function toast(msg, ms = 2800) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), ms); }

function setMode(m) { mode = m; renderPrompts(); renderInfo(); renderTip(); $('#play').hidden = m !== 'playing'; if (m !== 'open') hoverPart = null; canvasEl.style.cursor = 'default'; }
const btn = (k, label, a, primary) => `<button class="pbtn${primary ? ' primary' : ''}" type="button" data-act="${a}"><kbd>${k}</kbd>${label}</button>`;
function tearHintText(c) { return c.tear > .05 ? `Precinto ${Math.round(100 * c.tear / c.L)} % · sigue tirando` : 'Arrastra la lengüeta roja para quitar el precinto'; }
function renderPrompts() {
  const el = $('#prompts'); let h = '';
  if (mode === 'shelf') {
    const gr = groups[curGroup], np = gr ? gr.pages.length : 1;
    if (np > 1) h += `<div class="pager"><button class="pbtn icon" type="button" data-act="prevPage" aria-label="Página anterior"${curPage === 0 ? ' disabled' : ''}>‹</button><span class="pg">${curPage + 1} / ${np}</span><button class="pbtn next" type="button" data-act="nextPage"${curPage >= np - 1 ? ' disabled' : ''}>Siguiente <i aria-hidden="true">›</i></button></div>`;
    h += coarse ? `<span class="hint">Toca un lomo para sacar el juego</span>` : `<span class="hint">Clic en un lomo · <kbd>←</kbd><kbd>→</kbd> recorrer · <kbd>Q</kbd><kbd>E</kbd> estantes · <kbd>Intro</kbd> sacar</span>`;
  }
  if (mode === 'inspect' && active) {
    if (active.wrap) {
      if (prefs.seal !== 'auto') h += `<span class="hint tear" id="tearHint">${tearHintText(active)}</span>`;
      if (prefs.seal !== 'manual') h += btn('Intro', prefs.seal === 'auto' ? 'Abrir la caja' : 'Quitar precinto', 'unwrap', true);
    } else h += btn('Intro', 'Abrir la caja', 'open', true);
    h += btn('F', active.flipT ? 'Ver portada' : 'Ver contraportada', 'flip') + btn('Esc', 'Devolver', 'back');
  }
  if (mode === 'open') h = btn('M', 'Leer el manual', 'manual') + btn('Intro', active && active.g.real && !active.g.installed ? 'Meter el disco (instalar)' : 'Meter el disco', 'insert', true) + btn('Esc', 'Cerrar la caja', 'close');
  if (mode === 'playing') h = btn('Esc', PLAYNITE ? 'Sacar el disco' : 'Cerrar el juego', 'quit', true);
  el.innerHTML = h;
}
$('#prompts').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) { sfx.init(); doAct(b.dataset.act); } });
function doAct(a) {
  const fns = { flip: flipCase, open: openCase, unwrap: unwrapAction, back: putBack, manual: openManual, insert: insertDisc, close: () => closeCase(false), quit: () => closeGame(PLAYNITE && PN_STATE.running && !PN_STATE.waiting ? { keepRunning: true } : {}), prevPage: () => setPage(curPage - 1), nextPage: () => setPage(curPage + 1), prevShelf: () => setGroup(curGroup - 1), nextShelf: () => setGroup(curGroup + 1) };
  if (fns[a]) fns[a]();
}

/* ---------- header: brand count and the pills that choose what is on the shelf ---------- */
function renderBrand() {
  const gr = groups[curGroup], n = gr ? gr.games.length : 0;
  $('#brandCount').textContent = `${n} de ${GAMES.length} ${GAMES.length === 1 ? 'juego' : 'juegos'}`;
}
function renderPills() {
  const el = $('#pills');
  el.innerHTML = groups.map((gr, i) => `<button type="button" class="pill-btn${i === curGroup ? ' on' : ''}" data-group="${i}" aria-pressed="${i === curGroup}">${esc(gr.label)}<span>${gr.games.length}</span></button>`).join('');
  const on = el.querySelector('.on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { }
}
$('#pills').addEventListener('click', e => { const b = e.target.closest('[data-group]'); if (b) setGroup(+b.dataset.group); });

/* switching shelf contents goes through a short dip to black, then the new cases settle in a wave */
let swapBusy = false;
async function swapShelf(fn, quiet) {
  if (swapBusy) return; swapBusy = true; busy = true; setHovered(null);
  try {
    if (!quiet) sfx.slide();
    const f = $('#fade'); f.classList.add('on'); await new Promise(r => setTimeout(r, RM ? 20 : 200));
    fn(); layoutPage(); renderPills(); renderBrand(); renderPrompts();
    navOrder.forEach(c => { c.pullHold = .35; c.root.position.copy(c.home.pos); c.root.quaternion.copy(c.home.quat); });
    requestAnimationFrame(() => f.classList.remove('on'));
    navOrder.forEach((c, i) => setTimeout(() => { tween(.35, t => { c.pullHold = .35 * (1 - t); }, easeOut); }, i * 6 * SPEED));
    await wait(Math.min(700, navOrder.length * 6 + 380));
    navOrder.forEach(c => { c.pullHold = 0; });
    applySearch(true);
  } finally { swapBusy = false; busy = false; }
}
function setGroup(i, quiet) {
  if (!groups.length || mode !== 'shelf' || busy) return; i = ((i % groups.length) + groups.length) % groups.length;
  if (i === curGroup) return;
  prefs.shelf = groups[i].key; savePrefs();
  return swapShelf(() => { curGroup = i; curPage = 0; if (cam.view !== 'shelf') setView('shelf'); }, quiet);
}
function setPage(p, quiet) {
  const gr = groups[curGroup]; if (!gr || mode !== 'shelf' || busy) return;
  p = clamp(p, 0, gr.pages.length - 1); if (p === curPage) return;
  return swapShelf(() => { curPage = p; }, quiet);
}

/* ---------- inspect card: status and categories ---------- */
function renderInfo(force) {
  const el = $('#info'), tab = $('#infoTab'), show = active && (cam.view === 'shelf' || cam.view === 'browse') && !['shelf', 'loading', 'manual'].includes(mode);
  if (!show) { el.hidden = true; tab.hidden = true; lastInfoKey = ''; infoEdit = false; infoOpen = false; return; }
  if (prefs.card === 'hide') { el.hidden = true; lastInfoKey = ''; tab.hidden = false; tab.innerHTML = `<span>Ficha</span><b>${esc(active.g.t)}</b><i aria-hidden="true">▾</i>`; return; }
  tab.hidden = true;
  const g = active.g, key = [g.id, g.hours, g.status, g.last, g.sessions, g.cats.join(','), infoEdit, infoOpen, prefs.cats.length, Math.round(g.dust * 4)].join('|');
  el.hidden = false; if (!force && key === lastInfoKey) return; lastInfoKey = key;
  const idle = g.last === null || g.last === undefined ? g.added : g.last;
  const dustTxt = g.wrapped ? 'Ninguno, está precintado' : g.dust > .6 ? 'Mucho' : g.dust > .25 ? 'Algo' : g.dust > .04 ? 'Poco' : 'Limpio';
  const note = PLAYNITE ? 'Los cambios se guardan en Playnite al momento.' : 'Si cambias el estado, al devolverlo irá a ese estante.';
  const statuses = g.status && !STATUSES.includes(g.status) ? [g.status, ...STATUSES] : STATUSES;
  el.classList.toggle('open', infoOpen);
  el.innerHTML = `<div class="info-bar"><button type="button" class="info-more" data-more="1" aria-expanded="${infoOpen}">${infoOpen ? 'Menos' : 'Estado y categorías'}</button><button type="button" class="info-hide" data-hide="1" aria-label="Ocultar la ficha" title="Ocultar la ficha (I)">Ocultar <i aria-hidden="true">▴</i></button></div><div class="eyebrow">${esc([g.genre, g.year, g.real ? g.plat : DIMS[g.fmt].name].filter(Boolean).join(' · '))}</div><h2>${esc(g.t)}</h2>
    <dl><dt>Jugado</dt><dd>${fmtH(g.hours)}${g.sessions ? ` · ${g.sessions} ${g.sessions === 1 ? 'vez' : 'veces'}` : ''}</dd><dt>Última vez</dt><dd>${lastText(g.last)}</dd>${g.ach[1] ? `<dt>Logros</dt><dd>${g.ach[0]} de ${g.ach[1]}</dd>` : ''}<dt>Polvo</dt><dd>${dustTxt}${g.dust > .04 && idle != null ? ` · ${spanText(idle)} sin tocar` : ''}</dd></dl>
    <div class="frow"><label for="stSel">Estado</label><span class="pill ${STATUS_CLASS[g.status] || 'st-sin'}" aria-hidden="true"></span><select id="stSel">${g.status ? '' : '<option value="" selected>Sin estado</option>'}${statuses.map(s => `<option${s === g.status ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
    <div class="cats"><span class="lbl">Categorías</span><div class="chips">${g.cats.length ? g.cats.map(c => `<span class="chip">${esc(c)}</span>`).join('') : '<em>Ninguna</em>'}<button type="button" class="chip add" data-edit="1">${infoEdit ? 'Listo' : 'Editar'}</button></div></div>
    ${infoEdit ? `<div class="cat-edit">${prefs.cats.map(c => `<label><input type="checkbox" data-catbox="${esc(c)}"${g.cats.includes(c) ? ' checked' : ''}><span>${esc(c)}</span></label>`).join('')}
      <form class="cat-new"><input id="catNew" type="text" placeholder="Nueva categoría" maxlength="40" autocomplete="off"><button type="submit">Añadir</button></form></div>` : ''}
    <p class="note">${note}</p>`;
}
function gameChanged(c, fields, regroup) {
  saveGame(c.g); c.dirty = true; c.ensureDetail(); c.refreshSpine(); if (regroup) pendingRelayout = true; renderInfo(true);
  if (PLAYNITE && fields) LIB.update(c.g, fields);
}
$('#info').addEventListener('change', e => {
  if (!active) return; const c = active, g = c.g;
  if (e.target.id === 'stSel') { const old = g.status; g.status = e.target.value; gameChanged(c, ['status'], prefs.group === 'status'); if (prefs.group === 'status' && old !== g.status && groups[curGroup].key !== '__all') toast(`Al devolverlo irá al estante «${STATUS_SHELF[g.status] || g.status}»`); }
  const box = e.target.closest('[data-catbox]');
  if (box) { const name = box.dataset.catbox; if (box.checked) { if (!g.cats.includes(name)) g.cats.push(name); } else g.cats = g.cats.filter(x => x !== name); gameChanged(c, ['cats'], prefs.group === 'cat'); }
});
$('#info').addEventListener('click', e => {
  if (!active) return;
  if (e.target.closest('[data-more]')) { infoOpen = !infoOpen; renderInfo(true); return; }
  if (e.target.closest('[data-hide]')) { setCard('hide'); return; }
  if (e.target.closest('[data-edit]')) { infoEdit = !infoEdit; renderInfo(true); if (infoEdit) { const i = $('#catNew'); if (i && !coarse) i.focus(); } }
});
$('#info').addEventListener('submit', e => {
  e.preventDefault(); if (!active) return; const inp = $('#catNew'), name = inp.value.trim().replace(/\s+/g, ' ');
  if (!name) return; if (!prefs.cats.includes(name)) { prefs.cats.push(name); savePrefs(); }
  const g = active.g; if (!g.cats.includes(name)) g.cats.push(name);
  gameChanged(active, ['cats'], prefs.group === 'cat'); toast(`Categoría «${name}» añadida`);
});
function setCard(v) { prefs.card = v; savePrefs(); lastInfoKey = ''; renderInfo(true); sfx.tick(); if (v === 'show') { const b = $('#info .info-hide'); if (b && !coarse) b.focus(); } else $('#infoTab').focus(); }
$('#infoTab').addEventListener('click', () => setCard('show'));

/* ---------- search ---------- */
const qEl = $('#q'), countEl = $('#count');
function searchText(g) { return norm([g.t, g.genre, g.dev, g.pub, g.plat, g.status, ...(g.cats || [])].filter(Boolean).join(' ')); }
function applySearch(stay) {
  const q = norm(qEl.value.trim()), gr = groups[curGroup]; if (!gr) return;
  const hits = q ? gr.games.filter(g => searchText(g).includes(q)) : [];
  navOrder.forEach(c => { c.match = !!q && hits.includes(c.g); c.setDim(!!q && !c.match); });
  countEl.hidden = !q; countEl.textContent = hits.length === 1 ? '1 juego' : `${hits.length} juegos`;
  if (!stay && q && hits.length && !navOrder.some(c => c.match) && mode === 'shelf') { const p = pageOf(hits[0]); if (p >= 0 && p !== curPage) setPage(p, true); }
}
qEl.addEventListener('input', () => applySearch());
qEl.addEventListener('keydown', e => { if (e.key === 'Enter') { const m = navOrder.find(c => c.match); if (m && mode === 'shelf') { qEl.blur(); focus = m; pick(m); } } });

/* ---------- settings ---------- */
const setBtn = $('#setBtn'), setPop = $('#settings');
function renderSettings() { setPop.querySelectorAll('[data-pref]').forEach(seg => seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(prefs[seg.dataset.pref] === b.dataset.v)))); renderRoomPick(); }
function renderRoomPick() {
  const el = $('#roomPick'); if (!el) return;
  el.innerHTML = ROOM_ORDER.map(k => { const R = ROOMS[k]; return `<button type="button" class="room" data-room="${k}" aria-pressed="${prefs.room === k}"><i style="background:linear-gradient(90deg,${R.sw[0]} 0 45%,${R.sw[1]} 45% 72%,${R.sw[2]} 72%)"></i><span>${R.name}</span></button>`; }).join('');
}
let roomBusy = false;
async function switchRoom(name) {
  if (!ROOMS[name] || roomBusy || RP === ROOMS[name]) return;
  roomBusy = true; prefs.room = name; savePrefs(); renderRoomPick(); sfx.tick();
  const f = $('#fade'); f.classList.add('on'); await new Promise(r => setTimeout(r, RM ? 30 : 240));
  try { applyRoom(name); } catch (e) { console.error(e); }
  requestAnimationFrame(() => requestAnimationFrame(() => { f.classList.remove('on'); roomBusy = false; }));
  toast(`Ambiente: ${ROOMS[name].name}`, 1800);
}
$('#roomPick').addEventListener('click', e => { const b = e.target.closest('[data-room]'); if (b) switchRoom(b.dataset.room); });
setBtn.addEventListener('click', () => { setPop.hidden = !setPop.hidden; setBtn.setAttribute('aria-expanded', String(!setPop.hidden)); renderSettings(); });
setPop.addEventListener('click', e => {
  const b = e.target.closest('button[data-v]'); if (!b) return; const k = b.closest('[data-pref]').dataset.pref; if (prefs[k] === b.dataset.v) return; prefs[k] = b.dataset.v; savePrefs(); renderSettings();
  if (k === 'light') applyLight(prefs.light);
  if (k === 'sound') { sfx.on = prefs.sound !== 'off'; if (sfx.on) sfx.tick(); }
  if (k === 'seal') renderPrompts();
  if (k === 'sort') relayout({ full: true });
  if (k === 'group') { prefs.shelf = '__all'; savePrefs(); relayout({ full: true, reset: true }); }
});
document.addEventListener('pointerdown', e => {
  if (!setPop.hidden && !e.target.closest('#settings') && !e.target.closest('#setBtn')) { setPop.hidden = true; setBtn.setAttribute('aria-expanded', 'false'); }
});
function syncHudHeight() { document.documentElement.style.setProperty('--hud-h', $('.hud-top').offsetHeight + 'px'); }

/* =====================================================================
   ACTIONS
   ===================================================================== */
async function guarded(fn) { if (busy) return; busy = true; try { await fn(); } catch (err) { console.error(err); } finally { busy = false; } }
const waitReal = sec => new Promise(r => setTimeout(r, Math.max(0, sec) * 1000));
const tweenReal = (sec, fn, ease) => tween(sec / SPEED, fn, ease);
function pick(c) {
  if (mode !== 'shelf' || busy || !c) return;
  return guarded(async () => {
    active = c; setHovered(null); tipEl.hidden = true; c.hoverT = 0; infoEdit = false;
    if (cam.view === 'browse') setView('shelf');
    setMode('busy');
    if (c.g.real) await LIB.prepare(c.g, 1500);
    c.ensureDetail(); c.setShadow(true);
    /* the case slides out for as long as the recorded scrape lasts and comes free on its loudest moment */
    const h = clamp(sfx.slide(c.g.fmt), .18, .7);
    if (c.g.dust > .15) emit(spineWorld(c, _sp), Math.round(30 + c.g.dust * 70), 1.4, 1.5);
    c.leaving = true; c.fast = true; c.placeExtras();
    await tweenReal(h, t => { c.pullHold = t; }, easeIO);
    c.mode = 'pulled'; c.pullHold = 0; c.fast = false; await wait(110);
    c.mode = 'inspect'; c.flipT = 0; await wait(380);
    setMode('inspect');
    const idle = c.g.last === null || c.g.last === undefined ? c.g.added : c.g.last;
    if (c.g.wrapped) toast(prefs.seal === 'auto' ? 'Precintado. Al abrirlo se quitará el precinto solo.' : 'Precintado. Tira de la lengüeta roja o déjalo como está.', 3400);
    else if (c.g.dust > .3 && idle != null) toast(`Lleva ${spanText(idle)} sin tocarse. Frota la caja para quitarle el polvo.`, 3600);
  });
}
function flipCase() { if (!active || busy || mode !== 'inspect') return; active.flipT = active.flipT ? 0 : Math.PI; sfx.handle(active.g.fmt); renderPrompts(); }
/* the lid starts to swing when the latch lets go in the recording */
async function swingOpen(c) { const h = sfx.caseOpen(c.g.fmt); await waitReal(h - .01); await tween(.75, t => { c.openA = t; }, easeIO); }
function openCase() {
  if (!active || mode !== 'inspect') return;
  if (active.wrap) { if (prefs.seal === 'manual') { toast('Primero quita el precinto tirando de la lengüeta roja'); return; } return unwrapAction(); }
  return guarded(async () => {
    const c = active; setMode('busy');
    if (c.flipT) { c.flipT = 0; await wait(450); }
    await swingOpen(c);
    setMode('open');
  });
}
function unwrapAction() {
  if (!active || mode !== 'inspect' || !active.wrap) return;
  const openAfter = prefs.seal === 'auto';
  return guarded(async () => {
    const c = active; setMode('busy');
    if (c.flipT) { c.flipT = 0; await wait(400); }
    await autoTear(c);
    if (openAfter) { await wait(350); await swingOpen(c); setMode('open'); }
    else setMode('inspect');
  });
}
async function autoTear(c) {
  const s0 = c.tear, dur = .4 + 2.2 * (1 - s0 / c.L); c.dragging = true; let lastS = s0;
  await tween(dur, t => {
    c.tear = lerp(s0, c.L, t); const tp = c.tearPoint(c.tear, _v), seg = c.segAt(c.tear);
    c.hand.copy(tp).addScaledVector(seg.n, 2.4).add(_w.set(0, .6, 0)); c.updateStrip();
    if (c.tear - lastS > 1.2) { sfx.crinkle(); lastS = c.tear; }
  }, t => t);
  await finishWrap(c);
}
async function finishWrap(c) {
  c.dragging = false; sfx.wrap(); const w = c.wrap, st = c.strip, mat = c.wrapMat, stick = w.children[0];
  c.tearDone = Math.PI * 2;
  await tween(.75, t => { w.position.y = -t * 5; w.scale.setScalar(1 + t * .06); mat.opacity = .2 * (1 - t); if (stick) stick.scale.setScalar(Math.max(.01, 1 - t)); st.position.y = -t * 9; st.rotation.z = t * .7; });
  c.removeWrapNow(); saveGame(c.g); buildShelfPicks(); toast('Precinto retirado'); renderPrompts();
}
function closeCase(internal) {
  /* the lid speeds up and lands exactly on the recorded snap */
  const run = async () => { const c = active; if (!internal) setMode('busy'); const h = clamp(sfx.caseClose(c.g.fmt), .3, .9); await tweenReal(h, t => { c.openA = 1 - t; }, t => t * t); c.openA = 0; if (!internal) setMode('inspect'); };
  if (internal) return run();
  if (!active || mode !== 'open') return;
  return guarded(run);
}
function putBack() {
  if (!active || mode !== 'inspect') return;
  const back = active;
  return guarded(async () => {
    const c = active; setMode('busy');
    if (c.wrap) { c.g.tear = c.tear; saveGame(c.g); }
    c.flipT = 0; c.mode = 'pulled'; await wait(560);
    const h = clamp(sfx.slideIn(c.g.fmt), .2, .7);
    c.mode = 'home'; c.pullHold = 1; c.leaving = true; c.fast = true;
    await tweenReal(h, t => { c.pullHold = 1 - t; }, t => t * t);
    c.pullHold = 0; await wait(90); c.fast = false; c.leaving = false; c.setShadow(false); c.placeExtras();
    c.releaseDetail(); active = null; setMode('shelf');
  }).then(() => { if (pendingRelayout) { pendingRelayout = false; relayout({ follow: back }); } });
}
const _p0 = new V3(), _p1 = new V3(), _p2 = new V3(), _q0 = new Q4(), _q2 = new Q4(), _qz = new Q4(), _qt = new Q4(), ZAX = new V3(0, 0, 1);
const QFLAT = new Q4().setFromEuler(new EU(-Math.PI / 2, 0, 0));
/* the disc leaves the case upwards, in front of it, so it never passes through the plastic */
function discAbove(c, out) { const { h, discR } = c.dim; return out.set(c.discHome.x, h / 2 + discR + 1.4, c.discHome.z + 3.2); }
function insertDisc() {
  if (!active || mode !== 'open') return;
  return guarded(async () => {
    const c = active, d = c.disc, home = c.discHome, above = discAbove(c, new V3()), R = c.dim.discR;
    setMode('busy'); hoverPart = null; c.discLabelMat.emissive.set('#000000');
    await waitReal(sfx.discOut() - .005);
    await tween(.28, t => { d.position.z = home.z + 1.4 * t; d.rotation.x = -.06 * t; });
    await tween(.6, t => { d.position.y = lerp(home.y, above.y, t); d.position.z = lerp(home.z + 1.4, above.z, t); });
    c.mode = 'parked'; setView('console'); await wait(750);
    scene.attach(d); _p0.copy(d.position); _q0.copy(d.quaternion); const s0 = d.scale.x;
    _p2.set(SLOT.x, SLOT.y, SLOT.z + R + .6); _p1.copy(_p0).lerp(_p2, .45); _p1.y = Math.max(_p0.y, _p2.y) + 18;
    await tween(1.1, t => { bez(_p0, _p1, _p2, t, d.position); d.scale.setScalar(lerp(s0, 1, t)); _qt.copy(_q0).slerp(QFLAT, easeIO(Math.min(1, t * 1.2))); _qz.setFromAxisAngle(ZAX, t * Math.PI * 2); d.quaternion.copy(_qt).multiply(_qz); });
    d.scale.setScalar(1); d.quaternion.copy(QFLAT); d.position.copy(_p2);
    sfx.slotIn();
    const z0 = d.position.z, z1 = z0 - 3.4, z2 = SLOT.z - R - 1.2;
    await tweenReal(.28, t => { d.position.z = lerp(z0, z1, t); }, easeOut);
    await tweenReal(.52, t => { d.position.z = lerp(z1, z2, t); }, easeIO);
    d.visible = false; await waitReal(.05); setLed(true); await waitReal(.17);
    sfx.tvOn(); tvSet('boot', c);
    if (PLAYNITE) {
      /* the real thing: Playnite launches the game; the TV waits until it is actually running */
      PN_STATE.waiting = true; PN_STATE.running = c.g.id; LIB.start(c.g);
      await wait(1400); if (PN_STATE.waiting) tvSet('wait', c); else tvSet('play', c);
      playStart = performance.now(); $('#playTitle').textContent = c.g.t; renderPlayBanner();
      setMode('playing');
      if (PN_STATE.pendingEject) { const o = PN_STATE.pendingEject; PN_STATE.pendingEject = null; setTimeout(() => closeGame(o), 700); }
      return;
    }
    await wait(1600);
    sfx.boot(); tvSet('title', c); await wait(1700);
    tvSet('play', c); playStart = performance.now(); $('#playTitle').textContent = c.g.t; renderPlayBanner();
    setMode('playing');
  });
}
function renderPlayBanner() {
  $('#playNote').textContent = PLAYNITE ? (PN_STATE.waiting ? 'Playnite está abriendo el juego. Si no arranca, saca el disco con Esc.' : 'Playnite cuenta el tiempo. Al cerrar el juego, el disco vuelve solo a su caja.') : 'En esta demo cada segundo cuenta como un minuto de partida.';
  $('#playEyebrow').textContent = PLAYNITE && PN_STATE.waiting ? 'Arrancando' : 'En marcha';
}
/* ejects the disc and puts it back in its case. Inside Playnite it runs when the game closes (o.auto),
   or when you pull the disc yourself while the game keeps running */
function closeGame(o = {}) {
  if (!active || mode !== 'playing') return;
  return guarded(async () => {
    const c = active, d = c.disc, g = c.g, home = c.discHome, above = discAbove(c, new V3()), R = c.dim.discR;
    const mins = Math.max(1, Math.floor((performance.now() - playStart) / 1000));
    PN_STATE.waiting = false; if (!o.keepRunning) PN_STATE.running = null;
    setMode('busy'); tvSet('standby'); setLed(false); sfx.tvOff();
    await waitReal(.15); sfx.slotOut(); await waitReal(1.02);
    d.visible = true; const zIn = d.position.z, zOut = SLOT.z + R - 3.6;
    await tweenReal(.5, t => { d.position.z = lerp(zIn, zOut, t); }, easeIO);
    await wait(320);
    _p0.copy(d.position); _q0.copy(d.quaternion);
    const tmp = new THREE.Object3D(); c.inner.add(tmp); tmp.position.copy(above); tmp.updateMatrixWorld(true);
    tmp.getWorldPosition(_p2); tmp.getWorldQuaternion(_q2); c.inner.remove(tmp);
    _p1.copy(_p0).lerp(_p2, .55); _p1.y = Math.max(_p0.y, _p2.y) + 22; const sT = c.root.scale.x;
    await tween(1.1, t => { bez(_p0, _p1, _p2, t, d.position); d.scale.setScalar(lerp(1, sT, t)); _qt.copy(_q0).slerp(_q2, easeIO(Math.min(1, t * 1.2))); _qz.setFromAxisAngle(ZAX, (1 - t) * Math.PI * 2); d.quaternion.copy(_qt).multiply(_qz); });
    c.inner.attach(d); d.position.copy(above); d.quaternion.identity(); d.scale.set(1, 1, 1);
    sfx.discIn({ hitAt: (.55 + .22) * SPEED });
    await tween(.55, t => { d.position.y = lerp(above.y, home.y, t); d.position.z = lerp(above.z, home.z + 1.4, t); });
    await tween(.22, t => { d.position.z = home.z + 1.4 * (1 - t); }); d.position.copy(home);
    let msg, moved = false;
    if (PLAYNITE) {
      const s = o.seconds || 0;
      msg = o.msg || (o.keepRunning ? 'El juego sigue abierto: Playnite seguirá contando el tiempo.' : s >= 60 ? `+${Math.round(s / 60)} min en ${g.t}. Playnite ya lo ha apuntado.` : s > 0 ? `Partida corta en ${g.t}.` : 'Disco fuera.');
      if (s > 0 || o.auto) { g.dust = 0; c.setDust(0); saveGame(g); }
    } else {
      g.hours += mins / 60; g.sessions += 1; g.last = 0;
      if (prefs.autoStatus === 'on' && !['playing', 'beaten', 'completed'].includes(kindOf(g))) { const s = STATUSES.find(n => STATUS_KIND[n] === 'playing'); if (s) { g.status = s; moved = true; } }
      c.setDust(0); g.dust0 = 0; saveGame(g);
      msg = moved ? `+${mins} min. Ahora está en «${g.status}».` : `+${mins} min en ${g.t}. Tus horas ya están en la caja.`;
    }
    c.dirty = true; c.ensureDetail(); c.refreshSpine(); if (moved) pendingRelayout = true; focus = c;
    c.mode = 'inspect'; setView('shelf'); await wait(700);
    toast(msg);
    setMode('open');
  });
}

/* ---------- re-arranging the shelf after a change ---------- */
async function relayout(opts = {}) {
  if (mode !== 'shelf' || busy) { pendingRelayout = true; return; }
  const keyNow = groups[curGroup] ? groups[curGroup].key : '__all';
  buildGroups();
  let gi = groups.findIndex(g => g.key === (opts.reset ? '__all' : keyNow)); if (gi < 0) gi = 0;
  let pi = opts.full ? 0 : clamp(curPage, 0, groups[gi].pages.length - 1);
  if (opts.follow && !opts.full) { const p = pageOf(opts.follow.g, gi); if (p >= 0) pi = p; }
  if (opts.full || gi !== curGroup) { await swapShelf(() => { curGroup = gi; curPage = pi; }); return; }
  /* same shelf: cases that moved slide out a little, change place and slide back; the ones that left go into the wall */
  busy = true; setHovered(null);
  try {
    const before = new Map(navOrder.map(c => [c, { p: c.home.pos.clone(), q: c.home.quat.clone() }]));
    curPage = pi; const oldOrder = navOrder.slice();
    const items = curItems(), stay = new Set(items.map(it => it.g.id));
    const leaving = oldOrder.filter(c => !stay.has(c.g.id));
    leaving.forEach(c => { c.mode = 'pulled'; c.placeExtras(); });
    if (leaving.length) { sfx.slideIn(); await wait(420); leaving.forEach(c => { c.hidden = true; c.root.visible = false; }); }
    const keepActive = active; active = null;
    layoutPage(); active = keepActive;
    const moved = navOrder.filter(c => before.has(c) && before.get(c).p.distanceTo(c.home.pos) > .05);
    if (moved.length) {
      const neu = new Map(moved.map(c => [c, { p: c.home.pos.clone(), q: c.home.quat.clone() }]));
      moved.forEach(c => { c.home.pos.copy(before.get(c).p); c.home.quat.copy(before.get(c).q); });
      sfx.slide(); moved.forEach((c, i) => setTimeout(() => { c.mode = 'pulled'; c.placeExtras(); }, i * 10 * SPEED));
      await wait(moved.length * 10 + 380);
      moved.forEach(c => { c.home.pos.copy(neu.get(c).p); c.home.quat.copy(neu.get(c).q); });
      await wait(600);
      moved.forEach((c, i) => setTimeout(() => { c.mode = 'home'; c.placeExtras(); }, i * 10 * SPEED));
      await wait(moved.length * 10 + 450); sfx.slide();
    }
    navOrder.forEach(c => { if (!before.has(c)) { c.pullHold = .4; tween(.4, t => { c.pullHold = .4 * (1 - t); }, easeOut); } });
    markContacts(); renderPills(); renderBrand(); applySearch(true);
  } finally { busy = false; if (mode === 'shelf') renderPrompts(); }
}

/* ---------- keyboard / pad focus along the shelf ---------- */
function moveFocus(dir) {
  if (!navOrder.length) return; kbNav = true;
  if (!focus || !navOrder.includes(focus)) focus = hovered && navOrder.includes(hovered) ? hovered : navOrder[0];
  else {
    const step = dir === 'right' ? 1 : dir === 'left' ? -1 : dir === 'down' ? 8 : -8, i = navOrder.indexOf(focus), j = i + step;
    const np = groups[curGroup].pages.length;
    if (j >= navOrder.length && np > 1) { const p = (curPage + 1) % np; setPage(p, true).then(() => { focus = navOrder[0]; setHovered(focus); cam.browseX = focus.home.x; if (cam.view === 'browse') setView('browse'); }); return; }
    if (j < 0 && np > 1) { const p = (curPage - 1 + np) % np; setPage(p, true).then(() => { focus = navOrder[navOrder.length - 1]; setHovered(focus); cam.browseX = focus.home.x; if (cam.view === 'browse') setView('browse'); }); return; }
    focus = navOrder[clamp(j, 0, navOrder.length - 1)];
  }
  setHovered(focus);
  cam.browseX = focus.home.x; setView('browse');
}
