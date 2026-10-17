
/* =====================================================================
   THE SHELF: what is on it (the pill you picked), split into pages that
   each fill the board. Only the cases of the current page exist in 3D.
   ===================================================================== */
let cases = [], navOrder = [], groups = [], curGroup = 0, curPage = 0, contactsDirty = true;
const caseById = new Map();
const SORTS = {
  alpha: (a, b) => (a.sort || a.t).localeCompare(b.sort || b.t, 'es', { numeric: true }),
  hours: (a, b) => b.hours - a.hours || SORTS.alpha(a, b),
  recent: (a, b) => (a.last ?? 1e9) - (b.last ?? 1e9) || SORTS.alpha(a, b),
  added: (a, b) => (a.added ?? 1e9) - (b.added ?? 1e9) || SORTS.alpha(a, b),
  year: (a, b) => (a.year || 9999) - (b.year || 9999) || SORTS.alpha(a, b)
};
const FMT_SHELF = { dvd: 'Cajas DVD', jewel: 'Cajas de CD', big: 'Cajas grandes' };
const GROUP_NAMES = { status: 'por estado', cat: 'por categoría', plat: 'por plataforma', fmt: 'por formato', all: 'todo junto' };
function keysOf(g) {
  if (prefs.group === 'status') return [g.status || '__none'];
  if (prefs.group === 'cat') return g.cats.length ? g.cats : ['__none'];
  if (prefs.group === 'fmt') return [g.fmt];
  if (prefs.group === 'plat') return [g.plat || '__none'];
  return [];
}
function groupLabel(k) {
  if (k === '__all') return 'Todos';
  if (k === '__none') return { status: 'Sin estado', cat: 'Sin categoría', plat: 'Sin plataforma' }[prefs.group] || 'Otros';
  if (prefs.group === 'status') return STATUS_SHELF[k] || k;
  if (prefs.group === 'fmt') return FMT_SHELF[k];
  return k;
}
function groupRank(k, n) {
  if (k === '__none') return 1e6;
  if (prefs.group === 'status') return KIND_ORDER.indexOf(STATUS_KIND[k] || 'other') * 100 + Math.max(0, STATUSES.indexOf(k));
  if (prefs.group === 'cat') { const i = prefs.cats.indexOf(k); return i < 0 ? 5e5 : i; }
  if (prefs.group === 'fmt') return FMT_ORDER[k];
  if (prefs.group === 'plat') return -n;
  return 0;
}
function belongs(g, key) { return key === '__all' || keysOf(g).includes(key); }
function buildGroups() {
  const all = GAMES.slice(), map = new Map();
  if (prefs.group !== 'all') all.forEach(g => keysOf(g).forEach(k => { if (!map.has(k)) map.set(k, []); map.get(k).push(g); }));
  const keys = [...map.keys()].sort((a, b) => groupRank(a, map.get(a).length) - groupRank(b, map.get(b).length) || String(a).localeCompare(String(b), 'es'));
  groups = [{ key: '__all', label: 'Todos', games: all }, ...keys.map(k => ({ key: k, label: groupLabel(k), games: map.get(k) }))];
  groups.forEach(gr => { gr.pages = paginate(gr); });
}
/* the two games you are playing right now stand face-out at the start of the shelf */
function faceOutOf(gr) {
  if (gr.key !== '__all' && !(prefs.group === 'status' && STATUS_KIND[gr.key] === 'playing')) return [];
  return gr.games.filter(g => kindOf(g) === 'playing' && g.last !== null && g.last !== undefined).sort((a, b) => a.last - b.last).slice(0, 2);
}
function paginate(gr) {
  const fo = faceOutOf(gr), rest = gr.games.filter(g => !fo.includes(g)).sort(SORTS[prefs.sort] || SORTS.alpha);
  const pages = []; let page = [], x = 0;
  const push = (g, isFo) => { const w = isFo ? DIMS[g.fmt].w + 1 : DIMS[g.fmt].d + .12; if (x + w > SHELF.innerW - 1 && page.length) { pages.push(page); page = []; x = 0; } page.push({ g, fo: isFo, w }); x += w; };
  fo.forEach(g => push(g, true)); rest.forEach(g => push(g, false));
  if (page.length || !pages.length) pages.push(page);
  return pages;
}
function curItems() { const gr = groups[curGroup]; return gr ? gr.pages[curPage] || [] : []; }
function pageOf(g, gi = curGroup) { const gr = groups[gi]; if (!gr) return -1; return gr.pages.findIndex(p => p.some(it => it.g === g)); }

