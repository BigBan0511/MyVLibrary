
/* =====================================================================
   ROOMS BY SYSTEM
   - the desk (PC games): the table under the wall shelf, with a beige
     90s PC (CD-ROM tray, 3½" drive, a cartridge port on top) and a CRT
     computer monitor
   - the TV room (every other system): you sit cross-legged on the rug;
     the TV stands on a low cabinet that keeps that system's games, the
     console sits on the floor in front of it. A CRT up to the PS2
     generation, a flat TV from the PS3 on.
   Each system can use a model from EmuVR (.ugc) instead of our generic
   console, and the TVs and the monitor can be replaced the same way.
   ===================================================================== */
const TVR = { x: 430 };
const CAB = { x: TVR.x, w: 150, h: 56, d: 46, plinth: 3, th: 2, top: 2.4 };
CAB.front = WALL_Z + CAB.d; CAB.innerW = CAB.w - 2 * CAB.th; CAB.rowH = (CAB.h - CAB.top - CAB.plinth - 3 * CAB.th) / 2;
CAB.boards = [CAB.plinth + 2 * CAB.th + CAB.rowH, CAB.plinth + CAB.th];  /* top row, bottom row (where the cases stand) */
const RUG = { x: TVR.x, z: CAB.front + 95, w: 230, d: 190, y: .35 };
const FLOOR_CON = { x: TVR.x, front: CAB.front + 42 };

/* ---------- the TV room: cabinet, rug ---------- */
function makeRoomRug() {
  const W = 1024, H = Math.round(1024 * RUG.d / RUG.w), c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(57);
  x.fillStyle = '#6b2e26'; x.fillRect(0, 0, W, H);
  const band = (m, col, lw) => { x.strokeStyle = col; x.lineWidth = lw; x.strokeRect(m, m, W - 2 * m, H - 2 * m); };
  band(26, '#2b1d1a', 34); band(58, '#c9a46a', 6); band(84, '#3b4a5c', 22); band(110, '#c9a46a', 4);
  x.save(); x.translate(W / 2, H / 2);
  for (let k = 0; k < 4; k++) { x.rotate(Math.PI / 2); x.fillStyle = k % 2 ? '#3b4a5c' : '#c9a46a'; x.beginPath(); x.moveTo(0, -H * .3); x.lineTo(W * .12, 0); x.lineTo(0, H * .3); x.lineTo(-W * .12, 0); x.closePath(); x.globalAlpha = .55; x.fill(); }
  x.globalAlpha = 1; x.fillStyle = '#2b1d1a'; x.beginPath(); x.arc(0, 0, 46, 0, 7); x.fill(); x.fillStyle = '#c9a46a'; x.beginPath(); x.arc(0, 0, 22, 0, 7); x.fill(); x.restore();
  for (let i = 0; i < 26000; i++) { x.fillStyle = r() > .5 ? `rgba(255,235,210,${r() * .06})` : `rgba(0,0,0,${r() * .1})`; x.fillRect(r() * W, r() * H, 1, 1 + r() * 2); }
  return c;
}
const tvRoom = new THREE.Group(); scene.add(tvRoom);
{
  const { x, w, h, d, plinth, th, top } = CAB, zc = WALL_Z + d / 2;
  fbox(w, top, d, shelfMat, x, h - top / 2, zc, tvRoom);
  fbox(w - 2 * th, th, d - 1, shelfMat, x, plinth + th / 2, zc + .5, tvRoom);
  fbox(w - 2 * th, th, d - 1.6, shelfMat, x, CAB.boards[0] - th / 2, zc + .3, tvRoom);
  [x - w / 2 + th / 2, x + w / 2 - th / 2].forEach(sx => fbox(h - top, th, d, shelfMat, sx, (h - top) / 2, zc, tvRoom, Math.PI / 2));
  addBox(w - 2 * th, plinth, 1.2, woodDark, x, plinth / 2, WALL_Z + d - 2.5, tvRoom);
  addBox(w - 2 * th, h - top - plinth, .8, woodDark, x, plinth + (h - top - plinth) / 2, WALL_Z + .9, tvRoom);
  CAB.boards.forEach(b => {
    const back = new THREE.Mesh(new THREE.PlaneGeometry(CAB.innerW, CAB.rowH), AO.back); back.position.set(x, b + CAB.rowH / 2, WALL_Z + 1.32); tvRoom.add(back);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(CAB.innerW, d - 2), AO.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(x, b + .012, zc + .5); tvRoom.add(fl);
  });
  const rug = new THREE.Mesh(new THREE.BoxGeometry(RUG.w, RUG.y * 2, RUG.d), M(THREE.MeshStandardMaterial, { map: tex(makeRoomRug()), roughness: .95 }, .4));
  rug.position.set(RUG.x, RUG.y, RUG.z); rug.receiveShadow = true; tvRoom.add(rug);
}

