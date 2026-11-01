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
/* the biggest a box may be: a format bigger than that (a record's sleeve) has shelves of its own size */
function skinMax(key) { const b = DIMS[key.slice(4)]; return b ? { w: Math.max(SKIN_MAX.w, b.w), h: Math.max(SKIN_MAX.h, b.h) } : SKIN_MAX; }
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
function skinFitBox(root, key) {
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
  const max = skinMax(key), size = skinPlace(root, right, up, axis, max.w, max.h);
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
  root.userData.dim = box ? skinFitBox(root, key) : (skinFitMedium(root), null);
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
/* ---------- the box at work ----------
   EmuVR keeps no list of boxes and has no idea how far any of them opens. It runs the model's own clips and
   hangs the medium from the model's own socket (male socket on female socket, and the medium becomes its
   child), so whatever a clip moves carries the medium along: a DVD's socket stays on the back while the front
   swings 180°, a cassette box's rides on its 90° lid, a SNES box's on the tray that slides out. Here it is the
   same, and nothing below knows a kind of box. Two things have no counterpart in EmuVR, where you walk round a
   box and reach into it, and are looked for on the model itself with rays: which way to hold it open so that
   the medium can be seen (and, when no way shows it, by which side to draw it out), and where a manual fits. */
const _sm1 = new THREE.Matrix4(), _sm2 = new THREE.Matrix4(), _sm3 = new THREE.Matrix4(), _wp = new V3(), _wq = new Q4(), _ws = new V3();
const SKIN_PULL_T = .6;
/* where a part of the model is now, in the case's own space */
function skinAt(root, o, out) { return out.copy(root.matrix).multiply(_sm1.copy(root.matrixWorld).invert()).multiply(o.matrixWorld); }
/* one clip's seconds, the time a box takes to open or shut, and the share of it that belongs to the clip */
function skinClipT(c, shut) { const C = (c.skin.root.userData.anim || { clips: {} }).clips, k = shut ? C.close || C.open : C.open || C.close; return k ? clamp(k.dur, .3, 3.2) : .5; }
function skinTime(c, shut) { return skinClipT(c, shut) + (c.skin.pull ? SKIN_PULL_T : 0); }
/* whatever rides on the box goes where its part took it */
function skinRide(c, o) {
  const s = c.skin, root = s.root; if (!s.riders.length) return;
  root.updateMatrixWorld(true);
  const P = s.pull, share = skinClipT(c, s.shut) / skinTime(c, s.shut), e = P ? easeIO(clamp((o - share) / (1 - share), 0, 1)) : 0;
  for (const r of s.riders) {
    /* the medium is the app's while it travels: it rides again once it is back where it was left */
    const b = r.obj; if (b.parent !== c.inner || (r.last && b.position.distanceToSquared(r.last) > 1e-5 && !(r.home && b.position.distanceToSquared(r.home) < 1e-5))) continue;
    _sm2.multiplyMatrices(skinAt(root, r.part, _sm3), r.base).decompose(_wp, _wq, _ws);
    if (r.pulled && P) _wp.addScaledVector(P.v, P.len * e);
    b.position.copy(_wp); b.quaternion.copy(_wq); (r.last = r.last || new V3()).copy(_wp);
  }
}
/* the model's own clips, the opening one on the way up and the closing one on the way down: each brings its own easing */
function skinPose(c, o) {
  const s = c.skin, an = s.root.userData.anim; if (s.o === o) return;
  if (s.o >= 0 && o !== s.o) s.shut = o < s.o;
  const t = Math.min(1, o * skinTime(c, s.shut) / skinClipT(c, s.shut)); s.o = o;
  if (an) { const C = an.clips, k = s.shut ? C.close || C.open : C.open || C.close; if (k) an.apply(k, k === C.open ? k.dur * t : k.dur * (1 - t)); }
  skinRide(c, o);
}
/* every frame: the pose, and the way the box is held (lying on a table it stays as it lies) */
function skinMove(c, o, dt) {
  const s = c.skin, v = s.view; skinPose(c, o);
  s.lean += ((c.mode === 'rest' ? 0 : 1) - s.lean) * (1 - Math.exp(-7 * dt)); c.pivot.rotation.y = 0;
  const e = easeIO(o) * s.lean; c.inner.quaternion.identity().slerp(v.q, e); c.inner.position.set(v.p.x * e, v.p.y * e, 0);
}
/* the open box as plain triangles in the case's space, in small bundles with their bounds, so that rays can look at
   thousands of them (what bends is posed once, here). What you can see through stops nothing, except a printed card. */
function skinTris(meshes, at) {
  const out = { b: [], pos: [] }, v = new V3();
  for (const m of meshes) {
    const G = m.geometry, P = G.attributes.position, I = G.index.array, M = at(m), mats = [].concat(m.material), pos = new Float32Array(P.count * 3);
    for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i); if (m.isSkinnedMesh) m.boneTransform(i, v); v.applyMatrix4(M).toArray(pos, i * 3); }
    out.pos.push(pos);
    for (const g of G.groups.length ? G.groups : [{ start: 0, count: I.length, materialIndex: 0 }]) {
      const t = mats[g.materialIndex] || mats[0]; if (t && t.transparent && !m.userData.artFace) continue;
      for (let s = g.start, end = g.start + g.count; s < end; s += 96) {
        const to = Math.min(end, s + 96), lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        for (let i = s; i < to; i++) { const q = I[i] * 3; for (let k = 0; k < 3; k++) { const w = pos[q + k]; if (w < lo[k]) lo[k] = w; if (w > hi[k]) hi[k] = w; } }
        out.b.push({ m, I, pos, from: s, to, lo, hi });
      }
    }
  }
  return out;
}
/* the first triangle a ray meets, whichever side it comes from: where, how far, which way it looks (towards the ray) */
function skinHit(T, o, d) {
  const ox = o.x, oy = o.y, oz = o.z, dx = d.x || 1e-9, dy = d.y || 1e-9, dz = d.z || 1e-9, ix = 1 / dx, iy = 1 / dy, iz = 1 / dz; let near = Infinity, B = null, at = 0;
  for (const b of T.b) {
    const ax = (b.lo[0] - ox) * ix, bx = (b.hi[0] - ox) * ix, ay = (b.lo[1] - oy) * iy, by = (b.hi[1] - oy) * iy, az = (b.lo[2] - oz) * iz, bz = (b.hi[2] - oz) * iz;
    const t0 = Math.max(Math.min(ax, bx), Math.min(ay, by), Math.min(az, bz), 0), t1 = Math.min(Math.max(ax, bx), Math.max(ay, by), Math.max(az, bz), near); if (t0 > t1) continue;
    const I = b.I, p = b.pos;
    for (let i = b.from; i + 2 < b.to; i += 3) {
      const a = I[i] * 3, e = I[i + 1] * 3, f = I[i + 2] * 3, x0 = p[a], y0 = p[a + 1], z0 = p[a + 2], ux = p[e] - x0, uy = p[e + 1] - y0, uz = p[e + 2] - z0, vx = p[f] - x0, vy = p[f + 1] - y0, vz = p[f + 2] - z0;
      const px = dy * vz - dz * vy, py = dz * vx - dx * vz, pz = dx * vy - dy * vx, det = ux * px + uy * py + uz * pz; if (det > -1e-10 && det < 1e-10) continue;
      const k = 1 / det, tx = ox - x0, ty = oy - y0, tz = oz - z0, u = (tx * px + ty * py + tz * pz) * k; if (u < 0 || u > 1) continue;
      const qx = ty * uz - tz * uy, qy = tz * ux - tx * uz, qz = tx * uy - ty * ux, w = (dx * qx + dy * qy + dz * qz) * k; if (w < 0 || u + w > 1) continue;
      const t = (vx * qx + vy * qy + vz * qz) * k; if (t > 1e-4 && t < near) { near = t; B = b; at = i; }
    }
  }
  if (!B) return null;
  const I = B.I, p = B.pos, a = I[at] * 3, e = I[at + 1] * 3, f = I[at + 2] * 3, n = new V3(p[e] - p[a], p[e + 1] - p[a + 1], p[e + 2] - p[a + 2]).cross(new V3(p[f] - p[a], p[f + 1] - p[a + 1], p[f + 2] - p[a + 2])).normalize();
  if (n.dot(d) > 0) n.negate();
  return { d: near, p: o.clone().addScaledVector(d, near), n, m: B.m, a: I[at] };
}
/* the size of one of our own media, on its own axes */
function skinMedSize(c) { const D = c.dim, m = D.media; return m === 'disc' ? new V3(2 * D.discR, 2 * D.discR, .15) : m === 'tape' || m === 'cass' ? new V3(MSIZE[m].h, MSIZE[m].w, MSIZE[m].t) : new V3(MSIZE[m].w, MSIZE[m].h, MSIZE[m].t); }
/* a box and what goes in it, looked at once: the seat of the medium, how to hold the box, the manual's place */
function skinMeasure(c, root) {
  const A = root.userData.anchors, an = root.userData.anim, C = an ? an.clips : {}, S = A.socket || root, d = c.disc, male = d && A.socket ? d.userData.male : null, D = c.dim, k0 = root.scale.x;
  const at = o => skinAt(root, o, new THREE.Matrix4()), comp = (p, q) => new THREE.Matrix4().compose(p, q, new V3(1, 1, 1));
  const nodes = new Set(); [C.open, C.close].forEach(k => k && k.binds.forEach(b => { if (b.node && b.type === 4) nodes.add(b.node); }));
  skinClosed(root); const shut = new Map([...nodes].map(o => [o, at(o)])), S0 = at(S), sealed = skinTris(root.userData.meshes.filter(m => { for (let o = m; o && o !== root; o = o.parent) if (!o.visible) return false; return true; }), at);
  if (C.open) an.apply(C.open, C.open.dur); else if (C.close) an.apply(C.close, 0);
  root.updateMatrixWorld(true);
  const S1 = at(S), moved = new Set([...shut].filter(([o, m]) => { const e = at(o).multiply(m.clone().invert()).elements; return Math.hypot(e[12], e[13], e[14]) > .3 || (e[0] + e[5] + e[10] - 1) / 2 < .995; }).map(e => e[0]));
  const meshes = root.userData.meshes.filter(m => { for (let o = m; o && o !== root; o = o.parent) if (!o.visible) return false; return true; });
  const tris = skinTris(meshes, at), hit = (o, dir) => skinHit(tris, o, dir);
  /* the medium's seat with the box open */
  const q1 = new Q4(), p1 = new V3(), size = d ? (male ? d.children[0].userData.size.clone().multiplyScalar(k0) : skinMedSize(c)) : new V3();
  if (d && male) {
    const e = S1.elements, F = new THREE.Matrix4().makeBasis(new V3(e[0], e[1], e[2]).normalize(), new V3(e[4], e[5], e[6]).normalize(), new V3(e[8], e[9], e[10]).normalize());
    q1.setFromRotationMatrix(F.multiply(male.m.clone().invert())); p1.setFromMatrixPosition(S1).sub(male.p.clone().multiplyScalar(k0).applyQuaternion(q1));
  } else if (d) {
    /* one of our own has no socket: it lies flat inside the shut box as near the model's socket as it fits, in the widest gap there is, and moves as the socket moves */
    const q0 = (c.discQuat || new Q4()).clone(), half = q => { const a = new V3(size.x / 2, 0, 0).applyQuaternion(q), b = new V3(0, size.y / 2, 0).applyQuaternion(q), f = new V3(0, 0, size.z / 2).applyQuaternion(q); return new V3(Math.abs(a.x) + Math.abs(b.x) + Math.abs(f.x), Math.abs(a.y) + Math.abs(b.y) + Math.abs(f.y), Math.abs(a.z) + Math.abs(b.z) + Math.abs(f.z)); };
    const h = half(q0), fit = (v, room) => room <= 0 ? 0 : clamp(v, -room, room), p0 = new V3().setFromMatrixPosition(S0); p0.set(fit(p0.x, D.w / 2 - h.x), fit(p0.y, D.h / 2 - h.y), fit(p0.z, D.d / 2 - h.z));
    const down = new V3(0, 0, -1), gaps = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([i, j]) => { const o = new V3(p0.x + i * h.x * .6, p0.y + j * h.y * .6, D.d + 20); let z = null, best = 0, mid = 0; for (let k = 0; k < 16; k++) { const f = skinHit(sealed, o, down); if (!f) break; if (z !== null && z - f.p.z > best) { best = z - f.p.z; mid = (z + f.p.z) / 2; } z = f.p.z; o.z = z - .001; } return best > 0 ? mid : null; }).filter(v => v !== null).sort((a, b) => a - b);
    if (gaps.length) p0.z = gaps[gaps.length >> 1];
    const rel = S1.clone().multiply(S0.clone().invert()), place = q => rel.clone().multiply(comp(p0, q)).decompose(p1, q1, _ws); place(q0);
    /* on a lid it must end up looking at you, not at the lid */
    if (new V3(0, 0, 1).applyQuaternion(q1).z < .2 && S1.elements[12] !== S0.elements[12]) place(q0.clone().multiply(new Q4().setFromAxisAngle(new V3(0, 1, 0), Math.PI)));
    /* a clip may spin the socket as it slides: a printed disc still comes out with its label straight */
    else if (D.media === 'disc') q1.identity();
  }
  const ax = new V3(1, 0, 0).applyQuaternion(q1), ay = new V3(0, 1, 0).applyQuaternion(q1), n = new V3(0, 0, 1).applyQuaternion(q1);
  /* the medium, nine points through its middle */
  let P = []; if (d) for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) P.push(p1.clone().addScaledVector(ax, i * size.x * .36).addScaledVector(ay, j * size.y * .36));
  const hidden = (L, v) => { if (!L.length) return 0; const back = v.clone().negate(); return L.filter(x => { const o = x.clone().addScaledVector(v, 90), h = hit(o, back); return h && h.d < 89.95; }).length / L.length; };
  /* the way to hold it open: what shows the medium, flat towards you (best its label: a tape in a lid has it against the lid), turned as little as will do */
  const hold = L => { let out = null; for (const yaw of d ? [0, .25, -.25, .5, -.5, .8, -.8, 1.05, -1.05] : [0]) for (const pitch of d ? [0, .35, -.35, .7, -.7, 1.05, -1.05, 1.3, -1.3] : [0]) { const q = new Q4().setFromEuler(new EU(pitch, yaw, 0)), v = new V3(0, 0, 1).applyQuaternion(q.clone().invert()), hid = hidden(L, v), f = n.dot(v), cost = 3 * hid + (1 - Math.abs(f)) + (f < 0 ? .25 : 0) + .35 * (1 - Math.cos(yaw) * Math.cos(pitch)); if (!out || cost < out.cost) out = { q, v, hid, cost, flat: Math.abs(f) }; } return out; };
  let view = hold(P), pull = null, lift = d ? n.clone() : new V3(0, 0, 1), through = false;
  /* it stays out of sight, or could only be seen from far round the side or edge-on (a box that opens at the top, a tape between the leaves of its card): a hand would draw it out by the side that is open */
  if (d && (view.hid > .5 || view.cost > .75)) {
    const axes = [ax, ay, n].flatMap(a => [a.clone(), a.clone().negate()]), len = a => Math.abs(a.dot(ax)) * size.x + Math.abs(a.dot(ay)) * size.y + Math.abs(a.dot(n)) * size.z;
    /* a clip that slides the medium along its own plane and leaves it hidden says itself which way is out (a record half out of its sleeve; a lid swinging it round does not count);
       otherwise, the side the opening freed: where a ray goes further with the box open than shut, or gets away altogether */
    const slid = new V3().setFromMatrixPosition(S1).sub(new V3().setFromMatrixPosition(S0)), turn = new Q4().setFromRotationMatrix(S1.clone().multiply(S0.clone().invert())), slides = view.hid > .5 && slid.length() > 1 && n.clone().applyQuaternion(turn).dot(n) > .98;
    const reach = (T, a) => P.reduce((m, x) => { const h = skinHit(T, x.clone().addScaledVector(a, .05), a); return m + (h ? Math.min(h.d, 40) : 40); }, 0) / P.length;
    const ways = axes.map(a => { const go = reach(tris, a), gain = go - reach(sealed, a); return { a, go, gain, s: (go >= 40 ? 1 : 0) + gain / 8 + .3 * a.y + .15 * a.z }; }).sort((u, w) => w.s - u.s), way = slides ? slid.clone().normalize() : ways[0].a;
    if (slides || ways[0].go >= 40 || ways[0].gain > .5) for (let t = len(way) * .35, end = Math.abs(way.x) * D.w + Math.abs(way.y) * D.h + Math.abs(way.z) * D.d + len(way); t <= end && !pull; t += len(way) * .15) { const Q = P.map(x => x.clone().addScaledVector(way, t)), w = hold(Q); if (w.hid <= .12 && w.flat > .5 && w.cost < .62) { pull = { v: way.clone(), len: t }; view = w; P = Q; lift = way.clone(); } }
    /* a box that does not open at all: the medium comes to lie on its front */
    if (!pull && view.hid > .5) {
      const f = hit(new V3(0, 0, D.d + 60), new V3(0, 0, -1)), z = f ? f.p.z : D.d / 2; through = true;
      q1.identity(); if (size.x > D.w && size.y < size.x) q1.setFromAxisAngle(new V3(0, 0, 1), Math.PI / 2);
      p1.set(0, 0, z + size.z / 2 + .1); lift.set(0, 0, 1); view = { q: new Q4(), v: new V3(0, 0, 1), hid: 0 }; P = [p1.clone()];
    }
  }
  if (!pull && lift.dot(view.v) < 0) lift.negate();
  /* how big the open box is, held that way */
  const R = new THREE.Matrix4().makeRotationFromQuaternion(view.q), Ri = R.clone().invert(), ext = new THREE.Box3(), add = v => ext.expandByPoint(v.applyMatrix4(R)), v0 = new V3();
  tris.pos.forEach(a => { const step = 3 * Math.max(1, (a.length / 3) >> 12); for (let i = 0; i < a.length; i += step) add(v0.fromArray(a, i)); });
  const seat = pull ? p1.clone().addScaledVector(pull.v, pull.len) : p1.clone();
  /* the manual: the biggest flat bit of the open box that looks your way and is not the medium. It stays on that part, so it swings with a lid */
  let man = null;
  if (c.manual && !through) {
    const g = c.manual.geometry.parameters, ux = new V3(1, 0, 0).transformDirection(Ri), uy = new V3(0, 1, 0).transformDirection(Ri), v = view.v, W = ext.max.x - ext.min.x, H = ext.max.y - ext.min.y, step = Math.max(.7, Math.max(W, H) / 32);
    const nx = Math.ceil(W / step), ny = Math.ceil(H / step), cells = [], mrect = new THREE.Box3(), vp = new V3();
    if (d) [-1, 1].forEach(i => [-1, 1].forEach(j => mrect.expandByPoint(vp.copy(seat).addScaledVector(ax, i * size.x / 2).addScaledVector(ay, j * size.y / 2).applyMatrix4(R))));
    const carrier = h => { let o = h.m; if (o.isSkinnedMesh) { const G = o.geometry.attributes, a = h.a; let best = 0, bw = -1; for (let i = 0; i < 4; i++) { const w = G.skinWeight.array[a * 4 + i]; if (w > bw) { bw = w; best = G.skinIndex.array[a * 4 + i]; } } o = o.skeleton.bones[best] || o; } for (; o && o !== root; o = o.parent) if (moved.has(o)) return o; return root; };
    const back = v.clone().negate();
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = ext.min.x + (i + .5) * step, y = ext.min.y + (j + .5) * step; cells.push(null);
      if (d && x > mrect.min.x - .4 && x < mrect.max.x + .4 && y > mrect.min.y - .4 && y < mrect.max.y + .4) continue;
      const h = hit(new V3().addScaledVector(ux, x).addScaledVector(uy, y).addScaledVector(v, ext.max.z + 30), back); if (!h) continue;
      if (h.n.dot(v) < .35) continue;
      const part = carrier(h), m0 = part === root ? null : shut.get(part).clone().multiply(at(part).invert()), p0 = h.p.clone(), n0 = h.n.clone(); if (m0) { p0.applyMatrix4(m0); n0.transformDirection(m0); }
      if (!skinHit(sealed, p0.addScaledVector(n0, .03), n0)) continue;
      cells[j * nx + i] = { part, p: h.p, n: h.n };
    }
    const fits = (i0, j0, a, b) => { const f = cells[j0 * nx + i0]; if (!f) return null; for (let j = j0; j < j0 + b; j++) for (let i = i0; i < i0 + a; i++) { const q = cells[j * nx + i]; if (!q || q.part !== f.part || Math.abs(_st.subVectors(q.p, f.p).dot(f.n)) > .55) return null; } return f; };
    for (let k = 1; k >= .39 && !man; k -= .1) {
      const a = Math.ceil(g.width * k / step), b = Math.ceil(g.height * k / step); let found = null;
      for (let j = 0; j + b <= ny; j++) for (let i = 0; i + a <= nx; i++) {
        const f = fits(i, j, a, b); if (!f) continue;
        /* a part that moves is where a manual lives; among places alike, the middle of what is free */
        const dc = Math.hypot(i + a / 2 - nx / 2, j + b / 2 - ny / 2) / Math.max(nx, ny), score = (f.part === root ? 0 : 1) - dc;
        if (!found || score > found.score) found = { score, i, j, part: f.part };
      }
      if (!found) continue;
      const pts = [], nrm = new V3(); for (let j = found.j; j < found.j + b; j++) for (let i = found.i; i < found.i + a; i++) { const q = cells[j * nx + i]; pts.push(q.p); nrm.add(q.n); }
      nrm.normalize(); const mid = pts.reduce((m, q) => m.add(q), new V3()).multiplyScalar(1 / pts.length).addScaledVector(nrm, .07 + .08);
      const y = uy.clone().projectOnPlane(nrm).normalize(), z = nrm.clone().negate(), x = y.clone().cross(z).normalize(), T = new THREE.Matrix4().makeBasis(x, y, z); T.setPosition(mid);
      man = { part: found.part, base: at(found.part).invert().multiply(T), k };
    }
    /* no room inside: if the medium comes out it brings the manual behind it */
    if (!man && (pull || S1.elements[12] !== S0.elements[12] || S1.elements[13] !== S0.elements[13])) {
      const k = Math.min(1, size.y * 1.02 / g.height, D.w * .9 / g.width), y = ay.clone(), z = n.clone().negate(), x = y.clone().cross(z).normalize(), T = new THREE.Matrix4().makeBasis(x, y, z); T.setPosition(p1.clone().addScaledVector(n, -size.z / 2 - .16).addScaledVector(ax, size.x * .3));
      man = { part: S, base: S1.clone().invert().multiply(T), k, pulled: !!pull };
    }
  }
  if (d) { [-1, 1].forEach(i => [-1, 1].forEach(j => add(v0.copy(seat).addScaledVector(ax, i * size.x / 2).addScaledVector(ay, j * size.y / 2)))); }
  return {
    part: through ? root : S, base: (through ? root.matrix.clone() : S1.clone()).invert().multiply(comp(p1, q1)), home: seat, quat: q1.clone(), lift, pull, through, man,
    view: { q: view.q, p: new V3((ext.min.x + ext.max.x) / -2, (ext.min.y + ext.max.y) / -2, 0), w: ext.max.x - ext.min.x, h: ext.max.y - ext.min.y }
  };
}
function skinWear(c) {
  const key = c.dim.skin; if (!key || c.disposed) return;
  const root = UGCS.models.get(key);
  if (!root) { if (UGCS.meta()[key] && !UGCS.building.has(key)) UGCS.load([key]).then(() => { if (UGCS.models.has(key) && !c.disposed && c.detail) skinWear(c); }); return; }
  if (root.userData.wornBy && root.userData.wornBy !== c) return;
  if (c.skin) { skinPaint(c, root); return; }
  root.userData.wornBy = c; root.visible = true; c.inner.add(root);
  if (c.shelfSkin) c.shelfSkin.obj.visible = false;
  c.skin = { root, o: -1, shut: false, lean: 1, riders: [], pull: null, view: null }; root.traverse(o => { if (o.isMesh) { o.userData.case = c; o.userData.part = null; } });
  [c.shell, c.lid, c.spine, ...c.dustMeshes].forEach(m => { m.visible = false; });
  (c.interior || []).forEach(([, o]) => { o.visible = false; });
  skinPaint(c, root);
  const d = c.disc, m = c.manual, s = c.skin, plans = root.userData.plans || (root.userData.plans = new Map());
  const pk = (d ? (d.userData.skin ? d.children[0].userData.skinKey : c.dim.media) : '') + '|' + (m ? c.g.fmt : '');
  if (!plans.has(pk)) { let P = null; try { P = skinMeasure(c, root); } catch (e) { console.warn('skin', key, e); } plans.set(pk, P || { part: root, base: root.matrix.clone().invert().multiply(new THREE.Matrix4().setPosition(0, 0, c.dim.d / 2 + .6)), home: new V3(0, 0, c.dim.d / 2 + .6), quat: new Q4(), lift: new V3(0, 0, 1), pull: null, through: true, man: null, view: { q: new Q4(), p: new V3(), w: c.dim.w, h: c.dim.h } }); }
  const P = plans.get(pk); s.view = P.view; s.pull = P.pull; s.lift = P.lift; c.thickAt = P.through ? .6 : 0;
  if (d) {
    c.discHome.copy(P.home); c.discQuat = P.quat.clone(); d.position.copy(P.home); d.quaternion.copy(P.quat); d.scale.setScalar(root.scale.x);
    if (d.parent !== c.inner) c.inner.add(d); if (c.thick && !c.thick.includes(d)) c.thick.push(d);
    s.riders.push({ obj: d, part: P.part, base: P.base, pulled: true, home: c.discHome });
  }
  if (m) {
    if (P.man) { c.inner.add(m); m.rotation.set(0, 0, 0); m.scale.setScalar(P.man.k); if (c.thick) c.thick.push(m); s.manual = true; s.riders.push({ obj: m, part: P.man.part, base: P.man.base, pulled: P.man.pulled }); }
    else m.visible = false;
  }
  s.o = -1; skinPose(c, c.openA);
}
function skinOff(c) {
  const s = c.skin; if (!s) return; c.skin = null;
  s.root.userData.wornBy = null; if (s.root.parent) s.root.parent.remove(s.root);
  s.root.traverse(o => { if (o.isMesh) o.userData.case = null; });
  if (c.shelfSkin) c.shelfSkin.obj.visible = true;
  else { [c.shell, c.lid, c.spine].forEach(m => { m.visible = true; }); c.dustMeshes.forEach(m => { m.visible = c.g.dust > .01; }); }
  (c.interior || []).forEach(([, o]) => { o.visible = true; });
  if (c.manual) { const m = c.manual; if (s.manual) { const i = c.thick ? c.thick.indexOf(m) : -1; if (i >= 0) c.thick.splice(i, 1); c.pivot.add(m); m.position.set(c.dim.w / 2 - .1, 0, -.09); m.rotation.set(0, 0, 0); m.scale.setScalar(1); } m.visible = true; }
  c.inner.position.set(0, 0, 0); c.inner.quaternion.identity();
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
/* the pieces of its picture a label is made of: faces on the same piece count once, and a rim's slivers not at all */
function skinPatches(L) {
  const UV = L.geometry.attributes.uv, I = L.geometry.index.array, up = Int32Array.from({ length: UV.count }, (_, i) => i), find = x => { while (up[x] !== x) { up[x] = up[up[x]]; x = up[x]; } return x; };
  for (let i = 0; i + 2 < I.length; i += 3) { const a = find(I[i]); up[find(I[i + 1])] = a; up[find(I[i + 2])] = a; }
  const parts = new Map();
  I.forEach(v => { const k = find(v), u = UV.getX(v), w = UV.getY(v), q = parts.get(k) || { u0: 9, u1: -9, v0: 9, v1: -9 }; q.u0 = Math.min(q.u0, u); q.u1 = Math.max(q.u1, u); q.v0 = Math.min(q.v0, w); q.v1 = Math.max(q.v1, w); parts.set(k, q); });
  const big = [...parts.values()].filter(q => q.u1 - q.u0 > .02 && q.v1 - q.v0 > .02);
  return big.filter((q, i) => !big.slice(0, i).some(o => Math.abs(o.u0 - q.u0) < .02 && Math.abs(o.v0 - q.v0) < .02));
}
/* the game's sticker on the medium: the label's own part of its texture stretches over the picture */
function skinLabel(c) {
  const d = c.disc; if (!d || !d.userData.skin || !c.discTex) return;
  const root = d.children[0], L = root && root.userData.anchors.label; if (!L) return;
  const UV = L.geometry.attributes.uv; if (!UV) return;
  let u0 = 9, u1 = -9, v0 = 9, v1 = -9; for (let i = 0; i < UV.count; i++) { const u = UV.getX(i), v = UV.getY(i); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const t = c.discTex, mt = Array.isArray(L.material) ? L.material[0] : L.material;
  if (c.g.fmt === 'cass') { t.image = musicLabel(c.g, c.coverCanvas, true); t.needsUpdate = true; }
  /* two equal pieces are the two sides of the thing (a record, a tape): each carries the whole sticker */
  const P = skinPatches(L), [a, b] = P;
  if (P.length === 2 && Math.abs((a.u1 - a.u0) - (b.u1 - b.u0)) < .05 && Math.abs((a.v1 - a.v0) - (b.v1 - b.v0)) < .05) {
    const W = 1024, cv = mkCanvas(W, W), x = cv.getContext('2d'); P.forEach(q => x.drawImage(t.image, q.u0 * W, (1 - q.v1) * W, (q.u1 - q.u0) * W, (q.v1 - q.v0) * W)); t.image = cv; t.needsUpdate = true;
  } else if (u1 > u0 && v1 > v0) { t.repeat.set(1 / (u1 - u0), 1 / (v1 - v0)); t.offset.set(-u0 / (u1 - u0), -v0 / (v1 - v0)); }
  mt.map = t; mt.color.set('#ffffff'); mt.needsUpdate = true;
}
