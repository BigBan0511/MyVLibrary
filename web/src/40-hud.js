
sfx.on = prefs.sound !== 'off'; sfx.vol = clamp(prefs.vol / 100, 0, 1);

/* =====================================================================
   STATE + HUD
   ===================================================================== */
let mode = 'loading', active = null, busy = false, hovered = null, focus = null, kbNav = false, pendingRelayout = false;
let hoverPart = null, playStart = 0, lastInfoKey = '', infoEdit = false, infoOpen = false, newStatus = false;
const pointer = { x: 0, y: 0, cx: 0, cy: 0, type: 'mouse', down: null, live: false, out: false };
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const coarse = matchMedia('(pointer: coarse)').matches;
let shelfPicks = [];
function buildShelfPicks() { shelfPicks = navOrder.flatMap(c => [c.shell, c.lid, c.spine, c.wrap].filter(Boolean)); }
function hit(list) {
  ndc.set(pointer.x, pointer.y); ray.setFromCamera(ndc, camera);
  list = list || (mode === 'shelf' ? shelfPicks : active ? [active.shell, active.lid, active.spine, active.wrap, active.tabHit, ...(active.strip ? active.path.map(p => p.mesh) : []), ...(active.disc ? active.disc.children : []), active.manual, ...(active.multi ? active.multi.slots.filter(o => !o.userData.away).flatMap(o => o.children) : [])].filter(Boolean) : []);
  const h = ray.intersectObjects(list, false)[0];
  return h ? { case: h.object.userData.case, part: h.object.userData.part || null, point: h.point, obj: h.object } : null;
}
let prefetchT = 0;
function setHovered(c) { if (hovered === c) return; if (hovered) hovered.hoverT = 0; hovered = c; if (c) { c.hoverT = 1; if (kbNav) sfx.tick(); clearTimeout(prefetchT); prefetchT = setTimeout(() => { if (hovered === c) LIB.prefetch(c.g); }, 220); } renderTip(); }
const tipEl = $('#tip');
function renderTip() {
  const c = mode === 'shelf' ? hovered : null;
  if (!c) { tipEl.hidden = true; return; }
  const g = c.g, idle = g.last === null || g.last === undefined ? g.added : g.last;
  if (g.music) { tipEl.innerHTML = `<b>${esc(g.t)}</b><span>${esc([musicSub(g), g.year, T(DIMS[g.fmt].name)].filter(Boolean).join(' · '))}</span>`; tipEl.hidden = false; placeTip(); return; }
  const extra = g.wrapped ? ' · ' + T('precintado') : g.dust > .3 && idle != null ? ' · ' + T('{0} sin tocar', spanText(idle)) : '';
  tipEl.innerHTML = `<b>${esc(g.t)}</b><span>${fmtH(g.hours)} · ${esc(g.status ? TD(g.status) : T('Sin estado'))}${extra}</span>`; tipEl.hidden = false; placeTip();
}
const _tipV = new V3();
function placeTip() {
  if (tipEl.hidden || !hovered) return;
  hovered.root.getWorldPosition(_tipV); _tipV.y += hovered.dim.h / 2 + .8; _tipV.project(camera);
  const x = (_tipV.x * .5 + .5) * innerWidth, y = (-_tipV.y * .5 + .5) * innerHeight, w = tipEl.offsetWidth / 2 + 12;
  tipEl.style.left = clamp(x, w, innerWidth - w) + 'px'; tipEl.style.top = Math.max(y, tipEl.offsetHeight + 70) + 'px';
}
function toast(msg, ms = 2800) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), ms); }

function setMode(m) { mode = m; renderMini(); renderBag(); renderFilter(); renderRlBtn(); if (m === 'shelf' && STAGE.dirty) { STAGE.dirty = false; applyStage(curSysKey()); } $('#sysbar').classList.toggle('away', m !== 'shelf'); renderPrompts(); renderInfo(); renderTip(); $('#play').hidden = m !== 'playing'; if (m !== 'open') hoverPart = null; canvasEl.style.cursor = 'default'; }
const btn = (k, label, a, primary) => `<button class="pbtn${primary ? ' primary' : ''}" type="button" data-act="${a}"><kbd>${k}</kbd>${label}</button>`;
function tearHintText(c) { return c.tear > .05 ? T('Precinto {0} % · sigue tirando', Math.round(100 * c.tear / c.L)) : T('Arrastra la lengüeta roja para quitar el precinto'); }
function renderPrompts() {
  const el = $('#prompts'); let h = '';
  if (mode === 'shelf') {
    const gr = groups[curGroup], np = gr ? gr.pages.length : 1;
    if (np > 1) h += `<div class="pager"><button class="pbtn icon" type="button" data-act="prevPage" aria-label="${T('Página anterior')}"${curPage === 0 ? ' disabled' : ''}>‹</button><span class="pg">${curPage + 1} / ${np}</span><button class="pbtn next" type="button" data-act="nextPage"${curPage >= np - 1 ? ' disabled' : ''}>${T('Siguiente')} <i aria-hidden="true">›</i></button></div>`;
    h += coarse ? `<span class="hint">${T('Toca un lomo para sacar el juego')}</span>` : isRooms() ? `<span class="hint">${T('Clic en un lomo')} · <kbd>←</kbd><kbd>→</kbd> ${T('recorrer')} · <kbd>Q</kbd><kbd>E</kbd> ${T('sistemas')} · <kbd>Z</kbd><kbd>C</kbd> ${T('estantes')} · <kbd>${T('Intro')}</kbd> ${T('sacar')}</span>` : `<span class="hint">${T('Clic en un lomo')} · <kbd>←</kbd><kbd>→</kbd> ${T('recorrer')} · <kbd>Q</kbd><kbd>E</kbd> ${T('estantes')} · <kbd>${T('Intro')}</kbd> ${T('sacar')}</span>`;
  }
  if (mode === 'inspect' && active) {
    if (active.wrap) {
      if (prefs.seal !== 'auto') h += `<span class="hint tear" id="tearHint">${tearHintText(active)}</span>`;
      if (prefs.seal !== 'manual') h += btn(T('Intro'), prefs.seal === 'auto' ? T('Abrir la caja') : T('Quitar precinto'), 'unwrap', true);
    } else h += btn(T('Intro'), T('Abrir la caja'), 'open', true);
    h += btn('F', active.flipT ? T('Ver portada') : T('Ver contraportada'), 'flip') + btn('Esc', T('Devolver'), 'back');
  }
  if (mode === 'open' && active.g.video) h = (active.multi ? `<span class="hint">${T(active.multi.kind === 'tape' ? 'Elige una cinta' : 'Elige un disco')} · <kbd>←</kbd><kbd>→</kbd> ${T('más capítulos')} · <kbd>↑</kbd><kbd>↓</kbd> ${T('elegir')}</span>` + btn(T('Intro'), T('Ver este'), 'insert', true) : btn(T('Intro'), mediaT(active.g, 'Meter el disco'), 'insert', true)) + btn('Esc', T('Cerrar la caja'), 'close');
  else if (mode === 'open') h = btn('M', T('Leer el manual'), 'manual') + btn(T('Intro'), mediaT(active.g, active.g.real && !active.g.installed ? 'Meter el disco (instalar)' : 'Meter el disco'), 'insert', true) + btn('Esc', T('Cerrar la caja'), 'close');
  if (mode === 'playing') h = btn('Esc', active.g.video ? mediaT(active.g, 'Sacar el disco') : PLAYNITE ? mediaT(active.g, 'Sacar el disco') : T('Cerrar el juego'), 'quit', true);
  if (mode === 'hifi' || (active && active.g.music && (mode === 'inspect' || mode === 'open'))) h = musicPrompts();
  if (mode === 'roulette') h = rlPrompts();
  el.innerHTML = h;
  if (typeof renderEpBar === 'function') renderEpBar();
}
$('#prompts').addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b && !b.disabled) { sfx.init(); doAct(b.dataset.act); } });
function doAct(a) {
  const fns = { flip: flipCase, open: openCase, unwrap: unwrapAction, back: putBack, manual: openManual, insert: insertDisc, close: () => closeCase(false), quit: () => closeGame(PLAYNITE && PN_STATE.running && !PN_STATE.waiting ? { keepRunning: true } : {}), prevPage: () => setPage(curPage - 1), nextPage: () => setPage(curPage + 1), prevShelf: () => setGroup(curGroup - 1), nextShelf: () => setGroup(curGroup + 1), rlSpin, rlGo, rlBack: closeRoulette };
  if (fns[a]) fns[a](); else if (a[0] === 'm') musicAct(a);
}

/* ---------- header: brand count and the pills that choose what is on the shelf ---------- */
function renderBrand() {
  renderFilter();
  renderSysbar();
  const gr = groups[curGroup], n = gr ? gr.games.length : 0;
  if (STAGE.name === 'music') { const all = GAMES.filter(g => g.music).length; $('#brandCount').textContent = T(all === 1 ? '{0} de {1} elemento' : '{0} de {1} elementos', n, all); return; }
  if (STAGE.name === 'video') { const all = GAMES.filter(g => g.video).length; $('#brandCount').textContent = T(all === 1 ? '{0} de {1} título' : '{0} de {1} títulos', n, all); return; }
  const games = GAMES.filter(g => !g.video && !g.music).length; $('#brandCount').textContent = T(games === 1 ? '{0} de {1} juego' : '{0} de {1} juegos', n, games);
}
function renderPills() {
  const el = $('#pills');
  el.innerHTML = groups.map((gr, i) => `<button type="button" class="pill-btn${i === curGroup ? ' on' : ''}" data-group="${i}" aria-pressed="${i === curGroup}">${esc(gr.label)}<span>${gr.games.length}</span></button>`).join('');
  const on = el.querySelector('.on'); if (on && on.scrollIntoView) try { on.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) { }
  pillEdges();
}
/* fade whichever edge has more shelves beyond it */
function pillEdges() { const el = $('#pills'); if (!el) return; el.classList.toggle('more-l', el.scrollLeft > 2); el.classList.toggle('more-r', el.scrollLeft + el.clientWidth < el.scrollWidth - 2); }
$('#pills').addEventListener('scroll', pillEdges, { passive: true }); window.addEventListener('resize', pillEdges);
$('#pills').addEventListener('click', e => { const b = e.target.closest('[data-group]'); if (b) setGroup(+b.dataset.group); });