/* ---------- cases ---------- */
function getCase(g) {
  let c = caseById.get(g.id);
  if (!c || c.disposed) { c = new Case(g); c.fresh = true; caseById.set(g.id, c); }
  return c;
}
function placeCase(c, xc, fo) {
  const { w, h, d } = c.dim, by = SHELF.board; c.faceOut = fo; c.row = 0; c.home.x = xc; c.home.board = by;
  if (fo) { const lean = .12; c.home.pos.set(xc, by + (h / 2) * Math.cos(lean) + (d / 2) * Math.sin(lean) + .05, SHELF.front - 4.6 - (h / 2) * Math.sin(lean)); c.home.quat.setFromEuler(new EU(-lean, 0, 0)); }
  else { c.home.pos.set(xc, by + h / 2 + .03, SHELF.front - .6 - w / 2); c.home.quat.setFromEuler(new EU(0, Math.PI / 2, 0)); }
}
function layoutPage() {
  const items = curItems(), keep = new Set(); navOrder = [];
  let x = SHELF.x0 + .5;
  items.forEach(it => {
    const c = getCase(it.g); keep.add(c); c.hidden = false; c.root.visible = true;
    placeCase(c, x + (it.fo ? c.dim.w / 2 : c.dim.d / 2), it.fo); x += it.w; navOrder.push(c);
    if (it.fo) c.ensureCover(); else if (c !== active && !c.detail && c.coverTex) c.dropCover();
    if (c.fresh) { c.root.position.copy(c.home.pos); c.root.quaternion.copy(c.home.quat); c.fresh = false; }
  });
  for (const [id, c] of caseById) if (!keep.has(c) && c !== active) { c.dispose(); caseById.delete(id); }
  cases = [...caseById.values()];
  drawRowLabels(items);
  buildShelfPicks(); markContacts();
  if (typeof LIB !== 'undefined') LIB.pageShown(items.map(it => it.g));
  return items;
}

/* ---------- contact shadows: one instanced quad per spine, a single draw call ---------- */
const contactInst = new THREE.InstancedMesh(UNIT_PLANE, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(makeContactCanvas()), transparent: true, opacity: .6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }), 400);
contactInst.count = 0; contactInst.frustumCulled = false; scene.add(contactInst);
function markContacts() { contactsDirty = true; }
const _cm = new THREE.Matrix4(), _cq = new Q4().setFromEuler(new EU(-Math.PI / 2, 0, 0)), _cs = new V3(), _cp = new V3();
function updateContacts() {
  if (!contactsDirty) return; contactsDirty = false; let n = 0;
  for (const c of navOrder) {
    if (c.faceOut || c.mode !== 'home' || c.leaving || c.hidden || n >= 400) continue;
    _cp.set(c.home.x, c.home.board + .02, c.home.pos.z); _cs.set(c.dim.d + 1.3, c.dim.w + .9, 1);
    contactInst.setMatrixAt(n++, _cm.compose(_cp, _cq, _cs));
  }
  contactInst.count = n; contactInst.instanceMatrix.needsUpdate = true;
}

/* ---------- labels printed on the front edge of the board ---------- */
const labelC = mkCanvas(2048, 40), labelTex = tex(labelC);
const labelStrip = new THREE.Mesh(new THREE.PlaneGeometry(SHELF.innerW, SHELF.innerW * 40 / 2048), new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, opacity: .9 }));
labelStrip.position.set(SHELF.cx, SHELF.board - SHELF.th / 2, SHELF.front + .03); scene.add(labelStrip);
function rangeLabel(a, b) {
  if (!a) return '';
  if (prefs.sort === 'alpha') { const fa = (norm(a.g.sort || a.g.t)[0] || '#').toUpperCase(), fb = (norm(b.g.sort || b.g.t)[0] || '#').toUpperCase(); return fa === fb ? fa : `${fa} — ${fb}`; }
  if (prefs.sort === 'hours') return `${fmtH(a.g.hours)} — ${fmtH(b.g.hours)}`;
  if (prefs.sort === 'recent') return `${shortAgo(a.g.last)} — ${shortAgo(b.g.last)}`;
  if (prefs.sort === 'added') return `añadidos ${shortAgo(a.g.added)} — ${shortAgo(b.g.added)}`;
  return a.g.year === b.g.year ? String(a.g.year || '—') : `${a.g.year || '—'} — ${b.g.year || '—'}`;
}
function drawRowLabels(items) {
  const x = labelC.getContext('2d'), W = labelC.width, toPx = lx => (lx - SHELF.x0) / SHELF.innerW * W;
  x.clearRect(0, 0, W, labelC.height);
  const label = (txt, lx, accent) => { if (!txt) return; x.font = `700 22px ${F.mono}`; const tw = x.measureText(txt).width + 24, px = clamp(toPx(lx), 4, W - tw - 4); x.fillStyle = accent ? '#ffb547' : '#efe7d6'; x.fillRect(px, 6, tw, 28); x.fillStyle = '#1d1a20'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText(txt, px + 12, 21); };
  const cs = navOrder, fos = cs.filter(c => c.faceOut), sp = cs.filter(c => !c.faceOut);
  if (fos.length) label('JUGANDO AHORA', SHELF.x0 + .6, true);
  if (sp.length) label(rangeLabel(sp[0], sp[sp.length - 1]), sp[0].home.x - sp[0].dim.d / 2 + .2, false);
  labelTex.needsUpdate = true;
}
function unitOf() { return null; }
function placeFigure() { }
