/* =====================================================================
   DECORATION: EmuVR models (a .ugc, or one of EmuVR's own consoles) set
   about a system's room: figures, a console's box, another console on
   show. Each room keeps its own (prefs.decor[system]: what, where, how
   turned and how big); the files stay in this browser, with the other
   .ugc (UGCS in 15-stage.js). Placed by hand: Settings → EmuVR →
   Decoration → Place, then drag them onto any flat surface of the room.
   ===================================================================== */
const DECO = { on: false, room: '', sel: null, drag: null, group: new THREE.Group(), objs: new Map(), building: new Map(), surf: [], box: null, saveT: 0 };
scene.add(DECO.group);
const decoRay = new THREE.Raycaster(), _deN = new THREE.Vector2(), _deV = new V3(), _deD = new V3(0, -1, 0);
function decoList(sys) { const d = prefs.decor || (prefs.decor = {}); return d[sys] || (d[sys] = []); }
/* the room you are standing in, when the design has rooms */
function decoRoom() { return isRooms() && STAGE.sys && stageFor(STAGE.sys) !== 'table' ? STAGE.sys : ''; }
function decoItem(id) { return decoRoom() ? decoList(decoRoom()).find(i => i.id === id) || null : null; }
function decoSave() { clearTimeout(DECO.saveT); DECO.saveT = setTimeout(savePrefs, 300); }

/* ---------- building and showing ---------- */
function decoAdopt(it, root) {
  root.traverse(o => { if (o.isMesh) o.userData.deco = it.id; });
  root.visible = false; DECO.group.add(root); DECO.objs.set(it.id, root); return root;
}
function decoObj(it) {
  if (DECO.objs.has(it.id)) return Promise.resolve(DECO.objs.get(it.id));
  if (!DECO.building.has(it.id)) DECO.building.set(it.id, (async () => {
    let v = await UGCS.tx('readonly', st => st.get(it.src));
    if (v && v.ref) v = await UGCS.tx('readonly', st => st.get(v.ref));
    if (!v) throw new Error('missing ' + it.src);
    return decoAdopt(it, UGC.build(v.parsed || UGC.parse(v, { maxTex: 1024 })));
  })().catch(e => { console.error(e); toast(T('No se ha podido leer {0}', it.name)); return null; }).finally(() => DECO.building.delete(it.id)));
  return DECO.building.get(it.id);
}
function decoPlace(it, o) { o.position.set(it.p[0], it.p[1], it.p[2]); o.rotation.set(0, it.r || 0, 0); o.scale.setScalar(it.s || 1); }
/* called by applyStage: this room's things appear, the others' are put away */
function decoShow(sys) {
  if (DECO.on && DECO.room !== sys) decoEnd();
  const mine = isRooms() && sys && stageFor(sys) !== 'table' ? decoList(sys) : [], ids = new Set(mine.map(i => i.id));
  DECO.objs.forEach((o, id) => { o.visible = ids.has(id); });
  mine.forEach(it => decoObj(it).then(o => { if (!o) return; decoPlace(it, o); o.visible = decoRoom() === sys && decoList(sys).includes(it); }));
}
function decoDrop(id) { const o = DECO.objs.get(id); if (o) { DECO.group.remove(o); UGC.dispose(o); DECO.objs.delete(id); } }

/* ---------- surfaces: anything flat enough in the room, other decoration included ---------- */
function decoSurfaces() {
  const out = [], caseRoots = new Set([...cases, ...looseCases].map(c => c.root));
  const walk = o => {
    if (!o.visible || caseRoots.has(o) || o === DECO.group) return;
    if (o.isMesh && !o.userData.case) { const m = Array.isArray(o.material) ? o.material[0] : o.material; if (m && !(m.transparent && !m.depthWrite)) out.push(o); }
    o.children.forEach(walk);
  };
  scene.children.forEach(walk);
  return out;
}
function decoMeshes(skipId) { const out = []; DECO.group.children.forEach(o => { if (o.visible) o.traverse(m => { if (m.isMesh && m.visible && m.userData.deco !== skipId) out.push(m); }); }); return out; }
/* where a thing would stand: the first surface the ray meets, if it faces up (a wall or a cabinet's front does not take it) */
function decoStand(skipId) {
  const h = decoRay.intersectObjects(DECO.surf.concat(decoMeshes(skipId)), false)[0];
  if (!h || !h.face) return null;
  _deV.copy(h.face.normal).transformDirection(h.object.matrixWorld);
  return _deV.y > .55 ? h.point.clone() : null;
}
function decoAtScreen(x, y, skipId) { _deN.set(x, y); decoRay.setFromCamera(_deN, camera); return decoStand(skipId); }
/* what is under a point, from a little above it (a step up is fine, the top of the cabinet over it is not) */
function decoBelow(p, skipId) { decoRay.set(_deV.set(p.x, p.y + 12, p.z), _deD); decoRay.far = 60; const q = decoStand(skipId); decoRay.far = Infinity; return q; }
/* dragging: onto the surface under the mouse; over a wall or a cabinet's front, along its own height and down onto whatever is there */
const _dePl = new THREE.Plane(new V3(0, 1, 0), 0), _deQ = new V3();
function decoDragTo(it, x, y) {
  const p = decoAtScreen(x, y, it.id); if (p) return p;
  _dePl.constant = -it.p[1]; if (!decoRay.ray.intersectPlane(_dePl, _deQ)) return null;
  const q = _deQ.clone(), b = decoBelow(q, it.id); if (b) q.y = b.y;
  return q;
}
function decoNdc(e) { const r = canvasEl.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1]; }
function decoPick(e) { const [x, y] = decoNdc(e); _deN.set(x, y); decoRay.setFromCamera(_deN, camera); const h = decoRay.intersectObjects(decoMeshes(null), false)[0]; return h ? h.object.userData.deco : null; }