/* switching shelf contents goes through a short dip to black, then the new cases settle in a wave */
let swapBusy = false;
async function swapShelf(fn, quiet, snap, noFade) {
  if (swapBusy) return; swapBusy = true; busy = true; setHovered(null);
  try {
    if (!quiet) sfx.slide();
    const f = $('#fade'); if (!noFade) { f.classList.add('on'); await new Promise(r => setTimeout(r, RM ? 20 : 200)); }
    fn(); layoutPage(); renderPills(); renderBrand(); renderPrompts();
    /* frame what is there now; after a change of design the camera jumps while the screen is dark */
    if (cam.view === 'shelf' || cam.view === 'browse') { setView(cam.view); if (snap) { cam.pos.copy(cam.tPos); cam.look.copy(cam.tLook); cam.snap = true; } }
    navOrder.forEach(c => { c.pullHold = .35; c.root.position.copy(c.home.pos); c.root.quaternion.copy(c.home.quat); });
    if (!noFade) requestAnimationFrame(() => f.classList.remove('on'));
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
  if (isCases()) {
    curGroup = i; curPage = 0; layoutPage(); setView('shelf'); renderPills(); renderBrand(); renderPrompts(); applySearch(true);
    if (!quiet) sfx.whoosh(); return Promise.resolve();
  }
  return swapShelf(() => { curGroup = i; curPage = 0; if (cam.view !== 'shelf') setView('shelf'); }, quiet);
}
function setPage(p, quiet) {
  const gr = groups[curGroup]; if (!gr || mode !== 'shelf' || busy) return;
  p = clamp(p, 0, gr.pages.length - 1); if (p === curPage) return;
  return swapShelf(() => { curPage = p; }, quiet);
}

/* ---------- rooms by system: the switcher in the header, and walking to the next room ---------- */
function renderSysbar() {
  const el = $('#sysbar'), L = isRooms() ? systemsList() : [];
  el.hidden = !L.length; if (!L.length) return;
  const cur = L.find(s => s.key === curSysKey()) || L[0];
  el.querySelector('b').textContent = cur.name;
  el.querySelector('span').textContent = T(cur.key === 'VIDEO' ? (cur.n === 1 ? '{0} título' : '{0} títulos') : cur.key === 'MUSIC' ? (cur.n === 1 ? '{0} elemento' : '{0} elementos') : cur.n === 1 ? '{0} juego' : '{0} juegos', cur.n) + (L.length > 1 ? ` · ${L.indexOf(cur) + 1} / ${L.length}` : '');
  el.querySelectorAll('[data-sys]').forEach(b => { b.disabled = L.length < 2; });
}
$('#sysbar').addEventListener('click', e => { const b = e.target.closest('[data-sys]'); if (b && !b.disabled) { sfx.init(); setSystem(+b.dataset.sys); } });
async function setSystem(step, goTo) {
  if (!isRooms() || busy || swapBusy || mode !== 'shelf') return;
  const L = systemsList(); if (!goTo && L.length < 2) return;
  /* step through the list, or straight to one system (the filter left the current one empty) */
  const i = Math.max(0, L.findIndex(s => s.key === curSysKey())), sys = goTo ? L.find(s => s.key === goTo) || { key: goTo, name: goTo } : L[(i + step + L.length) % L.length], key = sys.key;
  const from = STAGE.name, to = stageFor(key);
  prefs.sys = key; prefs.shelf = '__all'; savePrefs(); sfx.whoosh(); setHovered(null); kbNav = false;
  const need = UGCS.keysFor(key).filter(k => UGCS.meta()[k] && !UGCS.models.has(k));
  if (need.length) { toast(T('Preparando la consola…'), 2000); busy = true; await new Promise(r => setTimeout(r, 60)); await UGCS.load(need); busy = false; }
  if (from !== to) {
    /* another room: the camera walks over, then the shelf fills */
    busy = true; applyStage(key); buildGroups(); curGroup = 0; curPage = 0;
    setView('shelf'); renderSysbar(); renderPills(); renderBrand();
    await wait(RM ? 50 : 700); busy = false;
    await swapShelf(() => { }, true, false, true);
  } else await swapShelf(() => { applyStage(key); buildGroups(); curGroup = 0; curPage = 0; setView('shelf'); }, true);
  renderSysbar(); toast(sys.name, 1400);
}
/* re-dress the room after a model is chosen or removed; while a game is out it waits for the shelf */
function refreshStage() { if (!isRooms()) return; if (mode === 'shelf' && !busy) applyStage(curSysKey()); else STAGE.dirty = true; }

/* ---------- inspect card: status and categories ---------- */
function renderInfo(force) {
  const el = $('#info'), tab = $('#infoTab'), show = active && (cam.view === 'shelf' || cam.view === 'browse') && !['shelf', 'loading', 'manual'].includes(mode);
  if (!show) { el.hidden = true; tab.hidden = true; lastInfoKey = ''; infoEdit = false; infoOpen = false; newStatus = false; return; }
  placeCard();
  if (prefs.card === 'hide') { el.hidden = true; lastInfoKey = ''; tab.hidden = false; tab.innerHTML = `<span>${T('Ficha')}</span><b>${esc(active.g.t)}</b><i aria-hidden="true">▾</i>`; return; }
  tab.hidden = true;
  if (active.g.music) { const g = active.g, mk = ['m', g.id, g.fmt, BAG.length, BAG.map(t => t.id).join(',').length].join('|'); el.hidden = false; if (!force && mk === lastInfoKey) return; lastInfoKey = mk; el.classList.add('open'); renderMusicInfo(el, g); return; }
  if (active.g.video) { const g = active.g, s = seasonOf(g), vk = ['v', g.id, g.fmt, g.seasonIdx, g.seasons ? g.seasons.length : 0, s && s.eps ? s.eps.length : -1, g.pos, g.played].join('|'); el.hidden = false; if (!force && vk === lastInfoKey) return; lastInfoKey = vk; el.classList.add('open'); renderVideoInfo(el, g); return; }
  const g = active.g, key = [g.id, g.fmt, g.installed, g.scanKey, g.manualVer, g.manualOwn, g.platFull, PLATFORMS.length, g.hours, g.status, g.last, g.sessions, g.cats.join(','), infoEdit, infoOpen, newStatus, prefs.cats.length, STATUSES.length, Math.round(g.dust * 4)].join('|');
  el.hidden = false; if (!force && key === lastInfoKey) return; lastInfoKey = key;
  const idle = g.last === null || g.last === undefined ? g.added : g.last;
  const dustTxt = T(g.wrapped ? 'Ninguno, está precintado' : g.dust > .6 ? 'Mucho' : g.dust > .25 ? 'Algo' : g.dust > .04 ? 'Poco' : 'Limpio');
  const note = T(PLAYNITE ? 'Los cambios se guardan en Playnite al momento.' : 'Si cambias el estado, al devolverlo irá a ese estante.');
  const statuses = g.status && !STATUSES.includes(g.status) ? [g.status, ...STATUSES] : STATUSES;
  el.classList.toggle('open', infoOpen);
  el.innerHTML = `<div class="info-bar"><button type="button" class="info-more" data-more="1" aria-expanded="${infoOpen}">${infoOpen ? T('Menos') : T('Estado y categorías')}</button><button type="button" class="info-hide" data-hide="1" aria-label="${T('Ocultar la ficha')}" title="${T('Ocultar la ficha')} (I) · ${T('Arrastra para moverla')}">${T('Ocultar')} <i aria-hidden="true">▴</i></button></div><div class="eyebrow">${esc([g.genre, g.year, g.real ? g.plat : T(DIMS[g.fmt].name)].filter(Boolean).join(' · '))}</div><h2>${esc(g.t)}</h2>
    <dl><dt>${T('Jugado')}</dt><dd>${fmtH(g.hours)}${g.sessions ? ' · ' + T(g.sessions === 1 ? '{0} vez' : '{0} veces', g.sessions) : ''}</dd><dt>${T('Última vez')}</dt><dd>${lastText(g.last)}</dd>${g.ach[1] ? `<dt>${T('Logros')}</dt><dd>${T('{0} de {1}', g.ach[0], g.ach[1])}</dd>` : ''}<dt>${T('Polvo')}</dt><dd>${dustTxt}${g.dust > .04 && idle != null ? ' · ' + T('{0} sin tocar', spanText(idle)) : ''}</dd></dl>
    <div class="frow"><label for="stSel">${T('Estado')}</label><span class="pill ${STATUS_CLASS[g.status] || 'st-sin'}" aria-hidden="true"></span><select id="stSel">${g.status ? '' : `<option value="" selected>${T('Sin estado')}</option>`}${statuses.map(s => `<option value="${esc(s)}"${s === g.status ? ' selected' : ''}>${esc(TD(s))}</option>`).join('')}<option value="__new">+ ${T('Nuevo estado…')}</option></select></div>
    <div class="frow"><label for="fmtSel">${T('Formato')}</label><span class="fmt-ico" aria-hidden="true">${FMT_ICON[g.fmt] || ''}</span><select id="fmtSel"${fmtLocked(g) ? ' disabled' : ''}>${GAME_FMTS.map(f => `<option value="${f}"${f === g.fmt ? ' selected' : ''}>${esc(T(DIMS[f].name))}</option>`).join('')}</select></div>
    ${platRow(g)}
    ${gameActs(g)}
    ${fmtLocked(g) ? `<p class="fmt-lock">${T('El original de {0}. Se puede cambiar en Ajustes → Formato en consolas.', esc(g.platFull || g.plat))}</p>` : ''}
    ${newStatus ? `<form class="cat-new st-new"><input id="stNew" type="text" placeholder="${T('Nombre del estado nuevo')}" maxlength="40" autocomplete="off"><button type="submit">${T('Crear')}</button></form>` : ''}
    <div class="cats"><span class="lbl">${T('Categorías')}</span><div class="chips">${g.cats.length ? g.cats.map(c => `<span class="chip">${esc(TD(c))}</span>`).join('') : `<em>${T('Ninguna')}</em>`}<button type="button" class="chip add" data-edit="1">${infoEdit ? T('Listo') : '+ ' + T('Categorías')}</button></div></div>
    ${infoEdit ? `<div class="cat-edit">${prefs.cats.map(c => `<label><input type="checkbox" data-catbox="${esc(c)}"${g.cats.includes(c) ? ' checked' : ''}><span>${esc(TD(c))}</span></label>`).join('')}
      <form class="cat-new"><input id="catNew" type="text" placeholder="${T('Nueva categoría')}" maxlength="40" autocomplete="off"><button type="submit">${T('Añadir')}</button></form></div>` : ''}
    <p class="note">${note}</p>`;
}
/* the platform Playnite has the game on, when it has it wrong: the game moves to that system's room */
function platRow(g) {
  if (!PLAYNITE || !g.real || !PLATFORMS.length) return '';
  const cur = PLATFORMS.find(p => p.name === g.platFull);
  return `<div class="frow"><label for="platSel">${T('Plataforma')}</label><span aria-hidden="true"></span><select id="platSel">${cur ? '' : `<option value="" selected>${esc(g.platName || T('Sin plataforma'))}</option>`}${PLATFORMS.map(p => `<option value="${esc(p.id)}"${cur && p.id === cur.id ? ' selected' : ''}>${esc(p.name)}</option>`).join('')}</select></div>`;
}
/* the game's real manual: a PDF of your own, or the one Playnite has in its Manual field */
function manualActs(g) {
  if (!(DIMS[g.fmt].man && DIMS[g.fmt].man[0])) return '';
  const what = g.manualVer ? (g.manualOwn ? T('Tu PDF') : T('El PDF de Playnite')) : T('El de MyVLibrary');
  return `<div class="acts"><span class="lbl">${T('Manual del juego')}</span><div class="act-row"><span class="inst${g.manualVer ? ' on' : ''}">${what}</span><button type="button" class="gact" data-manual="pick">${g.manualOwn ? T('Cambiar el PDF') : T('Elegir un PDF')}</button>${g.manualOwn ? `<button type="button" class="gact x" data-manual="remove" aria-label="${esc(T('Quitar el PDF'))}" title="${esc(T('Quitar el PDF'))}">×</button>` : ''}</div>`
    + `<p class="art-note">${T('El manual de verdad, escaneado en PDF: se lee al abrir la caja (M) y su primera página es la portada del manual. Si el juego ya tiene un manual en PDF en Playnite, se usa ese.')}</p></div>`;
}
/* installing, uninstalling and the rest, done by Playnite (only inside it) */
function gameActs(g) {
  if (!PLAYNITE || !g.real) return '';
  const b = (act, label, tip) => `<button type="button" class="gact" data-gact="${act}"${tip ? ` title="${esc(tip)}"` : ''}>${label}</button>`, mark = T('Solo cambia lo que Playnite tiene apuntado: no instala ni borra nada.');
  return `<div class="acts"><span class="lbl">${T('Instalación')}</span><div class="act-row"><span class="inst ${g.installed ? 'on' : ''}">${T(g.installed ? 'Instalado' : 'Sin instalar')}</span>`
    + (g.installed ? b('uninstall', T('Desinstalar')) + b('folder', T('Abrir carpeta')) + b('markOff', T('Marcar como no instalado'), mark) : b('install', T('Instalar')) + b('markOn', T('Marcar como instalado'), mark))
    + b('reveal', T('Ver en Playnite')) + `</div></div>` + artActs(g) + manualActs(g);
}
/* real pictures for the case: a full scan, or the back, the spine and the disc one by one */
function artActs(g) {
  const art = g.scans || {}, med = mediaOf(g), disc = med === 'cart' ? T('Etiqueta') : med === 'disc' ? T('Disco') : '';
  const one = (k, label) => art[k] ? `<button type="button" class="gact on" data-art="${k}" title="${esc(T('Cambiar'))}">✓ ${label}</button><button type="button" class="gact x" data-artx="${k}" aria-label="${esc(T('Quitar') + ': ' + label)}" title="${esc(T('Quitar'))}">×</button>` : `<button type="button" class="gact" data-art="${k}">+ ${label}</button>`;
  return `<div class="acts"><span class="lbl">${T('Imágenes de la caja')}</span><div class="act-row">${one('full', T('Escaneo completo'))}${one('front', T('Portada'))}${one('back', T('Contraportada'))}${one('spine', T('Lomo'))}${disc ? one('disc', disc) : ''}${DIMS[g.fmt].man && DIMS[g.fmt].man[0] ? one('manual', T('Manual')) : ''}${g.hasCover || Object.keys(art).length ? `<button type="button" class="gact fit" data-fit="1">${T('Ajustar encuadre')}</button>` : ''}</div>`
    + `<p class="art-note">${T('Escaneos reales de tu copia: el completo es contraportada, lomo y portada en una sola imagen; Manual es la portada del manual. Se guardan en la carpeta de metadatos del juego. Si una imagen se corta o se pasa, Ajustar encuadre.')}</p></div>`;
}
/* the picture chosen for a part: made no bigger than it needs to be, then handed to the extension to keep */
let artKind = null;
function pickArt(kind) { artKind = kind; const f = $('#artFile'); f.value = ''; f.click(); }
/* the pretend Playnite has no file dialog of its own: the browser's stands in for it */
$('#manualFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f && active && MOCK) MOCKHOST.pickManual(active.g.id, f); });
$('#artFile').addEventListener('change', e => {
  const file = e.target.files && e.target.files[0], g = active && active.g, kind = artKind; if (!file || !g || !kind) return;
  const url = URL.createObjectURL(file), img = new Image();
  img.onload = () => {
    URL.revokeObjectURL(url);
    const max = kind === 'full' ? 4096 : 2400, k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = mkCanvas(Math.round(img.naturalWidth * k), Math.round(img.naturalHeight * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    /* a disc keeps its see-through edges; the rest go as JPEG */
    const data = kind === 'disc' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', .92);
    LIB.send('setArt', { id: g.id, kind, data }); toast(T('Imagen guardada'));
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast(T('No se ha podido leer esa imagen')); };
  img.src = url;
});
function gameAct(g, act) {
  if (!PLAYNITE || !g.real) return;
  LIB.send('game', { id: g.id, act }); sfx.tick();
  if (act === 'install') toast(T('Playnite se encarga de instalarlo.'));
  /* the mark shows at once; Playnite's own update follows */
  if (act === 'markOn' || act === 'markOff') { g.installed = act === 'markOn'; renderInfo(true); pendingRelayout = true; }
}
function gameChanged(c, fields, regroup) {
  saveGame(c.g); c.dirty = true; c.ensureDetail(); c.refreshSpine(); if (regroup) pendingRelayout = true; renderInfo(true);
  if (PLAYNITE && fields) LIB.update(c.g, fields);
}
$('#info').addEventListener('change', e => {
  if (!active) return; const c = active, g = c.g;
  if (e.target.id === 'fmtSel') { setFormat(e.target.value); return; }
  if (e.target.id === 'platSel') { const p = PLATFORMS.find(x => x.id === e.target.value); if (!p) return; g.platId = p.id; LIB.update(g, ['platform']); toast(T('Ahora es de {0}: al devolverlo irá a su sala.', p.name), 2800); return; }
  if (e.target.id === 'stSel' && e.target.value === '__new') { newStatus = true; renderInfo(true); const i = $('#stNew'); if (i) i.focus(); return; }
  if (e.target.id === 'stSel') { const old = g.status; g.status = e.target.value; gameChanged(c, ['status'], prefs.group === 'status'); if (prefs.group === 'status' && old !== g.status && groups[curGroup].key !== '__all') toast(T('Al devolverlo irá al estante «{0}»', STATUS_SHELF[g.status] || g.status)); }
  const box = e.target.closest('[data-catbox]');
  if (box) { const name = box.dataset.catbox; if (box.checked) { if (!g.cats.includes(name)) g.cats.push(name); } else g.cats = g.cats.filter(x => x !== name); gameChanged(c, ['cats'], prefs.group === 'cat'); }
});
$('#info').addEventListener('click', e => {
  if (!active) return;
  if (e.target.closest('[data-more]')) { infoOpen = !infoOpen; renderInfo(true); return; }
  if (e.target.closest('[data-hide]')) { setCard('hide'); return; }
  const ga = e.target.closest('[data-gact]'); if (ga) { gameAct(active.g, ga.dataset.gact); return; }
  const ar = e.target.closest('[data-art]'); if (ar && PLAYNITE) { pickArt(ar.dataset.art); return; }
  if (e.target.closest('[data-fit]') && PLAYNITE) { openFit(active.g); return; }
  const mb = e.target.closest('[data-manual]'); if (mb && PLAYNITE) { if (MOCK && mb.dataset.manual === 'pick') { const f = $('#manualFile'); f.value = ''; f.click(); } else LIB.send('manual', { id: active.g.id, act: mb.dataset.manual }); return; }
  const ax = e.target.closest('[data-artx]'); if (ax && PLAYNITE) { LIB.send('setArt', { id: active.g.id, kind: ax.dataset.artx, data: '' }); return; }
  if (e.target.closest('[data-edit]')) { infoEdit = !infoEdit; renderInfo(true); if (infoEdit) { const i = $('#catNew'); if (i && !coarse) i.focus(); } }
});
$('#info').addEventListener('submit', e => {
  e.preventDefault(); if (!active) return;
  if (e.target.closest('.st-new')) {
    const name = $('#stNew').value.trim().replace(/\s+/g, ' '); newStatus = false; if (!name) { renderInfo(true); return; }
    if (!STATUSES.includes(name)) { STATUSES.push(name); STATUS_SHELF[name] = name; STATUS_KIND[name] = statusKind(name); STATUS_CLASS[name] = KIND_CLASS[STATUS_KIND[name]]; }
    const g = active.g; g.status = name; saveGame(g); active.dirty = true; active.ensureDetail(); renderInfo(true); pendingRelayout = prefs.group === 'status';
    if (PLAYNITE) LIB.send('createStatus', { id: g.id, name }); toast(T('Estado «{0}» creado', name)); return;
  }
  const inp = $('#catNew'), name = inp.value.trim().replace(/\s+/g, ' ');
  if (!name) return; if (!prefs.cats.includes(name)) { prefs.cats.push(name); savePrefs(); }
  const g = active.g; if (!g.cats.includes(name)) g.cats.push(name);
  gameChanged(active, ['cats'], prefs.group === 'cat'); toast(T('Categoría «{0}» añadida', name));
});
/* ---------- format: the case in your hands shrinks away and the new one takes its place ---------- */
const FMT_ICON = { dvd: '▮', jewel: '◫', bigjewel: '◧', big: '▣', floppy: '▤', cart: '▭', vhs: '▬', bluray: '▮', dvdbox: '▯', bdbox: '▯', vhsbox: '▦' };
function setFormat(fmt) {
  if (!active || !DIMS[fmt] || DIMS[fmt].video || busy || !(mode === 'inspect' || mode === 'open') || fmtLocked(active.g)) { renderInfo(true); return; }
  if (active.g.fmt === fmt) return;
  return swapCaseTo(active, () => { active.g.fmt = fmt; active.g.fmtPick = fmt; }, true);
}
/* a new case for the same game where the old one is, taking over its place on the shelf */
function replaceCase(c) {
  const n = new Case(c.g); n.key = c.key; caseById.set(c.key, n);
  n.root.position.copy(c.root.position); n.root.quaternion.copy(c.root.quaternion); n.root.scale.copy(c.root.scale);
  n.mode = c.mode; n.flipT = n.flipA = c.flipT; n.leaving = c.leaving; n.row = c.row; n.unitIdx = c.unitIdx; n.fresh = false; n.match = c.match; n.pullHold = c.pullHold;
  /* its place on the shelf: same spot for now; the shelf makes room when you put it back */
  placeCase(n, c.home.x, c.faceOut, c.home.board, isCases() ? SH.front : SHELF.front);
  const i = navOrder.indexOf(c); if (i >= 0) navOrder[i] = n;
  if (focus === c) focus = n; if (hovered === c) hovered = n;
  c.dispose(); cases = [...caseById.values()]; buildShelfPicks();
  pendingRelayout = true;
  return n;
}
/* the case in your hands shrinks away and another takes its place: a new format, or another season */
function swapCaseTo(c0, change, sayFormat) {
  if (!c0 || busy || !(mode === 'inspect' || mode === 'open')) { renderInfo(true); return; }
  return guarded(async () => {
    const c = c0, g = c.g, wasOpen = mode === 'open';
    setMode('busy'); stopTrailer();
    if (wasOpen) await closeCase(true);
    if (c.wrap) g.tear = c.tear;
    sfx.whoosh(); c.vanish = true; c.fast = true; await wait(170);
    change(); if (g.kind === 'series') await videoEpisodes(g, seasonOf(g)).then(() => resolveVideoFmt(g));
    const fmt = g.fmt; saveGame(g);
    const n = replaceCase(c); n.root.scale.setScalar(.02); n.leaving = true;
    active = n; n.ensureDetail(); n.setShadow(true); n.placeExtras();
    sfx.handle(fmt); await wait(420);
    if (g.video) setVideoMedium(DIMS[fmt].media);
    if (wasOpen) { await swingOpen(n); if (n.multi) multiOpened(n); setMode('open'); } else setMode('inspect');
    startTrailer(n); renderInfo(true);
    toast(sayFormat || !g.video ? T('Ahora es: {0}', T(DIMS[fmt].name)) : (seasonOf(g) ? seasonOf(g).name : g.t), 2200);
  });
}
/* the card can be dragged by its top bar anywhere on screen; the place is remembered (double click: back home) */
function placeCard() {
  const el = $('#info'), tab = $('#infoTab'), p = prefs.cardPos;
  [el, tab].forEach(n => { if (p) { n.style.left = clamp(p.x * innerWidth, 8, innerWidth - 120) + 'px'; n.style.top = clamp(p.y * innerHeight, 8, innerHeight - 60) + 'px'; } else { n.style.left = ''; n.style.top = ''; } });
}
let cardDrag = null;
$('#info').addEventListener('pointerdown', e => {
  if (!e.target.closest('.info-bar') || e.target.closest('button')) return;
  const r = $('#info').getBoundingClientRect(); cardDrag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
  try { $('#info').setPointerCapture(e.pointerId); } catch (_) { } e.preventDefault();
});
$('#info').addEventListener('pointermove', e => {
  if (!cardDrag) return; const el = $('#info'), w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = clamp(e.clientX - cardDrag.dx, 8, innerWidth - w - 8) + 'px'; el.style.top = clamp(e.clientY - cardDrag.dy, 8, innerHeight - Math.min(h, 80)) + 'px';
});
$('#info').addEventListener('pointerup', () => { if (!cardDrag) return; cardDrag = null; const r = $('#info').getBoundingClientRect(); prefs.cardPos = { x: r.left / innerWidth, y: r.top / innerHeight }; savePrefs(); placeCard(); });
$('#info').addEventListener('dblclick', e => { if (e.target.closest('.info-bar') && !e.target.closest('button')) { prefs.cardPos = null; savePrefs(); placeCard(); } });
function setCard(v) { prefs.card = v; savePrefs(); lastInfoKey = ''; renderInfo(true); sfx.tick(); if (v === 'show') { const b = $('#info .info-hide'); if (b && !coarse) b.focus(); } else $('#infoTab').focus(); }
$('#infoTab').addEventListener('click', () => setCard('show'));

/* ---------- search ---------- */
const qEl = $('#q'), countEl = $('#count');
function searchText(g) { return norm([g.t, g.artist, g.album, g.genre, g.dev, g.pub, g.plat, g.status, T(DIMS[g.fmt].name), ...(g.cats || [])].filter(Boolean).join(' ')); }
function applySearch(stay) {
  const q = norm(qEl.value.trim()), gr = groups[curGroup]; if (!gr) return;
  const hits = q ? gr.games.filter(g => searchText(g).includes(q)) : [];
  navOrder.forEach(c => { c.match = !!q && hits.includes(c.g); c.setDim(!!q && !c.match); });
  countEl.hidden = !q; countEl.textContent = T(hits.length === 1 ? '{0} juego' : '{0} juegos', hits.length);
  if (!stay && q && hits.length && !navOrder.some(c => c.match) && mode === 'shelf') { const p = pageOf(hits[0]); if (p >= 0 && p !== curPage) setPage(p, true); }
}
qEl.addEventListener('input', () => applySearch());
qEl.addEventListener('keydown', e => { if (e.key === 'Enter') { const m = navOrder.find(c => c.match); if (m && mode === 'shelf') { qEl.blur(); focus = m; pick(m); } } });

/* ---------- settings ---------- */
const setBtn = $('#setBtn'), setPop = $('#settings');
function renderUgcList() {
  const el = $('#ugcList'); if (!el) return;
  const rows = [...systemsList().filter(s => s.key !== 'MUSIC').flatMap(s => s.key === 'VIDEO' ? [['vid:tape', T('Vídeo VHS'), T('Genérico')], ['vid:disc', T('Reproductor de DVD y Blu-ray'), T('Genérico')]] : [['sys:' + s.key, s.name, s.key === 'PC' ? T('PC genérico') : T('Consola genérica (ID-2)')]]), ['scr:crt', T('Tele de tubo'), T('Genérica')], ['scr:flat', T('Tele plana'), T('Genérica')], ['scr:monitor', T('Monitor del PC'), T('Genérico')]];
  /* EmuVR's own consoles, once its folder has been read: offered on every system, the ones that suit it first */
  const bases = UGCS.bases(), sysOfKey = k => k.slice(4);
  const baseSel = k => !bases.length || !/^(sys|vid):/.test(k) || k === 'sys:PC' ? '' : `<select data-ugc-base="${k}" aria-label="${T('Consola de EmuVR')}"><option value="">EmuVR…</option>${bases.slice().sort((a, b) => (b.sys === sysOfKey(k)) - (a.sys === sysOfKey(k))).map(b => `<option value="${esc(b.id)}"${UGCS.meta()[k] && UGCS.meta()[k].base === b.id ? ' selected' : ''}>${esc(T(b.name))}</option>`).join('')}</select>`;
  const head = `<div class="ugc-item"><div class="ugc-what"><b>${T('Consolas de EmuVR')}</b><span${bases.length ? ' class="on"' : ''}>${bases.length ? T('{0} consolas leídas', bases.length) : T('Las que trae EmuVR, sin .ugc')}</span></div><div class="ugc-btns"><button type="button" data-ugc-emuvr>${bases.length ? T('Volver a leer') : T('Leer carpeta de EmuVR')}</button></div></div>`;
  el.innerHTML = head + rows.map(([k, label, gen]) => { const m = UGCS.meta()[k]; return `<div class="ugc-item"><div class="ugc-what"><b>${esc(label)}</b><span${m ? ' class="on"' : ''}>${m ? esc(m.name) : gen}</span></div><div class="ugc-btns">${m ? `<button type="button" data-ugc-rot="${k}" title="${T('Girar 180°')}" aria-label="${T('Girar 180°')}">↻</button><button type="button" data-ugc-del="${k}" title="${T('Quitar')}" aria-label="${T('Quitar')}">✕</button>` : ''}${baseSel(k)}<button type="button" data-ugc-pick="${k}">${m ? T('Cambiar') : T('Elegir .ugc')}</button></div></div>`; }).join('');
}
let ugcPending = null;
$('#ugcList').addEventListener('click', async e => {
  const pick = e.target.closest('[data-ugc-pick]'), del = e.target.closest('[data-ugc-del]'), rot = e.target.closest('[data-ugc-rot]');
  if (pick) { ugcPending = pick.dataset.ugcPick; const f = $('#ugcFile'); f.value = ''; f.click(); }
  if (e.target.closest('[data-ugc-emuvr]')) { const f = $('#emuvrDir'); f.value = ''; f.click(); }
  if (del) { try { await UGCS.remove(del.dataset.ugcDel); } catch (err) { console.error(err); } renderUgcList(); refreshStage(); sfx.tick(); }
  if (rot) { const m = UGCS.meta()[rot.dataset.ugcRot]; if (m) { m.rot = !m.rot; savePrefs(); refreshStage(); sfx.tick(); } }
});
$('#ugcList').addEventListener('change', async e => {
  const sel = e.target.closest('[data-ugc-base]'); if (!sel || !sel.value) return;
  toast(T('Preparando la consola…'), 4000);
  try { await UGCS.useBase(sel.dataset.ugcBase, sel.value); toast(T('{0} listo', UGCS.meta()[sel.dataset.ugcBase].name), 2600); refreshStage(); }
  catch (err) { console.error(err); toast(T('No se ha podido leer {0}', sel.value), 5000); }
  renderUgcList();
});
/* the EmuVR folder (or its EmuVR_Data): only sharedassets0.assets and its .resS are read */
$('#emuvrDir').addEventListener('change', async e => {
  const files = e.target.files; if (!files || !files.length) return;
  toast(T('Leyendo las consolas de EmuVR…'), 30000); await new Promise(r => setTimeout(r, 60));
  try {
    const list = await UGCS.readBase(files, (i, n) => toast(T('Leyendo las consolas de EmuVR… {0}/{1}', i, n), 30000));
    toast(T('{0} consolas de EmuVR listas: elígelas en cada sistema.', list.length), 4000); refreshStage();
  } catch (err) { console.error(err); toast(T(err && err.message ? err.message : 'No se han podido leer los datos de EmuVR'), 6000); }
  renderUgcList();
});
$('#ugcFile').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0], key = ugcPending; ugcPending = null; if (!file || !key) return;
  toast(T('Leyendo {0}…', file.name), 8000); await new Promise(r => setTimeout(r, 60));
  try { await UGCS.put(key, file); toast(T('{0} listo', UGCS.meta()[key].name), 2600); refreshStage(); }
  catch (err) { console.error(err); toast(T(err && err.message ? err.message : 'No se ha podido leer el .ugc', err && err.arg), 5000); }
  renderUgcList();
});
function renderSettings() {
  const hasMusic = GAMES.some(g => g.music); if (prefs.setTab === 'music' && !hasMusic) prefs.setTab = 'general';
  $('#tabMusic').hidden = !hasMusic;
  setPop.querySelectorAll('[data-tab-btn]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tabBtn === prefs.setTab)));
  setPop.querySelectorAll('[data-tab]').forEach(r => { r.hidden = r.dataset.tab !== prefs.setTab; });
  const mv = $('#mvolRange'); if (mv) { mv.value = prefs.mvol; $('#mvolVal').textContent = prefs.mvol + ' %'; }
  renderUgcList(); renderDecoList(); const vr = $('#volRange'); if (vr) { vr.value = prefs.vol; $('#volVal').textContent = prefs.vol + ' %'; } setPop.querySelectorAll('[data-pref]').forEach(seg => seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(prefs[seg.dataset.pref] === b.dataset.v)))); renderRoomPick(); }