/* ---------- a flat TV for the PS3 generation and later: the old 4:3 picture sits in the middle ---------- */
const FLAT = { w: 92, h: 53, d: 3.4, sw: 88.6, sh: 49.8 };
const flatTv = new THREE.Group(); scene.add(flatTv);
{
  const black = M(THREE.MeshPhysicalMaterial, { color: '#0c0c0e', roughness: .35, clearcoat: .6, clearcoatRoughness: .2 }, 1);
  const y0 = 9;  /* the panel stands on a short neck */
  const panel = new THREE.Mesh(slabGeometry(FLAT.w, FLAT.h, FLAT.d, .8, .3), black); panel.position.set(0, y0 + FLAT.h / 2, 0); panel.castShadow = panel.receiveShadow = true; flatTv.add(panel);
  const dark = new THREE.Mesh(new THREE.PlaneGeometry(FLAT.sw, FLAT.sh), new THREE.MeshBasicMaterial({ color: '#030304' })); dark.position.set(0, y0 + FLAT.h / 2 + .6, FLAT.d / 2 + .01); flatTv.add(dark);
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(FLAT.sh * 4 / 3, FLAT.sh), new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false })); pic.position.set(0, y0 + FLAT.h / 2 + .6, FLAT.d / 2 + .02); flatTv.add(pic);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(FLAT.sw, FLAT.sh), M(THREE.MeshPhysicalMaterial, { color: '#000000', transparent: true, opacity: .12, roughness: .05, clearcoat: 1, depthWrite: false }, 2.2)); glass.position.copy(dark.position); glass.position.z += .03; flatTv.add(glass);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(6, y0, 2.4), black); neck.position.set(0, y0 / 2, -.6); flatTv.add(neck);
  const foot = new THREE.Mesh(slabGeometry(34, 20, 1.2, 1.5, .4), black); foot.rotation.x = -Math.PI / 2; foot.position.set(0, .6, -1); foot.castShadow = true; flatTv.add(foot);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(8, 1.2), new THREE.MeshBasicMaterial({ map: tex((() => { const c = mkCanvas(256, 40), x = c.getContext('2d'); x.fillStyle = '#9a9ca3'; x.font = `800 30px ${F.saira}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('VISIÓN HD', 128, 21); return c; })()), transparent: true }));
  logo.position.set(0, y0 + 1.3, FLAT.d / 2 + .02); flatTv.add(logo);
  flatTv.userData.screen = new V3(0, y0 + FLAT.h / 2 + .6, FLAT.d / 2);
}

/* ---------- the desk: a beige 90s PC and its CRT monitor ---------- */
const PCT = { x: -79, w: 19, h: 42, d: 44, front: 30 };   /* tower */
const MON = { x: -36, w: 38, h: 35, front: 31 };          /* monitor */
const beige = M(THREE.MeshPhysicalMaterial, { color: '#d9d1bf', roughness: .55, clearcoat: .15, clearcoatRoughness: .6 }, .8);
const beigeDark = M(THREE.MeshStandardMaterial, { color: '#b9b09b', roughness: .6 }, .7);
const pcGroup = new THREE.Group(); scene.add(pcGroup);
/* tower front at 20 px per cm, from its top-left corner */
const PF = { k: 20, cd: [30, 50, 320, 76], trayGap: [44, 100, 292, 8], fdd: [80, 190, 220, 50], fslot: [100, 205, 180, 10] };
const pcLedMat = new THREE.MeshBasicMaterial({ color: '#2a3a24', toneMapped: false }), pcHddMat = new THREE.MeshBasicMaterial({ color: '#3a2a14', toneMapped: false });
const pcFloppyLedMat = new THREE.MeshBasicMaterial({ color: '#1d3a22', toneMapped: false });
const pcFlaps = [];
let pcTray = null;
{
  const W = PCT.w * PF.k, H = PCT.h * PF.k, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(71);
  x.fillStyle = '#ddd5c3'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 2500; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '90,80,60'},${r() * .05})`; x.fillRect(r() * W, r() * H, 2, 2); }
  /* CD-ROM drive */
  const [cx, cy, cw, ch] = PF.cd; x.fillStyle = '#cfc6b1'; x.fillRect(cx, cy, cw, ch); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; x.strokeRect(cx, cy, cw, ch);
  const [tx, ty, tw, th2] = PF.trayGap; x.fillStyle = '#28261f'; x.fillRect(tx, ty, tw, th2 * .4); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(tx, ty - 26, tw, 26);
  x.fillStyle = '#9d9583'; rr(x, cx + cw - 52, cy + ch - 20, 40, 12, 3); x.fill();
  x.fillStyle = '#4b453a'; x.font = `800 15px ${F.saira}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('CD-ROM 24X', cx + 14, cy + ch - 14);
  x.fillStyle = '#2f2a22'; x.beginPath(); x.arc(cx + cw - 72, cy + ch - 14, 3, 0, 7); x.fill();
  /* blank 5¼" cover */
  x.fillStyle = '#d3cab6'; x.fillRect(30, 136, 320, 40); x.strokeStyle = 'rgba(0,0,0,.18)'; x.strokeRect(30, 136, 320, 40);
  /* 3½" floppy drive */
  const [fx, fy, fw, fh] = PF.fdd, [sx, sy, sw, sh] = PF.fslot; x.fillStyle = '#cbc2ad'; x.fillRect(fx, fy, fw, fh); x.strokeStyle = 'rgba(0,0,0,.25)'; x.strokeRect(fx, fy, fw, fh);
  x.fillStyle = '#1a1814'; rr(x, sx, sy, sw, sh, 3); x.fill(); x.fillStyle = '#5a5446'; x.fillRect(sx + 3, sy + 2, sw - 6, sh - 5);
  x.fillStyle = '#9d9583'; rr(x, fx + fw - 40, fy + fh - 16, 30, 10, 3); x.fill();
  /* buttons, lights and the speed display */
  x.fillStyle = '#b7ae98'; rr(x, 140, 440, 100, 100, 16); x.fill(); x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 3; rr(x, 140, 440, 100, 100, 16); x.stroke();
  x.fillStyle = '#6b6352'; x.font = `700 16px ${F.mono}`; x.textAlign = 'center'; x.fillText('POWER', 190, 560);
  x.fillStyle = '#b7ae98'; rr(x, 60, 470, 40, 22, 4); x.fill(); rr(x, 280, 470, 40, 22, 4); x.fill();
  x.fillStyle = '#6b6352'; x.font = `700 12px ${F.mono}`; x.fillText('RESET', 80, 505); x.fillText('TURBO', 300, 505);
  x.fillStyle = '#16140f'; x.fillRect(150, 600, 80, 44); x.fillStyle = '#ff4b2e'; x.font = `700 34px ${F.mono}`; x.fillText('66', 190, 624);
  x.fillStyle = 'rgba(0,0,0,.22)'; for (let i = 0; i < 9; i++) x.fillRect(40, 690 + i * 12, 300, 5);
  x.fillStyle = '#7d7562'; x.font = `800 26px ${F.saira}`; x.fillText('MYV 486', 190, 812);
  const front = M(THREE.MeshStandardMaterial, { map: tex(c), roughness: .55 }, .8);
  const body = new THREE.Mesh(slabGeometry(PCT.w, PCT.h, PCT.d, .5, .3), [front, beige, beige]);
  body.position.set(PCT.x, TABLE.top + PCT.h / 2 + .4, PCT.front - PCT.d / 2); body.castShadow = body.receiveShadow = true; pcGroup.add(body);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => addBox(2.4, .4, 2.4, beigeDark, PCT.x + a * (PCT.w / 2 - 2), TABLE.top + .2, PCT.front - PCT.d / 2 + b * (PCT.d / 2 - 3), pcGroup));
  const px = (u, v) => [PCT.x - PCT.w / 2 + u / PF.k, TABLE.top + .4 + PCT.h - v / PF.k];
  [[pcLedMat, 120, 600], [pcHddMat, 120, 630]].forEach(([m, u, v]) => { const [lx, ly] = px(u, v); addBox(.6, .3, .15, m, lx, ly, PCT.front + .08, pcGroup); });
  { const [lx, ly] = px(PF.fdd[0] + 20, PF.fdd[1] + PF.fdd[3] - 11); addBox(.5, .25, .15, pcFloppyLedMat, lx, ly, PCT.front + .08, pcGroup); }
  /* the CD tray: lives inside the case, slides out through the slit */
  const [gx, gy, gw] = PF.trayGap, [tcx, tcy] = px(gx + gw / 2, gy);
  const trayC = mkCanvas(256, 272), t2 = trayC.getContext('2d'); t2.fillStyle = '#2c2a25'; t2.fillRect(0, 0, 256, 272);
  t2.fillStyle = '#211f1b'; t2.beginPath(); t2.arc(128, 128, 112, 0, 7); t2.fill(); t2.fillStyle = '#3a3730'; t2.beginPath(); t2.arc(128, 128, 22, 0, 7); t2.fill();
  t2.fillStyle = '#cfc6b1'; t2.fillRect(0, 252, 256, 20);
  pcTray = new THREE.Mesh(new THREE.BoxGeometry(gw / PF.k, .5, 13.6), [beigeDark, beigeDark, M(THREE.MeshStandardMaterial, { map: tex(trayC), roughness: .6 }, .6), beigeDark, beigeDark, beigeDark]);
  pcTray.userData.home = new V3(tcx, tcy + .1, PCT.front - 6.9); pcTray.position.copy(pcTray.userData.home); pcTray.castShadow = true; pcGroup.add(pcTray);
  pcTray.userData.out = 12.8;
  PCT.fslot = (() => { const [a, b, w, hh] = PF.fslot, [lx, ly] = px(a + w / 2, b + hh / 2); return new V3(lx, ly, PCT.front + .05); })();
  /* a cartridge port on top, as some home computers had */
  PCT.cslot = new V3(PCT.x, TABLE.top + .4 + PCT.h + 1, PCT.front - 12);
  fbox(16, 1.2, 5.4, beige, PCT.x, PCT.cslot.y - .6, PCT.cslot.z, pcGroup);
  const mouth = new THREE.Mesh(new THREE.PlaneGeometry(MSIZE.cart.w + .9, MSIZE.cart.t + .7), new THREE.MeshBasicMaterial({ color: '#0d0c0a' })); mouth.rotation.x = -Math.PI / 2; mouth.position.set(PCT.x, PCT.cslot.y + .015, PCT.cslot.z); pcGroup.add(mouth);
  const fg = new THREE.BoxGeometry(MSIZE.cart.w + .6, .12, (MSIZE.cart.t + .6) / 2 - .06);
  [-1, 1].forEach(s => { const hg = new THREE.Group(); hg.position.set(PCT.x, PCT.cslot.y + .02, PCT.cslot.z + s * (MSIZE.cart.t + .6) / 2); pcGroup.add(hg); const f = new THREE.Mesh(fg, beigeDark); f.position.z = -s * (MSIZE.cart.t + .6) / 4; hg.add(f); hg.userData.s = s; pcFlaps.push(hg); });
}
/* the monitor: beige, a 4:3 tube, buttons under the glass, on a swivel foot */
{
  const W = MON.w, H = MON.h, sw = 27.6, sh = 20.7, cy = 1.8, R = 90, baseY = TABLE.top + 3.2;
  MON.y = baseY + H / 2;
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(11, 12, 1.6, 40), beigeDark); foot.position.set(MON.x, TABLE.top + .8, MON.front - 18); foot.castShadow = foot.receiveShadow = true; pcGroup.add(foot);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(6, 8, 1.8, 30), beige); neck.position.set(MON.x, TABLE.top + 2.4, MON.front - 18); pcGroup.add(neck);
  const fc = mkCanvas(760, 700), x = fc.getContext('2d'), k = 760 / W;
  x.fillStyle = '#dcd4c2'; x.fillRect(0, 0, 760, 700);
  x.fillStyle = '#7d7562'; x.font = `800 26px ${F.saira}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('VISIÓN 15', 60, 640);
  x.fillStyle = '#c4bba6'; [520, 570, 620].forEach(bx => { rr(x, bx, 628, 34, 22, 5); x.fill(); });
  x.fillStyle = '#2e6b2a'; x.beginPath(); x.arc(690, 640, 5, 0, 7); x.fill();
  const outer = new THREE.Shape(), hole = new THREE.Path();
  const rrect = (p, x0, y0, w, h, r) => { p.moveTo(x0 + r, y0); p.lineTo(x0 + w - r, y0); p.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r); p.lineTo(x0 + w, y0 + h - r); p.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h); p.lineTo(x0 + r, y0 + h); p.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r); p.lineTo(x0, y0 + r); p.quadraticCurveTo(x0, y0, x0 + r, y0); };
  rrect(outer, -W / 2, -H / 2, W, H, 2); rrect(hole, -sw / 2, cy - sh / 2, sw, sh, 1.6); outer.holes.push(hole);
  const bg = new THREE.ExtrudeGeometry(outer, { depth: 3.2, bevelEnabled: true, bevelThickness: .3, bevelSize: .3, bevelSegments: 3, curveSegments: 8 });
  const P = bg.attributes.position, U = bg.attributes.uv; for (let i = 0; i < P.count; i++) U.setXY(i, (P.getX(i) + W / 2) / W, (P.getY(i) + H / 2) / H); U.needsUpdate = true;
  const bezel = new THREE.Mesh(bg, [M(THREE.MeshPhysicalMaterial, { map: tex(fc), roughness: .5, clearcoat: .15 }, .8), beige]); bezel.position.set(MON.x, MON.y, MON.front - 3.2); bezel.castShadow = bezel.receiveShadow = true; pcGroup.add(bezel);
  const back1 = new THREE.Mesh(slabGeometry(W - 1, H - 1, 12, 2, .8), beige); back1.position.set(MON.x, MON.y, MON.front - 3.2 - 6); back1.castShadow = true; pcGroup.add(back1);
  const back2 = new THREE.Mesh(slabGeometry(W * .7, H * .7, 16, 4, 1.5), beige); back2.position.set(MON.x, MON.y + .5, MON.front - 3.2 - 12 - 8); back2.castShadow = true; pcGroup.add(back2);
  const well = new THREE.Mesh(new THREE.PlaneGeometry(sw + .8, sh + .8), new THREE.MeshBasicMaterial({ color: '#050506' })); well.position.set(MON.x, MON.y + cy, MON.front - 3.1); pcGroup.add(well);
  const PL = (sw + .4) / R, TL = (sh + .4) / R, g = new THREE.SphereGeometry(R, 40, 30, Math.PI / 2 - PL / 2, PL, Math.PI / 2 - TL / 2, TL);
  const scr = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false })); scr.position.set(MON.x, MON.y + cy, MON.front - .5 - R); pcGroup.add(scr);
  const gl = new THREE.Mesh(g, M(THREE.MeshPhysicalMaterial, { color: '#000000', transparent: true, opacity: .16, roughness: .03, clearcoat: 1, depthWrite: false }, 2.4)); gl.position.copy(scr.position); gl.position.z += .06; pcGroup.add(gl);
  MON.screen = new V3(MON.x, MON.y + cy, MON.front);
  /* the keyboard in front of it */
  const kc = mkCanvas(900, 320), kx = kc.getContext('2d'); kx.fillStyle = '#d5cdb9'; kx.fillRect(0, 0, 900, 320);
  const key = (x0, y0, w, h) => { kx.fillStyle = '#c2b9a4'; rr(kx, x0, y0, w, h, 5); kx.fill(); kx.fillStyle = '#e8e1d0'; rr(kx, x0 + 3, y0 + 2, w - 6, h - 8, 4); kx.fill(); };
  for (let row = 0; row < 5; row++) for (let i = 0; i < 13; i++) key(30 + i * 46 + (row % 2) * 10, 40 + row * 48, 42, 42);
  key(150, 280 - 22, 330, 40); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) key(700 + i * 46, 40 + j * 48, 42, 42);
  const kb = new THREE.Mesh(new THREE.BoxGeometry(45, 2.2, 16), [beige, beige, M(THREE.MeshStandardMaterial, { map: tex(kc), roughness: .6 }, .7), beige, beige, beige]);
  kb.position.set(MON.x - 2, TABLE.top + 1.6, 35); kb.rotation.x = .07; kb.castShadow = kb.receiveShadow = true; pcGroup.add(kb);
}

