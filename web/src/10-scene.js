
/* =====================================================================
   RENDERER
   ===================================================================== */
const canvasEl = $('#gl');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, powerPreference: 'high-performance' }); } catch (e) { renderer = null; }
if (!renderer) { $('#loadMsg').textContent = 'Este equipo no puede mostrar 3D (WebGL). Activa la aceleración por hardware o actualiza el controlador de la tarjeta gráfica.'; throw new Error('WebGL no disponible'); }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(innerWidth, innerHeight, false);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
const maxAniso = renderer.capabilities.getMaxAnisotropy();
const scene = new THREE.Scene();
scene.background = new THREE.Color('#121110');
scene.fog = new THREE.Fog('#121110', 520, 1200);
const camera = new THREE.PerspectiveCamera(28, innerWidth / innerHeight, 6, 2400);

function tex(c, rep) { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
function dataTex(c, rep) { const t = new THREE.CanvasTexture(c); t.anisotropy = maxAniso; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
const allMats = []; let ENV_K = 1;
function M(Type, p, envBase = 1) { const m = new Type(p); m.userData.envBase = envBase; m.envMapIntensity = envBase * ENV_K; allMats.push(m); return m; }
function unM(m) { if (!m) return; const i = allMats.indexOf(m); if (i >= 0) allMats.splice(i, 1); m.dispose(); }
function setEnvK(k) { ENV_K = k; for (const m of allMats) m.envMapIntensity = m.userData.envBase * k; }
function addBox(w, h, d, mat, x, y, z, parent = scene) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }

/* image-based light: a dim room lit from one warm ceiling light, prefiltered once */
function buildEnv() {
  const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 7, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#2a2622'), side: THREE.BackSide })));
  const panel = (w, h, pos, rot, rgb) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.material.color.setRGB(...rgb); m.position.set(...pos); m.rotation.set(...rot); env.add(m); };
  panel(3.2, 2.4, [1, 3.4, 2], [Math.PI / 2, 0, 0], [3.4, 2.8, 2.1]);
  panel(2, 1.2, [0, 1.2, 5.9], [0, Math.PI, 0], [.9, .8, .7]);
  panel(8, 1, [0, -3.4, 0], [-Math.PI / 2, 0, 0], [.22, .17, .13]);
  panel(1.4, 1, [-5.9, .6, -1], [0, Math.PI / 2, 0], [.35, .45, .7]);
  const rt = pm.fromScene(env, .04); pm.dispose(); return rt.texture;
}
scene.environment = buildEnv();

/* =====================================================================
   LIGHTS: one warm ceiling spot over the table, a weak fill, the TV's glow
   ===================================================================== */
const hemi = new THREE.HemisphereLight('#c9cbff', '#4a3426', .25); scene.add(hemi);
const key = new THREE.SpotLight('#ffd2a0', 1.6, 0, .62, 1, 1);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -.0005; key.shadow.radius = 6; if ('normalBias' in key.shadow) key.shadow.normalBias = .02;
key.shadow.camera.near = 120; key.shadow.camera.far = 700;
const KEY_POS0 = [60, 330, 230], KEY_AIM0 = [-6, 108, -6], KEY_POS = new V3(...KEY_POS0), KEY_AIM = new V3(...KEY_AIM0);
key.position.copy(KEY_POS); key.target.position.copy(KEY_AIM); scene.add(key, key.target);
const fill = new THREE.DirectionalLight('#a9b8ff', .16); fill.position.set(-260, 120, 220); scene.add(fill);
const lampLight = new THREE.PointLight('#ffb15c', .9, 260, 2); scene.add(lampLight);
const tvLight = new THREE.PointLight('#7fa3ff', .25, 140, 2); scene.add(tvLight);
const rowLights = [new THREE.PointLight('#ffcf94', 0, 90, 2)]; rowLights.forEach(l => scene.add(l));
function updateKey() { }

/* =====================================================================
   FURNITURE HELPERS (rounded edges) + fake ambient occlusion
   ===================================================================== */
const FGEO = new Map();
function fgeo(w, h, d, rc = .3, b = .2) { const k = [w, h, d, rc, b].join(); if (!FGEO.has(k)) { const g = slabGeometry(w, h, d, rc, b); g.userData.shared = true; FGEO.set(k, g); } return FGEO.get(k); }
function fbox(w, h, d, mat, x, y, z, parent = scene, rotZ = 0) { const m = new THREE.Mesh(fgeo(w, h, d), mat); m.position.set(x, y, z); m.rotation.z = rotZ; m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
const AO = {};
AO.back = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(makeAOBack()), transparent: true, depthWrite: false });
AO.floor = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(makeAOFloor()), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
const glassMat = M(THREE.MeshPhysicalMaterial, { color: '#000000', transparent: true, opacity: .1, roughness: .04, clearcoat: 1, clearcoatRoughness: .02, depthWrite: false }, 2);
const metal = M(THREE.MeshStandardMaterial, { color: '#2b2c31', roughness: .3, metalness: .7 }, 1.2);
const blackSteel = M(THREE.MeshStandardMaterial, { color: '#17171a', roughness: .35, metalness: .7 }, 1.2);
const brass = M(THREE.MeshStandardMaterial, { color: '#a88450', roughness: .3, metalness: .85 }, 1.2);

/* =====================================================================
   CASE GEOMETRY: rounded halves built from an extruded rounded rectangle
   ===================================================================== */
