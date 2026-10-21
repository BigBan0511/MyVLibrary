
/* =====================================================================
   THE ROOM: a long wall shelf packed with games and, under it, a wooden
   table with a lace runner, a CRT, a whiteboard and the console.
   Units are centimetres; the wall's face is at z = WALL_Z.
   ===================================================================== */
const WALL_Z = -15.6;
const SHELF = { cx: -2, outerW: 190, th: 2.4, board: 129, innerH: 24.5, depth: 21.5 };
SHELF.x0 = SHELF.cx - SHELF.outerW / 2 + SHELF.th; SHELF.x1 = SHELF.cx + SHELF.outerW / 2 - SHELF.th;
SHELF.innerW = SHELF.x1 - SHELF.x0; SHELF.front = WALL_Z + SHELF.depth; SHELF.top = SHELF.board + SHELF.innerH;
const TABLE = { x0: -94, x1: 94, z0: -15, z1: 42, top: 74, th: 3.4 };

/* ---------- floor, wall, skirting ---------- */
const floorMat = M(THREE.MeshStandardMaterial, { map: tex(makeRealWood(1024, 1024, '#3b2a1e', 2, { planks: 8 }), [6, 2.2]), roughness: .5 }, .5);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(1500, 700), floorMat); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 200); floor.receiveShadow = true; scene.add(floor);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(1500, 420), M(THREE.MeshStandardMaterial, { map: tex(makePlasterCanvas(), [7, 2]), roughness: .95 }, .45));
wall.position.set(0, 210, WALL_Z); wall.receiveShadow = true; scene.add(wall);
const paint = M(THREE.MeshStandardMaterial, { color: '#e3ddd2', roughness: .45 }, .6);
const skirtMat = M(THREE.MeshStandardMaterial, { color: '#1c1a18', roughness: .45 }, .6);
const skirt = addBox(1500, 8, .5, skirtMat, 0, 4, WALL_Z + .25);
const woodMat = M(THREE.MeshStandardMaterial, { map: tex(makeRealWood(1024, 512, '#5a2f1d', 1)), roughness: .42 }, .55);
const woodDark = M(THREE.MeshStandardMaterial, { map: tex(makeRealWood(512, 256, '#2a1a12', 3)), roughness: .62 }, .45);
const shelfMat = M(THREE.MeshStandardMaterial, { map: tex(makeRealWood(1024, 256, '#3c2216', 4)), roughness: .46 }, .5);

/* ---------- the wall shelf: one long open box, the games stand on its bottom board ---------- */
const shelfGroup = new THREE.Group(); scene.add(shelfGroup);
const stripLedMat = new THREE.MeshBasicMaterial({ color: '#ffd59a', toneMapped: false });
const shelfLed = new THREE.Mesh(new THREE.BoxGeometry(SHELF.innerW - 4, .25, .5), stripLedMat);
{
  const { cx, outerW, th, board, innerH, depth } = SHELF, zc = WALL_Z + depth / 2;
  fbox(outerW, th, depth, shelfMat, cx, board - th / 2, zc, shelfGroup);
  fbox(outerW, th, depth, shelfMat, cx, SHELF.top + th / 2, zc, shelfGroup);
  [SHELF.x0 - th / 2, SHELF.x1 + th / 2].forEach(x => fbox(innerH, th, depth - .3, shelfMat, x, board + innerH / 2, zc - .15, shelfGroup, Math.PI / 2));
  addBox(SHELF.innerW, innerH, .6, woodDark, cx, board + innerH / 2, WALL_Z + .3, shelfGroup);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(SHELF.innerW, innerH), AO.back); back.position.set(cx, board + innerH / 2, WALL_Z + .62); shelfGroup.add(back);
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(SHELF.innerW, depth - .6), AO.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(cx, board + .012, zc); shelfGroup.add(fl);
  /* the underside of the top board is in its own shadow; a faint dark band sells it */
  const lip = new THREE.Mesh(new THREE.PlaneGeometry(SHELF.innerW, depth - .6), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: .35, depthWrite: false }));
  lip.rotation.x = Math.PI / 2; lip.position.set(cx, SHELF.top - .02, zc); shelfGroup.add(lip);
  shelfLed.position.set(cx, SHELF.top - .2, SHELF.front - 1.4); shelfLed.visible = false; shelfGroup.add(shelfLed);
}
/* the whole shelf rests on two hidden steel cleats; their shadow on the wall is enough */
const shelfShadow = new THREE.Mesh(new THREE.PlaneGeometry(SHELF.outerW + 18, 34), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture((() => { const c = mkCanvas(256, 64), x = c.getContext('2d'); x.fillStyle = lg(x, 0, 0, 0, 64, [[0, 'rgba(0,0,0,.55)'], [.35, 'rgba(0,0,0,.22)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, 256, 64); x.globalCompositeOperation = 'destination-in'; x.fillStyle = lg(x, 0, 0, 256, 0, [[0, 'rgba(0,0,0,0)'], [.08, 'rgba(0,0,0,1)'], [.92, 'rgba(0,0,0,1)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, 256, 64); return c; })()), transparent: true, depthWrite: false }));
shelfShadow.position.set(SHELF.cx, SHELF.board - SHELF.th - 17, WALL_Z + .05); scene.add(shelfShadow);

