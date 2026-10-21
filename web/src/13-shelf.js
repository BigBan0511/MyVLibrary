
/* =====================================================================
   THE SHELF, in two designs:
   - wall: one long wall shelf; the pills choose what is on it, split in pages
   - cases: the earlier free-standing bookcases, one per group, side by side
   Only the cases that can be seen exist in 3D.
   ===================================================================== */
let cases = [], navOrder = [], groups = [], curGroup = 0, curPage = 0, contactsDirty = true;
const caseById = new Map();
const SORTS = {
  alpha: (a, b) => (a.sort || a.t).localeCompare(b.sort || b.t, LANG, { numeric: true }),
  hours: (a, b) => b.hours - a.hours || SORTS.alpha(a, b),
  recent: (a, b) => (a.last ?? 1e9) - (b.last ?? 1e9) || SORTS.alpha(a, b),
  added: (a, b) => (a.added ?? 1e9) - (b.added ?? 1e9) || SORTS.alpha(a, b),
  year: (a, b) => (a.year || 9999) - (b.year || 9999) || SORTS.alpha(a, b)
};
function isCases() { return prefs.layout === 'cases'; }
/* ---------- systems (rooms by system): the ones in your library, PC first, then by generation ---------- */
function sysLabel(g) { const s = sysOf(g); return s === 'PC' ? 'PC' : (g.platFull || g.plat || s); }
function systemsList() {
  const m = new Map();
  GAMES.forEach(g => { const s = sysOf(g); if (!m.has(s)) m.set(s, { key: s, name: sysLabel(g), n: 0 }); m.get(s).n++; });
  return [...m.values()].sort((a, b) => sysRank(a.key) - sysRank(b.key) || a.name.localeCompare(b.name, LANG));
}
function curSysKey() { const L = systemsList(); return L.some(s => s.key === prefs.sys) ? prefs.sys : (L[0] ? L[0].key : 'PC'); }
function inCabinet() { return isRooms() && STAGE.name === 'tv'; }
function keysOf(g) {
  if (prefs.group === 'status') return [g.status || '__none'];
  if (prefs.group === 'cat') return g.cats.length ? g.cats : ['__none'];
  if (prefs.group === 'fmt') return [g.fmt];
  if (prefs.group === 'plat') return [g.plat || '__none'];
  return [];
}
function groupLabel(k) {
  if (k === '__all') return T('Todos');
  if (k === '__none') return T({ status: 'Sin estado', cat: 'Sin categoría', plat: 'Sin plataforma' }[prefs.group] || 'Otros');
  if (prefs.group === 'status') return TD(STATUS_SHELF[k] || k);
  if (prefs.group === 'cat') return TD(k);
  if (prefs.group === 'fmt') return T({ dvd: 'Cajas DVD', jewel: 'Cajas de CD', bigjewel: 'Cajas de CD grandes', big: 'Cajas grandes', floppy: 'Disquetes', cart: 'Cartuchos' }[k] || k);
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
  const sys = curSysKey(), all = isRooms() ? GAMES.filter(g => sysOf(g) === sys) : GAMES.slice(), map = new Map();
  if (prefs.group !== 'all') all.forEach(g => keysOf(g).forEach(k => { if (!map.has(k)) map.set(k, []); map.get(k).push(g); }));
  const keys = [...map.keys()].sort((a, b) => groupRank(a, map.get(a).length) - groupRank(b, map.get(b).length) || String(a).localeCompare(String(b), LANG));
  const G = [{ key: '__all', label: T('Todos'), games: all }, ...keys.map(k => ({ key: k, label: groupLabel(k), games: map.get(k) }))];
  groups = isCases() ? bookcasesFrom(G) : G;
  if (!isCases()) groups.forEach(gr => { gr.pages = stageFor(sys) === 'tv' ? paginateCabinet(gr) : paginate(gr); });
}
/* the two games you are playing right now stand face-out at the start of the shelf */
function faceOutOf(gr) {
  if (gr.key !== '__all' && !(prefs.group === 'status' && STATUS_KIND[gr.key] === 'playing')) return [];
  return gr.games.filter(g => kindOf(g) === 'playing' && g.last !== null && g.last !== undefined).sort((a, b) => a.last - b.last).slice(0, 2);
}
function sortedItems(gr, gapSpine) {
  const fo = faceOutOf(gr), rest = gr.games.filter(g => !fo.includes(g)).sort(SORTS[prefs.sort] || SORTS.alpha);
  return [...fo.map(g => ({ g, fo: true, w: DIMS[g.fmt].w + 1 })), ...rest.map(g => ({ g, fo: false, w: DIMS[g.fmt].d + gapSpine }))];
}
function paginate(gr) {
  const pages = []; let page = [], x = 0;
  for (const it of sortedItems(gr, .12)) { if (x + it.w > SHELF.innerW - 1 && page.length) { pages.push(page); page = []; x = 0; } page.push(it); x += it.w; }
  if (page.length || !pages.length) pages.push(page);
  return pages;
}
/* the TV cabinet: two rows of spines, a page is both rows */
function paginateCabinet(gr) {
  const pages = []; let page = [], row = 0, x = 0;
  for (const it0 of sortedItems(gr, .14)) {
    const it = Object.assign({}, it0, { fo: false, w: DIMS[it0.g.fmt].d + .14 });
    if (x + it.w > CAB.innerW - 1 && (page.length || row)) { row++; x = 0; if (row > 1) { pages.push(page); page = []; row = 0; } }
    it.row = row; it.x = x; page.push(it); x += it.w;
  }
  if (page.length || !pages.length) pages.push(page);
  return pages;
}
function curItems() { const gr = groups[curGroup]; return gr ? gr.pages[curPage] || [] : []; }
function pageOf(g, gi = curGroup) { const gr = groups[gi]; if (!gr) return -1; return gr.pages.findIndex(p => p.some(it => it.g === g)); }