/* ---------- adding and taking away ---------- */
/* a new thing lands on whatever is low in the middle of the view: the rug, the desk, the cabinet */
function decoSpawn() {
  DECO.surf = decoSurfaces();
  const n = decoRoom() ? decoList(decoRoom()).length : 0, side = n % 2 ? -1 : 1;
  for (const [x, y] of [[.38 * side, -.8], [-.38 * side, -.8], [.2 * side, -.6], [0, -.35], [0, 0]]) { const p = decoAtScreen(x, y, null); if (p) return [p.x, p.y, p.z]; }
  return [cam.look.x, 0, cam.look.z];
}
async function decoAdd(src, name, parsed) {
  const sys = decoRoom(); if (!sys) return;
  const it = { id: 'd' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36), src, name, p: decoSpawn(), r: 0, s: 1 };
  decoList(sys).push(it); savePrefs();
  const o = parsed ? decoAdopt(it, UGC.build(parsed)) : await decoObj(it);
  if (!o) return;
  decoPlace(it, o); o.visible = true;
  decoStart(it.id);
}
async function decoAddFile(file) {
  const buf = await file.arrayBuffer(), parsed = UGC.parse(buf, { maxTex: 1024 });   /* fails here if it cannot be read: nothing is kept */
  const src = 'deco:' + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  await UGCS.tx('readwrite', st => st.put(buf, src));
  await decoAdd(src, parsed.info.name || file.name.replace(/\.ugc$/i, '').replace(/_[0-9a-f]{8}$/i, '').replace(/_/g, ' '), parsed);
}
async function decoRemove(id) {
  const sys = decoRoom(), L = sys ? decoList(sys) : [], i = L.findIndex(x => x.id === id); if (i < 0) return;
  const [it] = L.splice(i, 1); decoDrop(id); savePrefs();
  /* the file goes when nothing in any room uses it any more (EmuVR's own consoles stay for the rooms' machines) */
  const used = Object.values(prefs.decor || {}).some(l => l.some(x => x.src === it.src));
  if (!used && it.src.startsWith('deco:')) try { await UGCS.tx('readwrite', st => st.delete(it.src)); } catch (e) { console.error(e); }
  if (DECO.sel === id) DECO.sel = L.length ? L[L.length - 1].id : null;
  decoMark(); renderDecoBar(); renderDecoList();
}