/* ---------- the video room's machines: a VHS recorder and a disc player, our own designs ---------- */
const VCR = { w: 43, h: 9.4, d: 30, slot: [19.6, 2.8] }, DVP = { w: 43, h: 6, d: 26, tray: 13.6 };
const vcrGroup = new THREE.Group(), playerGroup = new THREE.Group(); scene.add(vcrGroup, playerGroup);
const vidLedMat = new THREE.MeshBasicMaterial({ color: '#2a1d10', toneMapped: false });
let vcrFlap = null, dvpTray = null;
function makeFrontCanvas(W, H, draw) { const c = mkCanvas(W, H), x = c.getContext('2d'); draw(x, W, H); return c; }
{
  const silver = M(THREE.MeshStandardMaterial, { color: '#2b2c30', roughness: .45, metalness: .35 }, 1), dark = M(THREE.MeshStandardMaterial, { color: '#111114', roughness: .55 }, .8);
  /* VCR: brushed front, the tape door in the middle, a clock display on the right */
  const k = 20, front = makeFrontCanvas(VCR.w * k, VCR.h * k, (x, W, H) => {
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#3a3b40'], [1, '#24252a']]); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) { x.fillStyle = `rgba(255,255,255,${.012 + (i % 3) * .006})`; x.fillRect(0, i * H / 90, W, 1); }
    x.fillStyle = '#0c0c0e'; rr(x, W / 2 - VCR.slot[0] * k / 2 - 10, H * .28 - 8, VCR.slot[0] * k + 20, VCR.slot[1] * k + 16, 8); x.fill();
    x.fillStyle = '#08120c'; rr(x, W * .76, H * .3, W * .16, H * .34, 6); x.fill(); x.fillStyle = '#44ff88'; x.font = `700 ${Math.round(H * .2)}px ${F.mono}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('--:--', W * .84, H * .47);
    x.fillStyle = '#c9c9cf'; x.font = `800 ${Math.round(H * .13)}px ${F.saira}`; x.textAlign = 'left'; x.fillText('MYV  VHS · HQ', W * .04, H * .8);
    ['⏏', '◀◀', '▶', '■', '▶▶'].forEach((t, i) => { x.fillStyle = '#4a4b52'; rr(x, W * .05 + i * W * .045, H * .32, W * .038, H * .2, 4); x.fill(); x.fillStyle = '#cfcfd6'; x.font = `700 ${Math.round(H * .11)}px ${F.fig}`; x.textAlign = 'center'; x.fillText(t, W * .069 + i * W * .045, H * .43); });
  });
  const body = new THREE.Mesh(slabGeometry(VCR.w, VCR.h, VCR.d, .6, .3), [M(THREE.MeshStandardMaterial, { map: tex(front), roughness: .5, metalness: .2 }, .9), silver, silver]);
  body.position.set(0, VCR.h / 2 + .6, -VCR.d / 2); body.castShadow = body.receiveShadow = true; vcrGroup.add(body);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => addBox(2.6, .6, 2.6, dark, a * (VCR.w / 2 - 3), .3, -VCR.d / 2 + b * (VCR.d / 2 - 3), vcrGroup));
  vcrFlap = new THREE.Group(); vcrFlap.position.set(0, .6 + VCR.h * .72 + .35, .05); vcrGroup.add(vcrFlap);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(VCR.slot[0], VCR.slot[1], .25), dark); flap.position.y = -VCR.slot[1] / 2; vcrFlap.add(flap);
  const led = new THREE.Mesh(new THREE.BoxGeometry(.5, .25, .1), vidLedMat); led.position.set(VCR.w * .3, VCR.h * .78, .06); vcrGroup.add(led);
  VCR.slotY = vcrFlap.position.y - VCR.slot[1] / 2;
  /* the disc player: slim, a tray across the left half */
  const pf = makeFrontCanvas(DVP.w * k, DVP.h * k, (x, W, H) => {
    x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#2c2d32'], [1, '#1b1c20']]); x.fillRect(0, 0, W, H);
    x.fillStyle = '#0a0a0c'; x.fillRect(W * .06, H * .2, W * .42, H * .16);
    x.fillStyle = '#c9c9cf'; x.font = `800 ${Math.round(H * .2)}px ${F.saira}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('MYV  DVD · BLU-RAY', W * .06, H * .7);
    x.fillStyle = '#08120c'; rr(x, W * .6, H * .25, W * .22, H * .3, 6); x.fill(); x.fillStyle = '#5fb7ff'; x.font = `700 ${Math.round(H * .18)}px ${F.mono}`; x.textAlign = 'center'; x.fillText('NO DISC', W * .71, H * .41);
  });
  const pbody = new THREE.Mesh(slabGeometry(DVP.w, DVP.h, DVP.d, .5, .25), [M(THREE.MeshStandardMaterial, { map: tex(pf), roughness: .45, metalness: .25 }, .9), silver, silver]);
  pbody.position.set(0, DVP.h / 2 + .6, -DVP.d / 2); pbody.castShadow = pbody.receiveShadow = true; playerGroup.add(pbody);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([a, b]) => addBox(2.4, .6, 2.4, dark, a * (DVP.w / 2 - 3), .3, -DVP.d / 2 + b * (DVP.d / 2 - 3), playerGroup));
  const trayC = makeFrontCanvas(256, 256, (x, W, H) => { x.fillStyle = '#1c1d21'; x.fillRect(0, 0, W, H); x.fillStyle = '#121316'; x.beginPath(); x.arc(W / 2, H / 2, W * .47, 0, 7); x.fill(); x.fillStyle = '#2b2d33'; x.beginPath(); x.arc(W / 2, H / 2, W * .1, 0, 7); x.fill(); });
  dvpTray = new THREE.Mesh(new THREE.BoxGeometry(DVP.tray, .5, DVP.tray), [dark, dark, M(THREE.MeshStandardMaterial, { map: tex(trayC), roughness: .6 }, .7), dark, dark, dark]);
  dvpTray.userData.home = new V3(-DVP.w * .27 + 1, DVP.h * .55 + .6, -DVP.tray / 2 - .3); dvpTray.position.copy(dvpTray.userData.home); dvpTray.castShadow = true; playerGroup.add(dvpTray);
  const pled = new THREE.Mesh(new THREE.BoxGeometry(.5, .25, .1), vidLedMat); pled.position.set(DVP.w * .42, DVP.h * .75, .06); playerGroup.add(pled);
}
/* our machines as devices: the tape goes in through the door and disappears, the disc rides the tray in */
function videoMachine(kind) {
  const grp = kind === 'tape' ? vcrGroup : playerGroup;
  const play = (sec, fn) => tweenReal(sec, fn, easeIO);
  const dev = {
    name: kind === 'tape' ? 'vcr' : 'dvp', group: grp, flaps: [], floppyLed: null,
    led(on) { vidLedMat.color.set(on ? (kind === 'tape' ? '#ff4a2e' : '#5fb7ff') : '#2a1d10'); },
    reset() { vcrFlap.rotation.x = 0; dvpTray.position.copy(dvpTray.userData.home); },
    port() {
      grp.updateMatrixWorld(true); const w = v => grp.localToWorld(v);
      if (kind === 'tape') {
        /* flat, label up, the flap edge first; its spine is what you see going in */
        const y = VCR.slotY, mid = MSIZE.tape.h / 2;
        return {
          kind: 'socket', m: 'tape', q: new Q4().setFromEuler(new EU(-Math.PI / 2, 0, 0)), s: 1,
          entry: w(new V3(0, y, mid + 6)), inside: w(new V3(0, y, mid + .4)), out: w(new V3(0, y, mid + 3)),
          prepare() { },
          async seat(d) { sfx.click(.6); await play(.18, t => { vcrFlap.rotation.x = -1.4 * t; }); sfx.slotIn(); const z0 = d.position.z; await play(.55, t => { d.position.z = z0 - (MSIZE.tape.h + 1) * t; }); d.visible = false; await play(.18, t => { vcrFlap.rotation.x = -1.4 * (1 - t); }); },
          async unseat(d) { sfx.slotOut(); await play(.16, t => { vcrFlap.rotation.x = -1.4 * t; }); d.visible = true; const z0 = d.position.z; await play(.5, t => { d.position.z = z0 + (MSIZE.tape.h + 1) * t; }); scene.attach(d); },
          after() { play(.2, t => { vcrFlap.rotation.x = -1.4 * (1 - t); }); },
          restore(d) { d.visible = false; }
        };
      }
      const h = dvpTray.userData.home, outZ = DVP.tray - .5, onTray = new V3(h.x, h.y + .45, h.z + outZ);
      const trayTo = open => { sfx.tray(); const z0 = dvpTray.position.z, z1 = h.z + (open ? outZ : 0); return play(.7, t => { dvpTray.position.z = lerp(z0, z1, t); }); };
      return {
        kind: 'socket', m: 'disc', q: new Q4().setFromEuler(new EU(-Math.PI / 2, 0, 0)), s: 1,
        entry: w(onTray.clone().add(new V3(0, 8, 0))), inside: w(onTray.clone()), out: w(onTray.clone().add(new V3(0, 4, 0))),
        prepare() { trayTo(true); },
        async seat(d) { sfx.thud(); await waitReal(.2); dvpTray.attach(d); await trayTo(false); },
        async unseat(d) { await trayTo(true); scene.attach(d); },
        after() { trayTo(false); },
        restore(d) { d.position.copy(w(new V3(h.x, h.y + .45, h.z))); dvpTray.attach(d); }
      };
    },
    bounds() { return new THREE.Box3().setFromObject(grp); }
  };
  return dev;
}