/* ---------- cases ---------- */
function caseKey(g, ui) { return isCases() ? g.id + '@' + ui : g.id; }
function casesOf(g) { const out = []; for (const c of caseById.values()) if (c.g === g && !c.disposed) out.push(c); return out; }
function getCase(g, ui = curGroup) {
  const k = caseKey(g, ui); let c = caseById.get(k);
  /* its format changed (Settings, or Playnite moved it to another platform): a new case takes its place */
  if (c && !c.disposed && c !== active && c.dim !== DIMS[g.fmt]) { c.dispose(); caseById.delete(k); c = null; }
  if (!c || c.disposed) { c = new Case(g); c.fresh = true; c.key = k; caseById.set(k, c); }
  return c;
}
function placeCase(c, xc, fo, by = SHELF.board, front = SHELF.front, innerH = SHELF.innerH) {
  const { w, h, d } = c.dim; c.faceOut = fo; c.home.x = xc; c.home.board = by; c.home.front = front; c.home.innerH = innerH;
  if (fo) { const lean = .12; c.home.pos.set(xc, by + (h / 2) * Math.cos(lean) + (d / 2) * Math.sin(lean) + .05, front - 4.6 - (h / 2) * Math.sin(lean)); c.home.quat.setFromEuler(new EU(-lean, 0, 0)); }
  else { c.home.pos.set(xc, by + h / 2 + .03, front - .6 - w / 2); c.home.quat.setFromEuler(new EU(0, Math.PI / 2, 0)); }
}
function settle(c) { if (c.fresh) { c.root.position.copy(c.home.pos); c.root.quaternion.copy(c.home.quat); c.fresh = false; } }
function layoutPage() {
  const keep = new Set(); navOrder = [];
  if (STAGE.sys !== curSysKey() || STAGE.name !== stageFor(curSysKey())) applyStage(curSysKey());
  showWallShelf(!isCases()); if (decorLayout !== prefs.layout) buildDecor();
  let shown;
  if (inCabinet()) {
    clearBookcases();
    const items = curItems(), x0 = CAB.x - CAB.innerW / 2 + .5;
    items.forEach(it => {
      const c = getCase(it.g); keep.add(c); c.hidden = false; c.root.visible = true; c.row = it.row; c.unitIdx = curGroup;
      placeCase(c, x0 + it.x + c.dim.d / 2, false, CAB.boards[it.row], CAB.front, CAB.rowH); navOrder.push(c);
      if (c !== active && !c.detail && c.coverTex) c.dropCover();
      settle(c);
    });
    shown = items.map(it => it.g);
  } else if (isCases()) {
    buildBookcases();
    groups.forEach((gr, ui) => {
      if (Math.abs(ui - curGroup) > 1) return;
      const u = units[ui];
      gr.rows.forEach((row, i) => {
        let x = u.x - SH.innerW / 2 + .5;
        row.forEach(it => {
          const c = getCase(it.g, ui); keep.add(c); c.hidden = false; c.root.visible = true; c.row = i; c.unitIdx = ui;
          placeCase(c, x + (it.fo ? c.dim.w / 2 : c.dim.d / 2), it.fo, boardY(u.R, i), SH.front); x += it.w;
          if (ui === curGroup) navOrder.push(c);
          if (it.fo) c.ensureCover(); else if (c !== active && !c.detail && c.coverTex) c.dropCover();
          settle(c);
        });
      });
    });
    shown = groups[curGroup] ? groups[curGroup].games : [];
  } else {
    clearBookcases();
    let x = SHELF.x0 + .5; const items = curItems();
    items.forEach(it => {
      const c = getCase(it.g); keep.add(c); c.hidden = false; c.root.visible = true; c.row = 0; c.unitIdx = curGroup;
      placeCase(c, x + (it.fo ? c.dim.w / 2 : c.dim.d / 2), it.fo); x += it.w; navOrder.push(c);
      if (it.fo) c.ensureCover(); else if (c !== active && !c.detail && c.coverTex) c.dropCover();
      settle(c);
    });
    drawRowLabels();
    shown = items.map(it => it.g);
  }
  for (const [k, c] of caseById) if (!keep.has(c) && c !== active) { c.dispose(); caseById.delete(k); }
  cases = [...caseById.values()];
  buildShelfPicks(); markContacts();
  if (typeof LIB !== 'undefined') LIB.pageShown(shown);
}