/* ---------- the table ---------- */
const tableGroup = new THREE.Group(); scene.add(tableGroup);
{
  const { x0, x1, z0, z1, top, th } = TABLE, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, legH = top - th;
  fbox(w, th, d, woodMat, cx, top - th / 2, cz, tableGroup);
  addBox(w - 12, 8, 1.8, woodMat, cx, legH - 4, z1 - 5, tableGroup);
  addBox(w - 12, 8, 1.8, woodMat, cx, legH - 4, z0 + 5, tableGroup);
  [x0 + 5, x1 - 5].forEach(x => addBox(1.8, 8, d - 12, woodMat, x, legH - 4, cz, tableGroup));
  const legGeo = new THREE.CylinderGeometry(3.4, 2.4, legH, 4, 1); legGeo.rotateY(Math.PI / 4);
  [[x0 + 5, z0 + 5], [x1 - 5, z0 + 5], [x0 + 5, z1 - 5], [x1 - 5, z1 - 5]].forEach(([x, z]) => { const l = new THREE.Mesh(legGeo, woodMat); l.position.set(x, legH / 2, z); l.castShadow = l.receiveShadow = true; tableGroup.add(l); });
}

/* ---------- the runner: a square of linen with a lace edge, laid as a diamond, its front corner hanging ---------- */
function makeLaceCloth(base = '#ebe2cd', thread = '#cdbf9f') {
  const S = 1024, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(501), m = S * .07, n = 20, step = S / n;
  x.fillStyle = base; x.fillRect(m, m, S - 2 * m, S - 2 * m);
  for (let i = m; i < S - m; i += 3) { x.fillStyle = `rgba(110,90,60,${.025 + r() * .05})`; x.fillRect(m, i, S - 2 * m, 1); x.fillRect(i, m, 1, S - 2 * m); }
  const band = m + S * .045;
  for (let k = 0; k < 4; k++) {
    x.save(); x.translate(S / 2, S / 2); x.rotate(k * Math.PI / 2); x.translate(-S / 2, -S / 2);
    /* lace: scallops reaching out to the edge, pierced with a fan of holes */
    for (let i = 0; i < n; i++) {
      const cx = (i + .5) * step, cy = m * .58, R = step * .56;
      x.fillStyle = base; x.beginPath(); x.arc(cx, cy, R, Math.PI, 0); x.lineTo(cx + R, m + 2); x.lineTo(cx - R, m + 2); x.closePath(); x.fill();
      x.globalCompositeOperation = 'destination-out';
      x.beginPath(); x.arc(cx, cy + 6, R * .26, 0, 7); x.fill();
      for (let j = 0; j < 6; j++) { const a = Math.PI + (j + .5) / 6 * Math.PI; x.beginPath(); x.arc(cx + Math.cos(a) * R * .66, cy + 6 + Math.sin(a) * R * .66, R * .09, 0, 7); x.fill(); }
      x.beginPath(); x.arc(cx + step / 2, m - 6, R * .14, 0, 7); x.fill();
      x.globalCompositeOperation = 'source-over';
    }
    /* embroidered border inside the lace */
    x.strokeStyle = thread; x.lineWidth = 3; x.beginPath(); x.moveTo(band, band); x.lineTo(S - band, band); x.stroke();
    x.lineWidth = 2.4;
    for (let px = band + 34; px < S - band - 24; px += 44) {
      const py = band + 20; x.beginPath(); x.moveTo(px, py - 9); x.lineTo(px + 9, py); x.lineTo(px, py + 9); x.lineTo(px - 9, py); x.closePath(); x.stroke();
      x.fillStyle = thread; x.beginPath(); x.arc(px + 22, py, 2.8, 0, 7); x.fill();
    }
    x.restore();
  }
  /* soft creases where it was folded in four */
  x.fillStyle = 'rgba(80,60,30,.07)'; x.fillRect(S / 2 - 3, m, 6, S - 2 * m); x.fillRect(m, S / 2 - 3, S - 2 * m, 6);
  return c;
}
function clothGeometry(S, cx, cz, rot) {
  const seg = 56, g = new THREE.PlaneGeometry(S, S, seg, seg); g.rotateX(-Math.PI / 2); g.rotateY(rot);
  const P = g.attributes.position, top = TABLE.top + .06, edge = TABLE.z1, R = 1.1;
  for (let i = 0; i < P.count; i++) {
    let x = P.getX(i) + cx, z = P.getZ(i) + cz, y = top + (Math.sin(x * .21 + z * .13) + Math.sin(x * .07 - z * .31)) * .025;
    if (z < WALL_Z + .4) z = WALL_Z + .4;
    const d = z - edge;
    if (d > 0) {
      const a = d / R;
      if (a < Math.PI / 2) { z = edge + R * Math.sin(a); y = top - R * (1 - Math.cos(a)); }
      else { const h = d - R * Math.PI / 2; z = edge + R + h * .04 + Math.sin(x * .4) * .12; y = top - R - h; }
    }
    P.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals(); return g;
}
const clothMat = M(THREE.MeshStandardMaterial, { map: tex(makeLaceCloth()), alphaTest: .5, side: THREE.DoubleSide, roughness: .95 }, .45);
const cloth = new THREE.Mesh(clothGeometry(70, -2, 15, Math.PI / 4), clothMat); cloth.receiveShadow = true; scene.add(cloth);
function setCloth(canvas) {
  cloth.visible = !!canvas;
  if (!canvas) return;
  if (clothMat.map) clothMat.map.dispose();
  clothMat.map = tex(canvas); clothMat.needsUpdate = true;
}

/* ---------- the CRT: black plastic, big rounded bezel, curved glass, a control strip ---------- */
const TV = { x: -40, w: 58, h: 47, d: 22, zFront: 28 };
TV.y = TABLE.top + .8 + TV.h / 2;
const tvPlastic = M(THREE.MeshPhysicalMaterial, { color: '#141416', roughness: .48, clearcoat: .2, clearcoatRoughness: .5 }, .9);
/* everything of the TV hangs from one group, so the same set can stand on the table or on the TV cabinet */
const tvGroup = new THREE.Group(); scene.add(tvGroup);
function makeCrtFront() {
  const W = 1160, H = 940, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(44), k = W / TV.w;
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#1d1d20'], [.7, '#151517'], [1, '#101012']]); x.fillRect(0, 0, W, H);
  for (let i = 0; i < H; i += 2) { x.fillStyle = `rgba(255,255,255,${r() * .012})`; x.fillRect(0, i, W, 1); }
  const panelY = H - 7.6 * k;
  x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(0, panelY - 3, W, 3); x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(0, panelY, W, 2);
  /* speaker slots both sides */
  x.fillStyle = 'rgba(0,0,0,.6)';
  for (let i = 0; i < 16; i++) { rr(x, 2.4 * k + i * 11, panelY + 1.6 * k, 5, 4.4 * k, 2.5); x.fill(); rr(x, W - 2.4 * k - 170 + i * 11, panelY + 1.6 * k, 5, 4.4 * k, 2.5); x.fill(); }
  /* buttons */
  const by = panelY + 2.6 * k;
  x.fillStyle = '#0b0b0c'; [[440, 60], [520, 44], [575, 44], [650, 44], [705, 44]].forEach(([bx, bw]) => { rr(x, bx, by, bw, 28, 6); x.fill(); });
  x.fillStyle = 'rgba(255,255,255,.05)'; [[440, 60], [520, 44], [575, 44], [650, 44], [705, 44]].forEach(([bx, bw]) => x.fillRect(bx + 4, by + 2, bw - 8, 2));
  x.fillStyle = '#8e8f94'; x.font = `700 15px ${F.fig}`; x.textAlign = 'center';
  x.fillText('POWER', 470, by - 10); x.fillText('CH', 570, by - 10); x.fillText('VOL', 700, by - 10);
  x.fillStyle = '#c23a2e'; x.beginPath(); x.arc(780, by + 14, 4, 0, 7); x.fill();
  x.fillStyle = '#b9bcc4'; x.font = `800 26px ${F.saira}`; x.textAlign = 'left'; x.fillText('VISIÓN 21', 2.6 * k + 190, by + 22);
  return c;
}
const tvBody = new THREE.Mesh(slabGeometry(TV.w, TV.h, TV.d, 2.4, 1.1), tvPlastic); tvBody.position.set(TV.x, TV.y, TV.zFront - 4.6 - TV.d / 2); tvBody.castShadow = tvBody.receiveShadow = true; tvGroup.add(tvBody);
const tvRear = new THREE.Mesh(slabGeometry(TV.w * .74, TV.h * .8, 15, 4, 2), tvPlastic); tvRear.position.set(TV.x, TV.y - 1.5, TV.zFront - 4.6 - TV.d - 5.5); tvRear.castShadow = true; tvGroup.add(tvRear);
[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => addBox(5, .8, 4, tvPlastic, TV.x + sx * (TV.w / 2 - 6), TABLE.top + .4, TV.zFront - 4.6 - TV.d / 2 + sz * (TV.d / 2 - 4), tvGroup));
const SCR = { w: 45, h: 34, cy: 3.4, R: 130 };
{
  const outer = new THREE.Shape(), hole = new THREE.Path(), hw = TV.w / 2 - .4, hh = TV.h / 2 - .4;
  const rrect = (p, x0, y0, w, h, r) => { p.moveTo(x0 + r, y0); p.lineTo(x0 + w - r, y0); p.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); p.lineTo(x0 + w, y0 + h - r); p.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); p.lineTo(x0 + r, y0 + h); p.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); p.lineTo(x0, y0 + r); p.quadraticCurveTo(x0, y0, x0 + r, y0); };
  rrect(outer, -hw, -hh, hw * 2, hh * 2, 2.2); rrect(hole, -SCR.w / 2, SCR.cy - SCR.h / 2, SCR.w, SCR.h, 2.6); outer.holes.push(hole);
  const bg = new THREE.ExtrudeGeometry(outer, { depth: 4.6, bevelEnabled: true, bevelThickness: .35, bevelSize: .35, bevelSegments: 3, curveSegments: 10 });
  const P = bg.attributes.position, U = bg.attributes.uv; for (let i = 0; i < P.count; i++) U.setXY(i, (P.getX(i) + TV.w / 2) / TV.w, (P.getY(i) + TV.h / 2) / TV.h); U.needsUpdate = true;
  const bezel = new THREE.Mesh(bg, [M(THREE.MeshPhysicalMaterial, { map: tex(makeCrtFront()), roughness: .45, clearcoat: .2, clearcoatRoughness: .45 }, .9), tvPlastic]);
  bezel.position.set(TV.x, TV.y, TV.zFront - 4.6); bezel.castShadow = bezel.receiveShadow = true; tvGroup.add(bezel);
  /* the tube's dark surround inside the opening */
  const well = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w + 1, SCR.h + 1), new THREE.MeshBasicMaterial({ color: '#050506' })); well.position.set(TV.x, TV.y + SCR.cy, TV.zFront - 4.55); tvGroup.add(well);
}
const tvC = mkCanvas(512, 384), tvTex = tex(tvC); tvTex.anisotropy = 1;
const SCR_PL = (SCR.w + .6) / SCR.R, SCR_TL = (SCR.h + .6) / SCR.R;
const scrGeo = new THREE.SphereGeometry(SCR.R, 48, 36, Math.PI / 2 - SCR_PL / 2, SCR_PL, Math.PI / 2 - SCR_TL / 2, SCR_TL);
const screen = new THREE.Mesh(scrGeo, new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false })); screen.position.set(TV.x, TV.y + SCR.cy, TV.zFront - .4 - SCR.R); tvGroup.add(screen);
const screenGlass = new THREE.Mesh(scrGeo, M(THREE.MeshPhysicalMaterial, { color: '#000000', transparent: true, opacity: .16, roughness: .03, clearcoat: 1, clearcoatRoughness: .02, depthWrite: false }, 2.4)); screenGlass.position.copy(screen.position); screenGlass.position.z += .06; tvGroup.add(screenGlass);
tvLight.position.set(TV.x, TV.y + SCR.cy, TV.zFront + 14);
/* where the picture is, in table coordinates (the group moves it) */
const TV_SCREEN = new V3(TV.x, TV.y + SCR.cy, TV.zFront);