function renderRoomPick() {
  const el = $('#roomPick'); if (!el) return;
  el.innerHTML = ROOM_ORDER.map(k => { const R = ROOMS[k]; return `<button type="button" class="room" data-room="${k}" aria-pressed="${prefs.room === k}"><i style="background:linear-gradient(90deg,${R.sw[0]} 0 45%,${R.sw[1]} 45% 72%,${R.sw[2]} 72%)"></i><span>${T(R.name)}</span></button>`; }).join('');
}
let roomBusy = false;
async function switchRoom(name) {
  if (!ROOMS[name] || roomBusy || RP === ROOMS[name]) return;
  roomBusy = true; prefs.room = name; savePrefs(); renderRoomPick(); sfx.tick();
  const f = $('#fade'); f.classList.add('on'); await new Promise(r => setTimeout(r, RM ? 30 : 240));
  try { applyRoom(name); } catch (e) { console.error(e); }
  requestAnimationFrame(() => requestAnimationFrame(() => { f.classList.remove('on'); roomBusy = false; }));
  toast(T('Ambiente: {0}', T(ROOMS[name].name)), 1800);
}
$('#roomPick').addEventListener('click', e => { const b = e.target.closest('[data-room]'); if (b) switchRoom(b.dataset.room); });
setBtn.addEventListener('click', () => { setPop.hidden = !setPop.hidden; setBtn.setAttribute('aria-expanded', String(!setPop.hidden)); renderSettings(); });
setPop.addEventListener('input', e => {
  if (e.target.id === 'mvolRange') { MPLAY.setVol(+e.target.value); $('#mvolVal').textContent = prefs.mvol + ' %'; }
  if (e.target.id === 'volRange') { prefs.vol = +e.target.value; sfx.setVolume(prefs.vol / 100); $('#volVal').textContent = prefs.vol + ' %'; savePrefs(); if (trailer.video) trailer.video.volume = trailerVolume(); }
});
setPop.addEventListener('change', e => { if (e.target.id === 'volRange') sfx.tick(); });
setPop.addEventListener('click', e => {
  const tb = e.target.closest('[data-tab-btn]'); if (tb) { prefs.setTab = tb.dataset.tabBtn; savePrefs(); renderSettings(); sfx.tick(); return; }
  const all = e.target.closest('[data-all]'); if (all) { setMusicBulk(['album', 'playlist', 'song'], all.dataset.all); sfx.tick(); return; }
  const b = e.target.closest('button[data-v]'); if (!b) return; const k = b.closest('[data-pref]').dataset.pref; if (prefs[k] === b.dataset.v) return; prefs[k] = b.dataset.v; savePrefs(); renderSettings();
  if (k === 'light') applyLight(prefs.light);
  if (k === 'sound') { sfx.on = prefs.sound !== 'off'; if (sfx.on) sfx.tick(); if (trailer.video) trailer.video.volume = trailerVolume(); }
  if (k === 'trailer') { if (active && (mode === 'inspect' || mode === 'open')) { stopTrailer(); startTrailer(active); } }
  if (k === 'layout') setLayout(prefs.layout);
  if (k === 'seal') renderPrompts();
  if (k === 'fmtCon') { GAMES.forEach(resolveFmt); if (active) renderInfo(true); relayout({ full: true }); }
  if (k === 'sort') relayout({ full: true });
  if (k === 'mfAlb' || k === 'mfPl' || k === 'mfSong') setMusicBulk([{ mfAlb: 'album', mfPl: 'playlist', mfSong: 'song' }[k]], prefs[k]);
  if (k === 'mixFmt') renderBag();
  if (k === 'group') { prefs.shelf = '__all'; savePrefs(); relayout({ full: true, reset: true }); }
  if (k === 'wheel' && prefs.wheel !== 'zoom') lens.manual = 1;
  /* the cases are built once with their corners: the shelf reloads to build them again */
  if (k === 'corners') { toast(T('Cambiando las esquinas…')); setTimeout(() => location.reload(), 350); }
});
document.addEventListener('pointerdown', e => {
  if (!setPop.hidden && !e.target.closest('#settings') && !e.target.closest('#setBtn')) { setPop.hidden = true; setBtn.setAttribute('aria-expanded', 'false'); }
});