function slabGeometry(w, h, D, rc, b) {
  const sw = w - 2 * b, sh = h - 2 * b, r = Math.max(.01, Math.min(rc, sw / 2 - .01, sh / 2 - .01));
  const s = new THREE.Shape(), x0 = -sw / 2, y0 = -sh / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + sw - r, y0); s.quadraticCurveTo(x0 + sw, y0, x0 + sw, y0 + r); s.lineTo(x0 + sw, y0 + sh - r); s.quadraticCurveTo(x0 + sw, y0 + sh, x0 + sw - r, y0 + sh);
  s.lineTo(x0 + r, y0 + sh); s.quadraticCurveTo(x0, y0 + sh, x0, y0 + sh - r); s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  const depth = Math.max(.002, D - 2 * b);
  const src0 = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelSegments: 3, curveSegments: 5 });
  const src = src0.index ? src0.toNonIndexed() : src0, P = src.attributes.position.array, n = P.length / 9;
  const cats = [[], [], []], A = new V3(), Bv = new V3(), C = new V3(), ab = new V3(), ac = new V3();
  for (let t = 0; t < n; t++) { const o = t * 9; A.set(P[o], P[o + 1], P[o + 2]); Bv.set(P[o + 3], P[o + 4], P[o + 5]); C.set(P[o + 6], P[o + 7], P[o + 8]); ab.subVectors(Bv, A); ac.subVectors(C, A); ab.cross(ac).normalize(); cats[ab.z > .97 ? 0 : ab.z < -.97 ? 1 : 2].push([o, ab.x, ab.y, ab.z]); }
  const zoff = -depth / 2, pos = [], uv = [], groups = []; let start = 0;
  cats.forEach((list, k) => {
    for (const [o, nx, ny, nz] of list) for (let v = 0; v < 3; v++) {
      const x = P[o + v * 3], y = P[o + v * 3 + 1], z = P[o + v * 3 + 2] + zoff; pos.push(x, y, z);
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
      if (k === 0) uv.push((x + w / 2) / w, (y + h / 2) / h); else if (k === 1) uv.push(1 - (x + w / 2) / w, (y + h / 2) / h);
      else if (ay >= ax && ay >= az) uv.push((x + w / 2) / w, (z + D / 2) / D); else if (ax >= az) uv.push((z + D / 2) / D, (y + h / 2) / h); else uv.push((x + w / 2) / w, (y + h / 2) / h);
    }
    groups.push([start, list.length * 3, k]); start += list.length * 3;
  });
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  groups.forEach(([s0, c, k]) => geo.addGroup(s0, c, k));
  const N = new Float32Array(pos.length);
  for (let i = groups[0][0]; i < groups[0][0] + groups[0][1]; i++) N[i * 3 + 2] = 1;
  for (let i = groups[1][0]; i < groups[1][0] + groups[1][1]; i++) N[i * 3 + 2] = -1;
  const acc = new Map(), s2 = groups[2][0], e2 = s2 + groups[2][1], keyOf = j => `${pos[j].toFixed(3)},${pos[j + 1].toFixed(3)},${pos[j + 2].toFixed(3)}`;
  for (let i = s2; i < e2; i += 3) { A.fromArray(pos, i * 3); Bv.fromArray(pos, (i + 1) * 3); C.fromArray(pos, (i + 2) * 3); ab.subVectors(Bv, A); ac.subVectors(C, A); ab.cross(ac); for (let v = 0; v < 3; v++) { const k = keyOf((i + v) * 3); let a = acc.get(k); if (!a) { a = [0, 0, 0]; acc.set(k, a); } a[0] += ab.x; a[1] += ab.y; a[2] += ab.z; } }
  for (let i = s2; i < e2; i++) { const a = acc.get(keyOf(i * 3)), l = Math.hypot(a[0], a[1], a[2]) || 1; N[i * 3] = a[0] / l; N[i * 3 + 1] = a[1] / l; N[i * 3 + 2] = a[2] / l; }
  geo.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  src0.dispose(); if (src !== src0) src.dispose();
  return geo;
}
const GEO = {}, PGEO = {};
/* planes shared by every case of a format (spine label, dust layers, footprint) */
function pgeo(fmt, kind) {
  const k = fmt + kind; if (PGEO[k]) return PGEO[k];
  const { w, h, d } = DIMS[fmt], b = caseGeo(fmt).bevel, sw = d - b * 1.4, sh = h - .3;
  const size = { spine: [sw, sh], top: [w - .5, d - .1], film: [w - .4, h - .4], foot: [d + 1.8, w + 1.2] }[kind];
  return (PGEO[k] = new THREE.PlaneGeometry(size[0], size[1]));
}
function caseGeo(fmt) {
  if (GEO[fmt]) return GEO[fmt];
  const { w, h, d, split } = DIMS[fmt], shellD = split + d / 2, lidD = d / 2 - split, card = isCard(fmt);
  const rc = card ? .3 : fmt === 'jewel' ? .25 : .6, b = card ? .12 : fmt === 'jewel' ? .06 : .15;
  GEO[fmt] = { shell: card ? cavityGeometry(w, h, shellD, BOX_WALL) : slabGeometry(w, h, shellD, rc, Math.min(b, shellD * .3)), lid: slabGeometry(w, h, lidD, rc, Math.min(b, lidD * .3)), wrap: slabGeometry(w + .1, h + .1, d + .1, rc + .05, .03), bevel: b };
  return GEO[fmt];
}
/* a cardboard box open at the front: back panel and four walls; the flap is the lid.
   Groups as in slabGeometry: 0 the inside floor, 1 the back, 2 every edge and wall */
const BOX_WALL = .15;
function cavityGeometry(w, h, D, t) {
  const parts = [], out = [0, 1, 2].map(() => ({ p: [], n: [], u: [] }));
  const piece = (bw, bh, bd, x, y, z, map) => { const b = new THREE.BoxGeometry(bw, bh, bd); b.translate(x, y, z); parts.push([b, map]); };
  piece(w, h, t, 0, 0, -D / 2 + t / 2, i => i === 4 ? 0 : i === 5 ? 1 : 2);
  const wd = D - t, wz = t / 2;
  [-1, 1].forEach(sx => piece(t, h, wd, sx * (w / 2 - t / 2), 0, wz, () => 2));
  [-1, 1].forEach(sy => piece(w - 2 * t, t, wd, 0, sy * (h / 2 - t / 2), wz, () => 2));
  for (const [b, map] of parts) {
    const nb = b.toNonIndexed(), P = nb.attributes.position.array, Nn = nb.attributes.normal.array, U = nb.attributes.uv.array;
    for (const gr of nb.groups) { const o = out[map(gr.materialIndex)]; for (let i = gr.start; i < gr.start + gr.count; i++) { o.p.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]); o.n.push(Nn[i * 3], Nn[i * 3 + 1], Nn[i * 3 + 2]); o.u.push(U[i * 2], U[i * 2 + 1]); } }
    b.dispose(); nb.dispose();
  }
  const geo = new THREE.BufferGeometry(), P = [], Nn = [], U = []; let start = 0;
  out.forEach((o, mi) => { for (let i = 0; i < o.p.length; i++) P.push(o.p[i]); for (let i = 0; i < o.n.length; i++) Nn.push(o.n[i]); for (let i = 0; i < o.u.length; i++) U.push(o.u[i]); const cnt = o.p.length / 3; geo.addGroup(start, cnt, mi); start += cnt; });
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  return geo;
}