/* ---------- the whiteboard: aluminium frame, leaning against the wall ---------- */
const BOARD = { x: 26, w: 62, h: 44, fr: 1.6 };
const boardC = mkCanvas(1024, Math.round(1024 * BOARD.h / BOARD.w)), boardTex = tex(boardC);
const boardGroup = new THREE.Group(); scene.add(boardGroup);
{
  const lean = Math.asin(3.2 / (BOARD.h + 2 * BOARD.fr)), alu = M(THREE.MeshStandardMaterial, { color: '#b9bcc2', roughness: .32, metalness: .85 }, 1.2);
  boardGroup.position.set(BOARD.x, TABLE.top, WALL_Z + 4.4); boardGroup.rotation.x = -lean;
  const H = BOARD.h, W = BOARD.w, f = BOARD.fr, yc = f + H / 2;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(W, H), M(THREE.MeshStandardMaterial, { map: boardTex, roughness: .26, metalness: 0 }, 1.5)); face.position.set(0, yc, .45); face.receiveShadow = true; boardGroup.add(face);
  addBox(W + 2 * f, H + 2 * f, .8, M(THREE.MeshStandardMaterial, { color: '#d9d9d6', roughness: .6 }, .6), 0, yc, 0, boardGroup);
  [[0, H / 2 + f / 2, W + 2 * f, f], [0, -H / 2 - f / 2, W + 2 * f, f], [-W / 2 - f / 2, 0, f, H], [W / 2 + f / 2, 0, f, H]].forEach(([dx, dy, bw, bh]) => fbox(bw, bh, 1.5, alu, dx, yc + dy, .55, boardGroup));
  const tray = fbox(W * .6, .8, 3.2, alu, 0, f + .1, 2, boardGroup); tray.rotation.x = lean;
  const pen = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 12, 14), M(THREE.MeshStandardMaterial, { color: '#1c1d22', roughness: .35 }, 1)); pen.rotation.z = Math.PI / 2; pen.position.set(-8, f + 1.1, 2.4); pen.castShadow = true; boardGroup.add(pen);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 3, 14), M(THREE.MeshStandardMaterial, { color: '#2350a0', roughness: .35 }, 1)); cap.rotation.z = Math.PI / 2; cap.position.set(-1.5, f + 1.1, 2.4); boardGroup.add(cap);
  addBox(9, 2, 3.4, M(THREE.MeshStandardMaterial, { color: '#2a2b30', roughness: .8 }, .5), 12, f + 1.3, 2.1, boardGroup);
}