/* =====================================================================
   MACHINES: where each medium goes in, for whatever is on the table or the floor
   ===================================================================== */
const _dv = new V3();
const DEV = {
  cur: null,
  id2: {
    name: 'id2', group: conGroup, flaps: cartFlaps, floppyLed: floppyLedMat,
    led(on) { ledMat.color.set(on ? '#4dff88' : '#ff9b3a'); },
    port(m, c) {
      const w = v => conGroup.localToWorld(v);
      if (m === 'floppy') { const H = MSIZE.floppy.h; return { kind: 'floppy', q: QFLAT, entry: w(new V3(FSLOT.x, FSLOT.y, FSLOT.z + H / 2 + .5)), inside: w(new V3(FSLOT.x, FSLOT.y, FSLOT.z - H / 2 - .4)), out: w(new V3(FSLOT.x, FSLOT.y, FSLOT.z + H / 2 - 6.4)) }; }
      if (m === 'cart') { const H = MSIZE.cart.h; return { kind: 'cart', q: QUP, entry: w(new V3(CSLOT.x, CSLOT.top + H / 2 + 7, CSLOT.z)), inside: w(new V3(CSLOT.x, CSLOT.top + H / 2 - 3.6, CSLOT.z)), out: w(new V3(CSLOT.x, CSLOT.top + H / 2 + 2.5, CSLOT.z)), top: w(new V3(0, CSLOT.top, 0)).y }; }
      const R = c.dim.discR;
      return { kind: 'slot', q: QFLAT, entry: w(new V3(SLOT.x, SLOT.y, SLOT.z + R + .6)), inside: w(new V3(SLOT.x, SLOT.y, SLOT.z - R - 1.2)), out: w(new V3(SLOT.x, SLOT.y, SLOT.z + R - 3.6)) };
    },
    bounds() { return new THREE.Box3().setFromObject(conGroup); }
  },
  pc: {
    name: 'pc', group: pcGroup, flaps: pcFlaps, floppyLed: pcFloppyLedMat,
    led(on) { pcLedMat.color.set(on ? '#5dff6e' : '#2a3a24'); pcHddMat.color.set(on ? '#ffb02e' : '#3a2a14'); },
    port(m, c) {
      if (m === 'floppy') { const H = MSIZE.floppy.h, s = PCT.fslot; return { kind: 'floppy', q: QFLAT, entry: new V3(s.x, s.y, s.z + H / 2 + .5), inside: new V3(s.x, s.y, s.z - H / 2 - .4), out: new V3(s.x, s.y, s.z + H / 2 - 6.4) }; }
      if (m === 'cart') { const H = MSIZE.cart.h, s = PCT.cslot; return { kind: 'cart', q: QUP, entry: new V3(s.x, s.y + H / 2 + 7, s.z), inside: new V3(s.x, s.y + H / 2 - 3.6, s.z), out: new V3(s.x, s.y + H / 2 + 2.5, s.z), top: s.y }; }
      const h = pcTray.userData.home, out = pcTray.userData.out, onTray = new V3(h.x, h.y + .45, h.z + out - .4);
      return { kind: 'tray', q: QFLAT, entry: onTray.clone().add(new V3(0, 8, 0)), inside: onTray, out: onTray.clone() };
    },
    bounds() { return new THREE.Box3().setFromObject(pcGroup); }
  },
  vcr: videoMachine('tape'), dvp: videoMachine('disc'),
  ugc: null,  /* filled when a model is in use */
  led(on) { if (DEV.cur) DEV.cur.led(on); }
};
/* a machine made from an EmuVR model. The medium goes to the female Socket the model brings, and the machine
   moves the way its maker animated it (EmuVR's GameSystemState): a lid swings up, a tray or a slot-loader
   pushes the socket out and pulls it back in, a cartridge slot sinks the socket as the medium goes in, the
   power button goes down. The clips share channels (a slot-loader's open, insert and close all move the same
   socket), so the machine is always posed as a whole: shut or open, empty or holding the medium.
   Which way the medium goes in comes from that movement; with no animation for it, from the way out of the
   socket that nothing blocks (rays against the model). Discs lie across the socket's Y axis, as EmuVR's do;
   cartridges, floppies and tapes go in on their leading edge, the label to the front (or up, when they go in
   flat). In a tight opening (a handheld, a UMD) the medium is scaled down to fit.
   Models without any of this fall back to a lid (a mesh called lid) or to the top of the model. */