/* ---------- placing by hand ---------- */
function decoStart(id) {
  if (!decoRoom() || mode !== 'shelf' || busy) { toast(T('Vuelve a la estantería de una sala para colocar')); return; }
  const L = decoList(decoRoom()); if (!L.length) return;
  DECO.on = true; DECO.room = decoRoom(); DECO.sel = id || L[L.length - 1].id; DECO.drag = null; DECO.surf = decoSurfaces();
  setHovered(null); tipEl.hidden = true;
  if (!setPop.hidden) { setPop.hidden = true; setBtn.setAttribute('aria-expanded', 'false'); }
  document.documentElement.classList.add('decorating');
  decoMark(); renderDecoBar(); $('#decoBar').hidden = false;
}
function decoEnd() {
  if (!DECO.on) return;
  DECO.on = false; DECO.drag = null; DECO.sel = null; decoMark();
  document.documentElement.classList.remove('decorating'); $('#decoBar').hidden = true; canvasEl.style.cursor = 'default';
  clearTimeout(DECO.saveT); savePrefs(); renderPrompts();
}
/* the chosen thing wears a thin box */
function decoMark() {
  if (DECO.box) { scene.remove(DECO.box); DECO.box.geometry.dispose(); DECO.box.material.dispose(); DECO.box = null; }
  const o = DECO.on && DECO.sel && DECO.objs.get(DECO.sel); if (!o) return;
  DECO.box = new THREE.BoxHelper(o, 0xffb547); DECO.box.material.depthTest = false; DECO.box.material.transparent = true; DECO.box.renderOrder = 10; scene.add(DECO.box);
}
function decoMoved(it) { const o = DECO.objs.get(it.id); if (o) decoPlace(it, o); if (DECO.box) DECO.box.update(); decoSave(); renderDecoBar(); }
function decoTurn(it, a) { it.r = ((it.r || 0) + a) % (Math.PI * 2); decoMoved(it); }
function decoSize(it, k) { it.s = clamp((it.s || 1) * k, .05, 20); decoMoved(it); }
/* moved with the arrows: along the floor as the camera sees it, then dropped onto whatever is under it */
function decoNudge(it, dx, dz) {
  const r = new V3(1, 0, 0).applyQuaternion(camera.quaternion), f = new V3(0, 0, -1).applyQuaternion(camera.quaternion); r.y = 0; f.y = 0; r.normalize(); f.normalize();
  const p = new V3(it.p[0], it.p[1], it.p[2]).addScaledVector(r, dx).addScaledVector(f, dz), q = decoBelow(p, it.id);
  it.p = [p.x, q ? q.y : p.y, p.z]; decoMoved(it);
}
function decoKey(k) {
  if (k === 'Enter' || k === 'Escape') { decoEnd(); return true; }
  const L = decoRoom() ? decoList(decoRoom()) : [], it = decoItem(DECO.sel);
  if (k === 'm' || k === 'M' || k === 'Tab') { if (L.length) { const i = L.findIndex(x => x.id === DECO.sel); DECO.sel = L[(i + 1) % L.length].id; decoMark(); renderDecoBar(); } return true; }
  if (!it) return true;
  if (k === 'Delete') { decoRemove(it.id); return true; }
  if (k === 'ArrowLeft') decoNudge(it, -1.5, 0); else if (k === 'ArrowRight') decoNudge(it, 1.5, 0);
  else if (k === 'ArrowUp') decoNudge(it, 0, 1.5); else if (k === 'ArrowDown') decoNudge(it, 0, -1.5);
  else if (k === 'q' || k === 'Q') decoTurn(it, -Math.PI / 12); else if (k === 'e' || k === 'E') decoTurn(it, Math.PI / 12);
  else if (k === 'z' || k === 'Z' || k === '-') decoSize(it, 1 / 1.1); else if (k === 'c' || k === 'C' || k === '+' || k === '=') decoSize(it, 1.1);
  return true;
}
/* while placing, the mouse moves things instead of choosing games */
['pointerdown', 'pointermove', 'pointerup', 'click', 'dblclick', 'wheel', 'contextmenu'].forEach(type => window.addEventListener(type, e => {
  if (!DECO.on || e.target !== canvasEl) return;
  e.stopPropagation(); if (type === 'wheel' || type === 'contextmenu') e.preventDefault();
  if (type === 'pointerdown') {
    const id = decoPick(e);
    if (id) { DECO.sel = id; DECO.drag = { id, pid: e.pointerId }; try { canvasEl.setPointerCapture(e.pointerId); } catch (er) { } canvasEl.style.cursor = 'grabbing'; DECO.surf = decoSurfaces(); }
    decoMark(); renderDecoBar();
  } else if (type === 'pointermove') {
    if (!DECO.drag) { canvasEl.style.cursor = decoPick(e) ? 'grab' : 'default'; return; }
    const it = decoItem(DECO.drag.id), o = it && DECO.objs.get(it.id); if (!o) return;
    const [x, y] = decoNdc(e), p = decoDragTo(it, x, y); if (!p) return;
    it.p = [p.x, p.y, p.z]; decoPlace(it, o); if (DECO.box) DECO.box.update();
  } else if (type === 'pointerup') {
    if (DECO.drag) { DECO.drag = null; canvasEl.style.cursor = 'grab'; decoSave(); renderDecoBar(); }
  } else if (type === 'wheel') {
    const it = decoItem(DECO.sel); if (!it) return;
    if (e.shiftKey || e.ctrlKey || e.altKey) decoSize(it, Math.exp(-clamp(e.deltaY, -120, 120) * .0016));
    else decoTurn(it, clamp(e.deltaY, -120, 120) * .004);
  }
}, { capture: true, passive: false }));