/* ---------- the filter: every game, only the installed ones, or one of Playnite's saved filters ---------- */
function filterChoices() { return [['all', T('Todos los juegos')], ['installed', T('Solo los instalados')], ...PRESETS.map(p => ['p:' + p.id, p.name])]; }
function filterName(f) { const c = filterChoices().find(c => c[0] === f); return c ? c[1] : T('Todos los juegos'); }
function renderFilter() {
  const b = $('#filterBtn'), pop = $('#filterPop'); if (!b) return;
  const f = filterOf();
  /* always there, in the video and music rooms too, so a filter can always be undone */
  b.disabled = mode !== 'shelf' && mode !== 'loading';
  b.classList.toggle('on', f !== 'all'); b.querySelector('span').textContent = f === 'all' ? T('Filtro') : filterName(f); b.title = T('Filtro') + ' (F)';
  if (!pop.hidden) renderFilterPop();
}
/* how many games a filter leaves (films and records do not count) */
function filterCount(v) { let n = 0; for (const g of GAMES) if (!g.video && !g.music && passes(g, v)) n++; return n; }
function renderFilterPop() {
  const f = filterOf(), ch = filterChoices();
  /* each choice says how many games it leaves; one that leaves none cannot be picked */
  const item = ([v, name]) => { const n = filterCount(v); return `<button type="button" role="menuitemradio" aria-checked="${v === f}" data-filter="${esc(v)}"${n ? '' : ' disabled'}><b>${esc(name)}</b><span>${n}</span></button>`; };
  $('#filterPop').innerHTML = ch.slice(0, 2).map(item).join('') + (PRESETS.length ? `<div class="pop-title">${T('Filtros de Playnite')}</div>` + ch.slice(2).map(item).join('') : PLAYNITE ? `<p class="filter-note">${T('Los filtros que guardes en Playnite aparecerán aquí.')}</p>` : '');
}
function closeFilterPop() { $('#filterPop').hidden = true; $('#filterBtn').setAttribute('aria-expanded', 'false'); }
$('#filterBtn').addEventListener('click', () => {
  const pop = $('#filterPop'), b = $('#filterBtn'); if (mode !== 'shelf') return;
  if (!pop.hidden) { closeFilterPop(); return; }
  renderFilterPop(); pop.hidden = false; b.setAttribute('aria-expanded', 'true'); sfx.tick();
  const r = b.getBoundingClientRect(); pop.style.top = (r.bottom + 6) + 'px'; pop.style.left = clamp(r.left, 16, innerWidth - pop.offsetWidth - 16) + 'px';
  const on = pop.querySelector('[aria-checked="true"]'); if (on) on.focus({ preventScroll: true });
});
$('#filterPop').addEventListener('click', e => { const b = e.target.closest('[data-filter]'); if (!b || b.disabled) return; closeFilterPop(); setFilter(b.dataset.filter); });
$('#filterPop').addEventListener('keydown', e => {
  if (e.key === 'Escape') { e.stopPropagation(); closeFilterPop(); $('#filterBtn').focus(); return; }
  if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
  const items = [...$('#filterPop').querySelectorAll('[data-filter]:not(:disabled)')], i = items.indexOf(document.activeElement);
  if (items.length) items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus(); e.preventDefault(); e.stopPropagation();
});
document.addEventListener('pointerdown', e => { if (!$('#filterPop').hidden && !e.target.closest('#filterPop') && !e.target.closest('#filterBtn')) closeFilterPop(); });
async function setFilter(v) {
  if (mode !== 'shelf' || busy || swapBusy || v === filterOf()) return;
  /* a filter that would leave no games at all is not applied, so the game rooms never vanish */
  const n = filterCount(v);
  if (!n) { toast(T('Ningún juego cumple «{0}»', filterName(v)), 2200); return; }
  prefs.filter = v; prefs.shelf = '__all'; savePrefs(); renderFilter(); setHovered(null); focus = null; sfx.tick();
  toast(filterName(v) + ' · ' + T(n === 1 ? '{0} juego' : '{0} juegos', n), 1800);
  /* the room you are in may have nothing left: walk to the first one that has */
  if (isRooms() && curSysKey() !== STAGE.sys) { await setSystem(0, curSysKey()); return; }
  await relayout({ full: true, reset: true }); renderSysbar(); renderBrand();
}
/* F on the keyboard, Y on the pad: the next filter that leaves some games */
function cycleFilter() {
  const ch = filterChoices().filter(c => c[0] === filterOf() || filterCount(c[0]) > 0), i = ch.findIndex(c => c[0] === filterOf());
  if (ch.length > 1) setFilter(ch[(i + 1) % ch.length][0]); return true;
}
/* after the library changes: a filter that has been left with no games at all goes back to every game */
function checkFilter() {
  const f = filterOf(); if (f === 'all' || filterCount(f) > 0) return false;
  const name = filterName(f); prefs.filter = 'all'; savePrefs(); renderFilter(); toast(T('«{0}» se ha quedado sin juegos: se quita el filtro', name), 2600); return true;
}
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
    active = c; setHovered(null); tipEl.hidden = true; c.hoverT = 0; infoEdit = false; prefs.card = prefs.cardStart;
    if (cam.view === 'browse') setView('shelf');
    setMode('busy');
    /* a series learns its seasons first: if the season comes in another case, that case leaves the shelf instead */
    if (c.g.kind === 'series') { const old = c.g.fmt; await videoSeasons(c.g); await videoEpisodes(c.g, seasonOf(c.g)); resolveVideoFmt(c.g); if (c.g.fmt !== old) { const n = replaceCase(c); c = n; active = n; } }
    if (c.g.real) await LIB.prepare(c.g, 1500);
    if (c.g.video) setVideoMedium(c.dim.media);
    c.ensureDetail(); c.setShadow(true); if (TV_IDLE.includes(tv.state)) tvSet('channel', c);
    /* the case slides out for as long as the recorded scrape lasts and comes free on its loudest moment */
    const h = clamp(sfx.slide(c.g.fmt), .18, .7);
    if (c.g.dust > .15) emit(spineWorld(c, _sp), Math.round(30 + c.g.dust * 70), 1.4, 1.5);
    c.leaving = true; c.fast = true; c.placeExtras();
    await tweenReal(h, t => { c.pullHold = t; }, easeIO);
    c.mode = 'pulled'; c.pullHold = 0; c.fast = false; await wait(110);
    c.mode = 'inspect'; c.flipT = 0; await wait(380);
    setMode('inspect'); startTrailer(c);
    const idle = c.g.last === null || c.g.last === undefined ? c.g.added : c.g.last;
    if (c.g.wrapped) toast(T(prefs.seal === 'auto' ? 'Precintado. Al abrirlo se quitará el precinto solo.' : 'Precintado. Tira de la lengüeta roja o déjalo como está.'), 3400);
    else if (c.g.dust > .3 && idle != null) toast(T('Lleva {0} sin tocarse. Frota la caja para quitarle el polvo.', spanText(idle)), 3600);
  });
}
function flipCase() { if (!active || busy || mode !== 'inspect') return; active.flipT = active.flipT ? 0 : Math.PI; sfx.handle(active.g.fmt); renderPrompts(); }
/* the lid starts to swing when the latch lets go in the recording */
/* in the studio the case turns once round as the lid opens (the hinge sound lands as the lid lets go); in the room it just opens */
/* only a case held in your hands that opens like a book spins: not a box of tapes, a season's tray or a record */
const spinStage = c => !RM && prefs.hold !== 'room' && !!c && c.mode === 'inspect' && !c.multi && c.g.fmt !== 'vhsbox' && !c.g.music && ['keep', 'clear', 'card'].includes(c.dim.shell);
async function swingOpen(c) {
  if (!spinStage(c)) { const h = sfx.caseOpen(c.g.fmt); await waitReal(h - .01); await tween(.75, t => { c.openA = t; }, easeIO); return; }
  sfx.play('caseOpen', c.g.fmt, { hitAt: .97 * SPEED }); await playMotion(c, OPEN_K, OPEN_T); c.openA = 1;
}
function openCase() {
  if (!active || mode !== 'inspect') return;
  if (active.wrap) { if (prefs.seal === 'manual') { toast(T('Primero quita el precinto tirando de la lengüeta roja')); return; } return unwrapAction(); }
  return guarded(async () => {
    const c = active; setMode('busy');
    if (c.flipT) { c.flipT = 0; await wait(450); }
    await swingOpen(c);
    if (c.multi) multiOpened(c);
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
  c.removeWrapNow(); saveGame(c.g); buildShelfPicks(); toast(T('Precinto retirado')); renderPrompts();
}
function closeCase(internal) {
  /* the lid speeds up and lands exactly on the recorded snap */
  const run = async () => {
    const c = active; if (!internal) setMode('busy');
    if (c.multi) { multiClosing(c); await wait(c.multi.kind === 'tape' ? 380 : 260); }
    /* in the studio the lid lands with a small bounce (the recorded snap lands with it) */
    if (!internal && spinStage(c)) { sfx.play('caseClose', c.g.fmt, { hitAt: 1.7 * SPEED }); await playMotion(c, CLOSE_K, CLOSE_T); }
    else { const h = clamp(sfx.caseClose(c.g.fmt), .3, .9); await tweenReal(h, t => { c.openA = 1 - t; }, t => t * t); }
    c.openA = 0; if (!internal) setMode('inspect');
  };
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
    await slideHome(c); if (tv.state === 'channel' || tv.state === 'trailer') tvSet('standby'); setMode('shelf');
  }).then(() => { if (pendingRelayout) { pendingRelayout = false; relayout({ follow: back }); } });
}
/* the case goes in front of its place and slides in */
async function slideHome(c) {
  c.flipT = 0; c.mode = 'pulled'; await wait(560);
  const h = clamp(sfx.slideIn(c.g.fmt), .2, .7);
  c.mode = 'home'; c.pullHold = 1; c.leaving = true; c.fast = true;
  await tweenReal(h, t => { c.pullHold = 1 - t; }, t => t * t);
  c.pullHold = 0; await wait(90); c.fast = false; c.leaving = false; c.setShadow(false); c.placeExtras();
  stopTrailer(); c.releaseDetail(); active = null;
}
/* once the medium is in the machine the case closes and is laid down beside it */
async function layDown(c) {
  c.mode = 'rest'; await waitReal(.15);
  const h = clamp(sfx.caseClose(c.g.fmt), .3, .9); await tweenReal(h, t => { c.openA = 1 - t; }, t => t * t); c.openA = 0;
}
const _p0 = new V3(), _p1 = new V3(), _p2 = new V3(), _q0 = new Q4(), _q2 = new Q4(), _qz = new Q4(), _qt = new Q4(), ZAX = new V3(0, 0, 1);
const QFLAT = new Q4().setFromEuler(new EU(-Math.PI / 2, 0, 0));
/* the medium leaves the case upwards, in front of it, so it never passes through the plastic */
function discAbove(c, out) { return out.set(c.discHome.x, c.dim.h / 2 + mediaHalfH(c) + 1.4, c.discHome.z + 3.2); }
const QUP = new Q4();
/* each medium's way into whatever machine is in the room: where it is offered (entry), where it rests
   inside, where it pops out to and how it is turned. The machine says what kind of opening it is. */