/* ---------- the wall shelf's extras ---------- */
function showWallShelf(on) { shelfGroup.visible = on; shelfShadow.visible = on; labelStrip.visible = on; }

/* ---------- bookcases (the earlier design): one carcass per group, up to three rows ---------- */
const SH = { innerW: 36, rowH: 25, x0: 150, step: 58, maxRows: 3, cap: 34.6, front: WALL_Z + 30 };
let units = [], unitsKey = '';
function bookcasesFrom(G) {
  const src = prefs.group === 'all' ? G.slice(0, 1) : G.slice(1), out = [];
  src.forEach(gr => {
    const bks = []; let rows = [], row = [], x = 0;
    for (const it of sortedItems(gr, .24)) {
      if (x + it.w > SH.cap && row.length) { rows.push(row); row = []; x = 0; if (rows.length === SH.maxRows) { bks.push(rows); rows = []; } }
      row.push(it); x += it.w;
    }
    if (row.length) rows.push(row); if (rows.length) bks.push(rows);
    bks.forEach((r, i) => out.push({ key: gr.key, label: gr.label + (bks.length > 1 ? ` (${i + 1})` : ''), count: gr.games.length, rows: r, games: r.flat().map(it => it.g), pages: [r.flat()] }));
  });
  if (!out.length) out.push({ key: '__all', label: T('Todos'), count: 0, rows: [[]], games: [], pages: [[]] });
  return out;
}
function boardY(R, i) { return 8 + SH.rowH * (R - 1 - i); }
function furniture(parent, cx, ow, rowsYs, H, depth = 30) {
  const iw = ow - 4, sideH = H - 2;
  [-(ow / 2 - 1), ow / 2 - 1].forEach(dx => fbox(sideH, 2, depth, shelfMat, cx + dx, sideH / 2, 0, parent, Math.PI / 2));
  fbox(ow, 2, depth, shelfMat, cx, H - 1, 0, parent);
  rowsYs.slice(0, -1).forEach(b => fbox(iw, 2, depth - .6, shelfMat, cx, b - 1, -.3, parent));
  addBox(iw, 6, 1.2, woodDark, cx, 3, depth / 2 - 2.4, parent);
  addBox(iw, H - 8, .8, woodDark, cx, 6 + (H - 8) / 2, -depth / 2 + .9, parent);
}
function aoCompartment(parent, cx, by, innerW, rowH) {
  const back = new THREE.Mesh(new THREE.PlaneGeometry(innerW, rowH - 2), AO.back); back.position.set(cx, by + (rowH - 2) / 2, -13.62); parent.add(back);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(innerW, 29), AO.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, by + .012, 0); parent.add(fl);
}
function clearBookcases() {
  units.forEach(u => { scene.remove(u.group); u.group.traverse(o => { if (o.isMesh && !o.geometry.userData.shared) o.geometry.dispose(); }); if (u.labelTex) u.labelTex.dispose(); if (u.paperMat) unM(u.paperMat); });
  units = []; unitsKey = '';
}
function buildBookcases() {
  const key = groups.map(g => g.label + ':' + g.rows.length + ':' + g.count).join('|') + RP.name;
  if (key === unitsKey) return;
  clearBookcases(); unitsKey = key;
  units = groups.map((gr, ui) => {
    const R = gr.rows.length, H = 8 + SH.rowH * R, x = SH.x0 + ui * SH.step, g = new THREE.Group(); scene.add(g);
    const ys = []; for (let k = 0; k <= R; k++) ys.push(8 + SH.rowH * k);
    furniture(g, x, SH.innerW + 4, ys, H);
    for (let i = 0; i < R; i++) aoCompartment(g, x, boardY(R, i), SH.innerW, SH.rowH);
    const labelTex = tex(makeLabelCanvas(gr.label, gr.count)), paperMat = M(THREE.MeshStandardMaterial, { map: labelTex, roughness: .85 }, .6);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(20, 2.3), paperMat); paper.position.set(x, H - 1, 15.3); g.add(paper);
    return { x, R, H, group: g, labelTex, paperMat };
  });
}
function unitOf(c) { return units[c.unitIdx] || null; }
function placeFigure() { }