/* ---------- the console ("ID-2", our own design): a black slab that takes everything.
   Front: a slot-loading disc drive and a 3½" floppy drive. Top: a cartridge slot with spring flaps. ---------- */
const CON = { x: 40, w: 44, h: 8.4, d: 30, zFront: 25 };
CON.y = TABLE.top + .6; CON.cy = CON.y + CON.h / 2;
const conMat = M(THREE.MeshPhysicalMaterial, { color: '#141518', roughness: .5, metalness: .05, clearcoat: .35, clearcoatRoughness: .4 }, .9);
/* like the TV, the ID-2 and its pad hang from one group: on the table, or on the floor of the TV room */
const conGroup = new THREE.Group(); scene.add(conGroup);
/* the front panel is drawn at 20 px per cm, from the console's left edge and top */
const CF = { k: 20, disc: [60, 44, 280, 15], bay: [392, 26, 236, 58], floppy: [414, 47, 192, 10] };
const conFrontC = mkCanvas(880, 168);
{
  const x = conFrontC.getContext('2d');
  x.fillStyle = lg(x, 0, 0, 0, 168, [[0, '#1a1b1f'], [.5, '#141518'], [1, '#101114']]); x.fillRect(0, 0, 880, 168);
  x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(0, 104, 880, 2); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, 106, 880, 2);
  /* the disc slot */
  const [dx, dy, dw, dh] = CF.disc;
  x.fillStyle = '#030304'; rr(x, dx, dy, dw, dh, 7.5); x.fill();
  x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(dx + 6, dy + dh + 2, dw - 12, 2); x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(dx + 4, dy - 3, dw - 8, 3);
  x.fillStyle = '#6d7078'; x.beginPath(); x.moveTo(dx + dw + 20, 58); x.lineTo(dx + dw + 30, 46); x.lineTo(dx + dw + 40, 58); x.closePath(); x.fill(); x.fillRect(dx + dw + 20, 61, 20, 3);
  x.font = `700 11px ${F.mono}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('CD · DVD', dx, dy + dh + 16);
  /* the floppy drive: a recessed bay with its own slot, flap, eject button and activity light */
  const [bx, by, bw, bh] = CF.bay, [fx, fy, fw, fh] = CF.floppy;
  x.fillStyle = '#0d0e10'; rr(x, bx, by, bw, bh, 6); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 2; rr(x, bx + 1, by + 1, bw - 2, bh - 2, 6); x.stroke();
  x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(bx + 2, by + 2, bw - 4, 3);
  x.fillStyle = '#020203'; rr(x, fx, fy, fw, fh, 3); x.fill();
  x.fillStyle = '#25272c'; x.fillRect(fx + 3, fy + 2, fw - 6, fh - 5); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(fx + 3, fy + 2, fw - 6, 1.5);
  x.fillStyle = '#1e2024'; rr(x, fx + fw - 30, by + bh - 17, 30, 10, 4); x.fill(); x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(fx + fw - 27, by + bh - 16, 24, 1.5);
  x.fillStyle = '#6d7078'; x.font = `700 11px ${F.mono}`; x.fillText('3½" HD', fx + 22, by + bh - 12);
  /* power and reset */
  x.fillStyle = '#0a0a0c'; x.beginPath(); x.arc(668, 52, 13, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 2; x.beginPath(); x.arc(668, 52, 13, 0, 7); x.stroke();
  x.strokeStyle = '#7d8088'; x.lineWidth = 2.4; x.beginPath(); x.arc(668, 53, 6, -1.1, 4.25); x.stroke(); x.beginPath(); x.moveTo(668, 44); x.lineTo(668, 52); x.stroke();
  x.fillStyle = '#0a0a0c'; rr(x, 698, 46, 26, 12, 6); x.fill();
  /* two controller ports */
  [[700, 120], [790, 120]].forEach(([px, py]) => { x.fillStyle = '#060607'; rr(x, px, py, 66, 28, 5); x.fill(); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(px + 8, py + 10, 50, 3); });
  x.fillStyle = '#5c5f66'; x.font = `800 22px ${F.saira}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('MYV', 60, 132); x.font = `700 13px ${F.mono}`; x.fillText('ID-2', 112, 133);
}
const conFrontMat = M(THREE.MeshStandardMaterial, { map: tex(conFrontC), roughness: .5 }, .9);
const conBody = new THREE.Mesh(slabGeometry(CON.w, CON.h, CON.d, .6, .4), [conFrontMat, conMat, conMat]); conBody.position.set(CON.x, CON.cy, CON.zFront - CON.d / 2); conBody.castShadow = conBody.receiveShadow = true; conGroup.add(conBody);
const ventC = mkCanvas(440, 300); { const x = ventC.getContext('2d'); for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(0,0,0,.6)'; rr(x, 250, 24 + i * 14, 160, 5, 2.5); x.fill(); x.fillStyle = 'rgba(255,255,255,.04)'; x.fillRect(252, 30 + i * 14, 156, 1); } }
const vent = new THREE.Mesh(new THREE.PlaneGeometry(CON.w, CON.d), new THREE.MeshStandardMaterial({ map: tex(ventC), transparent: true, depthWrite: false, roughness: .6 })); vent.rotation.x = -Math.PI / 2; vent.position.set(CON.x, CON.y + CON.h + .02, CON.zFront - CON.d / 2); conGroup.add(vent);
[[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => addBox(3, .6, 3, M(THREE.MeshStandardMaterial, { color: '#0c0c0e' }, .5), CON.x + sx * (CON.w / 2 - 4), TABLE.top + .3, CON.zFront - CON.d / 2 + sz * (CON.d / 2 - 4), conGroup));
/* panel coordinates (px from the top-left of the front) to the room */
const conPx = (px, py) => [CON.x - CON.w / 2 + px / CF.k, CON.y + CON.h - py / CF.k];
const ledMat = new THREE.MeshBasicMaterial({ color: '#ff9b3a', toneMapped: false });
{ const [lx, ly] = conPx(760, 52); addBox(1.1, .4, .2, ledMat, lx, ly, CON.zFront + .12, conGroup); }
const floppyLedMat = new THREE.MeshBasicMaterial({ color: '#1d3a22', toneMapped: false });
{ const [lx, ly] = conPx(CF.floppy[0] + 8, CF.bay[1] + CF.bay[3] - 12); addBox(.6, .25, .15, floppyLedMat, lx, ly, CON.zFront + .1, conGroup); }
/* where each medium goes in: the middle of the disc slit, the middle of the floppy slit, the cartridge slot on top */
const SLOT = (() => { const [dx, dy, dw, dh] = CF.disc, [x, y] = conPx(dx + dw / 2, dy + dh / 2); return { x, y, z: CON.zFront + .05 }; })();
const FSLOT = (() => { const [fx, fy, fw, fh] = CF.floppy, [x, y] = conPx(fx + fw / 2, fy + fh / 2); return { x, y, z: CON.zFront + .05 }; })();
const CSLOT = { x: CON.x - 9, z: CON.zFront - 10, w: 17, d: 5.4, h: 1.1 };
CSLOT.top = CON.y + CON.h + CSLOT.h;
const cartFlaps = [];
{
  /* a raised collar with a dark mouth and two spring flaps that fold down when a cartridge goes in */
  fbox(CSLOT.w, CSLOT.h + .2, CSLOT.d, conMat, CSLOT.x, CON.y + CON.h + (CSLOT.h - .2) / 2, CSLOT.z, conGroup);
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(MSIZE.cart.w + .9, MSIZE.cart.t + .7), new THREE.MeshBasicMaterial({ color: '#030304' }));
  mouth.rotation.x = -Math.PI / 2; mouth.position.set(CSLOT.x, CSLOT.top + .015, CSLOT.z); conGroup.add(mouth);
  const flapGeo = new THREE.BoxGeometry(MSIZE.cart.w + .6, .12, (MSIZE.cart.t + .6) / 2 - .06), flapMat = M(THREE.MeshStandardMaterial, { color: '#0b0c0e', roughness: .8 }, .5);
  [-1, 1].forEach(s => {
    const hinge = new THREE.Group(); hinge.position.set(CSLOT.x, CSLOT.top + .02, CSLOT.z + s * (MSIZE.cart.t + .6) / 2); conGroup.add(hinge);
    const f = new THREE.Mesh(flapGeo, flapMat); f.position.z = -s * (MSIZE.cart.t + .6) / 4; f.receiveShadow = true; hinge.add(f);
    hinge.userData.s = s; cartFlaps.push(hinge);
  });
}
/* 0 = flaps shut, 1 = folded down into the slot (of whichever machine is in use) */
function setFlaps(list, v) { list.forEach(h => { h.rotation.x = -h.userData.s * v * 1.45; }); }
function setCartFlaps(v) { setFlaps(typeof DEV !== 'undefined' && DEV.cur ? DEV.cur.flaps || [] : cartFlaps, v); }
const tray = new THREE.Object3D(); tray.visible = false; scene.add(tray);
const trayState = { out: 0 };
function setTray(v) { trayState.out = v; }

/* ---------- the controller: an original two-grip pad lying on the console ---------- */
function makeController() {
  const g = new THREE.Group(), s = new THREE.Shape();
  s.moveTo(0, 3.3); s.lineTo(4.4, 3.3); s.bezierCurveTo(6.6, 3.4, 7.9, 2.4, 8.2, .4); s.bezierCurveTo(8.6, -2.6, 8.4, -5.6, 6.6, -6.4);
  s.bezierCurveTo(5.4, -6.9, 4.6, -5.6, 4.1, -3.8); s.bezierCurveTo(3.6, -2.4, 2.6, -2, 0, -2);
  s.bezierCurveTo(-2.6, -2, -3.6, -2.4, -4.1, -3.8); s.bezierCurveTo(-4.6, -5.6, -5.4, -6.9, -6.6, -6.4);
  s.bezierCurveTo(-8.4, -5.6, -8.6, -2.6, -8.2, .4); s.bezierCurveTo(-7.9, 2.4, -6.6, 3.4, -4.4, 3.3); s.lineTo(0, 3.3);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 1.6, bevelEnabled: true, bevelThickness: .9, bevelSize: .8, bevelSegments: 5, curveSegments: 16 });
  geo.rotateX(-Math.PI / 2); geo.translate(0, .9, 0);
  const body = M(THREE.MeshPhysicalMaterial, { color: '#0b0b0d', roughness: .38, clearcoat: .45, clearcoatRoughness: .3 }, .8);
  const btn = M(THREE.MeshStandardMaterial, { color: '#25272c', roughness: .35 }, 1), rub = M(THREE.MeshStandardMaterial, { color: '#1c1d21', roughness: .85 }, .6);
  const shell = new THREE.Mesh(geo, body); shell.castShadow = shell.receiveShadow = true; g.add(shell);
  const topY = 3.4;
  [[-2.6, 1.2], [2.6, 1.2]].forEach(([sx, sz]) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, .5, 24), btn); base.position.set(sx, topY, sz); g.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, .9, 12), btn); stem.position.set(sx, topY + .6, sz); g.add(stem);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.1, .45, 28), rub); cap.position.set(sx, topY + 1.15, sz); cap.castShadow = true; g.add(cap);
  });
  const dp = new THREE.Group(); dp.position.set(-5.2, topY - .05, -.6); g.add(dp);
  [[0, -.9], [0, .9], [-.9, 0], [.9, 0]].forEach(([dx, dz]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(dx ? 1.1 : .8, .45, dz ? 1.1 : .8), btn); b.position.set(dx, 0, dz); dp.add(b); });
  addBox(.8, .45, .8, btn, 0, 0, 0, dp);
  [[0, -.95], [0, .95], [-.95, 0], [.95, 0]].forEach(([dx, dz]) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(.42, .42, .5, 18), btn); b.position.set(5.2 + dx, topY, -.6 + dz); g.add(b); });
  [[-1.1, -1.2], [1.1, -1.2]].forEach(([dx, dz]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.9, .2, .4), btn); b.position.set(dx, topY - .1, dz); g.add(b); });
  [-1, 1].forEach(sd => { const sh = new THREE.Mesh(new THREE.BoxGeometry(3, 1, 1.2), btn); sh.position.set(sd * 5.6, 2.1, -3.6); g.add(sh); });
  return g;
}
/* it lies at the back of the console, out of the way of the cartridge slot */
const pad = makeController(); pad.position.set(CON.x + 10, CON.y + CON.h, CON.zFront - 19); pad.rotation.y = -.3; conGroup.add(pad);

