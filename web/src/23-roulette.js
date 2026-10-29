/* =====================================================================
   THE ROULETTE: a casino corner past the last room. You choose which
   games go on the wheel (every one, a status, a category, a system, one
   of Playnite's saved filters or your own list), spin, and the ball
   picks one. Each pocket holds a game's cover; the number ring and the
   ball are those of a European wheel (37 pockets, single zero).
   ===================================================================== */
const RL = {
  x: 980, z: 70, top: 78, N: 37, group: new THREE.Group(), pockets: [], pool: [], poolKey: '', filled: false,
  spinning: false, spin: null, result: null, resultIdx: -1, glowA: 0, lamp: 0, q: '', idle: .14, ballIn: null, hits: []
};
const RLW = { rim: 44, trackR: 37.6, rotorR: 33.5, numIn: 29, potIn: 21, numY: 6.2, potY: 5.2, ballR: .95, potR: 25 };
const RL_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
const RL_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const RL_D = 2 * Math.PI / RL_ORDER.length;
/* pocket i sits at this angle on the rotor (0 at the far side); on screen it is this minus the rotor's turn */
const rlPocketA = i => -Math.PI / 2 + i * RL_D;
RL.group.visible = false; scene.add(RL.group);

/* ---------- materials ---------- */
const rlWood = M(THREE.MeshStandardMaterial, { map: tex(makeRealWood(1024, 256, '#4a1d10', 17)), roughness: .3 }, .9);
const rlWoodDark = M(THREE.MeshStandardMaterial, { map: tex(makeRealWood(512, 256, '#24100a', 19)), roughness: .4 }, .7);
const rlGold = M(THREE.MeshStandardMaterial, { color: '#d6aa4e', metalness: 1, roughness: .26 }, 1.5);
const rlLeather = M(THREE.MeshStandardMaterial, { color: '#2b1510', roughness: .55 }, .5);
const rlBallMat = M(THREE.MeshPhysicalMaterial, { color: '#f7f2e8', roughness: .16, clearcoat: 1, clearcoatRoughness: .08 }, 1.2);

