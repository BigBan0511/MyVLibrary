/* =====================================================================
   SKINS: a system's games in EmuVR's own boxes, with EmuVR's own media.
   In EmuVR a box is a little machine: a model with an opening animation,
   a socket for the medium and the renderers that take the box image, one
   picture holding back, spine and front. A box is measured once: which
   faces take the art (its normals and UVs say which is the front, which
   way is up) and how big it is. In your hands the real box takes over,
   with the game's art painted on it; only one such working model exists,
   and whoever holds it first wears it. On the shelf each game stands in a
   light copy of the box, closed: it shares the model's geometry and shows
   the game's own spine (or front, face out), so a full bookcase costs no
   more pictures than plain cases do.
   A medium (a cartridge, a disk) brings its label and its male socket: it
   sits in EmuVR's machines exactly where EmuVR would put it.
   ===================================================================== */
const SKIN_MAX = { w: 30, h: 23 };
/* which slot a game's box or medium goes by: its system, or for films and music its format */
function skinSlot(g) { return g.video || g.music ? g.fmt : sysOf(g); }
function dimOf(g) {
  const base = DIMS[g.fmt]; if (base.multi || base.media === 'none') return base;
  const m = prefs.ugc && prefs.ugc['box:' + skinSlot(g)]; if (!m || !m.dim) return base;
  const { w, h, d } = m.dim, id = `skin:${skinSlot(g)}:${g.fmt}:${w}x${h}x${d}`;
  return DIMS[id] || (DIMS[id] = Object.assign({}, base, { w, h, d: Math.max(d, .3), split: 0, discX: 0, id, skin: 'box:' + skinSlot(g), wide: false, shell: base.shell === 'card' ? 'card' : base.shell }));
}
const _sa = new V3(), _sb = new V3(), _sc = new V3(), _se1 = new V3(), _se2 = new V3(), _sn = new V3(), _st = new V3(), _su = new V3();
function skinClosed(root) { const an = root.userData.anim; if (an) { if (an.clips.close) an.apply(an.clips.close, an.clips.close.dur); else if (an.clips.open) an.apply(an.clips.open, 0); } root.updateMatrixWorld(true); }
/* the faces of a model, by the way they look: area, UV box and which way U and V run */
function skinFaces(root, list) {
  const B = {}; root.updateMatrixWorld(true);
  for (const m of list) {
    const G = m.geometry, P = G.attributes.position, UV = G.attributes.uv, I = G.index; if (!P || !UV || !I) continue;
    const g0 = G.groups && G.groups[0], from = g0 ? g0.start : 0, to = g0 ? g0.start + g0.count : I.count;
    /* Unity's models are mirrored on the way in, which turns their triangles inside out */
    const mirror = m.matrixWorld.determinant() < 0 ? -1 : 1;
    for (let i = from; i + 2 < to; i += 3) {
      const a = I.getX(i), b = I.getX(i + 1), c = I.getX(i + 2);
      _sa.fromBufferAttribute(P, a).applyMatrix4(m.matrixWorld); _sb.fromBufferAttribute(P, b).applyMatrix4(m.matrixWorld); _sc.fromBufferAttribute(P, c).applyMatrix4(m.matrixWorld);
      _se1.subVectors(_sb, _sa); _se2.subVectors(_sc, _sa); _sn.crossVectors(_se1, _se2); const ar = _sn.length() / 2; if (ar < 1e-6) continue; _sn.normalize().multiplyScalar(mirror);
      const ax = Math.abs(_sn.x), ay = Math.abs(_sn.y), az = Math.abs(_sn.z), key = ax >= ay && ax >= az ? 'x' + Math.sign(_sn.x) : ay >= az ? 'y' + Math.sign(_sn.y) : 'z' + Math.sign(_sn.z);
      const f = B[key] || (B[key] = { key, area: 0, u0: 9, u1: -9, v0: 9, v1: -9, gu: new V3(), gv: new V3(), n: new V3() });
      const ua = UV.getX(a), va = UV.getY(a), ub = UV.getX(b), vb = UV.getY(b), uc = UV.getX(c), vc = UV.getY(c);
      f.area += ar; f.n.addScaledVector(_sn, ar);
      /* how far out the triangle is: only the outer skin of a face counts for where the art goes */
      const k = key[0], out = ((_sa[k] + _sb[k] + _sc[k]) / 3) * Math.sign(_sn[k]);
      (f.tris = f.tris || []).push({ out, ar, a: m.id * 1e6 + a, b: m.id * 1e6 + b, c: m.id * 1e6 + c, u0: Math.min(ua, ub, uc), u1: Math.max(ua, ub, uc), v0: Math.min(va, vb, vc), v1: Math.max(va, vb, vc) });
      const du1 = ub - ua, dv1 = vb - va, du2 = uc - ua, dv2 = vc - va, det = du1 * dv2 - du2 * dv1; if (Math.abs(det) < 1e-9) continue;
      _st.copy(_se1).multiplyScalar(dv2).addScaledVector(_se2, -dv1).multiplyScalar(1 / det); _su.copy(_se2).multiplyScalar(du1).addScaledVector(_se1, -du2).multiplyScalar(1 / det);
      const T = f.tris[f.tris.length - 1]; if (_st.lengthSq() > 0) T.gu = _st.clone().normalize(); if (_su.lengthSq() > 0) T.gv = _su.clone().normalize();
    }
  }
  /* the outermost layer of each face (an inner wall looks the same way but has its own place in the picture) */
  Object.values(B).forEach(f => {
    const top = f.tris.reduce((a, t) => Math.max(a, t.out), -Infinity), outer = f.tris.filter(t => t.out >= top - .25);
    /* and of that, the biggest piece: triangles joined by their vertices share one patch of the picture */
    const up = new Map(), find = x => { let r = x; while (up.has(r) && up.get(r) !== r) r = up.get(r); while (up.has(x) && up.get(x) !== r) { const n = up.get(x); up.set(x, r); x = n; } return r; };
    outer.forEach(t => { const a = find(t.a); [t.b, t.c].forEach(v => { const b = find(v); if (a !== b) up.set(b, a); }); if (!up.has(a)) up.set(a, a); });
    const by = new Map(); outer.forEach(t => { const r = find(t.a); by.set(r, (by.get(r) || 0) + t.ar); });
    let best = null, ba = -1; by.forEach((v, k) => { if (v > ba) { ba = v; best = k; } });
    /* the way the picture runs is that piece's too: an inner wall can run the other way */
    outer.filter(t => find(t.a) === best).forEach(t => { f.u0 = Math.min(f.u0, t.u0); f.u1 = Math.max(f.u1, t.u1); f.v0 = Math.min(f.v0, t.v0); f.v1 = Math.max(f.v1, t.v1); if (t.gu) f.gu.addScaledVector(t.gu, t.ar); if (t.gv) f.gv.addScaledVector(t.gv, t.ar); });
    f.outer = ba; f.tris = null;
  });
  return Object.values(B).sort((a, b) => b.outer - a.outer);
}
/* a model turned so that X, Y and Z are the case's own axes, centred, and no bigger than a shelf takes */
function skinPlace(root, right, up, n, maxW, maxH, keepAll) {
  const q = new Q4().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, n)).invert();
  root.quaternion.copy(q); root.position.set(0, 0, 0); root.scale.setScalar(1); root.updateMatrixWorld(true);
  const measure = () => { const b = new THREE.Box3(); root.updateMatrixWorld(true); root.userData.meshes.forEach(m => { let v = keepAll || m.visible; for (let o = m.parent; v && o && o !== root; o = o.parent) v = o.visible; if (v) b.expandByObject(m); }); return b; };
  let box = measure(), size = box.getSize(new V3());
  const s = Math.min(1, maxW / size.x, maxH / size.y); if (s < 1) { root.scale.setScalar(s); box = measure(); size = box.getSize(new V3()); }
  root.position.copy(box.getCenter(new V3())).negate(); root.updateMatrixWorld(true);
  return size;
}
/* a box, measured: returns its size and keeps where the front, the back and the spine are in the picture */
function skinFitBox(root) {
  skinClosed(root);
  const list = (root.userData.art || []).length ? root.userData.art : root.userData.meshes;
  list.forEach(m => { m.userData.artFace = true; });
  const F = skinFaces(root, list), big = F[0]; if (!big) return null;
  const opposite = F.find(f => f.key.slice(0, 1) === big.key[0] && f.key !== big.key);
  /* one picture usually wraps round the box: back on the left, spine, front on the right. Some boxes give the
     whole picture to the front, and then the other side has nothing of its own */
  const area = f => (f.u1 - f.u0) * (f.v1 - f.v0), apart = a => a && a.u1 <= big.u0 + .03 || a && a.u0 >= big.u1 - .03;
  const opp = opposite && opposite.outer > big.outer * .4 && area(opposite) > area(big) * .3 && apart(opposite) ? opposite : null;
  const uMid = f => (f.u0 + f.u1) / 2, front = opp && uMid(opp) > uMid(big) ? opp : big, back = opp ? (front === big ? opp : big) : null;
  const n = front.n.clone().normalize(), axis = new V3(front.key[0] === 'x' ? 1 : 0, front.key[0] === 'y' ? 1 : 0, front.key[0] === 'z' ? 1 : 0).multiplyScalar(Math.sign(n.dot(new V3(front.key[0] === 'x' ? 1 : 0, front.key[0] === 'y' ? 1 : 0, front.key[0] === 'z' ? 1 : 0))) || 1);
  let up = front.gv.clone().projectOnPlane(axis); if (up.lengthSq() < 1e-6) up = new V3(0, 1, 0).projectOnPlane(axis); if (up.lengthSq() < 1e-6) up = new V3(0, 0, -1); up.normalize();
  /* the art's up, squared to the model's own axes */
  const ax = Math.abs(up.x), ay = Math.abs(up.y), az = Math.abs(up.z); up = new V3(ax >= ay && ax >= az ? Math.sign(up.x) : 0, ay > ax && ay >= az ? Math.sign(up.y) : 0, az > ax && az > ay ? Math.sign(up.z) : 0);
  const right = up.clone().cross(axis).normalize();
  const spine = F.filter(f => f !== front && f !== back && f.key[0] !== front.key[0]).sort((a, b) => b.area - a.area).find(f => !back || (uMid(f) > Math.min(uMid(front), uMid(back)) - .05 && uMid(f) < Math.max(uMid(front), uMid(back)) + .05));
  const flipOf = f => { const c = new V3().crossVectors(f.gu, f.gv); return c.dot(f.n) < 0; };
  root.userData.rects = { front: front && { u0: front.u0, u1: front.u1, v0: front.v0, v1: front.v1, flip: flipOf(front) }, back: back && { u0: back.u0, u1: back.u1, v0: back.v0, v1: back.v1, flip: flipOf(back) }, spine: spine && { u0: spine.u0, u1: spine.u1, v0: spine.v0, v1: spine.v1, flip: back ? flipOf(front) : flipOf(spine), turn: spine.v1 - spine.v0 < spine.u1 - spine.u0 } };
  const size = skinPlace(root, right, up, axis, SKIN_MAX.w, SKIN_MAX.h);
  return { w: +size.x.toFixed(2), h: +size.y.toFixed(2), d: +size.z.toFixed(2) };
}
/* a medium, measured: the label to the front, the end with the socket (the end that goes in) down */
function skinFitMedium(root) {
  const A = root.userData.anchors; root.updateMatrixWorld(true);
  const all = new THREE.Box3(); root.userData.meshes.forEach(m => { if (m.visible) all.expandByObject(m); });
  const size0 = all.getSize(new V3()), ctr = all.getCenter(new V3());
  const thin = size0.x <= size0.y && size0.x <= size0.z ? new V3(1, 0, 0) : size0.y <= size0.z ? new V3(0, 1, 0) : new V3(0, 0, 1);
  let n = thin.clone();
  if (A.label) { const F = skinFaces(root, [A.label]); if (F[0]) { const f = F[0], k = f.key[0]; n = new V3(k === 'x' ? 1 : 0, k === 'y' ? 1 : 0, k === 'z' ? 1 : 0); const lc = new THREE.Box3().setFromObject(A.label).getCenter(new V3()).sub(ctr).dot(n); if (Math.abs(lc) > .02 ? lc < 0 : n.dot(f.n) < 0) n.negate(); } }
  else if (n.dot(new V3(1, 1, 1)) < 0) n.negate();
  let down = A.male ? A.male.getWorldPosition(new V3()).sub(ctr).projectOnPlane(n) : new V3();
  /* a socket in the middle (a cassette) says nothing: the short side goes down, so it lies the long way */
  if (down.lengthSq() < .25) { const axes = [new V3(1, 0, 0), new V3(0, 1, 0), new V3(0, 0, 1)].filter(a => Math.abs(a.dot(n)) < .5).sort((a, b) => size0.dot(a) - size0.dot(b)); down = axes[0].clone().negate(); }
  const ax = Math.abs(down.x), ay = Math.abs(down.y), az = Math.abs(down.z); down = new V3(ax >= ay && ax >= az ? Math.sign(down.x) : 0, ay > ax && ay >= az ? Math.sign(down.y) : 0, az > ax && az > ay ? Math.sign(down.z) : 0);
  const up = down.clone().negate(), right = up.clone().cross(n).normalize();
  root.userData.size = skinPlace(root, right, up, n, 40, 40, true);
  const S = A.male; root.userData.male = null;
  if (S) { root.updateMatrixWorld(true); const e = S.matrixWorld.elements, x = new V3(e[0], e[1], e[2]).normalize(), y = new V3(e[4], e[5], e[6]).normalize(), z = new V3(e[8], e[9], e[10]).normalize(); root.userData.male = { p: new V3().setFromMatrixPosition(S.matrixWorld), m: new THREE.Matrix4().makeBasis(x, y, z) }; }
}
function skinPrepare(key, root) {
  const box = key.startsWith('box:');
  root.userData.skinKey = key;
  root.userData.dim = box ? skinFitBox(root) : (skinFitMedium(root), null);
  if (box) root.userData.closed = skinCopy(root);
}
/* a closed copy of the model: the same geometry and materials, nothing that moves */
function skinCopy(o, seen) {
  const top = !seen, map = seen || new Map(), n = o.isSkinnedMesh ? new THREE.SkinnedMesh(o.geometry, o.material) : o.isMesh ? new THREE.Mesh(o.geometry, o.material) : new THREE.Group();
  map.set(o, n); n.position.copy(o.position); n.quaternion.copy(o.quaternion); n.scale.copy(o.scale); n.visible = o.visible; n.castShadow = o.castShadow; n.receiveShadow = o.receiveShadow;
  if (o.isMesh && o.userData.artFace) n.userData.artFace = true;
  o.children.forEach(k => n.add(skinCopy(k, map)));
  /* what bends gets bones of its own, or the copies would open along with the box in your hands */
  if (top) map.forEach((c, a) => { if (a.isSkinnedMesh) { c.bind(new THREE.Skeleton(a.skeleton.bones.map(b => map.get(b) || c), a.skeleton.boneInverses), a.bindMatrix); c.frustumCulled = false; } });
  return n;
}
/* the texture transform that lays a whole picture (a spine, a cover) over one face of the box's image */
function skinFaceMatrix(t, r) {
  const du = r.u1 - r.u0, dv = r.v1 - r.v0; t.matrixAutoUpdate = false;
  if (r.turn) { if (r.flip) t.matrix.set(0, -1 / dv, r.v1 / dv, -1 / du, 0, r.u1 / du, 0, 0, 1); else t.matrix.set(0, -1 / dv, r.v1 / dv, 1 / du, 0, -r.u0 / du, 0, 0, 1); }
  else if (r.flip) t.matrix.set(-1 / du, 0, r.u1 / du, 0, 1 / dv, -r.v0 / dv, 0, 0, 1);
  else t.matrix.set(1 / du, 0, -r.u0 / du, 0, 1 / dv, -r.v0 / dv, 0, 0, 1);
}
function skinShelfMap(c) {
  const s = c.shelfSkin; if (!s) return; const R = s.rects, cover = c.faceOut && c.coverTex;
  const t = cover ? c.coverTex : c.spineTex, r = cover ? R.front : R.spine; if (!r) return;
  skinFaceMatrix(t, r); s.mats.forEach(m => { if (m.map !== t) { m.map = t; m.color.set('#ffffff'); m.needsUpdate = true; } });
}
function skinShelfOff(c) {
  const s = c.shelfSkin; if (!s) return; c.shelfSkin = null;
  if (s.obj.parent) s.obj.parent.remove(s.obj); s.mats.forEach(m => m.dispose());
  [c.spineTex, c.coverTex].forEach(t => { if (t) { t.matrixAutoUpdate = true; t.matrix.identity(); } });
  if (!c.skin) { [c.shell, c.lid, c.spine].forEach(m => { m.visible = true; }); c.dustMeshes.forEach(m => { m.visible = c.g.dust > .01; }); }
}
/* the game on the shelf, in its box */
function skinShelf(c) {
  const key = c.dim.skin; if (!key || c.disposed || c.shelfSkin) { if (c.shelfSkin) skinShelfMap(c); return; }
  const root = UGCS.models.get(key), R = root && root.userData.rects; if (!root || !root.userData.closed || !R) return;
  const obj = skinCopy(root.userData.closed), mats = [], made = new Map();
  obj.traverse(o => {
    if (!o.isMesh) return; o.userData.case = c;
    if (!o.userData.artFace) return;
    const list = Array.isArray(o.material) ? o.material.slice() : [o.material], first = list[0];
    if (!made.has(first)) { const m = first.clone(); m.userData.envBase = first.userData.envBase; m.envMapIntensity = first.envMapIntensity; made.set(first, m); mats.push(m); }
    list[0] = made.get(first); o.material = list.length > 1 ? list : list[0];
  });
  c.shelfSkin = { obj, mats, rects: R }; c.inner.add(obj);
  [c.shell, c.lid, c.spine, ...c.dustMeshes].forEach(m => { m.visible = false; });
  obj.visible = !c.skin; skinShelfMap(c);
}