/* ---------- contact shadows: one instanced quad per spine, a single draw call ---------- */
const contactInst = new THREE.InstancedMesh(UNIT_PLANE, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(makeContactCanvas()), transparent: true, opacity: .6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }), 600);
contactInst.count = 0; contactInst.frustumCulled = false; scene.add(contactInst);
function markContacts() { contactsDirty = true; }
const _cm = new THREE.Matrix4(), _cq = new Q4().setFromEuler(new EU(-Math.PI / 2, 0, 0)), _cs = new V3(), _cp = new V3();
function updateContacts() {
  if (!contactsDirty) return; contactsDirty = false; let n = 0;
  for (const c of caseById.values()) {
    if (c.disposed || c.faceOut || c.mode !== 'home' || c.leaving || c.hidden || n >= 600) continue;
    _cp.set(c.home.x, c.home.board + .02, c.home.pos.z); _cs.set(c.dim.d + 1.3, c.dim.w + .9, 1);
    contactInst.setMatrixAt(n++, _cm.compose(_cp, _cq, _cs));
  }
  contactInst.count = n; contactInst.instanceMatrix.needsUpdate = true;
}

/* ---------- labels printed on the front edge of the wall shelf ---------- */
const labelC = mkCanvas(2048, 40), labelTex = tex(labelC);
const labelStrip = new THREE.Mesh(new THREE.PlaneGeometry(SHELF.innerW, SHELF.innerW * 40 / 2048), new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, opacity: .9 }));
labelStrip.position.set(SHELF.cx, SHELF.board - SHELF.th / 2, SHELF.front + .03); scene.add(labelStrip);
function rangeLabel(a, b) {
  if (!a) return '';
  if (prefs.sort === 'alpha') { const fa = (norm(a.g.sort || a.g.t)[0] || '#').toUpperCase(), fb = (norm(b.g.sort || b.g.t)[0] || '#').toUpperCase(); return fa === fb ? fa : `${fa} — ${fb}`; }
  if (prefs.sort === 'hours') return `${fmtH(a.g.hours)} — ${fmtH(b.g.hours)}`;
  if (prefs.sort === 'recent') return `${shortAgo(a.g.last)} — ${shortAgo(b.g.last)}`;
  if (prefs.sort === 'added') return `${T('añadidos')} ${shortAgo(a.g.added)} — ${shortAgo(b.g.added)}`;
  return a.g.year === b.g.year ? String(a.g.year || '—') : `${a.g.year || '—'} — ${b.g.year || '—'}`;
}
function drawRowLabels() {
  const x = labelC.getContext('2d'), W = labelC.width, toPx = lx => (lx - SHELF.x0) / SHELF.innerW * W;
  x.clearRect(0, 0, W, labelC.height);
  const label = (txt, lx, accent) => { if (!txt) return; x.font = `700 22px ${F.mono}`; const tw = x.measureText(txt).width + 24, px = clamp(toPx(lx), 4, W - tw - 4); x.fillStyle = accent ? '#ffb547' : '#efe7d6'; x.fillRect(px, 6, tw, 28); x.fillStyle = '#1d1a20'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.fillText(txt, px + 12, 21); };
  const cs = navOrder, fos = cs.filter(c => c.faceOut), sp = cs.filter(c => !c.faceOut);
  if (fos.length) label(T('JUGANDO AHORA'), SHELF.x0 + .6, true);
  if (sp.length) label(rangeLabel(sp[0], sp[sp.length - 1]), sp[0].home.x - sp[0].dim.d / 2 + .2, false);
  labelTex.needsUpdate = true;
}

/* ---------- switching design ---------- */
/* switching design always rebuilds the room and sends the camera back to the overview of the new one */
let layoutChanged = false;
function setLayout(name) {
  prefs.layout = ['rooms', 'wall', 'cases'].includes(name) ? name : 'rooms'; savePrefs(); layoutChanged = true; renderSysbar();
  if (mode !== 'shelf') { pendingRelayout = true; return; }
  relayout({ full: true, reset: true });
}