/* the felt: green baize with a gold ring printed around the wheel */
function makeFeltCanvas() {
  const S = 1024, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(311), h = S / 2;
  x.fillStyle = rg(x, h, h, 0, h, [[0, '#1f6a43'], [.7, '#185636'], [1, '#0f3b25']]); x.fillRect(0, 0, S, S);
  for (let i = 0; i < 60000; i++) { x.fillStyle = r() > .5 ? `rgba(255,255,255,${r() * .035})` : `rgba(0,0,0,${r() * .06})`; x.fillRect(r() * S, r() * S, 1.2, 1.2); }
  const k = h / 76, ring = (rr, w) => { x.beginPath(); x.arc(h, h, rr * k, 0, 7); x.lineWidth = w * k; x.strokeStyle = 'rgba(222,186,104,.75)'; x.stroke(); };
  ring(49, .35); ring(56, .2);
  x.save(); x.translate(h, h); x.fillStyle = 'rgba(222,186,104,.7)'; x.font = `700 ${Math.round(3.4 * k)}px ${F.saira}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const words = 'MYVLIBRARY · FAITES VOS JEUX · MYVLIBRARY · RIEN NE VA PLUS · '.split(''), step = 2 * Math.PI / words.length;
  words.forEach((ch, i) => { x.save(); x.rotate(i * step); x.translate(0, -52.5 * k); x.fillText(ch, 0, 0); x.restore(); });
  x.restore();
  return c;
}
const rlFelt = M(THREE.MeshStandardMaterial, { map: tex(makeFeltCanvas()), roughness: .95 }, .3);

/* ---------- the table, the lamp and the sign ---------- */
{
  const g = RL.group, T0 = RL.top;
  const felt = new THREE.Mesh(new THREE.CircleGeometry(76, 96), rlFelt); felt.rotation.x = -Math.PI / 2; felt.position.y = T0 + .02; felt.receiveShadow = true; g.add(felt);
  const slab = new THREE.Mesh(new THREE.CylinderGeometry(79, 77, 4.5, 96), rlWoodDark); slab.position.y = T0 - 2.25; slab.castShadow = slab.receiveShadow = true; g.add(slab);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(78.5, 3.3, 18, 120), rlLeather); rail.rotation.x = Math.PI / 2; rail.position.y = T0 + 1; rail.castShadow = true; g.add(rail);
  const col = new THREE.Mesh(new THREE.CylinderGeometry(8, 11, T0 - 8, 32), rlWoodDark); col.position.y = (T0 - 8) / 2 + 3; col.castShadow = true; g.add(col);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(30, 36, 5, 48), rlWoodDark); base.position.y = 2.5; base.castShadow = base.receiveShadow = true; g.add(base);
  const band = new THREE.Mesh(new THREE.TorusGeometry(79.2, .35, 8, 120), rlGold); band.rotation.x = Math.PI / 2; band.position.y = T0 - 4.4; g.add(band);
  /* chips: a few stacks at the edge of the felt */
  const chipTex = col2 => { const c = mkCanvas(256, 64), x = c.getContext('2d'); x.fillStyle = col2; x.fillRect(0, 0, 256, 64); x.fillStyle = '#f2eadb'; for (let i = 0; i < 8; i++) x.fillRect(i * 32 + 6, 0, 12, 64); return tex(c); };
  const chipTop = col2 => { const c = mkCanvas(128, 128), x = c.getContext('2d'); x.fillStyle = col2; x.fillRect(0, 0, 128, 128); x.strokeStyle = '#f2eadb'; x.lineWidth = 7; x.setLineDash([14, 10]); x.beginPath(); x.arc(64, 64, 52, 0, 7); x.stroke(); x.setLineDash([]); x.lineWidth = 2; x.beginPath(); x.arc(64, 64, 34, 0, 7); x.stroke(); return tex(c); };
  const chipGeo = new THREE.CylinderGeometry(2.1, 2.1, .38, 32);
  [['#a3161f', [54, 0, 30], 7], ['#16181c', [58, 0, 22.5], 4], ['#1f4f9a', [-56, 0, 28], 6], ['#a3161f', [-50, 0, 34], 3], ['#2c7a3c', [60, 0, -18], 5]].forEach(([col2, p, n], s) => {
    const side = M(THREE.MeshStandardMaterial, { map: chipTex(col2), roughness: .45 }, .6), top = M(THREE.MeshStandardMaterial, { map: chipTop(col2), roughness: .45 }, .6), r = rng(900 + s);
    for (let i = 0; i < n; i++) { const m = new THREE.Mesh(chipGeo, [side, top, top]); m.position.set(p[0] + (r() - .5) * .35, T0 + .2 + i * .39, p[2] + (r() - .5) * .35); m.rotation.y = r() * 6; m.castShadow = true; g.add(m); }
  });
  /* the pendant lamp: an enamel shade over the wheel, with its own warm spot */
  const LY = T0 + 112;
  const shade = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(3, 10), new THREE.Vector2(6, 8), new THREE.Vector2(16, 2), new THREE.Vector2(24, -4), new THREE.Vector2(24.6, -4.6)], 48), M(THREE.MeshStandardMaterial, { color: '#173d2c', roughness: .35, metalness: .3, side: THREE.DoubleSide }, .8));
  shade.position.y = LY; g.add(shade);
  const shadeRim = new THREE.Mesh(new THREE.TorusGeometry(24.4, .45, 8, 64), rlGold); shadeRim.rotation.x = Math.PI / 2; shadeRim.position.y = LY - 4.4; g.add(shadeRim);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 160, 8), rlGold); rod.position.y = LY + 90; g.add(rod);
  RL.bulb = new THREE.Mesh(new THREE.SphereGeometry(3.4, 20, 14), new THREE.MeshBasicMaterial({ color: '#ffe2b0', toneMapped: false })); RL.bulb.position.y = LY - 1.5; g.add(RL.bulb);
  RL.spot = new THREE.SpotLight('#ffd7a0', 0, 0, .62, .65, 1); RL.spot.position.set(0, LY - 2, 0); RL.spot.target.position.set(0, T0, 0); g.add(RL.spot, RL.spot.target);
  /* the neon on the wall behind */
  const neon = (() => {
    const c = mkCanvas(1024, 320), x = c.getContext('2d');
    x.font = `400 190px ${F.bungee}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.shadowColor = '#ff2a4d'; x.shadowBlur = 40; x.strokeStyle = '#ff6f86'; x.lineWidth = 12; x.strokeText('RULETA', 512, 168);
    x.shadowBlur = 14; x.strokeStyle = '#ffe3ea'; x.lineWidth = 4; x.strokeText('RULETA', 512, 168);
    return tex(c);
  })();
  RL.neon = new THREE.Mesh(new THREE.PlaneGeometry(128, 40), new THREE.MeshBasicMaterial({ map: neon, transparent: true, toneMapped: false, depthWrite: false, fog: false }));
  RL.neon.position.set(0, 190, WALL_Z - RL.z + .8); g.add(RL.neon);
  const halo = (() => { const c = mkCanvas(256, 128), x = c.getContext('2d'); x.fillStyle = rg(x, 128, 64, 0, 120, [[0, 'rgba(255,60,90,.4)'], [1, 'rgba(255,60,90,0)']]); x.fillRect(0, 0, 256, 128); return tex(c); })();
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(230, 110), new THREE.MeshBasicMaterial({ map: halo, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
  glow.position.set(0, 190, WALL_Z - RL.z + .5); g.add(glow);
}

/* ---------- the wheel: a bowl that stays put, a rotor that turns, a ball ---------- */
const rlWheel = new THREE.Group(); rlWheel.position.y = RL.top; RL.group.add(rlWheel);
const rlRotor = new THREE.Group(); rlWheel.add(rlRotor);
/* the rotor's face is one picture: numbers outside, the covers in the pockets */
const RLS = 2048, rlCan = mkCanvas(RLS, RLS), rlTex = tex(rlCan);
const rlFace = M(THREE.MeshPhysicalMaterial, { map: rlTex, roughness: .38, clearcoat: .5, clearcoatRoughness: .2 }, .6);
/* a flat ring whose texture coordinates follow the whole rotor face, so every ring shares the one picture */
function rlRing(r0, r1, y, mat) {
  const geo = new THREE.RingGeometry(r0, r1, 148, 2), p = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / (2 * RLW.rotorR) + .5, p.getY(i) / (2 * RLW.rotorR) + .5);
  geo.rotateX(-Math.PI / 2); const m = new THREE.Mesh(geo, mat); m.position.y = y; m.receiveShadow = true; return m;
}
{
  const W = RLW;
  /* the bowl: outer wall, rim, the sloping track the ball runs on */
  const prof = [[33.9, 4.4], [34.3, 6.4], [35.4, 6.9], [37.2, 7.5], [38.7, 8.3], [39.1, 9.7], [40.2, 10.3], [42.8, 10.3], [44.1, 9.4], [44.3, .3], [41, .02]].map(([r, y]) => new THREE.Vector2(r, y));
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 120), Object.assign(rlWood.clone(), { side: THREE.DoubleSide })); bowl.castShadow = bowl.receiveShadow = true; rlWheel.add(bowl); RL.hits.push(bowl);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(42.9, .32, 8, 120), rlGold); lip.rotation.x = Math.PI / 2; lip.position.y = 10.3; rlWheel.add(lip);
  /* eight diamonds on the track knock the ball about on its way down */
  const dGeo = new THREE.OctahedronGeometry(1, 0);
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4 + Math.PI / 8, d = new THREE.Mesh(dGeo, rlGold);
    d.position.set(Math.cos(a) * 36.3, 7.55, Math.sin(a) * 36.3); d.scale.set(i % 2 ? .55 : 1.7, .5, i % 2 ? 1.7 : .55); d.rotation.y = Math.PI / 2 - a; d.castShadow = true; rlWheel.add(d);
  }
  /* the rotor: numbers, pockets with their covers, frets, the cone and the turret */
  const nums = rlRing(W.numIn, W.rotorR, W.numY, rlFace), pots = rlRing(W.potIn, W.numIn, W.potY, rlFace);
  rlRotor.add(nums, pots); RL.hits.push(nums, pots);
  const wall = (r, y0, y1, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, y1 - y0, 148, 1, true), mat); m.position.y = (y0 + y1) / 2; rlRotor.add(m); return m; };
  wall(W.numIn, W.potY, W.numY, Object.assign(rlWoodDark.clone(), { side: THREE.DoubleSide }));
  wall(W.potIn, W.potY, 6.5, Object.assign(rlWoodDark.clone(), { side: THREE.DoubleSide }));
  wall(W.rotorR, 4.4, W.numY, rlWoodDark);
  const cone = new THREE.Mesh(new THREE.LatheGeometry([[21, 6.5], [19.5, 7.1], [13, 8.7], [6.5, 9.9], [4.4, 10.15], [.01, 10.2]].map(([r, y]) => new THREE.Vector2(r, y)), 120), rlWood);
  cone.castShadow = cone.receiveShadow = true; rlRotor.add(cone); RL.hits.push(cone);
  [[20.7, 6.6, .28], [W.rotorR, W.numY + .05, .22], [6.4, 9.95, .3]].forEach(([r, y, t]) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, t, 8, 120), rlGold); m.rotation.x = Math.PI / 2; m.position.y = y; rlRotor.add(m); });
  const fGeo = new THREE.BoxGeometry(.34, 1.25, W.numIn - W.potIn + .2);
  for (let i = 0; i < RL_ORDER.length; i++) {
    const a = rlPocketA(i) + RL_D / 2, f = new THREE.Mesh(fGeo, rlGold);
    f.position.set(Math.cos(a) * RLW.potR, W.potY + .62, Math.sin(a) * RLW.potR); f.rotation.y = Math.PI / 2 - a; f.castShadow = true; rlRotor.add(f);
  }
  /* the turret: a gold spindle with a four-armed handle */
  const tur = new THREE.Group(); tur.position.y = 10.2; rlRotor.add(tur);
  const add = (geo, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, rlGold); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; tur.add(m); return m; };
  add(new THREE.CylinderGeometry(1.4, 2.4, 3.4, 24), 0, 1.7, 0);
  add(new THREE.CylinderGeometry(.62, .62, 3.6, 16), 0, 5, 0);
  const arm = new THREE.CylinderGeometry(.42, .42, 11, 12), knob = new THREE.SphereGeometry(.9, 16, 12);
  add(arm, 0, 6.2, 0, 0, Math.PI / 2); add(arm, 0, 6.2, 0, Math.PI / 2, 0);
  [[5.5, 0], [-5.5, 0], [0, 5.5], [0, -5.5]].forEach(([x, z]) => add(knob, x, 6.2, z));
  add(new THREE.SphereGeometry(1.25, 18, 14), 0, 7.6, 0);
  /* where the winner sits: a gold glow over its pocket */
  const gc = mkCanvas(128, 192), gx = gc.getContext('2d');
  /* a gold frame drawn over the cover (not added light, which vanishes on a pale cover) */
  gx.shadowColor = 'rgba(255,190,80,.9)'; gx.shadowBlur = 18; gx.strokeStyle = '#ffd27a'; gx.lineWidth = 10; gx.strokeRect(26, 26, 76, 140); gx.shadowBlur = 0; gx.strokeStyle = '#fff1cf'; gx.lineWidth = 3; gx.strokeRect(26, 26, 76, 140);
  RL.glow = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 10.6), new THREE.MeshBasicMaterial({ map: tex(gc), transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
  RL.glow.rotation.x = -Math.PI / 2; RL.glow.position.y = W.potY + .08; rlRotor.add(RL.glow);
  /* and the dolly, the marker a croupier sets on the winning number */
  RL.dolly = new THREE.Group(); RL.dolly.visible = false; rlRotor.add(RL.dolly);
  const db = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, .7, 24), rlGold); db.position.y = .35; db.castShadow = true; RL.dolly.add(db);
  const dt2 = new THREE.Mesh(new THREE.SphereGeometry(1.05, 20, 14), M(THREE.MeshPhysicalMaterial, { color: '#fff4dc', roughness: .05, metalness: 0, clearcoat: 1, emissive: '#ffcf7a', emissiveIntensity: .35 }, 1.6)); dt2.position.y = 1.55; dt2.castShadow = true; RL.dolly.add(dt2);
}
const rlBall = new THREE.Mesh(new THREE.SphereGeometry(RLW.ballR, 24, 16), rlBallMat); rlBall.castShadow = true; rlWheel.add(rlBall);
/* the ball's place: angle round the wheel, distance from the middle, height of its centre */
const RLB = { a: Math.PI / 2, r: RLW.trackR, y: 0 };
/* the surface under the ball at a distance r from the middle */
function rlFloorY(r) {
  if (r < RLW.potIn) return 6.5; if (r < RLW.numIn) return RLW.potY; if (r < RLW.rotorR) return RLW.numY;
  const P = [[33.5, 6.2], [34.3, 6.4], [35.4, 6.9], [37.2, 7.5], [38.7, 8.3]];
  for (let i = 1; i < P.length; i++) if (r <= P[i][0]) return lerp(P[i - 1][1], P[i][1], (r - P[i - 1][0]) / (P[i][0] - P[i - 1][0]));
  return 8.3;
}
RLB.y = rlFloorY(RLB.r) + RLW.ballR;