/* how far a ray goes inside the model before it meets it (both faces count: the rays start inside) */
function ugcRays(root) {
  const meshes = (root.userData.meshes || []).filter(m => m.geometry && m.geometry.index);
  const _r = new THREE.Ray(), _m = new THREE.Matrix4(), _a = new V3(), _b = new V3(), _c = new V3(), _h = new V3(), _bx = new THREE.Box3();
  const shown = o => { for (; o && o !== root; o = o.parent) if (!o.visible) return false; return true; };
  return (o, dir, max = 60) => {
    root.updateMatrixWorld(true); let best = max;
    for (const me of meshes) {
      if (!shown(me)) continue;
      if (!me.geometry.boundingBox) me.geometry.computeBoundingBox();
      _bx.copy(me.geometry.boundingBox).applyMatrix4(me.matrixWorld); _r.set(o, dir);
      if (!_bx.containsPoint(o) && !_r.intersectsBox(_bx)) continue;
      _m.copy(me.matrixWorld).invert(); _r.origin.copy(o).applyMatrix4(_m); _r.direction.copy(dir).transformDirection(_m);
      const P = me.geometry.attributes.position, I = me.geometry.index.array;
      for (let i = 0; i + 2 < I.length; i += 3) {
        _a.fromBufferAttribute(P, I[i]); _b.fromBufferAttribute(P, I[i + 1]); _c.fromBufferAttribute(P, I[i + 2]);
        if (!_r.intersectTriangle(_a, _b, _c, false, _h)) continue;
        const d = _h.applyMatrix4(me.matrixWorld).distanceTo(o); if (d > .05 && d < best) best = d;
      }
    }
    return best;
  };
}
function ugcDevice(root) {
  const A = root.userData.anchors || {}, anim = root.userData.anim, clips = anim ? anim.clips : {}, holder = A.socket || root;
  root.updateMatrixWorld(true);
  /* called while the model still stands at the origin, unturned: everything below lives in its own space */
  /* without any animation of its own, a lid (that does not hold the socket) turns on the edge farthest from you */
  const lidPivots = anim ? [] : (root.userData.lids || []).filter(lid => { let in_ = false; lid.traverse(o => { if (o === A.socket) in_ = true; }); return !in_; }).map(lid => {
    const b = new THREE.Box3().setFromObject(lid), pivot = new THREE.Group();
    root.add(pivot); pivot.position.set((b.min.x + b.max.x) / 2, b.max.y, b.min.z);
    pivot.updateMatrixWorld(true); pivot.attach(lid); return pivot;
  });
  let led = null;
  if (A.light) {
    const c = A.light.color || { r: 0, g: 1, b: 0 }, mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(c.r, c.g, c.b), toneMapped: false });
    led = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 8), mat); A.light.obj.add(led); led.scale.setScalar(1 / Math.abs(A.light.obj.getWorldScale(new V3()).x || 1)); led.visible = false;
  }
  const at = (c, u) => { if (c) anim.apply(c, c.dur * u); return !!c; };
  /* the whole machine in one state; shut with the medium in, close goes last (it pulls a slot-loader's socket the rest of the way) */
  function pose(open, inserted) {
    if (anim) {
      if (open) at(clips.open, 1) || at(clips.close, 0); else at(clips.close, 1) || at(clips.open, 0);
      if (inserted) at(clips.insert, 1) || at(clips.remove, 0); else at(clips.insert, 0) || at(clips.remove, 1);
      if (!open && inserted) at(clips.close, 1);
    }
    lidPivots.forEach(p => { p.rotation.x = open ? -1.3 : 0; });
    root.updateMatrixWorld(true);
  }
  /* the socket in the model's space: where it is and its axes (the top of the model when it has none) */
  const sock = () => {
    root.updateMatrixWorld(true);
    if (!A.socket) { const b = new THREE.Box3(); (root.userData.meshes || []).forEach(m => { if (m.visible) b.expandByObject(m); }); if (b.isEmpty()) b.setFromObject(root); return { p: new V3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2), x: new V3(1, 0, 0), y: new V3(0, 1, 0), z: new V3(0, 0, 1), guessed: true }; }
    const e = A.socket.matrixWorld.elements;
    return { p: new V3().setFromMatrixPosition(A.socket.matrixWorld), x: new V3(e[0], e[1], e[2]).normalize(), y: new V3(e[4], e[5], e[6]).normalize(), z: new V3(e[8], e[9], e[10]).normalize() };
  };
  const hit = ugcRays(root), UP = new V3(0, 1, 0), FRONT = new V3(0, 0, 1);
  const free = (s, dirs, need) => dirs.filter(d => hit(s.p, d, need + 1) > need);
  /* the axis a disc turns on: the spindle's, else the one the socket lets turn, else the socket's Y; in a
     handheld it lies along the thin side whatever the socket says */
  const discAxis = s => {
    let n = null;
    if (anim && anim.spindle && anim.axis) { const a = anim.axis; n = new V3(a.x, a.y, a.z).transformDirection(anim.spindle.matrixWorld); }
    else if (A.sock && A.sock.free.filter(Boolean).length === 1) n = [s.x, s.y, s.z][A.sock.free.indexOf(true)].clone();
    else n = s.y.clone();
    const sz = root.userData.size, thin = Math.min(sz.x, sz.y, sz.z);
    if (thin < DIMS.dvd.discR) { const t = thin === sz.x ? new V3(1, 0, 0) : thin === sz.y ? UP.clone() : FRONT.clone(); if (Math.abs(n.dot(t)) < .7) n = t; }
    return n.normalize();
  };
  /* how the machine takes each medium, worked out once */
  const geo = (() => {
    /* the medium's own way: from where it is put down to where it stays while the game runs */
    const moveFrom = open => { pose(open, false); const a = sock(); pose(false, true); return sock().p.sub(a.p); };
    let opens = lidPivots.length > 0;
    if (clips.open || clips.close) {
      pose(false, false); at(clips.close, 1) || at(clips.open, 0); root.updateMatrixWorld(true); const shut = sock().p;
      at(clips.open, 1) || at(clips.close, 0); root.updateMatrixWorld(true);
      if (sock().p.distanceTo(shut) > .3) opens = true;   /* a tray or a slot-loader: it carries the socket */
      else {
        /* a lid that does not carry it: it has to open only if it is in the way of the medium */
        const mv = moveFrom(false); pose(false, true); const s = sock();
        opens = mv.length() > .3 ? hit(s.p, mv.clone().normalize().negate(), mv.length()) < mv.length() : !free(s, [s.y, s.y.clone().negate()], 8).length;
      }
    }
    pose(opens, false); const ready = sock(), move = moveFrom(opens);
    /* the disc's axis is taken where it ends up (the spindle's, once in) and kept in the socket's own terms:
       a socket that tilts while the medium goes in (EmuVR's GameCube) must not leave the disc tilted */
    const played = sock(), na = discAxis(played), nl = [played.x, played.y, played.z].map(a => a.dot(na));
    pose(opens, false);
    const deep = ready.p.clone().add(move), per = {};
    for (const m of ['disc', 'cart', 'floppy', 'tape']) {
      const disc = m === 'disc', H = disc ? DIMS.dvd.discR * 2 : MSIZE[m].h, q = new Q4();
      let inward, s = 1;
      if (disc) {
        /* the disc lies across the socket, label up (or to the front when it stands); on a tray it comes
           from above, into a slot it slides along the slot */
        const n = ready.x.clone().multiplyScalar(nl[0]).addScaledVector(ready.y, nl[1]).addScaledVector(ready.z, nl[2]).normalize(); if (n.dot(UP) < -.2 || (Math.abs(n.dot(UP)) <= .2 && n.dot(FRONT) < 0)) n.negate();
        const tray = Math.abs(n.dot(UP)) > .7 && hit(ready.p, n, 20) >= 20;
        if (move.length() > .3 && !(tray && Math.abs(move.clone().normalize().dot(UP)) < .5)) inward = move.clone().normalize();
        else inward = (free(ready, [n, n.clone().negate()], 6)[0] || n).clone().negate();
        q.setFromUnitVectors(new V3(0, 0, 1), n);
        /* in a tight well (a UMD, a mini disc) the disc shrinks to fit */
        const u = (Math.abs(n.dot(UP)) > .7 ? new V3(1, 0, 0) : UP.clone()).projectOnPlane(n).normalize(), v = n.clone().cross(u);
        const o = deep.clone().addScaledVector(n, .4), d = [u, u.clone().negate(), v, v.clone().negate()].map(a => hit(o, a, 30));
        if (d.every(x => x < 30)) { const r = Math.min(d[0] + d[1], d[2] + d[3]) / 2 / DIMS.dvd.discR; if (r < .7) s = Math.max(.3, r); }
        per[m] = { q, s, inward, inside: ready.p.clone().addScaledVector(n, .15), disc };
        continue;
      }
      if (move.length() > .3) inward = move.clone().normalize();
      else {
        /* the axis of the socket that leads out of the machine; up, then the front, win a close call */
        const axes = [ready.x, ready.y, ready.z].flatMap(a => [a.clone(), a.clone().negate()]);
        const ways = free(ready, axes, 59).sort((a, b) => (b.dot(UP) * 2 + b.dot(FRONT)) - (a.dot(UP) * 2 + a.dot(FRONT)));
        inward = (ways[0] || UP).clone().negate();
      }
      /* the leading edge goes first, the label faces the front (or up, when it goes in flat) */
      const want = Math.abs(inward.dot(UP)) > .7 ? FRONT : UP;
      const face = ([ready.x, ready.y, ready.z].filter(a => Math.abs(a.dot(inward)) < .7).sort((a, b) => Math.abs(b.dot(want)) - Math.abs(a.dot(want)))[0] || want).clone().projectOnPlane(inward).normalize();
      if (face.dot(want) < 0) face.negate();
      const yAx = m === 'cart' ? inward.clone().negate() : inward.clone(), xAx = yAx.clone().cross(face).normalize();
      q.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAx, yAx, face));
      /* a narrow slot (a handheld's) takes a smaller one */
      const o = deep.clone().addScaledVector(inward, -1), w = [xAx, xAx.clone().negate()].map(a => hit(o, a, 30)), t = [face, face.clone().negate()].map(a => hit(o, a, 30));
      if (w.every(x => x < 30)) s = Math.min(s, (w[0] + w[1]) / (MSIZE[m].w + .4));
      if (t.every(x => x < 30)) s = Math.min(s, (t[0] + t[1]) / (MSIZE[m].t + .3));
      s = clamp(s, .3, 1);
      /* put down with its foot on the socket */
      per[m] = { q, s, inward, inside: ready.p.clone().addScaledVector(inward, -(H / 2 - .6) * s), H: H * s, disc };
    }
    pose(false, false);
    return { per, opens, ready };
  })();
  const play = (c, a, b, sec) => c ? tweenReal(sec ?? c.dur * Math.abs(b - a), t => anim.apply(c, c.dur * lerp(a, b, t)), easeIO) : Promise.resolve();
  const lids = (v0, v1, sec = .45) => lidPivots.length ? tweenReal(sec, t => setLids(dev, lerp(v0, v1, t)), easeIO) : Promise.resolve();
  const opens = geo.opens;
  const openUp = () => { if (clips.open) { sfx.click(.7); return play(clips.open, 0, 1); } if (lidPivots.length) { sfx.click(.7); return lids(0, 1); } return Promise.resolve(); };
  const shutDown = () => { if (clips.close) { sfx.caseClose('jewel'); return play(clips.close, 0, 1); } if (lidPivots.length) { sfx.caseClose('jewel'); return lids(1, 0, .35); } return Promise.resolve(); };
  const dev = {
    name: 'ugc', group: root, flaps: [], floppyLed: null, lids: lidPivots, anim, geo,
    led(on) {
      if (led) led.visible = on;
      if (clips.on) { if (on) play(clips.on, 0, 1); else if (clips.off) play(clips.off, 0, 1); else anim.apply(clips.on, 0); }
    },
    /* back to empty and shut (a new room, a reload) */
    reset() { pose(false, false); },
    socket() { root.updateMatrixWorld(true); return root.localToWorld(geo.ready.p.clone()); },
    port(m) {
      root.updateMatrixWorld(true);
      const g = geo.per[m] || geo.per.cart, rq = root.getWorldQuaternion(new Q4()), back = g.inward.clone().negate().applyQuaternion(rq);
      const inside = root.localToWorld(g.inside.clone()), q = rq.clone().multiply(g.q), above = Math.abs(g.inward.y) > .7;
      const reach = g.disc ? (above ? 10 : DIMS.dvd.discR * g.s + 5) : g.H + 5, back2 = g.disc ? (above ? 4 : DIMS.dvd.discR * g.s + 3) : g.H * .5 + 2;
      return {
        kind: 'socket', m, q, s: g.s, inside, entry: inside.clone().addScaledVector(back, reach), out: inside.clone().addScaledVector(back, back2), lids: lidPivots,
        /* before the medium flies over: the lid or the tray opens */
        prepare() { if (opens) openUp(); },
        /* it has landed: the machine holds it, pulls it in and shuts */
        async seat(d) {
          holder.attach(d);
          if (clips.insert) { sfx.slotIn(); await play(clips.insert, 0, 1); }
          if (opens) { await waitReal(.15); await shutDown(); }
          if (anim && anim.hideClosed) d.visible = false;
        },
        /* the game is over: the machine gives it back */
        async unseat(d) {
          d.visible = true;
          if (opens) await openUp();
          if (clips.remove) { sfx.slotOut(); await play(clips.remove, 0, 1); }
          else if (clips.insert) { sfx.slotOut(); await play(clips.insert, 1, 0); }
          scene.attach(d);
        },
        after() { if (opens) shutDown(); },
        /* the shelf reopened with a game running: the medium is already in */
        restore(d) { pose(opens, false); holder.attach(d); pose(false, true); if (anim && anim.hideClosed) d.visible = false; }
      };
    },
    bounds() { return new THREE.Box3().setFromObject(root); }
  };
  return dev;
}
/* the name the TV prints while the machine boots */
function deviceLabel() { const d = DEV.cur; if (!d || d.name === 'id2') return 'ID-2'; if (d.name === 'pc') return 'MYV 486'; if (d.name === 'vcr') return 'MYV VHS'; if (d.name === 'dvp') return 'MYV DVD'; const m = UGCS.meta()[devKey(STAGE.sys)]; return (m && m.name || 'UGC').toUpperCase().slice(0, 18); }
function setLids(dev, v) { (dev && dev.lids || []).forEach(p => { p.rotation.x = -1.3 * v; }); }