/* ---------- shared case materials ---------- */
const MAT = {
  edge: {
    dvd: M(THREE.MeshStandardMaterial, { color: '#131418', roughness: .5, metalness: .05 }, 1),
    /* clear polystyrene: pale, glossy rails that take the softboxes' reflections */
    jewel: M(THREE.MeshPhysicalMaterial, { color: '#a9b3bd', roughness: .06, metalness: .05, clearcoat: 1, clearcoatRoughness: .01, reflectivity: .9 }, 2.2)
  },
  tray: {}, lid: {},
  discBottom: M(THREE.MeshStandardMaterial, { color: '#ffffff', roughness: .14, metalness: .95 }, 1.5),
  discEdge: M(THREE.MeshStandardMaterial, { color: '#d4d8de', roughness: .25, metalness: .8 }, 1.2),
  paper: M(THREE.MeshStandardMaterial, { color: '#efe9dc', roughness: .85 }, .6),
  strip: M(THREE.MeshStandardMaterial, { color: '#d4202c', roughness: .3, metalness: .15 }, 1),
  hit: new THREE.MeshBasicMaterial({ visible: false })
};
let TEXS = {};
function buildSharedMaterials() {
  FMT_LIST.forEach(f => {
    const card = isCard(f);
    MAT.tray[f] = M(THREE.MeshPhysicalMaterial, { map: tex(makeTrayCanvas(f)), roughness: card ? .85 : .4, clearcoat: card ? 0 : .5, clearcoatRoughness: .2 }, card ? .5 : 1);
    MAT.lid[f] = M(THREE.MeshPhysicalMaterial, { map: tex(makeLidCanvas(f)), roughness: card ? .85 : .4, clearcoat: card ? 0 : .5, clearcoatRoughness: .2 }, card ? .5 : 1);
  });
  MAT.discBottom.map = tex(makeRainbowCanvas()); MAT.discBottom.needsUpdate = true;
  TEXS = {
    film: new THREE.CanvasTexture(makeFilmCanvas(256, 360, 21)),
    spineDust: new THREE.CanvasTexture(makeSpineDustCanvas()),
    topDust: new THREE.CanvasTexture(makeTopDustCanvas()),
    web: new THREE.CanvasTexture(makeWebCanvas()),
    crinkle: dataTex(makeCrinkleCanvas()),
    sticker: tex(makeSealStickerCanvas()),
    tab: tex(makeTabCanvas()),
    foot: {}
  };
  FMT_LIST.forEach(f => { const { w, d } = DIMS[f]; TEXS.foot[f] = new THREE.CanvasTexture(makeFootCanvas(d / (d + 1.8), w / (w + 1.2))); });
  TEXS.contact = new THREE.CanvasTexture(makeContactCanvas());
  MAT.acrylic = M(THREE.MeshPhysicalMaterial, { color: '#f4f8ff', transparent: true, opacity: .22, roughness: .02, clearcoat: 1, clearcoatRoughness: .01, depthWrite: false }, 2.4);
  MAT.sticker = M(THREE.MeshStandardMaterial, { map: TEXS.sticker, transparent: true, roughness: .4 }, .8);
  MAT.tab = M(THREE.MeshStandardMaterial, { map: TEXS.tab, roughness: .35, side: THREE.DoubleSide }, 1);
}
function makeDisc(R, labelMat) {
  const grp = new THREE.Group(), ring = new THREE.RingGeometry(R * .125, R, 72, 1);
  const top = new THREE.Mesh(ring, labelMat); top.position.z = .062;
  const bot = new THREE.Mesh(ring, MAT.discBottom); bot.rotation.y = Math.PI; bot.position.z = -.062;
  const side = new THREE.Mesh(new THREE.CylinderGeometry(R, R, .124, 72, 1, true), MAT.discEdge); side.rotation.x = Math.PI / 2;
  grp.add(top, bot, side); grp.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return grp;
}
/* a 3½-inch floppy: plastic body, metal shutter over the head window, the label below, the hub behind */
const FLOPPY = { w: 9, h: 9.4, t: .33 }, CART = { w: 11.6, h: 9.2, t: 1.9 };
const FLOPPY_COLS = ['#1c1d21', '#24344f', '#2e3036', '#5a1f22', '#1f3b2c'], CART_COLS = ['#8b8d93', '#2b2c31', '#5d6068', '#b9b5aa'];
const shutterMat = M(THREE.MeshStandardMaterial, { color: '#c9ccd2', roughness: .32, metalness: .9 }, 1.3);
const darkPlastic = M(THREE.MeshStandardMaterial, { color: '#08080a', roughness: .6 }, .6);
const mediaBody = {};
function mediaBodyMat(kind, g) {
  const list = kind === 'cart' ? CART_COLS : FLOPPY_COLS, col = list[hash(g.id + kind) % list.length], k = kind + col;
  return mediaBody[k] || (mediaBody[k] = M(THREE.MeshPhysicalMaterial, { color: col, roughness: kind === 'cart' ? .55 : .42, clearcoat: kind === 'cart' ? .1 : .35, clearcoatRoughness: .4 }, .9));
}
let FLOPPY_GEO = null, CART_GEO = null;
function floppyGeo() {
  if (FLOPPY_GEO) return FLOPPY_GEO;
  const { w, h, t } = FLOPPY;
  FLOPPY_GEO = { body: slabGeometry(w, h, t, .22, .04), shutter: new THREE.BoxGeometry(4.6, 3.1, t + .04), win: new THREE.PlaneGeometry(1, 2), label: new THREE.PlaneGeometry(7.4, 5.6), hub: new THREE.CircleGeometry(1.25, 32) };
  Object.values(FLOPPY_GEO).forEach(g => { g.userData.shared = true; }); return FLOPPY_GEO;
}
function makeFloppy(labelMat, bodyMat) {
  const G = floppyGeo(), { h, t } = FLOPPY, grp = new THREE.Group();
  grp.add(new THREE.Mesh(G.body, bodyMat));
  const sh = new THREE.Mesh(G.shutter, shutterMat); sh.position.set(.3, h / 2 - 1.55, 0); grp.add(sh);
  const win = new THREE.Mesh(G.win, darkPlastic); win.position.set(.3, h / 2 - 1.4, t / 2 + .025); grp.add(win);
  const lab = new THREE.Mesh(G.label, labelMat); lab.position.set(0, -1.7, t / 2 + .004); grp.add(lab);
  const hub = new THREE.Mesh(G.hub, MAT.discEdge); hub.rotation.y = Math.PI; hub.position.set(0, -.3, -t / 2 - .004); grp.add(hub);
  grp.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return grp;
}
/* a cartridge (our own shape): narrower at the connector, rounded on top, grip lines under the label */
function cartGeo() {
  if (CART_GEO) return CART_GEO;
  const { w, h, t } = CART, s = new THREE.Shape(), a = w / 2, b = h / 2, r = .9, nb = .45, nh = 1.4;
  s.moveTo(-a + nb, -b); s.lineTo(a - nb, -b); s.lineTo(a - nb, -b + nh); s.lineTo(a, -b + nh + .4); s.lineTo(a, b - r); s.quadraticCurveTo(a, b, a - r, b); s.lineTo(-a + r, b); s.quadraticCurveTo(-a, b, -a, b - r); s.lineTo(-a, -b + nh + .4); s.lineTo(-a + nb, -b + nh); s.closePath();
  const body = new THREE.ExtrudeGeometry(s, { depth: t - .16, bevelEnabled: true, bevelThickness: .08, bevelSize: .08, bevelSegments: 2, curveSegments: 8 }); body.translate(0, 0, -(t - .16) / 2);
  CART_GEO = { body, label: new THREE.PlaneGeometry(9.4, 5.8), groove: new THREE.BoxGeometry(8.6, .16, .08), pins: new THREE.PlaneGeometry(w - 2 * nb - .6, .7) };
  Object.values(CART_GEO).forEach(g => { g.userData.shared = true; }); return CART_GEO;
}
function makeCart(labelMat, bodyMat) {
  const G = cartGeo(), { h, t } = CART, grp = new THREE.Group();
  const body = new THREE.Mesh(G.body, bodyMat); grp.add(body);
  const lab = new THREE.Mesh(G.label, labelMat); lab.position.set(0, .95, t / 2 + .005); grp.add(lab);
  for (let i = 0; i < 4; i++) { const gr = new THREE.Mesh(G.groove, darkPlastic); gr.position.set(0, -2.45 - i * .38, t / 2); grp.add(gr); }
  const pins = new THREE.Mesh(G.pins, darkPlastic); pins.rotation.x = Math.PI / 2; pins.position.set(0, -h / 2 - .002, 0); grp.add(pins);
  grp.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return grp;
}
function makeMedia(kind, labelMat, g) { return kind === 'floppy' ? makeFloppy(labelMat, mediaBodyMat(kind, g)) : kind === 'cart' ? makeCart(labelMat, mediaBodyMat(kind, g)) : makeDisc(DIMS.dvd.discR, labelMat); }
/* how thick each piece of media is, to rest it on the floor of a box */
const MEDIA_T = { disc: .124, floppy: FLOPPY.t, cart: CART.t };
const STRIP_GEO = new THREE.BoxGeometry(1, .32, .03);
const UNIT_PLANE = new THREE.PlaneGeometry(1, 1);
let IGEO = null; const MGEO = {};
function interiorGeo() { return IGEO || (IGEO = { hub: new THREE.CylinderGeometry(.68, .74, .34, 24), tooth: new THREE.BoxGeometry(.18, .5, .3), clip: new THREE.BoxGeometry(1.4, .7, .26) }); }
function manualGeo(fmt) { const [mw, mh] = DIMS[fmt].man; return MGEO[fmt] || (MGEO[fmt] = new THREE.BoxGeometry(mw, mh, .14)); }
const X_AXIS = new V3(1, 0, 0);
/* =====================================================================
   CASE
   ===================================================================== */