/* ---------- the ashtray and a couple of cigarettes ---------- */
const propsGroup = new THREE.Group(); scene.add(propsGroup);
function cigarette(len, burnt) {
  const g = new THREE.Group(), fl = 2.4;
  const filt = new THREE.Mesh(new THREE.CylinderGeometry(.38, .38, fl, 14), M(THREE.MeshStandardMaterial, { color: '#c98e52', roughness: .8 }, .4)); filt.rotation.z = Math.PI / 2; filt.position.x = -len / 2 + fl / 2; g.add(filt);
  const pap = new THREE.Mesh(new THREE.CylinderGeometry(.37, .37, len - fl, 14), M(THREE.MeshStandardMaterial, { color: '#eeeae2', roughness: .9 }, .4)); pap.rotation.z = Math.PI / 2; pap.position.x = fl / 2; g.add(pap);
  if (burnt) { const tip = new THREE.Mesh(new THREE.CylinderGeometry(.36, .3, .5, 12), M(THREE.MeshStandardMaterial, { color: '#2b2622', roughness: 1 }, .3)); tip.rotation.z = Math.PI / 2; tip.position.x = len / 2 + .2; g.add(tip); }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
{
  const at = new THREE.Group(); at.position.set(4, TABLE.top + .08, 31); propsGroup.add(at);
  const prof = [[0, .02], [5.6, .02], [6.1, .3], [6.35, 1.3], [6.25, 2.15], [5.75, 2.3], [5.25, 2.05], [4.7, 1.05], [4.2, .85], [0, .85]].map(([r, y]) => new THREE.Vector2(r, y));
  const glassA = M(THREE.MeshPhysicalMaterial, { color: '#101012', roughness: .1, clearcoat: 1, clearcoatRoughness: .04, metalness: .1 }, 1.8);
  const bowl = new THREE.Mesh(new THREE.LatheGeometry(prof, 48), glassA); bowl.castShadow = bowl.receiveShadow = true; at.add(bowl);
  const ashC = mkCanvas(128, 128); { const x = ashC.getContext('2d'), r = rng(9); x.fillStyle = '#5b5752'; x.fillRect(0, 0, 128, 128); for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(${r() > .5 ? '200,195,185' : '30,28,26'},${r() * .5})`; x.fillRect(r() * 128, r() * 128, 1 + r() * 2, 1 + r() * 2); } }
  const ash = new THREE.Mesh(new THREE.CircleGeometry(4.3, 32), M(THREE.MeshStandardMaterial, { map: tex(ashC), roughness: 1 }, .3)); ash.rotation.x = -Math.PI / 2; ash.position.y = .9; at.add(ash);
  [[1.6, -1, .5, 4.2], [-1.4, .8, -2.2, 3.6], [.4, 2, 2.6, 3.2]].forEach(([dx, dz, ry, len], i) => { const c = cigarette(len, true); c.position.set(dx, 1.25, dz); c.rotation.set(0, ry, i === 2 ? -.25 : .05); at.add(c); });
  const loose = cigarette(8.4, false); loose.position.set(-10, TABLE.top + .45, 37.5); loose.rotation.y = .5; propsGroup.add(loose);
}

/* ---------- floor lamp (only some rooms use it) ---------- */
const lampShadeMat = M(THREE.MeshStandardMaterial, { map: tex(makeLinenCanvas(), [3, 1]), roughness: .95, side: THREE.DoubleSide, emissive: new THREE.Color('#ffb066'), emissiveIntensity: .5 }, .35);
const lampGroup = new THREE.Group(); scene.add(lampGroup);
{ const lx = -124, lz = 4; const base = new THREE.Mesh(new THREE.CylinderGeometry(8, 8.5, 1.8, 40), blackSteel); base.position.set(lx, .9, lz); base.castShadow = base.receiveShadow = true; lampGroup.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.45, .45, 150, 12), blackSteel); pole.position.set(lx, 76, lz); pole.castShadow = true; lampGroup.add(pole);
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(11, 15, 20, 48, 1, true), lampShadeMat); shade.position.set(lx, 158, lz); lampGroup.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(2, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffe3b0', toneMapped: false })); bulb.position.set(lx, 153, lz); lampGroup.add(bulb);
  lampLight.position.set(lx + 4, 150, lz + 6); }