function portOf(c) { const P = DEV.cur.port(c.dim.media, c); P.m = c.dim.media; return P; }
/* the flaps of a cartridge slot fold down as the cartridge's foot passes the mouth */
function flapsFor(d, P) { setCartFlaps(clamp(((P.top ?? 0) + .4 - (d.position.y - MSIZE.cart.h / 2)) / 1.4, 0, 1)); }
function trayTo(open, sec = .74) { const h = pcTray.userData.home, z0 = pcTray.position.z, z1 = h.z + (open ? pcTray.userData.out : 0); sfx.tray(); return tweenReal(sec, t => { pcTray.position.z = lerp(z0, z1, t); }, easeIO); }
/* before the medium flies over: open what has to be open */
function prepareIn(P) { if (P.kind === 'tray') trayTo(true); if (P.kind === 'socket' && P.prepare) P.prepare(); }
async function pushIn(d, P) {
  if (P.kind === 'floppy') {
    sfx.floppyIn();
    await tweenReal(.24, t => { d.position.z = lerp(P.entry.z, P.inside.z, t); }, t => t * t);
    d.visible = false; blinkFloppy(2.4); await waitReal(.25); return;
  }
  if (P.kind === 'cart') {
    sfx.cartIn();
    await tweenReal(.32, t => { d.position.y = lerp(P.entry.y, P.inside.y, t); flapsFor(d, P); }, t => t * t);
    d.position.copy(P.inside); setCartFlaps(1); await waitReal(.38); return;
  }
  if (P.kind === 'tray') {
    await tweenReal(.32, t => { d.position.lerpVectors(P.entry, P.inside, t); }, t => t * t); sfx.thud();
    await waitReal(.25); pcTray.attach(d); await trayTo(false); d.visible = false; await waitReal(.2); return;
  }
  if (P.kind === 'socket') {
    await tweenReal(.42, t => { d.position.lerpVectors(P.entry, P.inside, t); }, easeOut);
    if (P.m === 'cart') sfx.cartIn(); else sfx.discIn();
    if (P.seat) await P.seat(d);
    await waitReal(.2); return;
  }
  sfx.slotIn();
  const z0 = d.position.z, z1 = z0 - 3.4, z2 = P.inside.z;
  await tweenReal(.28, t => { d.position.z = lerp(z0, z1, t); }, easeOut);
  await tweenReal(.52, t => { d.position.z = lerp(z1, z2, t); }, easeIO);
  d.visible = false; await waitReal(.05);
}
async function popOut(d, P) {
  if (P.kind === 'floppy') {
    await waitReal(.25); sfx.floppyOut(); await waitReal(.07);
    d.position.copy(P.inside); d.visible = true;
    await tweenReal(.16, t => { d.position.z = lerp(P.inside.z, P.out.z, t); }, easeOut); return;
  }
  if (P.kind === 'cart') {
    await waitReal(.2); sfx.cartOut(); await waitReal(.2);
    await tweenReal(.42, t => { d.position.y = lerp(P.inside.y, P.out.y, t); flapsFor(d, P); }, easeIO); return;
  }
  if (P.kind === 'tray') {
    await waitReal(.2); d.visible = true; await trayTo(true); scene.attach(d); return;
  }
  if (P.kind === 'socket') {
    await waitReal(.15); if (P.unseat) await P.unseat(d);
    if (P.m === 'cart') sfx.cartOut();
    const from = d.position.clone(); await tweenReal(.35, t => { d.position.lerpVectors(from, P.out, t); }, easeOut); return;
  }
  await waitReal(.15); sfx.slotOut(); await waitReal(1.02);
  d.visible = true; const zIn = d.position.z;
  await tweenReal(.5, t => { d.position.z = lerp(zIn, P.out.z, t); }, easeIO);
}
/* once the medium has left the machine: close what was opened for it */
function afterOut(P) { if (P.kind === 'tray') setTimeout(() => trayTo(false), 350); if (P.kind === 'socket' && P.after) setTimeout(() => P.after(), 500); }
function insertDisc() {
  if (!active || mode !== 'open') return;
  if (active.g.video && !VPLAY.item) { const m = active.multi; return chooseVideo(active, m ? m.slots[m.focus || 0] : null); }
  return guarded(async () => {
    const c = active, d = c.disc, home = c.discHome, above = discAbove(c, new V3()), P = portOf(c);
    if (c.g.music) musicMakeRoom(c); else if (MPLAY.state === 'playing') MPLAY.pause();
    setMode('busy'); hoverPart = null; c.discLabelMat.emissive.set('#000000'); stopTrailer();
    await waitReal(sfx.mediaOut(c.g.fmt) - .005);
    /* it comes loose with a slight tilt, whatever way it was lying */
    const qHome = d.quaternion.clone(), qTilt = new Q4();
    await tween(.28, t => { d.position.z = home.z + 1.4 * t; d.quaternion.copy(qTilt.setFromAxisAngle(X_AXIS, -.06 * t)).multiply(qHome); });
    await tween(.6, t => { d.position.y = lerp(home.y, above.y, t); d.position.z = lerp(home.z + 1.4, above.z, t); });
    c.mode = 'parked'; setView('console'); prepareIn(P); await wait(750);
    scene.attach(d); _p0.copy(d.position); _q0.copy(d.quaternion); const s0 = d.scale.x;
    layDown(c);
    _p2.copy(P.entry); _p1.copy(_p0).lerp(_p2, .45); _p1.y = Math.max(_p0.y, _p2.y) + 18;
    await tween(1.1, t => { bez(_p0, _p1, _p2, t, d.position); d.scale.setScalar(lerp(s0, P.s || 1, t)); _qt.copy(_q0).slerp(P.q, easeIO(Math.min(1, t * 1.2))); _qz.setFromAxisAngle(ZAX, t * Math.PI * 2); d.quaternion.copy(_qt).multiply(_qz); });
    d.scale.setScalar(P.s || 1); d.quaternion.copy(P.q); d.position.copy(_p2);
    await pushIn(d, P);
    if (c.g.music) { await musicInserted(c); return; }
    setLed(true); await waitReal(.17);
    sfx.tvOn(); tvSet('boot', c);
    if (c.g.video) {
      startVideo(c); await wait(1200); tvSet('play', c);
      playStart = performance.now(); $('#playTitle').textContent = c.g.t + (VPLAY.item && !VPLAY.item.film ? ' · ' + epCode(VPLAY.item) : ''); renderPlayBanner();
      setMode('playing');
      if (PN_STATE.pendingEject) { const o = PN_STATE.pendingEject; PN_STATE.pendingEject = null; setTimeout(() => closeGame(o), 700); }
      return;
    }
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
/* the shelf was (re)opened while a game is running: its disc is already in the console */
async function restorePlaying(id, seconds) {
  const g = GAMES.find(q => q.id === id); if (!g || active) return;
  /* rooms by system: the game is played in its own system's room */
  const moved = isRooms() && sysOf(g) !== curSysKey(); if (moved) { prefs.sys = sysOf(g); prefs.shelf = '__all'; buildGroups(); curGroup = 0; curPage = 0; }
  const gi = groups.findIndex(gr => gr.games.includes(g)), p = gi >= 0 ? pageOf(g, gi) : -1;
  if (moved || (gi >= 0 && (gi !== curGroup || p !== curPage))) { if (gi >= 0) { curGroup = gi; curPage = Math.max(0, p); } layoutPage(); renderPills(); renderBrand(); }
  const c = navOrder.find(q => q.g === g) || getCase(g); if (!c) return;
  if (g.real) await LIB.prepare(g, 1200);
  active = c; c.ensureDetail(); c.setShadow(true); c.openA = 0; c.mode = 'rest'; c.leaving = true; c.placeExtras();
  { const tp = c.targetPose(); c.root.position.copy(tp.pos); c.root.quaternion.copy(tp.quat); c.root.scale.setScalar(1); }
  const d = c.disc, P = portOf(c); scene.attach(d); d.position.copy(P.inside); d.quaternion.copy(P.q); d.scale.setScalar(P.s || 1); d.visible = P.kind === 'cart' || P.kind === 'socket'; if (P.kind === 'cart') setCartFlaps(1);
  if (P.kind === 'tray') { d.position.z -= pcTray.userData.out; pcTray.attach(d); }
  if (P.kind === 'socket' && P.restore) P.restore(d);
  setLed(true); tvSet('play', c); playStart = performance.now() - (seconds || 0) * 1000;
  PN_STATE.running = id; PN_STATE.waiting = false; $('#playTitle').textContent = g.t; renderPlayBanner();
  setView('console'); setMode('playing');
}
function renderPlayBanner() {
  const g = active ? active.g : { fmt: 'dvd' };
  if (g.video) { $('#playNote').textContent = mediaT(g, PLAYNITE && g.real ? (PN_STATE.waiting ? 'Abriendo el reproductor…' : 'Al cerrar el reproductor, el disco vuelve a su caja.') : 'En esta demo, la película dura unos segundos.'); $('#playEyebrow').textContent = T(PN_STATE.waiting && g.real ? 'Arrancando' : 'Viendo'); return; }
  $('#playNote').textContent = mediaT(g, PLAYNITE ? (PN_STATE.waiting ? 'Playnite está abriendo el juego. Si no arranca, saca el disco con Esc.' : PN_STATE.selfTrack ? 'Playnite lo ha dado por cerrado, pero sigue abierto: la estantería cuenta el tiempo y el disco sale cuando lo cierres.' : 'Playnite cuenta el tiempo. Al cerrar el juego, el disco vuelve solo a su caja.') : 'En esta demo cada segundo cuenta como un minuto de partida.');
  $('#playEyebrow').textContent = T(PLAYNITE && PN_STATE.waiting ? 'Arrancando' : 'En marcha');
}
/* ejects the disc and puts it back in its case. Inside Playnite it runs when the game closes (o.auto),
   or when you pull the disc yourself while the game keeps running */
function closeGame(o = {}) {
  if (!active || mode !== 'playing') return;
  const back = active;
  return guarded(async () => {
    const c = active, d = c.disc, g = c.g, home = c.discHome, P = portOf(c), rest = c.mode === 'rest';
    /* into a case lying open on the table the medium drops from straight above */
    const above = rest ? new V3(home.x, home.y, home.z + 7) : discAbove(c, new V3()), qIn = c.discQuat || new Q4();
    const mins = Math.max(1, Math.floor((performance.now() - playStart) / 1000));
    /* pulled out by hand while only the shelf was keeping track: stop counting from here */
    if (g.video && !o.auto) stopVideo();
    const released = !g.video && PLAYNITE && o.keepRunning && PN_STATE.selfTrack;
    if (released) { LIB.send('release', { id: g.id }); o = Object.assign({}, o, { keepRunning: false, msg: mediaT(g, 'Disco fuera. El tiempo hasta ahora se suma a {0} en Playnite.', g.t) }); }
    PN_STATE.waiting = false; PN_STATE.selfTrack = false; if (!o.keepRunning) PN_STATE.running = null;
    setMode('busy'); tvSet('standby'); setLed(false); sfx.tvOff();
    /* the case beside the machine opens while the medium comes out */
    const opened = rest ? (async () => { await waitReal(.3); await swingOpen(c); })() : null;
    await popOut(d, P);
    afterOut(P); await wait(320); if (opened) await opened;
    _p0.copy(d.position); _q0.copy(d.quaternion);
    const tmp = new THREE.Object3D(); c.inner.add(tmp); tmp.position.copy(above); tmp.updateMatrixWorld(true);
    tmp.quaternion.copy(qIn); tmp.updateMatrixWorld(true); tmp.getWorldPosition(_p2); tmp.getWorldQuaternion(_q2); c.inner.remove(tmp);
    _p1.copy(_p0).lerp(_p2, .55); _p1.y = Math.max(_p0.y, _p2.y) + 22; const sT = c.root.scale.x, s0 = d.scale.x;
    await tween(1.1, t => { bez(_p0, _p1, _p2, t, d.position); d.scale.setScalar(lerp(s0, sT, t)); _qt.copy(_q0).slerp(_q2, easeIO(Math.min(1, t * 1.2))); _qz.setFromAxisAngle(ZAX, (1 - t) * Math.PI * 2); d.quaternion.copy(_qt).multiply(_qz); if (P.kind === 'cart') flapsFor(d, P); });
    if (P.kind === 'cart') setCartFlaps(0);
    c.inner.attach(d); d.position.copy(above); d.quaternion.copy(qIn); d.scale.set(1, 1, 1);
    sfx.mediaIn(g.fmt, { hitAt: (.55 + .22) * SPEED });
    await tween(.55, t => { d.position.y = lerp(above.y, home.y, t); d.position.z = lerp(above.z, home.z + 1.4, t); });
    await tween(.22, t => { d.position.z = home.z + 1.4 * (1 - t); }); d.position.copy(home);
    if (c.multi) await putBackInSet(c);
    let msg, moved = false;
    if (g.video) msg = videoDone(c.box || c, o);
    else if (PLAYNITE) {
      const s = o.seconds || 0;
      msg = o.msg || (o.keepRunning ? T('El juego sigue abierto: Playnite seguirá contando el tiempo.') : s >= 60 ? T('+{0} min en {1}. Playnite ya lo ha apuntado.', Math.round(s / 60), g.t) : s > 0 ? T('Partida corta en {0}.', g.t) : mediaT(g, 'Disco fuera.'));
      if (s > 0 || o.auto) { g.dust = 0; c.setDust(0); saveGame(g); }
    } else {
      g.hours += mins / 60; g.sessions += 1; g.last = 0;
      if (prefs.autoStatus === 'on' && !['playing', 'beaten', 'completed'].includes(kindOf(g))) { const s = STATUSES.find(n => STATUS_KIND[n] === 'playing'); if (s) { g.status = s; moved = true; } }
      c.setDust(0); g.dust0 = 0; saveGame(g);
      msg = moved ? T('+{0} min. Ahora está en «{1}».', mins, g.status) : T('+{0} min en {1}. Tus horas ya están en la caja.', mins, g.t);
    }
    /* an episode's tape case goes back into its box, and the box to the shelf */
    const owner = c.box || c;
    owner.dirty = true; owner.refreshSpine(); if (moved) pendingRelayout = true;
    toast(msg);
    /* a season with more episodes comes back to your hands, open at the next one; anything else closes
       and goes back to its place */
    const more = !!(owner.multi && owner.multi.eps.length > 1);
    await waitReal(.25);
    if (c.box || !more) { const h = clamp(sfx.caseClose(g.fmt), .3, .9); await tweenReal(h, t => { c.openA = 1 - t; }, t => t * t); c.openA = 0; }
    if (c.box) { await caseBackInBox(c); if (!more) await closeCase(true); } else setView('shelf');
    if (more) { if (!c.box) c.mode = 'inspect'; await wait(450); backToEpisodes(owner); setMode('open'); return; }
    await waitReal(.2);
    await slideHome(owner); focus = owner; setMode('shelf');
  }).then(() => { if (pendingRelayout) { pendingRelayout = false; relayout({ follow: back }); } });
}

/* ---------- re-arranging the shelf after a change ---------- */
async function relayout(opts = {}) {
  if (mode !== 'shelf' || busy) { pendingRelayout = true; return; }
  /* the room you are in has been left empty (by the filter): walk to the first one that has games */
  if (isRooms() && STAGE.sys && curSysKey() !== STAGE.sys && !swapBusy) return setSystem(0, curSysKey());
  if (layoutChanged) { layoutChanged = false; opts = Object.assign({}, opts, { full: true, layout: true }); }
  const keyNow = groups[curGroup] ? groups[curGroup].key : '__all';
  buildGroups();
  let gi = groups.findIndex(g => g.key === (opts.reset ? '__all' : keyNow)); if (gi < 0) gi = 0;
  let pi = opts.full ? 0 : clamp(curPage, 0, groups[gi].pages.length - 1);
  if (opts.follow && !opts.full) { const p = pageOf(opts.follow.g, gi); if (p >= 0) pi = p; }
  if (isCases()) {
    if (opts.follow) { const u = groups.findIndex(gr => gr.games.includes(opts.follow.g)); if (u >= 0) gi = u; }
    if (gi >= groups.length) gi = 0;
    await swapShelf(() => { curGroup = gi; curPage = 0; setView('shelf'); }, false, opts.layout); return;
  }
  if (opts.full || gi !== curGroup) { await swapShelf(() => { curGroup = gi; curPage = pi; if (opts.layout) setView('shelf'); }, false, opts.layout); return; }
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
  /* the mouse counts as resting until it moves again */
  if (!navOrder.length) return; kbNav = true; pointer.live = false;
  if (inCabinet()) {
    /* the TV cabinet: two rows; left and right run along a row and turn the page at the ends, up and down change row */
    const look = c => { focus = c; setHovered(c); cam.browseX = c.home.x; cam.browseRow = c.row; setView('browse'); };
    if (!focus || !navOrder.includes(focus)) { look(hovered && navOrder.includes(hovered) ? hovered : navOrder[0]); return; }
    const np = groups[curGroup].pages.length;
    if (dir === 'left' || dir === 'right') {
      const j = navOrder.indexOf(focus) + (dir === 'right' ? 1 : -1);
      if (j >= navOrder.length && np > 1) { setPage((curPage + 1) % np, true).then(() => look(navOrder[0])); return; }
      if (j < 0 && np > 1) { setPage((curPage - 1 + np) % np, true).then(() => look(navOrder[navOrder.length - 1])); return; }
      look(navOrder[clamp(j, 0, navOrder.length - 1)]); return;
    }
    const cand = navOrder.filter(c => c.row === focus.row + (dir === 'down' ? 1 : -1));
    if (cand.length) look(cand.reduce((b, c) => Math.abs(c.home.x - focus.home.x) < Math.abs(b.home.x - focus.home.x) ? c : b));
    return;
  }
  if (isCases()) {
    if (!focus || !navOrder.includes(focus)) focus = hovered && navOrder.includes(hovered) ? hovered : navOrder[0];
    else if (dir === 'left' || dir === 'right') {
      const j = navOrder.indexOf(focus) + (dir === 'right' ? 1 : -1);
      if ((j < 0 || j >= navOrder.length) && groups.length > 1) { const last = j < 0; setGroup(curGroup + (last ? -1 : 1), true); focus = last ? navOrder[navOrder.length - 1] : navOrder[0]; }
      else focus = navOrder[clamp(j, 0, navOrder.length - 1)];
    } else { const r = focus.row + (dir === 'down' ? 1 : -1), cand = navOrder.filter(c => c.row === r); if (cand.length) focus = cand.reduce((b, c) => Math.abs(c.home.x - focus.home.x) < Math.abs(b.home.x - focus.home.x) ? c : b); }
    if (focus) setHovered(focus);
    return;
  }
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