/* ---------- covers for the pockets ---------- */
const RL_THUMB = new Map();
function rlThumb(g) {
  const key = g.id + '|' + (g.ver || '') + '|' + (g.coverSmall || g.cover ? 1 : 0);
  if (RL_THUMB.has(key)) return RL_THUMB.get(key);
  const c = mkCanvas(132, 188), x = c.getContext('2d');
  if (g.real) { const src = g.cover || g.coverSmall; if (src) coverFit(x, src, 0, 0, 132, 188); else placeholderArt(x, 132, 188, g); }
  else { try { const cv = drawCover(g); coverFit(x, cv, 0, 0, 132, 188); } catch (e) { x.fillStyle = (g.pal && g.pal[0]) || '#444'; x.fillRect(0, 0, 132, 188); } }
  RL_THUMB.set(key, c);
  /* a real cover not loaded yet: fetch the small one and paint the wheel again when it comes */
  if (g.real && g.hasCover && !g.coverSmall && !g.cover && PLAYNITE) LIB.img(LIB.coverUrl(g, 200)).then(img => { if (img) { g.coverSmall = img; rlRedraw(); } });
  return c;
}
let rlRedrawT = 0;
function rlRedraw() { clearTimeout(rlRedrawT); rlRedrawT = setTimeout(rlDraw, 120); }
function rlWedge(x, c, r0, r1, a0, a1) { x.beginPath(); x.arc(c, c, r1, a0, a1); x.arc(c, c, r0, a1, a0, true); x.closePath(); }
function rlDraw() {
  const x = rlCan.getContext('2d'), S = RLS, c = S / 2, k = S / (2 * RLW.rotorR);
  x.fillStyle = '#2a120b'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < RL_ORDER.length; i++) {
    const a = rlPocketA(i), a0 = a - RL_D / 2, a1 = a + RL_D / 2, n = RL_ORDER[i], col = n === 0 ? '#11733a' : RL_RED.has(n) ? '#a8121b' : '#151515';
    rlWedge(x, c, RLW.numIn * k, RLW.rotorR * k, a0, a1); x.fillStyle = col; x.fill();
    x.save(); x.translate(c + Math.cos(a) * 31.3 * k, c + Math.sin(a) * 31.3 * k); x.rotate(a + Math.PI / 2);
    x.fillStyle = '#f3e7cc'; x.font = `700 ${Math.round(2.7 * k)}px ${F.saira}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n), 0, .1 * k); x.restore();
    /* the pocket's floor: the cover, its top towards the rim */
    x.save(); rlWedge(x, c, RLW.potIn * k, RLW.numIn * k, a0, a1); x.clip(); x.fillStyle = col; x.fill();
    const g = RL.pockets[i];
    if (g) { x.translate(c + Math.cos(a) * RLW.potR * k, c + Math.sin(a) * RLW.potR * k); x.rotate(a + Math.PI / 2); coverFit(x, rlThumb(g), -2.85 * k, -4.15 * k, 5.7 * k, 8.3 * k); }
    x.restore();
  }
  /* the pockets are a step down: darker at their inner and outer edges */
  x.save(); rlWedge(x, c, RLW.potIn * k, RLW.numIn * k, 0, 2 * Math.PI);
  x.fillStyle = rg(x, c, c, RLW.potIn * k, RLW.numIn * k, [[0, 'rgba(0,0,0,.55)'], [.18, 'rgba(0,0,0,0)'], [.82, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.45)']]); x.fill(); x.restore();
  x.lineWidth = .22 * k; x.strokeStyle = '#c9a24a';
  [RLW.numIn, RLW.rotorR - .12].forEach(r => { x.beginPath(); x.arc(c, c, r * k, 0, 2 * Math.PI); x.stroke(); });
  for (let i = 0; i < RL_ORDER.length; i++) { const a = rlPocketA(i) + RL_D / 2; x.beginPath(); x.moveTo(c + Math.cos(a) * RLW.numIn * k, c + Math.sin(a) * RLW.numIn * k); x.lineTo(c + Math.cos(a) * RLW.rotorR * k, c + Math.sin(a) * RLW.rotorR * k); x.stroke(); }
  rlTex.needsUpdate = true;
}

/* ---------- which games go on the wheel ---------- */
const RL_BY = [['all', 'Todos'], ['status', 'Estado'], ['cat', 'Categoría'], ['plat', 'Sistema'], ['preset', 'Filtro de Playnite'], ['pick', 'Elegidos a mano']];
const rlGames = () => GAMES.filter(g => !g.video && !g.music);
function rlByList() { return RL_BY.filter(([v]) => v !== 'preset' || PRESETS.length); }
/* the choices for a status, a category, a system or a saved filter, each with how many games it has */
function rlOptions(by) {
  const games = rlGames(), count = f => games.reduce((n, g) => n + (f(g) ? 1 : 0), 0);
  if (by === 'status') return [...new Set([...STATUSES, ...games.map(g => g.status || '')])].map(s => [s, s ? TD(s) : T('Sin estado'), count(g => (g.status || '') === s)]).filter(o => o[2] > 0);
  if (by === 'cat') return [...new Set([...prefs.cats, ...games.flatMap(g => g.cats)])].sort((a, b) => a.localeCompare(b, LANG)).map(c => [c, TD(c), count(g => g.cats.includes(c))]).filter(o => o[2] > 0);
  if (by === 'plat') { const m = new Map(); games.forEach(g => { const s = sysOf(g); if (!m.has(s)) m.set(s, [s, sysLabel(g), 0]); m.get(s)[2]++; }); return [...m.values()].sort((a, b) => sysRank(a[0]) - sysRank(b[0]) || a[1].localeCompare(b[1], LANG)); }
  if (by === 'preset') return PRESETS.map(p => [p.id, p.name, count(g => (g.presets || []).includes(p.id))]).filter(o => o[2] > 0);
  return [];
}
function rlBy() { const b = prefs.rlBy || 'all'; return rlByList().some(o => o[0] === b) ? b : 'all'; }
function rlVal() { const by = rlBy(), o = rlOptions(by); if (!o.length) return ''; return o.some(x => x[0] === prefs.rlVal) ? prefs.rlVal : o[0][0]; }
function rlPool() {
  const by = rlBy(), v = rlVal(), pick = new Set(prefs.rlPick || []);
  let L = rlGames();
  if (by === 'status') L = L.filter(g => (g.status || '') === v);
  else if (by === 'cat') L = L.filter(g => g.cats.includes(v));
  else if (by === 'plat') L = L.filter(g => sysOf(g) === v);
  else if (by === 'preset') L = L.filter(g => (g.presets || []).includes(v));
  else if (by === 'pick') L = L.filter(g => pick.has(g.id));
  if (PLAYNITE && prefs.rlInst === 'on') L = L.filter(g => g.installed);
  return L;
}
const rlPoolKeyOf = L => L.map(g => g.id).join(',');
/* fill the 37 pockets: a fresh random 37 when there are more games, each game round and round when there are fewer */
function rlFill() {
  const pool = rlPool(), sh = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  RL.pool = pool; RL.poolKey = rlPoolKeyOf(pool); RL.filled = true;
  if (!pool.length) RL.pockets = new Array(RL_ORDER.length).fill(null);
  else if (pool.length >= RL_ORDER.length) RL.pockets = sh(pool.slice()).slice(0, RL_ORDER.length);
  else { const o = sh(pool.slice()); RL.pockets = RL_ORDER.map((_, i) => o[i % o.length]); }
  rlClearResult(); rlDraw();
}
function rlClearResult() { RL.result = null; RL.resultIdx = -1; const r = $('#rlResult'); if (r) r.hidden = true; }

/* ---------- the spin: worked out in advance, so the ball lands where the draw says ---------- */
const smooth01 = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
function rlPlan(target) {
  const s = SPEED, T1 = 4 * s, T2 = 5.3 * s, T3 = 7.1 * s, n = 900, dt = T3 / n;
  const wr0 = RM ? .5 : 1.7, tr = 5.5 * s, wb0 = RM ? 3 : 10.5, tb = 2.9 * s, tc = 1.2 * s;
  const th0 = rlRotor.rotation.y, theta = t => th0 + wr0 * tr * (1 - Math.exp(-t / tr)), wr = t => wr0 * Math.exp(-t / tr);
  /* the ball's own speed: fast round the track, slowing, then carried along by the rotor */
  const wFree = t => t < T1 ? wb0 * Math.exp(-t / tb) : wb0 * Math.exp(-T1 / tb) * Math.exp(-(t - T1) / tc);
  const w = t => t < T2 ? wFree(t) : lerp(wFree(t), -wr(t), smooth01((t - T2) / (T3 - T2)));
  const nat = new Float32Array(n + 1), corr = new Float32Array(n + 1);
  for (let i = 1; i <= n; i++) { const t0 = (i - 1) * dt, t1 = i * dt; nat[i] = nat[i - 1] + (w(t0) + w(t1)) / 2 * dt; corr[i] = corr[i - 1] + (Math.pow(Math.sin(Math.PI * t0 / T3), 2) + Math.pow(Math.sin(Math.PI * t1 / T3), 2)) / 2 * dt; }
  const a0 = RLB.a, want = rlPocketA(target) - theta(T3);
  let d = (want - (a0 + nat[n])) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
  const plan = { t0: performance.now(), T1, T2, T3, n, dt, nat, corr, d, a0, theta, wr, target, r0: RLB.r, y0: RLB.y, sounds: [], end: T3 + 6 * s };
  /* the sounds: the hop off a diamond, the landings, the frets the ball clicks over in the pockets */
  plan.sounds.push({ t: T1 + .4 * (T2 - T1), k: 'clack', g: .55 });
  [1 / 3, 2 / 3, 1].forEach((u, i) => plan.sounds.push({ t: T2 + u * (T3 - T2) - .02, k: 'clack', g: [.5, .32, .18][i] }));
  let last = null;
  for (let i = 0; i <= n; i++) {
    const t = i * dt; if (t < T2) continue;
    const rel = Math.floor((rlAngleAt(plan, t) + theta(t) - rlPocketA(0) + RL_D / 2) / RL_D);
    if (last !== null && rel !== last) plan.sounds.push({ t, k: 'tick', g: .3 * (1 - (t - T2) / (T3 - T2)) + .05 });
    last = rel;
  }
  plan.sounds.push({ t: T3 + .28 * s, k: 'ding', g: .5 });
  plan.sounds.sort((a, b) => a.t - b.t);
  return plan;
}
function rlAngleAt(p, t) {
  const f = clamp(t / p.dt, 0, p.n), i = Math.floor(f), j = Math.min(p.n, i + 1), u = f - i;
  return p.a0 + lerp(p.nat[i], p.nat[j], u) + p.d * lerp(p.corr[i], p.corr[j], u) / p.corr[p.n];
}
/* where the ball is at time t of the spin */
function rlBallAt(p, t) {
  const { T1, T2, T3 } = p;
  if (t >= T3) return { a: rlPocketA(p.target) - rlRotor.rotation.y, r: RLW.potR, y: RLW.potY + RLW.ballR };
  const a = rlAngleAt(p, t); let r, hop = 0;
  if (t < T1) r = lerp(p.r0, RLW.trackR, smooth01(t / (.45 * SPEED))) + .15 * Math.sin(t * 9);
  else if (t < T2) { const u = (t - T1) / (T2 - T1); r = lerp(RLW.trackR, 31.4, u * u); if (u > .38 && u < .7) hop = 1.7 * Math.sin(Math.PI * (u - .38) / .32); }
  else { const u = (t - T2) / (T3 - T2); r = RLW.potR + 6.4 * (1 - easeOut(u)) + 1.1 * Math.sin(3 * Math.PI * u) * (1 - u) * (1 - u); hop = 1.6 * Math.abs(Math.sin(3 * Math.PI * u)) * (1 - u) * (1 - u); }
  let y = rlFloorY(r) + RLW.ballR + hop;
  /* lifted out of the pocket at the start, if that is where it was */
  if (t < .45 * SPEED && p.y0 < y) y = lerp(p.y0, y, smooth01(t / (.45 * SPEED)));
  return { a, r, y };
}
function rlSpin() {
  if (mode !== 'roulette' || RL.spinning) return;
  /* more games than pockets: a new handful each spin */
  if (RL.result && RL.pool.length > RL_ORDER.length) rlFill();
  if (RL.poolKey !== rlPoolKeyOf(rlPool())) rlFill();
  const on = [...new Set(RL.pockets.filter(Boolean))];
  if (!on.length) { toast(T('Ningún juego entra en la ruleta')); return; }
  /* the draw: every game on the wheel equally likely, whatever number of pockets it has */
  const g = on[Math.floor(Math.random() * on.length)], idx = RL.pockets.map((x, i) => x === g ? i : -1).filter(i => i >= 0), target = idx[Math.floor(Math.random() * idx.length)];
  rlClearResult(); RL.glowA = 0; RL.glow.material.opacity = 0; RL.ballIn = null;
  RL.spin = rlPlan(target); RL.spinning = true; RL.won = g; RL.si = 0;
  sfx.init(); rlAudio.start();
  if (LIB.prefetch && g.real) LIB.prefetch(g);
  rlRenderPanel(); renderPrompts();
}
function rlLanded() {
  const p = RL.spin; RL.spinning = false; RL.result = RL.won; RL.resultIdx = p.target; RL.ballIn = rlPocketA(p.target); RL.landT = performance.now();
  /* the glow lies flat in the winning pocket, its long side along the pocket */
  const a = rlPocketA(p.target); RL.glow.position.set(Math.cos(a) * RLW.potR, RLW.potY + .1, Math.sin(a) * RLW.potR); RL.glow.rotation.set(-Math.PI / 2, 0, -(a + Math.PI / 2));
  RL.dolly.position.set(Math.cos(a) * 31.3, RLW.numY, Math.sin(a) * 31.3);
  rlRenderPanel(); rlRenderResult(); renderPrompts();
}
function updateRoulette(dt, now) {
  /* the lamp comes on as you walk in */
  RL.lamp += ((mode === 'roulette' ? 1 : 0) - RL.lamp) * (1 - Math.exp(-3 * dt));
  RL.spot.intensity = 1.5 * RL.lamp; RL.bulb.material.color.setScalar(.25 + .75 * RL.lamp).multiply(_rlBulb);
  const p = RL.spin;
  if (p) {
    /* (a fixed moment can be asked for while testing) */
    const t = RL.debugT ?? (now - p.t0) / 1000;
    rlRotor.rotation.y = p.theta(Math.min(t, p.end));
    const b = rlBallAt(p, t); RLB.a = b.a; RLB.r = b.r; RLB.y = b.y;
    /* the rolling sound follows the ball's speed while it runs round the track */
    rlAudio.roll(t < p.T2 ? clamp(Math.abs(rlAngleAt(p, t + .05) - rlAngleAt(p, t)) / .05 / 10, 0, 1) * (t < p.T2 - .3 ? 1 : (p.T2 - t) / .3) : 0);
    while (RL.si < p.sounds.length && p.sounds[RL.si].t <= t) { const s = p.sounds[RL.si++]; rlAudio[s.k](s.g); }
    if (RL.spinning && t >= p.T3 + .3 * SPEED) rlLanded();
    if (t >= p.end) { RL.spin = null; rlAudio.stop(); }
  } else if (!RL.result) {
    /* waiting: the rotor turns slowly with the ball resting on the track */
    rlRotor.rotation.y += RL.idle * dt * (mode === 'roulette' ? 1 : 0);
  }
  /* a ball sitting in a pocket goes round with the rotor */
  if (!p && RL.ballIn !== null) { RLB.a = RL.ballIn - rlRotor.rotation.y; RLB.r = RLW.potR; RLB.y = RLW.potY + RLW.ballR; }
  rlBall.position.set(Math.cos(RLB.a) * RLB.r, RLB.y, Math.sin(RLB.a) * RLB.r);
  rlBall.rotation.y -= dt * 8;
  /* timed from the landing, so it shows the same however fast the frames come */
  RL.glowA = RL.result ? clamp((now - (RL.landT || 0)) / 600, 0, 1) : 0;
  RL.glow.material.opacity = RL.glowA * (.8 + .2 * Math.sin(now * .006));
  /* the dolly drops onto the number with a little bounce */
  RL.dolly.visible = RL.glowA > 0; if (RL.dolly.visible) { const u = clamp((now - RL.landT) / 450, 0, 1); RL.dolly.position.y = RLW.numY + 6 * Math.pow(1 - u, 2); RL.dolly.scale.setScalar(.6 + .4 * easeOut(u)); }
}
const _rlBulb = new THREE.Color('#ffe2b0');

/* ---------- sounds, made on the spot: the ball rolling, clacks, the frets, a bell ---------- */
const rlAudio = {
  src: null, gain: null,
  ok() { return sfx.ok() && sfx.ctx; },
  start() {
    if (!this.ok()) return; this.stop();
    const c = sfx.ctx, len = c.sampleRate * 2, b = c.createBuffer(1, len, c.sampleRate), d = b.getChannelData(0);
    let v = 0; for (let i = 0; i < len; i++) { v = v * .6 + (Math.random() * 2 - 1) * .4; d[i] = v * (.6 + .4 * Math.sin(i / c.sampleRate * 2 * Math.PI * 31)); }
    const s = c.createBufferSource(); s.buffer = b; s.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = .8;
    const g = c.createGain(); g.gain.value = 0; s.connect(f); f.connect(g); g.connect(sfx.master); s.start();
    this.src = s; this.gain = g; this.filter = f;
  },
  roll(v) { if (!this.gain) return; const c = sfx.ctx; this.gain.gain.setTargetAtTime(.22 * v, c.currentTime, .05); this.filter.frequency.setTargetAtTime(1500 + 2200 * v, c.currentTime, .1); },
  stop() { if (this.src) { try { this.src.stop(); } catch (e) { } this.src = null; this.gain = null; } },
  hit(g, freq, dur) {
    if (!this.ok()) return; const c = sfx.ctx, t = c.currentTime, n = Math.round(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const e = Math.exp(-i / (n * .18)); d[i] = ((Math.random() * 2 - 1) * .5 + Math.sin(i / c.sampleRate * 2 * Math.PI * freq)) * e; }
    const s = c.createBufferSource(); s.buffer = b; const gn = c.createGain(); gn.gain.value = g; s.connect(gn); gn.connect(sfx.master); s.start(t);
  },
  clack(g) { this.hit(g, 2900 + Math.random() * 500, .05); },
  tick(g) { this.hit(g * .7, 4200 + Math.random() * 600, .018); },
  ding(g) {
    if (!this.ok()) return; const c = sfx.ctx, t = c.currentTime;
    [[1318.5, 1], [1975.5, .5], [2637, .25]].forEach(([f, a]) => { const o = c.createOscillator(), gn = c.createGain(); o.type = 'sine'; o.frequency.value = f; gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(g * a * .35, t + .01); gn.gain.exponentialRampToValueAtTime(.0001, t + 1.4); o.connect(gn); gn.connect(sfx.master); o.start(t); o.stop(t + 1.5); });
  }
};

/* ---------- going there and back ---------- */
function rlPlace() {
  /* past the TV room, or past the last bookcase in that design */
  RL.x = isCases() && STAGE.name !== 'video' && STAGE.name !== 'music' ? Math.max(980, SH.x0 + groups.length * SH.step + 230) : 980;
  RL.x = Math.min(RL.x, 3400); RL.group.position.set(RL.x, 0, RL.z);
}
function openRoulette() {
  if (mode !== 'shelf' || busy || swapBusy) return;
  sfx.init(); setHovered(null); kbNav = false; if (typeof closeFilterPop === 'function') closeFilterPop();
  rlPlace(); RL.group.visible = true;
  if (!RL.filled || RL.poolKey !== rlPoolKeyOf(rlPool())) rlFill(); else rlDraw();
  setMode('roulette'); setView('roulette'); sfx.whoosh();
  document.documentElement.classList.add('rl-on'); rlRenderPanel(); rlRenderResult(); renderRlBtn();
}
function closeRoulette() {
  if (mode !== 'roulette') return;
  if (RL.spinning) { RL.spinning = false; RL.spin = null; rlAudio.stop(); }
  document.documentElement.classList.remove('rl-on'); $('#rlPanel').hidden = true; $('#rlResult').hidden = true;
  setMode('shelf'); setView('shelf'); sfx.whoosh(); renderRlBtn();
  setTimeout(() => { if (mode !== 'roulette') RL.group.visible = false; }, 2600);
}
/* the winner: back to the shelf, to its room, and it comes out into your hands */
async function rlGo() {
  const g = RL.result; if (!g || RL.spinning) return;
  closeRoulette(); await waitReal(.05);
  const hidden = !passes(g);
  if (hidden) { prefs.filter = 'all'; savePrefs(); renderFilter(); toast(T('Sin filtro, para enseñarte este juego')); }
  if (isRooms() && sysOf(g) !== STAGE.sys) await setSystem(0, sysOf(g));
  else if (hidden) { buildGroups(); await swapShelf(() => { curGroup = 0; curPage = 0; }, true); renderSysbar(); }
  await LIB.focusGame(g.id);
  const c = navOrder.find(q => q.g === g); if (c && mode === 'shelf' && !busy) pick(c);
}
function rlKey(k) {
  if (k === 'Escape' || k === 'Backspace') { closeRoulette(); return true; }
  if (RL.spinning) return true;
  if (k === 'Enter') { if (RL.result) rlGo(); else rlSpin(); return true; }
  if (k === ' ' || k === 'f' || k === 'F') { rlSpin(); return true; }
  if (k === 'm' || k === 'M') { if (RL.result) rlGo(); return true; }
  if (k === 'ArrowUp' || k === 'ArrowDown') { const L = rlByList(), i = L.findIndex(o => o[0] === rlBy()); rlSetBy(L[(i + (k === 'ArrowDown' ? 1 : -1) + L.length) % L.length][0]); return true; }
  if (k === 'ArrowLeft' || k === 'ArrowRight') { const o = rlOptions(rlBy()); if (o.length > 1) { const i = o.findIndex(x => x[0] === rlVal()); rlSetVal(o[(i + (k === 'ArrowRight' ? 1 : -1) + o.length) % o.length][0]); } return true; }
  return false;
}
function rlPrompts() {
  if (RL.spinning) return `<span class="hint">${T('¡No va más!')}</span>`;
  return (RL.result ? btn(T('Intro'), T('Ir a por él'), 'rlGo', true) + btn(T('Espacio'), T('Tirar otra vez'), 'rlSpin') : btn(T('Intro'), T('Tirar'), 'rlSpin', true))
    + `<span class="hint"><kbd>↑</kbd><kbd>↓</kbd> ${T('entre qué')} · <kbd>←</kbd><kbd>→</kbd> ${T('cuál')}</span>` + btn('Esc', T('Volver'), 'rlBack');
}

/* ---------- the panels: what goes on the wheel, and what came out ---------- */
function rlSetBy(v) { if (RL.spinning) return; prefs.rlBy = v; savePrefs(); sfx.tick(); rlChanged(); }
function rlSetVal(v) { if (RL.spinning) return; prefs.rlVal = v; savePrefs(); sfx.tick(); rlChanged(); }
function rlChanged() { if (RL.poolKey !== rlPoolKeyOf(rlPool())) rlFill(); rlRenderPanel(); renderPrompts(); }
function rlCountText(n) {
  if (!n) return T('Ningún juego entra en la ruleta');
  if (n > RL_ORDER.length) return T('{0} juegos: en la rueda caben 37 y cambian en cada tirada', n);
  return T(n === 1 ? '{0} juego en la ruleta' : '{0} juegos en la ruleta', n);
}
function rlPickRows() {
  const q = RL.q.trim().toLowerCase(), pick = new Set(prefs.rlPick || []);
  let L = rlGames().sort((a, b) => (a.sort || a.t).localeCompare(b.sort || b.t, LANG));
  if (q) L = L.filter(g => g.t.toLowerCase().includes(q));
  const more = L.length > 400; L = L.slice(0, 400);
  return L.map(g => `<label><input type="checkbox" data-rlpick="${esc(g.id)}"${pick.has(g.id) ? ' checked' : ''}><span>${esc(g.t)}</span><em>${esc(sysLabel(g))}</em></label>`).join('') + (more ? `<p class="rl-more">${T('Busca para ver el resto')}</p>` : '') + (L.length ? '' : `<p class="rl-more">${T('Ningún juego con ese nombre')}</p>`);
}
function rlRenderPanel() {
  const el = $('#rlPanel'); if (!el) return;
  if (mode !== 'roulette') { el.hidden = true; return; }
  const by = rlBy(), val = rlVal(), opts = rlOptions(by), pool = rlPool(), off = RL.spinning ? ' disabled' : '';
  el.hidden = false; el.classList.toggle('busy', RL.spinning);
  el.innerHTML = `<div class="rl-head"><b>${T('Ruleta')}</b><span>${T('¿Entre qué juegos tiramos?')}</span></div>
    <div class="rl-by" role="radiogroup">${rlByList().map(([v, n]) => `<button type="button" role="radio" data-rlby="${v}" aria-checked="${v === by}"${off}>${T(n)}</button>`).join('')}</div>
    ${opts.length ? `<select id="rlVal" aria-label="${T('Cuál')}"${off}>${opts.map(([v, n, c]) => `<option value="${esc(v)}"${v === val ? ' selected' : ''}>${esc(n)} (${c})</option>`).join('')}</select>` : ''}
    ${by === 'pick' ? `<div class="rl-pick"><input id="rlQ" type="search" placeholder="${T('Buscar juego')}" value="${esc(RL.q)}" autocomplete="off"><div class="rl-pick-bar"><span id="rlPickN">${T('{0} elegidos', (prefs.rlPick || []).length)}</span><button type="button" data-rl="none"${off}>${T('Ninguno')}</button></div><div class="rl-list" id="rlList">${rlPickRows()}</div></div>` : ''}
    ${PLAYNITE ? `<label class="rl-inst"><input type="checkbox" id="rlInst"${prefs.rlInst === 'on' ? ' checked' : ''}${off}> ${T('Solo los instalados')}</label>` : ''}
    <p class="rl-count" id="rlCount">${rlCountText(pool.length)}</p>
    <button type="button" class="rl-spin" data-rl="spin"${pool.length && !RL.spinning ? '' : ' disabled'}>${RL.spinning ? T('¡No va más!') : RL.result ? T('Tirar otra vez') : T('Tirar')}</button>`;
}
function rlRenderResult() {
  const el = $('#rlResult'); if (!el) return;
  const g = RL.result; if (mode !== 'roulette' || !g) { el.hidden = true; return; }
  const meta = [sysLabel(g), g.year, g.status ? TD(g.status) : '', g.hours ? fmtH(g.hours) : ''].filter(Boolean).join(' · ');
  el.innerHTML = `<span class="rl-eyebrow">${T('Te toca')}</span><canvas id="rlCover" width="300" height="420"></canvas><h2>${esc(g.t)}</h2><p>${esc(meta)}</p>
    <div class="rl-acts"><button type="button" class="primary" data-rl="go">${T('Ir a por él')}</button><button type="button" data-rl="again">${T('Tirar otra vez')}</button></div>`;
  el.hidden = false;
  /* the whole cover, whatever its shape: a CD case or a big box is not cut down to a DVD's */
  const paint = () => {
    const cv = $('#rlCover'); if (!cv || RL.result !== g) return;
    const s = g.real ? g.cover || g.coverSmall : drawCover(g), W = 300;
    const H = Math.round(W * (s && imgW(s) ? Math.min(1.5, Math.max(.6, imgH(s) / imgW(s))) : 1.4));
    if (cv.height !== H) { cv.height = H; cv.style.aspectRatio = `${W} / ${H}`; }
    const x = cv.getContext('2d'); x.clearRect(0, 0, W, H);
    if (s) coverFit(x, s, 0, 0, W, H); else placeholderArt(x, W, H, g);
  };
  paint(); if (g.real && PLAYNITE) LIB.bigCover(g).then(paint);
}
$('#rlPanel').addEventListener('click', e => {
  const b = e.target.closest('[data-rlby]'); if (b && !b.disabled) { rlSetBy(b.dataset.rlby); return; }
  const a = e.target.closest('[data-rl]'); if (!a || a.disabled) return;
  if (a.dataset.rl === 'spin') rlSpin();
  if (a.dataset.rl === 'none') { prefs.rlPick = []; savePrefs(); rlChanged(); }
});
$('#rlPanel').addEventListener('change', e => {
  if (e.target.id === 'rlVal') { rlSetVal(e.target.value); return; }
  if (e.target.id === 'rlInst') { prefs.rlInst = e.target.checked ? 'on' : 'off'; savePrefs(); rlChanged(); return; }
  const id = e.target.dataset && e.target.dataset.rlpick;
  if (id) {
    const s = new Set(prefs.rlPick || []); if (e.target.checked) s.add(id); else s.delete(id); prefs.rlPick = [...s]; savePrefs();
    if (RL.poolKey !== rlPoolKeyOf(rlPool())) rlFill();
    const n = $('#rlPickN'), c = $('#rlCount'), sp = $('#rlPanel .rl-spin'), cnt = rlPool().length;
    if (n) n.textContent = T('{0} elegidos', s.size); if (c) c.textContent = rlCountText(cnt); if (sp) sp.disabled = !cnt;
  }
});
$('#rlPanel').addEventListener('input', e => { if (e.target.id !== 'rlQ') return; RL.q = e.target.value; const l = $('#rlList'); if (l) l.innerHTML = rlPickRows(); });
$('#rlResult').addEventListener('click', e => { const a = e.target.closest('[data-rl]'); if (!a) return; if (a.dataset.rl === 'go') rlGo(); if (a.dataset.rl === 'again') rlSpin(); });
/* the top bar button: into the casino, and back out */
function renderRlBtn() { const b = $('#rlBtn'); if (!b) return; const on = mode === 'roulette'; b.querySelector('span').textContent = on ? T('Volver') : T('Ruleta'); b.setAttribute('aria-pressed', String(on)); b.disabled = !(on || mode === 'shelf' || mode === 'loading'); }
$('#rlBtn').addEventListener('click', () => { sfx.init(); if (mode === 'roulette') closeRoulette(); else openRoulette(); });