/* ---------- wearing it ---------- */
function skinPaint(c, root) {
  const R = root.userData.rects || {}, list = (root.userData.art || []).length ? root.userData.art : [], seen = new Set();
  list.forEach(m => { const mt = Array.isArray(m.material) ? m.material[0] : m.material; if (mt) seen.add(mt); });
  if (!seen.size) return;
  const W = 1024, H = 1024, cv = mkCanvas(W, H), x = cv.getContext('2d');
  /* what the picture has besides the three faces (the inside of the case) carries the author's sample game: it goes */
  x.fillStyle = mix(c.g.pal[0], '#000000', .35); x.fillRect(0, 0, W, H);
  if (c.coverCanvas) { x.globalAlpha = .28; x.drawImage(c.coverCanvas, 0, 0, W, H); x.globalAlpha = 1; x.fillStyle = hexA(mix(c.g.pal[0], '#000000', .35), .55); x.fillRect(0, 0, W, H); }
  const put = (art, r) => { if (!art || !r) return; const X = r.u0 * W, Y = (1 - r.v1) * H, w = (r.u1 - r.u0) * W, h = (r.v1 - r.v0) * H; x.save(); x.translate(X + (r.flip ? w : 0), Y); x.scale(r.flip ? -1 : 1, 1); if (r.turn) { x.translate(w, 0); x.rotate(Math.PI / 2); x.drawImage(art, 0, 0, h, w); } else x.drawImage(art, 0, 0, w, h); x.restore(); };
  put(c.coverCanvas, R.front); put(c.backTex && c.backTex.image, R.back); put(c.spineCanvas, R.spine);
  const t = tex(cv); seen.forEach(mt => { mt.map = t; mt.color.set('#ffffff'); mt.needsUpdate = true; });
  if (root.userData.artTex) root.userData.artTex.dispose(); root.userData.artTex = t;
}
function skinPose(c, o) { const s = c.skin, an = s.root.userData.anim; if (!an || s.o === o) return; s.o = o; if (an.clips.open) an.apply(an.clips.open, an.clips.open.dur * o); else if (an.clips.close) an.apply(an.clips.close, an.clips.close.dur * (1 - o)); }
function skinWear(c) {
  const key = c.dim.skin; if (!key || c.disposed) return;
  const root = UGCS.models.get(key);
  if (!root) { if (UGCS.meta()[key] && !UGCS.building.has(key)) UGCS.load([key]).then(() => { if (UGCS.models.has(key) && !c.disposed && c.detail) skinWear(c); }); return; }
  if (root.userData.wornBy && root.userData.wornBy !== c) return;
  if (c.skin) { skinPaint(c, root); return; }
  root.userData.wornBy = c; root.visible = true; c.inner.add(root);
  if (c.shelfSkin) c.shelfSkin.obj.visible = false;
  c.skin = { root, o: -1 }; root.traverse(o => { if (o.isMesh) { o.userData.case = c; o.userData.part = null; } });
  [c.shell, c.lid, c.spine, ...c.dustMeshes].forEach(m => { m.visible = false; });
  (c.interior || []).forEach(([, o]) => { o.visible = false; });
  skinPaint(c, root);
  /* where the medium rests, with the box open */
  const S = root.userData.anchors.socket;
  skinPose(c, 1); root.updateMatrixWorld(true); c.inner.updateMatrixWorld(true);
  const toIn = new THREE.Matrix4().copy(c.inner.matrixWorld).invert(), bb = new THREE.Box3(), mb = new THREE.Box3();
  root.userData.meshes.forEach(m => { if (!m.geometry.boundingBox) m.geometry.computeBoundingBox(); for (let o = m; o && o !== root; o = o.parent) if (!o.visible) return; mb.copy(m.geometry.boundingBox).applyMatrix4(new THREE.Matrix4().multiplyMatrices(toIn, m.matrixWorld)); bb.union(mb); });
  /* it opens like a book, or to one side: what stays centred on screen is the open box */
  c.skin.shift = bb.isEmpty() ? 0 : -(bb.min.x + bb.max.x) / 2;
  /* whatever is nearest the viewer at a point of the open box */
  const rc = new THREE.Raycaster(), frontZ = (x, y) => { rc.set(c.inner.localToWorld(new V3(x, y, c.dim.d + 60)), c.inner.localToWorld(new V3(x, y, 0)).sub(c.inner.localToWorld(new V3(x, y, 1))).normalize()); const h = rc.intersectObjects(root.userData.meshes, false)[0]; return h ? c.inner.worldToLocal(h.point.clone()).z : null; };
  if (c.disc) {
    const d = c.disc, male = d.userData.male; let p = S ? S.getWorldPosition(new V3()).applyMatrix4(toIn) : new V3(0, 0, c.dim.d / 2);
    if (S && male) {
      /* EmuVR's own medium in EmuVR's box: male socket on female socket, as in its machines */
      const e = new THREE.Matrix4().multiplyMatrices(toIn, S.matrixWorld).elements, F = new THREE.Matrix4().makeBasis(new V3(e[0], e[1], e[2]).normalize(), new V3(e[4], e[5], e[6]).normalize(), new V3(e[8], e[9], e[10]).normalize());
      const q = new Q4().setFromRotationMatrix(F.multiply(male.m.clone().invert())); d.quaternion.copy(q); c.discQuat = q.clone(); p = p.clone().sub(male.p.clone().applyQuaternion(q));
      /* a lid that stands up holds its medium edge-on (a cassette box), and a box that does not really open keeps it inside: it comes out and lies on the half that faces you, label up, turned to fit */
      const size = d.children[0].userData.size, ax = new V3(size.x * .3, 0, 0).applyQuaternion(q), ay = new V3(0, size.y * .3, 0).applyQuaternion(q), top = p.z + size.z / 2 + .05;
      const hid = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].filter(([a, b]) => { const z = frontZ(p.x + ax.x * a + ay.x * b, p.y + ax.y * a + ay.y * b); return z !== null && z > top; }).length;
      if (new V3(0, 0, 1).applyQuaternion(q).z < .85 || hid >= 2 || Math.abs(p.y) > c.dim.h / 2) {
        const z = frontZ(0, 0);
        q.identity(); if (size.x > c.dim.w && size.y < size.x) q.setFromAxisAngle(new V3(0, 0, 1), Math.PI / 2);
        d.quaternion.copy(q); c.discQuat = q.clone(); p.set(0, 0, (z === null ? c.dim.d / 2 : z) + Math.min(size.x, size.y, size.z) / 2 + .1);
      }
    }
    /* a medium that stays behind a flap comes out in front of it, or you would never see it */
    if (Math.abs(p.y) > c.dim.h / 2 && !male) p.set(0, 0, p.z);
    const z = frontZ(p.x, p.y); if (z !== null && z > p.z + .2 && !male) p.z = z + (c.dim.media === 'disc' ? .2 : (MSIZE[c.dim.media] ? MSIZE[c.dim.media].t / 2 + .1 : .6));
    c.discHome.copy(p); d.position.copy(p); if (d.parent !== c.inner) c.inner.add(d); if (c.thick && !c.thick.includes(d)) c.thick.push(d); c.thickAt = .35;
  }
  /* the manual lies on the free half of the open box, never on the medium; with no free half it stays out of sight */
  if (c.manual) {
    const m = c.manual, sp = { L: -c.dim.w / 2 - bb.min.x, R: bb.max.x - c.dim.w / 2 }, side = sp.L >= sp.R ? 'L' : 'R', room = sp[side];
    const x = side === 'L' ? (bb.min.x - c.dim.w / 2) / 2 : (bb.max.x + c.dim.w / 2) / 2, z = frontZ(x, 0);
    if (!bb.isEmpty() && room > 4 && z !== null) {
      const g = m.geometry.parameters, k = Math.min(1, (room - .6) / g.width, (c.dim.h - .6) / g.height);
      c.inner.add(m); m.position.set(x, 0, z + .1); m.rotation.set(0, Math.PI, 0); m.scale.setScalar(k); if (c.thick) c.thick.push(m); c.skin.manual = true;
    } else m.visible = false;
  }
  skinPose(c, c.openA);
}
function skinOff(c) {
  const s = c.skin; if (!s) return; c.skin = null;
  s.root.userData.wornBy = null; if (s.root.parent) s.root.parent.remove(s.root);
  s.root.traverse(o => { if (o.isMesh) o.userData.case = null; });
  if (c.shelfSkin) c.shelfSkin.obj.visible = true;
  else { [c.shell, c.lid, c.spine].forEach(m => { m.visible = true; }); c.dustMeshes.forEach(m => { m.visible = c.g.dust > .01; }); }
  (c.interior || []).forEach(([, o]) => { o.visible = true; });
  if (c.manual) { const m = c.manual; if (s.manual) { const i = c.thick ? c.thick.indexOf(m) : -1; if (i >= 0) c.thick.splice(i, 1); c.pivot.add(m); m.position.set(c.dim.w / 2 - .1, 0, -.09); m.rotation.set(0, 0, 0); m.scale.setScalar(1); } m.visible = true; }
  c.inner.position.x = 0;
}
/* the medium of a game whose system has one chosen; null keeps our own */
function skinMedium(c) {
  const key = 'med:' + skinSlot(c.g), root = UGCS.models.get(key);
  if (!root) { if (UGCS.meta()[key] && !UGCS.building.has(key)) UGCS.load([key]); return null; }
  if (root.userData.wornBy && root.userData.wornBy !== c) return null;
  root.userData.wornBy = c; root.visible = true;
  const W = new THREE.Group(); W.add(root); W.userData.male = root.userData.male; W.userData.skin = true; return W;
}
function skinMediumOff(c) { const d = c.disc; if (!d || !d.userData.skin) return; const root = d.children[0]; if (root) { root.userData.wornBy = null; d.remove(root); root.traverse(o => { if (o.isMesh) o.userData.case = null; }); } }
/* the game's sticker on the medium: the label's own part of its texture stretches over the picture */
function skinLabel(c) {
  const d = c.disc; if (!d || !d.userData.skin || !c.discTex) return;
  const root = d.children[0], L = root && root.userData.anchors.label; if (!L) return;
  const UV = L.geometry.attributes.uv; if (!UV) return;
  let u0 = 9, u1 = -9, v0 = 9, v1 = -9; for (let i = 0; i < UV.count; i++) { const u = UV.getX(i), v = UV.getY(i); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const t = c.discTex, mt = Array.isArray(L.material) ? L.material[0] : L.material;
  if (c.g.fmt === 'cass') { t.image = musicLabel(c.g, c.coverCanvas, true); t.needsUpdate = true; }
  if (u1 > u0 && v1 > v0) { t.repeat.set(1 / (u1 - u0), 1 / (v1 - v0)); t.offset.set(-u0 / (u1 - u0), -v0 / (v1 - v0)); }
  mt.map = t; mt.color.set('#ffffff'); mt.needsUpdate = true;
}