const _tp = { pos: new V3(), quat: new Q4() }, _fwd = new V3(), _right = new V3(), _up = new V3(), _q = new Q4(), _e = new EU(), _v = new V3(), _w = new V3();
const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
const PARK_SCALE = .42;
function fitDist(w, h) { const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); return Math.max((h / 2) / t, (w / 2) / (t * camera.aspect)); }
function viewH(dist) { return 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); }
function viewW(dist) { return viewH(dist) * camera.aspect; }

class Case {
  constructor(g) {
    this.g = g; const D = this.dim = DIMS[g.fmt], { w, h, d, split } = D, G = caseGeo(g.fmt);
    const isJ = g.fmt === 'jewel', isB = isCard(g.fmt);
    this.root = new THREE.Group(); this.inner = new THREE.Group(); this.root.add(this.inner); scene.add(this.root);
    this.edge = isB ? M(THREE.MeshStandardMaterial, { color: g.spine || g.pal[0], roughness: .7 }, .6) : MAT.edge[g.fmt];
    const cp = isB ? { roughness: .62, clearcoat: .3, clearcoatRoughness: .4 } : isJ ? { roughness: .45, clearcoat: .7, clearcoatRoughness: .08 } : { roughness: .52, clearcoat: .55, clearcoatRoughness: .14 };
    this.frontMat = M(THREE.MeshPhysicalMaterial, { color: g.pal[0], ...cp }, .8);
    this.backMat = M(THREE.MeshPhysicalMaterial, { color: g.pal[0], ...cp }, .8);
    const shellD = split + d / 2, lidD = d / 2 - split; this.shellD = shellD; this.lidD = lidD;
    this.shell = new THREE.Mesh(G.shell, [MAT.tray[g.fmt], this.backMat, this.edge]); this.shell.position.z = -d / 2 + shellD / 2; this.inner.add(this.shell);
    this.pivot = new THREE.Group(); this.pivot.position.set(-w / 2, 0, split); this.inner.add(this.pivot);
    this.lid = new THREE.Mesh(G.lid, [this.frontMat, MAT.lid[g.fmt], this.edge]); this.lid.position.set(w / 2, 0, lidD / 2); this.pivot.add(this.lid);
    /* spine label under the clear sleeve */
    this.spineCanvas = drawSpine(g); this.spineTex = tex(this.spineCanvas);
    this.spineMat = M(THREE.MeshPhysicalMaterial, { map: this.spineTex, roughness: isB ? .62 : .5, clearcoat: isB ? .3 : .6, clearcoatRoughness: .12, emissive: new THREE.Color('#ffffff'), emissiveMap: this.spineTex, emissiveIntensity: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }, .8);
    const sw = d - G.bevel * 1.4, sh = h - .3;
    this.spine = new THREE.Mesh(pgeo(g.fmt, 'spine'), this.spineMat); this.spine.rotation.y = -Math.PI / 2; this.spine.position.x = -w / 2 - .03; this.inner.add(this.spine);
    /* dust: spine, top, front, back */
    this.dustMat = M(THREE.MeshStandardMaterial, { map: TEXS.spineDust, color: '#d9cfbd', transparent: true, opacity: 0, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }, .6);
    this.filmMat = M(THREE.MeshStandardMaterial, { map: TEXS.film, color: '#c9bea9', transparent: true, opacity: 0, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }, .6);
    this.topMat = M(THREE.MeshStandardMaterial, { map: TEXS.topDust, color: '#d9cfbd', transparent: true, opacity: 0, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }, .6);
    const ds = new THREE.Mesh(pgeo(g.fmt, 'spine'), this.dustMat); ds.rotation.y = -Math.PI / 2; ds.position.x = -w / 2 - .06;
    const dt = new THREE.Mesh(pgeo(g.fmt, 'top'), this.topMat); dt.rotation.x = -Math.PI / 2; dt.position.y = h / 2 + .04;
    const df = new THREE.Mesh(pgeo(g.fmt, 'film'), this.filmMat); df.position.set(0, 0, lidD / 2 + .035); this.lid.add(df);
    const db = new THREE.Mesh(pgeo(g.fmt, 'film'), this.filmMat); db.rotation.y = Math.PI; db.position.set(0, 0, -shellD / 2 - .035); this.shell.add(db);
    this.inner.add(ds, dt); this.dustMeshes = [ds, dt, df, db];
    /* dust footprint on the shelf and an optional cobweb (live in the room, not on the case) */
    this.footMat = M(THREE.MeshStandardMaterial, { map: TEXS.foot[g.fmt], color: '#d9cfbd', transparent: true, opacity: 0, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }, .6);
    this.foot = new THREE.Mesh(pgeo(g.fmt, 'foot'), this.footMat); this.foot.rotation.x = -Math.PI / 2; this.foot.visible = false; scene.add(this.foot);
    this.contactMat = new THREE.MeshBasicMaterial({ map: TEXS.contact, transparent: true, opacity: .55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
    this.contact = new THREE.Mesh(UNIT_PLANE, this.contactMat); this.contact.rotation.x = -Math.PI / 2; this.contact.visible = false; scene.add(this.contact);
    this.stand = null;
    this.webMat = new THREE.MeshStandardMaterial({ map: TEXS.web, color: '#ffffff', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, roughness: 1 });
    this.web = new THREE.Mesh(UNIT_PLANE, this.webMat); this.web.visible = false; scene.add(this.web);
    /* the inside (hub, clips, disc, manual) is only built while the case is in your hands */
    this.disc = null; this.manual = null; this.interior = null;
    /* the media lies on the tray of a plastic case, or on the floor of a cardboard box (floppies stacked, the top one goes in) */
    const floor = -d / 2 + BOX_WALL, kind = D.media;
    this.discHome = isB ? new V3(D.discX, kind === 'cart' ? .4 : 0, floor + (kind === 'floppy' ? 2 * .34 : 0) + MEDIA_T[kind] / 2 + .03) : new V3(D.discX, 0, split + .075);
    this.discLabelMat = M(THREE.MeshPhysicalMaterial, { color: g.pal[0], roughness: .4, metalness: .05, clearcoat: .8, clearcoatRoughness: .1, emissive: new THREE.Color('#000000') }, 1);
    this.manMat = M(THREE.MeshStandardMaterial, { color: '#efe9dc', roughness: .7, emissive: new THREE.Color('#000000') }, .8);
    this.shell.receiveShadow = this.lid.receiveShadow = true; this.spine.receiveShadow = true;
    this.tag = (m, part) => m.traverse(o => { if (o.isMesh) { o.userData.case = this; if (part) o.userData.part = part; } });
    this.tag(this.shell); this.tag(this.lid); this.tag(this.spine);
    this.home = { pos: new V3(), quat: new Q4(), x: 0, board: 0 };
    this.pullHold = 0; this.fast = false; this.leaving = false;
    this.mode = 'home'; this.faceOut = false; this.hoverA = 0; this.hoverT = 0; this.flipA = 0; this.flipT = 0; this.openA = 0;
    this.tearA = 0; this.tearDone = 0; this.glowT = 0; this.glowA = 0; this.dimmed = false; this.detail = false; this.dirty = false;
    this.hand = new V3(); this.dragging = false;
    /* c.motion: the hand-keyed open or close in progress; c.grab: how far you have turned it by dragging (springs back) */
    this.motion = null; this.grab = { x: 0, y: 0, vx: 0, vy: 0, held: false };
    if (g.wrapped) this.makeWrap();
    this.setDust(g.dust);
  }
  /* ---------- shrink wrap with a red tear strip ---------- */
  makeWrap() {
    const { w, h, d } = this.dim, o = .075, G = caseGeo(this.g.fmt);
    this.wrapMat = M(THREE.MeshPhysicalMaterial, { color: '#ffffff', transparent: true, opacity: .2, roughness: .04, clearcoat: 1, clearcoatRoughness: .03, bumpMap: TEXS.crinkle, bumpScale: .04, depthWrite: false }, 2.2);
    this.wrap = new THREE.Mesh(G.wrap, this.wrapMat); this.inner.add(this.wrap);
    const st = new THREE.Mesh(new THREE.PlaneGeometry(2.8, 2.8), MAT.sticker); st.position.set(w / 2 - 2.3, -h / 2 + 2.6, d / 2 + .07); this.wrap.add(st);
    const y = h / 2 - .75;
    this.path = [
      { S: new V3(w / 2 + o, y, d / 2 + o), dir: new V3(-1, 0, 0), l: w + 2 * o },
      { S: new V3(-w / 2 - o, y, d / 2 + o), dir: new V3(0, 0, -1), l: d + 2 * o },
      { S: new V3(-w / 2 - o, y, -d / 2 - o), dir: new V3(1, 0, 0), l: w + 2 * o },
      { S: new V3(w / 2 + o, y, -d / 2 - o), dir: new V3(0, 0, 1), l: d + 2 * o }];
    let a = 0; this.path.forEach(p => { p.a = a; a += p.l; p.n = new V3(p.dir.z, 0, -p.dir.x); }); this.L = a;
    const [L0, L1, L2, L3] = this.path.map(p => p.l);
    this.phiK = [[0, 0], [L0 * .7, 0], [L0 + L1 * .5, Math.PI / 2], [L0 + L1 + L2 * .3, Math.PI], [L0 + L1 + L2 * .7, Math.PI], [L0 + L1 + L2 + L3 * .5, Math.PI * 1.5], [a, Math.PI * 1.5]];
    this.strip = new THREE.Group(); this.inner.add(this.strip);
    this.path.forEach(p => { const m = new THREE.Mesh(STRIP_GEO, MAT.strip); m.rotation.y = Math.atan2(-p.dir.z, p.dir.x); p.mesh = m; this.strip.add(m); m.userData.case = this; m.userData.part = 'strip'; });
    this.torn = new THREE.Mesh(STRIP_GEO, MAT.strip); this.strip.add(this.torn);
    this.tab = new THREE.Mesh(new THREE.PlaneGeometry(1.3, .95), MAT.tab); this.strip.add(this.tab);
    this.tabHit = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 1.6), MAT.hit); this.strip.add(this.tabHit);
    [this.wrap, st].forEach(m => { m.userData.case = this; m.userData.part = 'wrap'; });
    [this.tab, this.tabHit, this.torn].forEach(m => { m.userData.case = this; m.userData.part = 'tab'; });
    this.tear = clamp(this.g.tear || 0, 0, this.L - .01);
    this.tearPoint(this.tear, this.hand); this.dropHand(); this.updateStrip();
  }
  tearPoint(s, out) { for (const p of this.path) if (s <= p.a + p.l + 1e-6) return out.copy(p.S).addScaledVector(p.dir, clamp(s - p.a, 0, p.l)); const p = this.path[3]; return out.copy(p.S).addScaledVector(p.dir, p.l); }
  segAt(s) { for (const p of this.path) if (s <= p.a + p.l) return p; return this.path[3]; }
  phiAt(s) { const K = this.phiK; for (let i = 1; i < K.length; i++) if (s <= K[i][0]) { const t = (s - K[i - 1][0]) / Math.max(1e-6, K[i][0] - K[i - 1][0]); return lerp(K[i - 1][1], K[i][1], easeIO(clamp(t, 0, 1))); } return K[K.length - 1][1]; }
  dropHand() { const tp = this.tearPoint(this.tear, _v), seg = this.segAt(this.tear); this.hand.copy(tp).addScaledVector(seg.n, 1.1).add(_w.set(0, -Math.min(2.2, .4 + this.tear * .25), 0)); }
  updateStrip() {
    if (!this.wrap) return;
    for (const p of this.path) { const t0 = clamp(this.tear - p.a, 0, p.l), len = p.l - t0; p.mesh.visible = len > .01; if (p.mesh.visible) { p.mesh.position.copy(p.S).addScaledVector(p.dir, t0 + len / 2); p.mesh.scale.x = len; } }
    const tp = this.tearPoint(this.tear, _v);
    if (this.tear < .02) { const seg = this.path[0]; this.tab.position.copy(tp).add(_w.set(.62, -.05, 0)); this.tab.rotation.set(0, -.55, 0); this.torn.visible = false; this.tabHit.position.copy(this.tab.position); return; }
    const v = _w.copy(this.hand).sub(tp); let len = v.length(); const maxL = this.tear + .6; if (len > maxL) { v.multiplyScalar(maxL / len); len = maxL; }
    this.torn.visible = len > .05; if (this.torn.visible) { this.torn.position.copy(tp).addScaledVector(v, .5); this.torn.quaternion.setFromUnitVectors(X_AXIS, v.clone().normalize()); this.torn.scale.x = len; }
    this.tab.position.copy(tp).add(v); this.tab.quaternion.copy(this.torn.quaternion); this.tabHit.position.copy(this.tab.position);
  }
  removeWrapNow(keepState) {
    if (!this.wrap) return;
    this.inner.remove(this.wrap); this.inner.remove(this.strip);
    unM(this.wrapMat); this.tabHit.geometry.dispose(); this.tab.geometry.dispose(); this.wrap.children.forEach(m => m.geometry && m.geometry.dispose());
    this.wrap = null; this.strip = null; if (!keepState) { this.g.wrapped = false; this.g.tear = 0; }
  }
  buildInterior() {
    if (this.interior) return;
    const g = this.g, D = this.dim, { w, h, split } = D, isJ = g.fmt === 'jewel', isB = isCard(g.fmt), parts = [];
    if (!isB) {
      const m = isJ ? MAT.edge.jewel : MAT.edge.dvd, G = interiorGeo();
      const hub = new THREE.Mesh(G.hub, m); hub.rotation.x = Math.PI / 2; hub.position.set(D.discX, 0, split + .17); this.inner.add(hub); parts.push([this.inner, hub]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, tooth = new THREE.Mesh(G.tooth, m); tooth.position.set(D.discX + Math.cos(a) * .55, Math.sin(a) * .55, split + .2); tooth.rotation.z = a; this.inner.add(tooth); parts.push([this.inner, tooth]); }
      [1, -1].forEach(sy => { const clip = new THREE.Mesh(G.clip, m); clip.position.set(w - .9, sy * (h / 2 - 1.3), -.13); this.pivot.add(clip); parts.push([this.pivot, clip]); });
    }
    this.disc = D.media === 'disc' ? makeDisc(D.discR, this.discLabelMat) : makeMedia(D.media, this.discLabelMat, g); this.disc.position.copy(this.discHome); this.inner.add(this.disc);
    if (D.media === 'floppy') {
      /* the rest of the set under the first disk */
      [[-1.7, 1.5, .09, 0], [-.85, .75, -.05, 1]].forEach(([dx, dy, rz, i]) => { const f = makeFloppy(this.discLabelMat, mediaBodyMat('floppy', g)); f.position.set(this.discHome.x + dx, this.discHome.y + dy, this.discHome.z - (2 - i) * .34); f.rotation.z = rz; this.inner.add(f); parts.push([this.inner, f]); });
    }
    const [mw, mh] = D.man;
    this.manual = new THREE.Mesh(manualGeo(g.fmt), [MAT.paper, MAT.paper, MAT.paper, MAT.paper, MAT.paper, this.manMat]);
    this.manual.position.set(w / 2 - .1, 0, -.09); this.pivot.add(this.manual);
    this.tag(this.disc, 'disc'); this.tag(this.manual, 'manual');
    this.interior = parts;
  }
  dropInterior() {
    if (!this.interior) return;
    this.interior.forEach(([p, m]) => p.remove(m));
    if (this.disc) { this.disc.parent && this.disc.parent.remove(this.disc); this.disc.children.forEach(m => { if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); }); }
    if (this.manual) this.pivot.remove(this.manual);
    this.disc = null; this.manual = null; this.interior = null;
  }
  setShadow(on) { this.shell.castShadow = this.lid.castShadow = on; }
  ensureStand() {
    if (this.stand) return this.stand;
    const { w, h } = this.dim; this.stand = new THREE.Group(); scene.add(this.stand);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(w * .62, h * .66, .3), MAT.acrylic); plate.position.set(0, h * .33, -2.2); plate.rotation.x = -.34; this.stand.add(plate);
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(w * .9, 1, .3), MAT.acrylic); ledge.position.set(0, .5, 1.6); this.stand.add(ledge);
    const base = new THREE.Mesh(new THREE.BoxGeometry(w * .9, .3, 4.4), MAT.acrylic); base.position.set(0, .15, -.4); this.stand.add(base);
    return this.stand;
  }
  dispose() {
    this.dropInterior(); if (this.wrap) this.removeWrapNow(true);
    [this.root, this.foot, this.contact, this.web, this.stand].forEach(o => { if (o) scene.remove(o); });
    if (this.stand) this.stand.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
    [this.spineTex, this.coverTex, this.backTex, this.discTex, this.manTex].forEach(t => t && t.dispose());
    if (isCard(this.g.fmt)) unM(this.edge);
    [this.frontMat, this.backMat, this.spineMat, this.dustMat, this.filmMat, this.topMat, this.footMat, this.discLabelMat, this.manMat].forEach(unM);
    this.contactMat.dispose(); this.webMat.dispose();
    this.disposed = true;
  }
  setDust(v) {
    if (this.g.wrapped) v = 0;
    this.g.dust = v;
    this.dustMat.opacity = Math.min(1, v * 1.15); this.topMat.opacity = Math.min(1, v * 1.4); this.filmMat.opacity = Math.min(.74, v * .9);
    this.dustMeshes.forEach(m => m.visible = v > .01);
    this.footMat.opacity = Math.min(1, v * 1.25);
    this.webMat.opacity = clamp((v - .62) * 3, 0, .9);
    this.placeExtras();
  }
  placeExtras() {
    const home = this.mode === 'home' && !this.leaving && !this.hidden, show = !this.faceOut && !this.hidden, { w, h, d } = this.dim;
    if (typeof markContacts === 'function') markContacts();
    this.contact.visible = home && this.faceOut;
    if (this.contact.visible) { this.contact.scale.set(w + 1.6, 3.4, 1); this.contact.position.set(this.home.x, this.home.board + .02, this.home.pos.z + 1.4); }
    if (this.faceOut && !this.hidden) this.ensureStand();
    if (this.stand) { this.stand.visible = this.faceOut && !this.hidden; if (this.stand.visible) this.stand.position.set(this.home.x, this.home.board, this.home.pos.z - .2); }
    this.foot.visible = show && this.g.dust > .04;
    if (this.foot.visible) this.foot.position.set(this.home.x, this.home.board + .03, this.home.pos.z);
    const gap = SHELF.innerH - .4 - this.dim.h; this.web.visible = home && show && this.webMat.opacity > .02 && gap > 2.5;
    if (this.web.visible) { this.web.scale.set(4.6, gap, 1); this.web.position.set(this.home.x + 1.9, this.home.board + this.dim.h + gap / 2, SHELF.front - 1.4); this.web.rotation.set(0, -.25, 0); }
  }
  ensureCover() {
    if (this.coverTex && !this.dirty) return;
    if (this.coverTex) this.coverTex.dispose();
    this.coverCanvas = drawCover(this.g); this.coverTex = tex(this.coverCanvas);
    this.frontMat.map = this.coverTex; this.frontMat.color.set('#ffffff'); this.frontMat.needsUpdate = true;
  }
  ensureDetail() {
    this.buildInterior();
    if (this.detail && !this.dirty) return;
    this.ensureCover();
    [this.backTex, this.discTex, this.manTex].forEach(t => t && t.dispose());
    this.backTex = tex(drawBack(this.g, this.coverCanvas)); this.backMat.map = this.backTex; this.backMat.color.set('#ffffff'); this.backMat.needsUpdate = true;
    this.discTex = tex(drawMedia(this.g, this.coverCanvas)); this.discLabelMat.map = this.discTex; this.discLabelMat.color.set('#ffffff'); this.discLabelMat.needsUpdate = true;
    this.manTex = tex(drawManualCover(this.g, this.coverCanvas)); this.manMat.map = this.manTex; this.manMat.color.set('#ffffff'); this.manMat.needsUpdate = true;
    this.detail = true; this.dirty = false;
  }
  releaseDetail() {
    if (!this.detail) return;
    [this.backTex, this.discTex, this.manTex].forEach(t => t && t.dispose()); this.backTex = this.discTex = this.manTex = null;
    this.backMat.map = null; this.backMat.color.set(this.g.pal[0]); this.backMat.needsUpdate = true;
    this.discLabelMat.map = null; this.discLabelMat.color.set(this.g.pal[0]); this.discLabelMat.needsUpdate = true;
    this.manMat.map = null; this.manMat.color.set('#efe9dc'); this.manMat.needsUpdate = true;
    if (!this.faceOut) this.dropCover();
    this.dropInterior();
    this.detail = false;
  }
  dropCover() { if (!this.coverTex) return; this.coverTex.dispose(); this.coverTex = null; this.coverCanvas = null; this.frontMat.map = null; this.frontMat.color.set(this.g.pal[0]); this.frontMat.needsUpdate = true; }
  refreshSpine() { const c = drawSpine(this.g), x = this.spineCanvas.getContext('2d'); x.clearRect(0, 0, c.width, c.height); x.drawImage(c, 0, 0); this.spineTex.needsUpdate = true; if (!this.g.real || this.g.pal) { this.edgeTint(); } }
  edgeTint() { if (isCard(this.g.fmt)) this.edge.color.set(this.g.spine || this.g.pal[0]); if (!this.frontMat.map) this.frontMat.color.set(this.g.pal[0]); if (!this.backMat.map) this.backMat.color.set(this.g.pal[0]); if (!this.discLabelMat.map) this.discLabelMat.color.set(this.g.pal[0]); }
  targetPose() {
    const P = _tp.pos, Qt = _tp.quat;
    if (this.mode === 'home' || this.mode === 'pulled') {
      P.copy(this.home.pos); Qt.copy(this.home.quat);
      if (this.faceOut) { P.z += this.hoverA * 2.2; P.y += this.hoverA * .7; } else P.z += this.hoverA * 3.4;
      const pa = this.mode === 'pulled' ? 1 : this.pullHold;
      if (pa > 0) { P.z += (this.dim.w + 5 + (this.faceOut ? 6 : 0)) * pa; P.y += 1.5 * pa; }
      return _tp;
    }
    const D = this.dim, mo = this.motion, o = mo ? mo.spread : easeIO(this.openA);
    let dist, offX = 0, offY = 0, extra = 0, tx = 0, ty = 0, tz = 0;
    if (this.mode === 'inspect') {
      const hk = camera.aspect < .95 ? 2.05 : 1.66, sw = studio.sway, gb = this.grab;
      dist = lerp(fitDist(D.w * 1.85, D.h * hk), fitDist(D.w * 2 * 1.2, D.h * hk), o);
      /* with the card open the case moves right to leave it room; otherwise it sits in the middle */
      if (camera.aspect > 1.25 && prefs.card !== 'hide') offX = viewW(dist) * .1;
      offY = viewH(dist) * (camera.aspect > 1 ? .015 : prefs.card === 'hide' ? .02 : -.05) + sw.y;
      tx = tilt.x + gb.x + sw.pitch + (mo ? mo.pitch : 0); ty = tilt.y + gb.y + sw.yaw + (mo ? mo.yaw : 0); tz = sw.roll + (mo ? mo.roll : 0);
    } else {
      dist = camera.position.distanceTo(cam.look) * .45;
      if (camera.aspect > 1) { offX = -viewW(dist) * .33; offY = viewH(dist) * .25; extra = .5; } else offY = viewH(dist) * .3;
    }
    camera.getWorldDirection(_fwd); _right.set(1, 0, 0).applyQuaternion(camera.quaternion); _up.set(0, 1, 0).applyQuaternion(camera.quaternion);
    P.copy(camera.position).addScaledVector(_fwd, dist).addScaledVector(_right, offX).addScaledVector(_up, offY);
    _e.set(tx, ty + this.flipA + this.tearA + extra, tz); Qt.copy(camera.quaternion).multiply(_q.setFromEuler(_e));
    return _tp;
  }
  update(dt) {
    const s = dt / SPEED;
    this.hoverA += (this.hoverT - this.hoverA) * (1 - Math.exp(-14 * s));
    this.flipA += (this.flipT - this.flipA) * (1 - Math.exp(-7 * s));
    this.glowA += (this.glowT - this.glowA) * (1 - Math.exp(-10 * s));
    const tearT = this.wrap ? this.phiAt(this.tear) : this.tearDone;
    this.tearA += (tearT - this.tearA) * (1 - Math.exp(-6 * s));
    if (!this.wrap && this.tearDone && Math.abs(this.tearA - this.tearDone) < .01) { this.tearA = 0; this.tearDone = 0; }
    const tp = this.targetPose(), k = this.fast ? 26 : (this.mode === 'inspect' || this.mode === 'parked') ? 7 : 9, a = 1 - Math.exp(-k * s);
    this.root.position.lerp(tp.pos, a); this.root.quaternion.slerp(tp.quat, a);
    const sc = this.root.scale.x + ((this.mode === 'parked' ? PARK_SCALE : 1) - this.root.scale.x) * a; this.root.scale.setScalar(sc);
    const o = this.openA, mo = this.motion; this.pivot.rotation.y = -(mo ? mo.lid : LID_OPEN * o); this.inner.position.x = this.dim.w / 2 * (mo ? mo.spread : o);
    const gb = this.grab; if (!gb.held && (gb.x || gb.y)) { gb.vx += (-16 * gb.x - 5.5 * gb.vx) * dt; gb.vy += (-16 * gb.y - 5.5 * gb.vy) * dt; gb.x += gb.vx * dt; gb.y += gb.vy * dt; if (Math.abs(gb.x) + Math.abs(gb.y) + Math.abs(gb.vx) + Math.abs(gb.vy) < 1e-4) gb.x = gb.y = gb.vx = gb.vy = 0; }
    this.spineMat.emissiveIntensity = this.glowA * .5;
    if (this.wrap && !this.dragging && this.tear > .02) { this.dropHand(); this.updateStrip(); }
  }
  setDim(on) {
    if (this.dimmed === on) return; this.dimmed = on; const v = on ? .22 : 1;
    this.spineMat.color.setScalar(v); this.frontMat.color.copy(this.frontMat.map ? new THREE.Color(1, 1, 1) : new THREE.Color(this.g.pal[0])).multiplyScalar(v);
  }
}