/* ---------- the bar at the bottom while placing ---------- */
function renderDecoBar() {
  const el = $('#decoBar'); if (!el || !DECO.on) return;
  const it = decoItem(DECO.sel), L = decoRoom() ? decoList(decoRoom()) : [], room = (systemsList().find(s => s.key === decoRoom()) || {}).name || '';
  const b = (a, label, tip) => `<button type="button" class="gact" data-deco-act="${a}"${tip ? ` title="${esc(tip)}" aria-label="${esc(tip)}"` : ''}>${label}</button>`;
  el.innerHTML = `<div class="deco-what"><b>${T('Decorando')} · ${esc(room)}</b><span>${it ? esc(it.name) + ' · ×' + (it.s || 1).toFixed(2) : T('Elige algo de la sala')}</span></div>
    <div class="deco-btns">${L.length > 1 ? b('next', T('Siguiente'), T('Elegir el siguiente') + ' (M)') : ''}${it ? b('left', '↺', T('Girar') + ' (Q)') + b('right', '↻', T('Girar') + ' (E)') + b('small', '−', T('Más pequeño') + ' (Z)') + b('big', '+', T('Más grande') + ' (C)') + b('del', T('Quitar'), T('Quitar') + ' (Supr)') : ''}
    <button type="button" class="pbtn primary" data-deco-act="done"><kbd>${T('Intro')}</kbd>${T('Listo')}</button></div>
    <p class="deco-hint">${coarse ? T('Arrastra cada cosa a donde quieras.') : T('Arrastra para mover · rueda: girar · Mayús + rueda: tamaño · flechas: mover')}</p>`;
}
$('#decoBar').addEventListener('click', e => {
  const a = e.target.closest('[data-deco-act]'); if (!a) return; const it = decoItem(DECO.sel), k = a.dataset.decoAct;
  if (k === 'done') decoEnd(); else if (k === 'next') decoKey('m');
  else if (it) { if (k === 'left') decoTurn(it, -Math.PI / 12); else if (k === 'right') decoTurn(it, Math.PI / 12); else if (k === 'small') decoSize(it, 1 / 1.1); else if (k === 'big') decoSize(it, 1.1); else if (k === 'del') decoRemove(it.id); }
});

/* ---------- Settings → EmuVR → Decoration ---------- */
function renderDecoList() {
  const el = $('#decoList'); if (!el) return;
  const sys = decoRoom();
  if (!sys) { el.innerHTML = `<p class="deco-none">${T(isRooms() ? 'Entra en la sala de un sistema para decorarla.' : 'La decoración va en el diseño Por sistema.')}</p>`; return; }
  const L = decoList(sys), room = (systemsList().find(s => s.key === sys) || {}).name || sys, bases = UGCS.bases();
  el.innerHTML = `<div class="ugc-item"><div class="ugc-what"><b>${T('Esta sala')}</b><span class="on">${esc(room)}${L.length ? ' · ' + T(L.length === 1 ? '{0} cosa' : '{0} cosas', L.length) : ''}</span></div><div class="ugc-btns">`
    + `<button type="button" data-deco-add>${T('Añadir .ugc')}</button>`
    + (bases.length ? `<select data-deco-base aria-label="${esc(T('Una consola de EmuVR'))}"><option value="">EmuVR…</option>${bases.map(b => `<option value="${esc(b.id)}">${esc(b.name)}</option>`).join('')}</select>` : '')
    + (L.length ? `<button type="button" data-deco-place>${T('Colocar')}</button>` : '') + `</div></div>`
    + L.map(it => `<div class="ugc-item"><div class="ugc-what"><b>${esc(it.name)}</b><span>×${(it.s || 1).toFixed(2)}</span></div><div class="ugc-btns"><button type="button" data-deco-pick="${it.id}">${T('Colocar')}</button><button type="button" data-deco-del="${it.id}" aria-label="${esc(T('Quitar') + ': ' + it.name)}" title="${esc(T('Quitar'))}">×</button></div></div>`).join('');
}
$('#decoList').addEventListener('click', async e => {
  if (e.target.closest('[data-deco-add]')) { const f = $('#decoFile'); f.value = ''; f.click(); return; }
  if (e.target.closest('[data-deco-place]')) { decoStart(); return; }
  const p = e.target.closest('[data-deco-pick]'); if (p) { decoStart(p.dataset.decoPick); return; }
  const d = e.target.closest('[data-deco-del]'); if (d) { await decoRemove(d.dataset.decoDel); sfx.tick(); }
});
$('#decoList').addEventListener('change', async e => {
  const sel = e.target.closest('[data-deco-base]'); if (!sel || !sel.value) return;
  const b = UGCS.bases().find(x => x.id === sel.value); if (!b) return;
  try { await decoAdd('emuvr:' + b.id, b.name); } catch (err) { console.error(err); toast(T('No se ha podido leer {0}', b.name), 5000); }
  renderDecoList();
});
$('#decoFile').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0]; if (!file) return;
  toast(T('Leyendo {0}…', file.name), 8000); await new Promise(r => setTimeout(r, 60));
  try { await decoAddFile(file); toast(T('Colócalo donde quieras'), 2600); }
  catch (err) { console.error(err); toast(T('No se ha podido leer el .ugc'), 5000); }
  renderDecoList();
});