/* =====================================================================
   STAGE: which room you are in, and what stands in it
   ===================================================================== */
function isRooms() { return prefs.layout === 'rooms'; }
const UGC_SCREEN_MAT = new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false });
const STAGE = { name: '', sys: '', screen: null, dirty: false, vmed: 'tape' };
/* what the current system's room is: the desk for PC, the video shop for films, the TV room for the rest */
function stageFor(sys) { return !isRooms() ? 'table' : sys === 'PC' ? 'pc' : sys === 'VIDEO' ? 'video' : 'tv'; }
/* the video room plays tapes on the CRT and discs on the flat TV */
function screenFor(stage, sys) { return stage === 'pc' ? 'monitor' : stage === 'video' ? (STAGE.vmed === 'tape' ? 'crt' : 'flat') : stage === 'tv' ? (FLAT_SYSTEMS.has(sys) ? 'flat' : 'crt') : 'crt'; }
/* the machine a system's games go into: its own key, or the video room's player for the medium in hand */
function devKey(sys) { return sys === 'VIDEO' ? 'vid:' + STAGE.vmed : 'sys:' + sys; }
/* a tape needs the VCR and the CRT, a disc the player and the flat TV: the room changes while you hold the case */
function setVideoMedium(m) { m = m === 'tape' ? 'tape' : 'disc'; if (STAGE.vmed === m && STAGE.name === 'video') return; STAGE.vmed = m; if (STAGE.name === 'video') { UGCS.load(UGCS.keysFor('VIDEO')).then(() => { if (STAGE.vmed === m && mode !== 'playing') applyStage('VIDEO'); }); applyStage('VIDEO'); } }
function applyStage(sys) {
  const st = stageFor(sys); STAGE.name = st; STAGE.sys = sys;
  tvRoom.visible = isRooms();
  /* the generic CRT and ID-2: on the table in the old designs, in the TV room otherwise */
  if (st === 'table') { tvGroup.position.set(0, 0, 0); conGroup.position.set(0, 0, 0); }
  else { tvGroup.position.set(CAB.x - TV.x, CAB.h - TABLE.top, CAB.front - 3 - TV.zFront); conGroup.position.set(FLOOR_CON.x - CON.x, RUG.y * 2 - TABLE.top, FLOOR_CON.front - CON.zFront); }
  flatTv.position.set(CAB.x, CAB.h, CAB.front - 12);
  pcGroup.visible = st === 'pc';
  const scr = screenFor(st, sys); STAGE.screen = scr;
  /* EmuVR models, when you have chosen one for this system or this screen */
  const devModel = st === 'table' ? null : UGCS.ready(devKey(sys)), scrModel = st === 'table' ? null : UGCS.ready('scr:' + scr);
  UGCS.showOnly([devModel, scrModel].filter(Boolean));
  if (devModel) {
    devModel.position.copy(st === 'pc' ? new V3(PCT.x + 4, TABLE.top, PCT.front - devModel.userData.size.z / 2) : new V3(FLOOR_CON.x, RUG.y * 2, FLOOR_CON.front - devModel.userData.size.z / 2));
    devModel.rotation.y = UGCS.rot(devKey(sys)) ? Math.PI : 0;
    DEV.cur = devModel.userData.dev;
  } else DEV.cur = st === 'pc' ? DEV.pc : st === 'video' ? (STAGE.vmed === 'tape' ? DEV.vcr : DEV.dvp) : DEV.id2;
  conGroup.visible = !devModel && st !== 'pc' && st !== 'video';
  /* our VCR or disc player on the rug, where the console would be */
  [[vcrGroup, 'tape', VCR], [playerGroup, 'disc', DVP]].forEach(([g, m, S]) => { g.visible = st === 'video' && !devModel && STAGE.vmed === m; g.position.set(FLOOR_CON.x, RUG.y * 2, FLOOR_CON.front); });
  if (st === 'pc' && devModel) pcGroup.children.forEach(o => { o.visible = !(o.position.x < PCT.x + PCT.w / 2 + 2 && o.position.x > PCT.x - PCT.w / 2 - 2); });
  else pcGroup.children.forEach(o => { o.visible = true; });
  /* the screen */
  let at;
  const tvOn = scr === 'crt' && !scrModel, flatOn = scr === 'flat' && !scrModel, monOn = scr === 'monitor';
  tvGroup.visible = tvOn || st === 'table'; flatTv.visible = flatOn;
  if (scrModel) {
    if (scr === 'monitor') { scrModel.position.set(MON.x, TABLE.top, MON.front - scrModel.userData.size.z / 2); pcGroup.children.forEach(o => { if (Math.abs(o.position.x - MON.x) < MON.w / 2 + 1 && o.position.z < 34) o.visible = false; }); }
    else scrModel.position.set(CAB.x, CAB.h, CAB.front - 4 - scrModel.userData.size.z / 2);
    scrModel.rotation.y = UGCS.rot('scr:' + scr) ? Math.PI : 0;
    /* the game plays on the model's own screen when it has one */
    const sm = scrModel.userData.anchors.screen; if (sm) { sm.material = UGC_SCREEN_MAT; sm.visible = true; }
    scrModel.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(sm || scrModel); at = new V3((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2 + (sm ? 0 : 2), b.max.z);
  } else at = monOn ? MON.screen.clone() : flatOn ? flatTv.localToWorld(flatTv.userData.screen.clone()) : tvGroup.localToWorld(TV_SCREEN.clone());
  STAGE.screenAt = at; tvLight.position.set(at.x, at.y, at.z + 14);
  setCartFlaps(0); setFlaps(cartFlaps, 0); setFlaps(pcFlaps, 0); if (DEV.cur && DEV.cur.reset) DEV.cur.reset(); else setLids(DEV.cur, 0); DEV.led(false);
}
/* where the case waits while you play, lying cover up: on the desk right of the monitor, on the rug
   left of the console (its lid opens away from it) or on the table right of the console. When it opens
   the bottom half stays put and the lid swings over to the left, like a real case on a table. */
const _rqY = new Q4(), _rqF = new Q4().setFromEuler(new EU(-Math.PI / 2, 0, 0)), _rv = new V3(), YAX = new V3(0, 1, 0);
function restPose(c, P, Q) {
  const D = c.dim, o = easeIO(c.openA); let x, y, z, yaw;
  if (STAGE.name === 'pc') { x = MON.x + MON.w / 2 + 2 + 1.5 * D.w; z = 10; y = TABLE.top + .1; yaw = -.1; }
  else if (STAGE.name === 'tv' || STAGE.name === 'video') {
    const m = DEV.cur && DEV.cur.name === 'ugc' ? UGCS.ready(devKey(STAGE.sys)) : null, s = m ? m.userData.size : DEV.cur && DEV.cur.group && STAGE.name === 'video' ? { x: DEV.cur === DEV.vcr ? VCR.w : DVP.w, z: DEV.cur === DEV.vcr ? VCR.d : DVP.d } : null;
    x = FLOOR_CON.x - (s ? s.x : CON.w) / 2 - 5 - D.w / 2; z = FLOOR_CON.front - (s ? s.z : CON.d) / 2; y = RUG.y * 2; yaw = .14;
  } else { x = CON.x + CON.w / 2 + 3 + 1.5 * D.w; z = 10; y = TABLE.top; yaw = -.08; }
  Q.copy(_rqY.setFromAxisAngle(YAX, yaw)).multiply(_rqF);
  P.set(x, y + D.d / 2, z).add(_rv.set(-D.w / 2 * o, 0, 0).applyQuaternion(Q));
}
/* camera boxes for each room */
function stageBox(view) {
  const narrow = camera.aspect < .95;
  /* the video shop is framed like the bookcases; when a film goes in, the camera turns to the TV room */
  if (STAGE.name === 'video') return view === 'console' ? { box: { cx: CAB.x, cy: 42, cz: 45, w: narrow ? 120 : 150, h: narrow ? 190 : 150 }, dir: new V3(0, .18, 1) } : null;
  if (STAGE.name === 'tv') {
    if (view === 'browse') return { box: { cx: clamp(cam.browseX, CAB.x - CAB.w / 2 + 34, CAB.x + CAB.w / 2 - 34), cy: CAB.boards[cam.browseRow || 0] + CAB.rowH / 2, cz: CAB.front - 8, w: narrow ? 50 : 84, h: 36 }, dir: new V3(0, .2, 1) };
    if (view === 'console') return { box: { cx: CAB.x, cy: 42, cz: 45, w: narrow ? 120 : 150, h: narrow ? 190 : 150 }, dir: new V3(0, .18, 1) };
    /* sitting cross-legged on the rug: the TV at eye height, the cabinet and the console on the rug below */
    return { box: { cx: CAB.x, cy: 50, cz: 25, w: narrow ? 160 : 200, h: narrow ? 230 : 170 }, dir: new V3(0, .1, 1) };
  }
  /* the tower, the monitor and, right of it, the case you took the disc from */
  if (STAGE.name === 'pc' && view === 'console') return { box: narrow ? { cx: -40, cy: TABLE.top + 30, w: 104, h: 150 } : { cx: -33, cy: TABLE.top + 24, w: 128, h: 74 }, dir: new V3(.04, .2, 1) };
  return null;
}

/* =====================================================================
   EmuVR MODELS: picked in Settings, kept in this browser (IndexedDB),
   read and built when you walk into the room that uses them. A .ugc is
   kept as it is; EmuVR's own consoles, read once from its folder, are
   kept already read (emuvr:<name>) and a room only points at one.
   ===================================================================== */
const UGCS = {
  db: null, models: new Map(), building: new Map(), group: new THREE.Group(),
  meta() { return prefs.ugc || (prefs.ugc = {}); },
  rot(key) { const m = this.meta()[key]; return !!(m && m.rot); },
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => { try { const rq = indexedDB.open('myvlibrary-ugc', 1); rq.onupgradeneeded = () => rq.result.createObjectStore('files'); rq.onsuccess = () => { this.db = rq.result; res(this.db); }; rq.onerror = () => rej(rq.error); } catch (e) { rej(e); } });
  },
  async tx(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('files', mode), st = t.objectStore('files'), rq = fn(st); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); }); },
  async put(key, file) {
    const buf = await file.arrayBuffer();
    const parsed = UGC.parse(buf, { maxTex: 1024 });   /* fails here if it cannot be read: nothing is stored */
    if (parsed.info.type === 'medium') throw new Error('Ese .ugc es un juego (un cartucho o un disco), no una consola ni una pantalla.');
    const root = UGC.build(parsed);
    await this.tx('readwrite', st => st.put(buf, key));
    this.drop(key); this.adopt(key, root);
    this.meta()[key] = { name: parsed.info.name || file.name.replace(/\.ugc$/i, '').replace(/_[0-9a-f]{8}$/i, '').replace(/_/g, ' '), size: file.size, rot: false }; savePrefs();
    return root;
  },
  /* EmuVR's own consoles: read from the folder the user picked, each one kept already read */
  bases() { return prefs.emuvr || []; },
  async readBase(files, progress) {
    const list = await EMUVR.scan(files, progress);
    for (const c of list) await this.tx('readwrite', st => st.put({ parsed: c.parsed }, 'emuvr:' + c.id));
    prefs.emuvr = list.map(c => ({ id: c.id, name: c.name, sys: c.sys })); savePrefs();
    /* a room already using one of them gets the fresh copy */
    Object.entries(this.meta()).forEach(([k, m]) => { if (m.base) this.drop(k); });
    return list;
  },
  async useBase(key, id) {
    const b = this.bases().find(x => x.id === id); if (!b) return;
    await this.tx('readwrite', st => st.put({ ref: 'emuvr:' + id }, key));
    this.drop(key); this.meta()[key] = { name: b.name + ' (EmuVR)', size: 0, rot: false, base: id }; savePrefs();
    await this.load([key]);
  },
  async remove(key) { await this.tx('readwrite', st => st.delete(key)); this.drop(key); delete this.meta()[key]; savePrefs(); },
  adopt(key, root) { root.userData.dev = ugcDevice(root); root.visible = false; this.group.add(root); this.models.set(key, root); },
  drop(key) { const m = this.models.get(key); if (m) { this.group.remove(m); UGC.dispose(m); this.models.delete(key); } },
  ready(key) { return this.meta()[key] ? this.models.get(key) || null : null; },
  showOnly(list) { this.models.forEach(m => { m.visible = list.includes(m); }); },
  /* reads the models this room needs; resolves when they are built (or could not be) */
  load(keys) {
    return Promise.all(keys.filter(k => this.meta()[k] && !this.models.has(k)).map(k => {
      if (!this.building.has(k)) this.building.set(k, this.tx('readonly', st => st.get(k)).then(async v => {
        if (v && v.ref) v = await this.tx('readonly', st => st.get(v.ref));
        if (!v) { delete this.meta()[k]; savePrefs(); return; }
        try { this.adopt(k, UGC.build(v.parsed || UGC.parse(v, { maxTex: 1024 }))); } catch (e) { console.error(e); toast(T('No se ha podido leer {0}', this.meta()[k].name)); }
      }).catch(e => console.error(e)).finally(() => this.building.delete(k)));
      return this.building.get(k);
    }));
  },
  keysFor(sys) { const st = stageFor(sys); return st === 'table' ? [] : st === 'video' ? ['vid:tape', 'vid:disc', 'scr:crt', 'scr:flat'] : ['sys:' + sys, 'scr:' + screenFor(st, sys)]; }
};
scene.add(UGCS.group);
