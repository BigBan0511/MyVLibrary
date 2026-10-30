
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
  const { w, h, d, split, shell } = DIMS[fmt], shellD = split + d / 2, lidD = d / 2 - split;
  /* corners like real cases (a keep case is barely rounded, a cardboard box is square), or the softer look from before */
  const soft = prefs.corners === 'round';
  const rc = shell === 'card' ? (soft ? .3 : .05) : shell === 'clear' ? (soft ? .25 : .1) : (soft ? .6 : .28), b = shell === 'card' ? (soft ? .12 : .03) : shell === 'clear' ? (soft ? .06 : .035) : (soft ? .15 : .07);
  GEO[fmt] = { shell: slabGeometry(w, h, shellD, rc, Math.min(b, shellD * .3)), lid: slabGeometry(w, h, lidD, rc, Math.min(b, lidD * .3)), wrap: slabGeometry(w + .1, h + .1, d + .1, rc + .05, .03), bevel: b };
  return GEO[fmt];
}

/* ---------- shared case materials ---------- */
const MAT = {
  edge: {
    dvd: M(THREE.MeshStandardMaterial, { color: '#131418', roughness: .5, metalness: .05 }, 1),
    /* clear polystyrene: pale, glossy rails that take the softboxes' reflections */
    jewel: M(THREE.MeshPhysicalMaterial, { color: '#a9b3bd', roughness: .06, metalness: .05, clearcoat: 1, clearcoatRoughness: .01, reflectivity: .9 }, 2.2),
    bigjewel: M(THREE.MeshPhysicalMaterial, { color: '#3e454e', roughness: .1, metalness: .15, clearcoat: 1, clearcoatRoughness: .02 }, 1.4),
    vhs: M(THREE.MeshPhysicalMaterial, { color: '#0f0f11', roughness: .55, clearcoat: .2, clearcoatRoughness: .5 }, .9),
    bluray: M(THREE.MeshPhysicalMaterial, { color: '#1c56b8', roughness: .3, metalness: .05, clearcoat: .8, clearcoatRoughness: .1 }, 1.2)
  },
  tray: {}, lid: {},
  discBottom: M(THREE.MeshStandardMaterial, { color: '#ffffff', roughness: .14, metalness: .95 }, 1.5),
  discEdge: M(THREE.MeshStandardMaterial, { color: '#d4d8de', roughness: .25, metalness: .8 }, 1.2),
  paper: M(THREE.MeshStandardMaterial, { color: '#efe9dc', roughness: .85 }, .6),
  strip: M(THREE.MeshStandardMaterial, { color: '#d4202c', roughness: .3, metalness: .15 }, 1),
  hit: new THREE.MeshBasicMaterial({ visible: false })
};
MAT.edge.dvdbox = MAT.edge.dvd; MAT.edge.bdbox = MAT.edge.bluray; MAT.edge.cd = MAT.edge.jewel;
/* a cassette box: smoky clear plastic */
MAT.edge.cass = M(THREE.MeshPhysicalMaterial, { color: '#6d7179', roughness: .12, metalness: .1, clearcoat: 1, clearcoatRoughness: .04 }, 1.3);
let TEXS = {};
function buildSharedMaterials() {
  FMTS.forEach(f => {
    const card = DIMS[f].shell === 'card';
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
  FMTS.forEach(f => { const { w, d } = DIMS[f]; TEXS.foot[f] = new THREE.CanvasTexture(makeFootCanvas(d / (d + 1.8), w / (w + 1.2))); });
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
/* a 3½" disk, upright in its XY plane: the metal shutter on top, the label below it, the hub on the back */
let FLGEO = null, CAGEO = null;
const MEDIA_MAT = {
  shutter: M(THREE.MeshStandardMaterial, { color: '#c3c7cd', roughness: .28, metalness: .9 }, 1.3),
  hole: new THREE.MeshBasicMaterial({ color: '#0d0d10' }),
  ridge: M(THREE.MeshStandardMaterial, { color: '#55585f', roughness: .6 }, .7),
  tape: M(THREE.MeshPhysicalMaterial, { color: '#141416', roughness: .5, clearcoat: .25, clearcoatRoughness: .5 }, .9)
};
function makeFloppy(labelMat, bodyMat) {
  const { w, h, t } = MSIZE.floppy;
  const G = FLGEO || (FLGEO = { body: slabGeometry(w, h, t, .28, .05), shutter: new THREE.BoxGeometry(5, 3.2, t + .04), win: new THREE.PlaneGeometry(1.15, 2.1), label: new THREE.PlaneGeometry(7.2, 5.6), hub: new THREE.CircleGeometry(1.3, 28) });
  Object.values(G).forEach(q => { q.userData.shared = true; });
  const grp = new THREE.Group();
  const body = new THREE.Mesh(G.body, bodyMat);
  const sh = new THREE.Mesh(G.shutter, MEDIA_MAT.shutter); sh.position.set(.3, h / 2 - 1.6, 0);
  const wf = new THREE.Mesh(G.win, MEDIA_MAT.hole); wf.position.set(.9, h / 2 - 1.75, t / 2 + .025);
  const wb = new THREE.Mesh(G.win, MEDIA_MAT.hole); wb.position.set(.9, h / 2 - 1.75, -t / 2 - .025); wb.rotation.y = Math.PI;
  const lab = new THREE.Mesh(G.label, labelMat); lab.position.set(0, -1.6, t / 2 + .006);
  const hub = new THREE.Mesh(G.hub, MEDIA_MAT.shutter); hub.position.set(0, -.2, -t / 2 - .006); hub.rotation.y = Math.PI;
  grp.add(body, sh, wf, wb, lab, hub); grp.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return grp;
}
/* a 16-bit cartridge, upright: the label up top, grip ridges below it, the contacts along the bottom edge */
function makeCart(labelMat, bodyMat) {
  const { w, h, t } = MSIZE.cart;
  const G = CAGEO || (CAGEO = { body: slabGeometry(w, h, t, .8, .25), label: new THREE.PlaneGeometry(10.4, 5.4), ridge: new THREE.BoxGeometry(9.6, .14, .12) });
  Object.values(G).forEach(q => { q.userData.shared = true; });
  const grp = new THREE.Group();
  const body = new THREE.Mesh(G.body, bodyMat), lab = new THREE.Mesh(G.label, labelMat); lab.position.set(0, .95, t / 2 + .012);
  grp.add(body, lab);
  for (let i = 0; i < 4; i++) { const rdg = new THREE.Mesh(G.ridge, MEDIA_MAT.ridge); rdg.position.set(0, -2.35 - i * .42, t / 2 + .02); grp.add(rdg); }
  grp.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return grp;
}
/* a VHS tape, upright in its XY plane: the flap along the top edge goes in first, the window with its
   two reels and the label on the front, the spine label along the bottom edge */
let TPGEO = null, TAPE_WIN = null;
function makeTape(labelMat, spineMat) {
  const { w, h, t } = MSIZE.tape;
  const G = TPGEO || (TPGEO = { body: slabGeometry(w, h, t, .35, .1), win: new THREE.PlaneGeometry(9.4, 3.6), label: new THREE.PlaneGeometry(15.2, 3.4), spine: new THREE.PlaneGeometry(15.4, 1.7), flap: new THREE.BoxGeometry(w - 1.2, .9, .12) });
  Object.values(G).forEach(q => { q.userData.shared = true; });
  if (!TAPE_WIN) TAPE_WIN = new THREE.MeshPhysicalMaterial({ map: tex(makeTapeWindowCanvas()), roughness: .15, clearcoat: 1, clearcoatRoughness: .05 });
  const grp = new THREE.Group();
  const body = new THREE.Mesh(G.body, MEDIA_MAT.tape);
  const win = new THREE.Mesh(G.win, TAPE_WIN); win.position.set(0, 1.1, t / 2 + .012);
  const lab = new THREE.Mesh(G.label, labelMat); lab.position.set(0, -2.6, t / 2 + .012);
  const sp = new THREE.Mesh(G.spine, spineMat || labelMat); sp.rotation.x = Math.PI / 2; sp.position.set(0, -h / 2 - .012, 0);
  const flap = new THREE.Mesh(G.flap, MEDIA_MAT.ridge); flap.position.set(0, h / 2 - .55, t / 2 + .02);
  grp.add(body, win, lab, sp, flap); grp.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return grp;
}
/* an LP, in its XY plane like a disc: black grooved vinyl with the paper label in the middle, both sides */
let VNGEO = null, VINYL_MATS = null;
function makeGroovesCanvas() {
  const S = 1024, c = mkCanvas(S, S), x = c.getContext('2d'), R = S / 2, r = rng(3333);
  x.fillStyle = '#0a0a0c'; x.fillRect(0, 0, S, S);
  for (let k = 0; k < 230; k++) { const rad = R * (.35 + .63 * k / 230); x.strokeStyle = `rgba(255,255,255,${.025 + r() * .05})`; x.lineWidth = 1; x.beginPath(); x.arc(R, R, rad, 0, 7); x.stroke(); }
  /* the quiet bands between songs */
  [.46, .58, .69, .8, .9].forEach(v => { x.strokeStyle = 'rgba(0,0,0,.95)'; x.lineWidth = 5; x.beginPath(); x.arc(R, R, R * v, 0, 7); x.stroke(); });
  /* a soft sheen across it */
  x.save(); x.globalCompositeOperation = 'lighter'; x.translate(R, R); for (const a of [-.7, 2.45]) { x.fillStyle = rg(x, Math.cos(a) * R * .5, Math.sin(a) * R * .5, 0, R * .5, [[0, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(-R, -R, S, S); } x.restore();
  return c;
}
function makeVinyl(R, labelMat) {
  const G = VNGEO || (VNGEO = { disc: new THREE.CylinderGeometry(R, R, .2, 96, 1), label: new THREE.CircleGeometry(R * .34, 48) });
  Object.values(G).forEach(q => { q.userData.shared = true; });
  if (!VINYL_MATS) { const face = M(THREE.MeshStandardMaterial, { map: tex(makeGroovesCanvas()), roughness: .3, metalness: .15 }, 1.2), edge = M(THREE.MeshStandardMaterial, { color: '#09090b', roughness: .4 }, 1); VINYL_MATS = [edge, face, face]; }
  const grp = new THREE.Group();
  const disc = new THREE.Mesh(G.disc, VINYL_MATS); disc.rotation.x = Math.PI / 2;
  const top = new THREE.Mesh(G.label, labelMat); top.position.z = .102;
  const bot = new THREE.Mesh(G.label, labelMat); bot.rotation.y = Math.PI; bot.position.z = -.102;
  grp.add(disc, top, bot); grp.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return grp;
}
/* a compact cassette, in its XY plane: smoky shell, the label along the top, the window with its two reels
   (they turn while it plays) and the head openings along the bottom edge */
let CSGEO = null, CASS_MATS = null;
function makeReelCanvas() {
  const S = 128, c = mkCanvas(S, S), x = c.getContext('2d'), R = S / 2;
  x.fillStyle = '#3b2b20'; x.beginPath(); x.arc(R, R, R, 0, 7); x.fill();
  x.fillStyle = '#ece8df'; x.beginPath(); x.arc(R, R, R * .45, 0, 7); x.fill();
  x.fillStyle = '#18181b'; x.beginPath(); x.arc(R, R, R * .22, 0, 7); x.fill();
  x.fillStyle = '#ece8df'; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; x.save(); x.translate(R, R); x.rotate(a); x.fillRect(-4, R * .14, 8, R * .12); x.restore(); }
  return c;
}
function makeCassette(labelMat) {
  const { w, h, t } = MSIZE.cass;
  const G = CSGEO || (CSGEO = { body: slabGeometry(w, h, t, .3, .08), label: new THREE.PlaneGeometry(8.6, 2.3), win: new THREE.PlaneGeometry(4.6, 1.5), reel: new THREE.CircleGeometry(.62, 24), foot: new THREE.PlaneGeometry(6.4, 1.1) });
  Object.values(G).forEach(q => { q.userData.shared = true; });
  if (!CASS_MATS) CASS_MATS = { body: M(THREE.MeshPhysicalMaterial, { color: '#26272b', roughness: .35, clearcoat: .6, clearcoatRoughness: .2 }, 1), win: new THREE.MeshBasicMaterial({ color: '#0b0b0d' }), reel: M(THREE.MeshStandardMaterial, { map: tex(makeReelCanvas()), roughness: .5 }, .8), foot: M(THREE.MeshStandardMaterial, { color: '#141416', roughness: .6 }, .7) };
  const grp = new THREE.Group();
  const body = new THREE.Mesh(G.body, CASS_MATS.body);
  const lab = new THREE.Mesh(G.label, labelMat); lab.position.set(0, 1.45, t / 2 + .012);
  const win = new THREE.Mesh(G.win, CASS_MATS.win); win.position.set(0, -.35, t / 2 + .012);
  const reels = [-1.25, 1.25].map(dx => { const rl = new THREE.Mesh(G.reel, CASS_MATS.reel); rl.position.set(dx, -.35, t / 2 + .02); grp.add(rl); return rl; });
  const foot = new THREE.Mesh(G.foot, CASS_MATS.foot); foot.position.set(0, -h / 2 + .7, t / 2 + .012);
  grp.add(body, lab, win, foot); grp.userData.reels = reels; grp.traverse(m => { if (m.isMesh) m.castShadow = true; });
  return grp;
}
function makeTapeWindowCanvas() {
  const W = 512, H = 196, c = mkCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = '#16161a'; x.fillRect(0, 0, W, H);
  /* the two hubs, the brown tape wound on the left one */
  x.fillStyle = '#3a2a1e'; x.beginPath(); x.arc(W * .27, H / 2, H * .44, 0, 7); x.fill();
  x.fillStyle = '#2a1f17'; x.beginPath(); x.arc(W * .73, H / 2, H * .22, 0, 7); x.fill();
  [.27, .73].forEach(k => { x.fillStyle = '#e9e6df'; x.beginPath(); x.arc(W * k, H / 2, H * .16, 0, 7); x.fill(); x.fillStyle = '#16161a'; for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; x.fillRect(W * k + Math.cos(a) * H * .09 - 3, H / 2 + Math.sin(a) * H * .09 - 3, 6, 6); } });
  x.strokeStyle = 'rgba(255,255,255,.18)'; x.lineWidth = 3; x.strokeRect(4, 4, W - 8, H - 8);
  return c;
}
/* half the media's height, so it can leave the case upwards without touching it (a tape stands on its long side in its case) */
function mediaHalfH(c) { const m = c.dim.media; return m === 'disc' ? c.dim.discR : m === 'tape' || m === 'cass' ? MSIZE[m].w / 2 : MSIZE[m].h / 2; }
const FLOPPY_COLS = ['#22252b', '#1d2b4a', '#55595f', '#2a2a2d', '#3b1e22'];
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
    const isJ = D.shell === 'clear', isB = D.shell === 'card';
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
    /* the spine hangs from the back's outer edge: in a keep case it folds back as the case opens, like the real
       plastic hinge, so from inside you see the black hinge and not the label (a jewel case's stays put) */
    this.hinge = new THREE.Group(); this.hinge.position.set(-w / 2, 0, -d / 2); this.inner.add(this.hinge); this.folds = D.shell === 'keep';
    this.spine = new THREE.Mesh(pgeo(g.fmt, 'spine'), this.spineMat); this.spine.rotation.y = -Math.PI / 2; this.spine.position.set(-.03, 0, d / 2); this.hinge.add(this.spine);
    /* dust: spine, top, front, back */
    this.dustMat = M(THREE.MeshStandardMaterial, { map: TEXS.spineDust, color: '#d9cfbd', transparent: true, opacity: 0, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }, .6);
    this.filmMat = M(THREE.MeshStandardMaterial, { map: TEXS.film, color: '#c9bea9', transparent: true, opacity: 0, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }, .6);
    this.topMat = M(THREE.MeshStandardMaterial, { map: TEXS.topDust, color: '#d9cfbd', transparent: true, opacity: 0, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }, .6);
    const ds = new THREE.Mesh(pgeo(g.fmt, 'spine'), this.dustMat); ds.rotation.y = -Math.PI / 2; ds.position.set(-.06, 0, d / 2);
    const dt = new THREE.Mesh(pgeo(g.fmt, 'top'), this.topMat); dt.rotation.x = -Math.PI / 2; dt.position.y = h / 2 + .04;
    const df = new THREE.Mesh(pgeo(g.fmt, 'film'), this.filmMat); df.position.set(0, 0, lidD / 2 + .035); this.lid.add(df);
    const db = new THREE.Mesh(pgeo(g.fmt, 'film'), this.filmMat); db.rotation.y = Math.PI; db.position.set(0, 0, -shellD / 2 - .035); this.shell.add(db);
    this.hinge.add(ds); this.inner.add(dt); this.dustMeshes = [ds, dt, df, db];
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
    /* where the media rests in the open case: the disc on its hub, the disks in a stack, the cartridge in its dent */
    this.discHome = D.media === 'disc' ? new V3(D.discX, 0, split + .075)
      : D.media === 'floppy' ? new V3(.6, -h * .1, split + .05 + MSIZE.floppy.t * (D.disks - .5))
      : D.media === 'tape' || D.media === 'cass' ? new V3(0, 0, split + MSIZE[D.media].t / 2 + .05)
      : new V3(0, -h * .13, split + MSIZE.cart.t / 2 + .05);
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
    const g = this.g, D = this.dim, { w, h, split } = D, isJ = g.fmt === 'jewel', isB = D.shell === 'card', parts = [];
    /* a series' season: several discs on the leaves of the case, or six tapes in a box (17-video.js) */
    if (D.multi) { this.thick = []; this.thickAt = .15; buildMultiInterior(this, parts); this.interior = parts; return; }
    /* an artist's divider card holds nothing */
    if (D.media === 'none') { this.thick = []; this.interior = parts; return; }
    if (!isB && D.media === 'disc') {
      const m = isJ ? MAT.edge.jewel : MAT.edge.dvd, G = interiorGeo();
      const hub = new THREE.Mesh(G.hub, m); hub.rotation.x = Math.PI / 2; hub.position.set(D.discX, 0, split + .17); this.inner.add(hub); parts.push([this.inner, hub]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, tooth = new THREE.Mesh(G.tooth, m); tooth.position.set(D.discX + Math.cos(a) * .55, Math.sin(a) * .55, split + .2); tooth.rotation.z = a; this.inner.add(tooth); parts.push([this.inner, tooth]); }
      [1, -1].forEach(sy => { const clip = new THREE.Mesh(G.clip, m); clip.position.set(w - .9, sy * (h / 2 - 1.3), -.13); this.pivot.add(clip); parts.push([this.pivot, clip]); });
    }
    /* thick media would show through a closed lid: they only appear once it has swung far enough */
    this.thick = []; this.thickAt = D.media === 'cart' ? .5 : .15;
    if (D.media === 'disc') this.disc = D.vinyl ? makeVinyl(D.discR, this.discLabelMat) : makeDisc(D.discR, this.discLabelMat);
    else if (D.media === 'cass') { this.disc = makeCassette(this.discLabelMat); this.thick.push(this.disc); this.thickAt = .2; }
    else if (D.media === 'tape') {
      /* the tape stands on its long side in the clamshell, its label to the front */
      this.disc = makeTape(this.discLabelMat); this.thick.push(this.disc); this.thickAt = .2;
    } else {
      this.mediaMat = M(THREE.MeshPhysicalMaterial, { color: D.media === 'cart' ? '#8d9098' : FLOPPY_COLS[hash(g.id) % FLOPPY_COLS.length], roughness: .5, clearcoat: .25, clearcoatRoughness: .4 }, .9);
      this.disc = D.media === 'cart' ? makeCart(this.discLabelMat, this.mediaMat) : makeFloppy(this.discLabelMat, this.mediaMat);
      this.thick.push(this.disc);
      if (D.media === 'floppy') {
        /* the other disks of the set, fanned out under the first one */
        this.extraLabelMats = [];
        for (let k = 1; k < D.disks; k++) {
          const lm = M(THREE.MeshStandardMaterial, { color: '#f3efe4', roughness: .7 }, .7), f = makeFloppy(lm, this.mediaMat);
          f.position.set(this.discHome.x + k * .55, this.discHome.y - k * .4, this.discHome.z - k * MSIZE.floppy.t); f.rotation.z = -k * .06;
          this.inner.add(f); parts.push([this.inner, f]); this.thick.push(f); this.extraLabelMats.push(lm);
        }
      }
    }
    this.disc.position.copy(this.discHome); this.inner.add(this.disc);
    /* the tape stands on its long side in the clamshell; it comes back the same way */
    if (D.media === 'tape' || D.media === 'cass') { this.disc.rotation.z = Math.PI / 2; this.discQuat = this.disc.quaternion.clone(); }
    /* films and series come without a manual */
    if (D.man[0]) {
      this.manual = new THREE.Mesh(manualGeo(g.fmt), [MAT.paper, MAT.paper, MAT.paper, MAT.paper, MAT.paper, this.manMat]);
      this.manual.position.set(w / 2 - .1, 0, -.09); this.pivot.add(this.manual); this.tag(this.manual, 'manual');
    }
    this.tag(this.disc, 'disc');
    this.interior = parts;
  }
  dropInterior() {
    if (!this.interior) return;
    this.interior.forEach(([p, m]) => p.remove(m));
    if (this.multi) dropMultiInterior(this);
    if (this.disc) { this.disc.parent && this.disc.parent.remove(this.disc); this.disc.children.forEach(m => { if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose(); }); }
    if (this.manual) this.pivot.remove(this.manual);
    if (this.extraLabelMats) { this.extraLabelMats.forEach(m => { if (m.map) m.map.dispose(); unM(m); }); this.extraLabelMats = null; }
    if (this.mediaMat) { unM(this.mediaMat); this.mediaMat = null; }
    this.disc = null; this.manual = null; this.interior = null; this.thick = null;
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
    if (this.dim.shell === 'card') unM(this.edge);
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
    const gap = (this.home.innerH || SHELF.innerH) - .4 - this.dim.h; this.web.visible = home && show && this.webMat.opacity > .02 && gap > 2.5;
    if (this.web.visible) { this.web.scale.set(4.6, gap, 1); this.web.position.set(this.home.x + 1.9, this.home.board + this.dim.h + gap / 2, (this.home.front || SHELF.front) - 1.4); this.web.rotation.set(0, -.25, 0); }
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
    this.discTex = tex(drawMediaLabel(this.g, this.coverCanvas)); this.discLabelMat.map = this.discTex; this.discLabelMat.color.set('#ffffff'); this.discLabelMat.needsUpdate = true;
    if (this.extraLabelMats) this.extraLabelMats.forEach((m, k) => { if (m.map) m.map.dispose(); m.map = tex(drawFloppyLabel(this.g, this.coverCanvas, k + 1, this.dim.disks)); m.needsUpdate = true; });
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
  edgeTint() { if (this.dim.shell === 'card') this.edge.color.set(this.g.spine || this.g.pal[0]); if (!this.frontMat.map) this.frontMat.color.set(this.g.pal[0]); if (!this.backMat.map) this.backMat.color.set(this.g.pal[0]); if (!this.discLabelMat.map) this.discLabelMat.color.set(this.g.pal[0]); }
  targetPose() {
    const P = _tp.pos, Qt = _tp.quat;
    if (this.mode === 'home' || this.mode === 'pulled') {
      P.copy(this.home.pos); Qt.copy(this.home.quat);
      if (this.faceOut) { P.z += this.hoverA * 2.2; P.y += this.hoverA * .7; } else P.z += this.hoverA * 3.4;
      const pa = this.mode === 'pulled' ? 1 : this.pullHold;
      if (pa > 0) { P.z += (this.dim.w + 5 + (this.faceOut ? 6 : 0)) * pa; P.y += 1.5 * pa; }
      return _tp;
    }
    /* while you play it waits closed beside the machine, lying cover up */
    if (this.mode === 'rest') { restPose(this, P, Qt); return _tp; }
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
    const tp = this.targetPose(), k = this.fast ? 26 : this.mode === 'rest' ? (this.root.position.distanceToSquared(tp.pos) < 4 ? 40 : 6) : (this.mode === 'inspect' || this.mode === 'parked') ? 7 : 9, a = 1 - Math.exp(-k * s);
    /* (a tape case on its way back into its box is moved by hand) */
    if (!this.pinned) {
      this.root.position.lerp(tp.pos, a); this.root.quaternion.slerp(tp.quat, a);
      const sc = this.root.scale.x + ((this.mode === 'parked' ? PARK_SCALE : 1) * (this.vanish ? .02 : 1) - this.root.scale.x) * a; this.root.scale.setScalar(sc);
    }
    const o = this.openA;
    /* a box of tapes does not open like a book: it leans back and the tapes rise out of its open top */
    if (this.g.fmt === 'vhsbox') { this.pivot.rotation.y = 0; this.inner.position.x = 0; this.inner.rotation.x = .9 * easeIO(o); }
    else { const mo = this.motion, lid = mo ? mo.lid : LID_OPEN * o; this.pivot.rotation.y = -lid; this.inner.position.x = this.dim.w / 2 * (mo ? mo.spread : o); if (this.folds) this.hinge.rotation.y = -lid / 2; }
    /* turned by hand, it springs back when you let go */
    const gb = this.grab; if (!gb.held && (gb.x || gb.y)) { gb.vx += (-16 * gb.x - 5.5 * gb.vx) * dt; gb.vy += (-16 * gb.y - 5.5 * gb.vy) * dt; gb.x += gb.vx * dt; gb.y += gb.vy * dt; if (Math.abs(gb.x) + Math.abs(gb.y) + Math.abs(gb.vx) + Math.abs(gb.vy) < 1e-4) gb.x = gb.y = gb.vx = gb.vy = 0; }
    if (this.multi) updateMultiInterior(this, dt);
    if (this.thick) { const show = o > this.thickAt; for (const m of this.thick) if (m.parent === this.inner || m.userData.thick) m.visible = show && !m.userData.away; }
    this.spineMat.emissiveIntensity = this.glowA * .5;
    if (this.wrap && !this.dragging && this.tear > .02) { this.dropHand(); this.updateStrip(); }
  }
  setDim(on) {
    if (this.dimmed === on) return; this.dimmed = on; const v = on ? .22 : 1;
    this.spineMat.color.setScalar(v); this.frontMat.color.copy(this.frontMat.map ? new THREE.Color(1, 1, 1) : new THREE.Color(this.g.pal[0])).multiplyScalar(v);
  }
}
