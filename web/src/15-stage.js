
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
  ugc: null,  /* filled when a model is in use */
  led(on) { if (DEV.cur) DEV.cur.led(on); }
};
/* a machine made from an EmuVR model: everything goes to its socket_media; a lid, if it has one, opens first */
function ugcDevice(root) {
  const A = root.userData.anchors || {}, lights = [];
  root.updateMatrixWorld(true);
  /* the lid turns on the edge farthest from you */
  /* called while the model still stands at the origin, unturned: the pivots live in its own space */
  const lidPivots = (root.userData.lids || []).map(lid => {
    const b = new THREE.Box3().setFromObject(lid), pivot = new THREE.Group();
    root.add(pivot); pivot.position.set((b.min.x + b.max.x) / 2, b.max.y, b.min.z);
    pivot.updateMatrixWorld(true); pivot.attach(lid); return pivot;
  });
  let led = null;
  if (A.light) {
    const c = A.light.color || { r: 0, g: 1, b: 0 }, mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(c.r, c.g, c.b), toneMapped: false });
    led = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 8), mat); A.light.obj.add(led); led.scale.setScalar(1 / Math.abs(A.light.obj.getWorldScale(new V3()).x || 1)); led.visible = false;
  }
  const dev = {
    name: 'ugc', group: root, flaps: [], floppyLed: null, lids: lidPivots,
    led(on) { if (led) led.visible = on; },
    socket() {
      root.updateMatrixWorld(true);
      if (A.socket) return A.socket.getWorldPosition(new V3());
      const b = new THREE.Box3().setFromObject(root); return new V3((b.min.x + b.max.x) / 2, b.max.y, (b.min.z + b.max.z) / 2);
    },
    port(m, c) {
      const s = this.socket(), half = m === 'cart' ? MSIZE.cart.h / 2 : 0;
      const inside = m === 'cart' ? s.clone().add(new V3(0, half - 2.5, 0)) : s.clone().add(new V3(0, .15, 0));
      return { kind: 'socket', q: m === 'cart' ? QUP : QFLAT, entry: inside.clone().add(new V3(0, m === 'cart' ? 9 : 10, 0)), inside, out: inside.clone().add(new V3(0, m === 'cart' ? 3 : 4, 0)), lids: lidPivots };
    },
    bounds() { return new THREE.Box3().setFromObject(root); }
  };
  return dev;
}
/* the name the TV prints while the machine boots */
function deviceLabel() { const d = DEV.cur; if (!d || d.name === 'id2') return 'ID-2'; if (d.name === 'pc') return 'MYV 486'; const m = UGCS.meta()['sys:' + STAGE.sys]; return (m && m.name || 'UGC').toUpperCase().slice(0, 18); }
function setLids(dev, v) { (dev && dev.lids || []).forEach(p => { p.rotation.x = -1.3 * v; }); }

/* =====================================================================
   STAGE: which room you are in, and what stands in it
   ===================================================================== */
function isRooms() { return prefs.layout === 'rooms'; }
const UGC_SCREEN_MAT = new THREE.MeshBasicMaterial({ map: tvTex, toneMapped: false });
const STAGE = { name: '', sys: '', screen: null, dirty: false };
/* what the current system's room is: the desk for PC, the TV room for the rest */
function stageFor(sys) { return !isRooms() ? 'table' : sys === 'PC' ? 'pc' : 'tv'; }
function screenFor(stage, sys) { return stage === 'pc' ? 'monitor' : stage === 'tv' ? (FLAT_SYSTEMS.has(sys) ? 'flat' : 'crt') : 'crt'; }
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
  const devModel = st === 'table' ? null : UGCS.ready('sys:' + sys), scrModel = st === 'table' ? null : UGCS.ready('scr:' + scr);
  UGCS.showOnly([devModel, scrModel].filter(Boolean));
  if (devModel) {
    devModel.position.copy(st === 'pc' ? new V3(PCT.x + 4, TABLE.top, PCT.front - devModel.userData.size.z / 2) : new V3(FLOOR_CON.x, RUG.y * 2, FLOOR_CON.front - devModel.userData.size.z / 2));
    devModel.rotation.y = UGCS.rot('sys:' + sys) ? Math.PI : 0;
    DEV.cur = devModel.userData.dev;
  } else DEV.cur = st === 'pc' ? DEV.pc : DEV.id2;
  conGroup.visible = !devModel && st !== 'pc';
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
  setCartFlaps(0); setFlaps(cartFlaps, 0); setFlaps(pcFlaps, 0); setLids(DEV.cur, 0); DEV.led(false);
}
/* camera boxes for each room */
function stageBox(view) {
  const narrow = camera.aspect < .95;
  if (STAGE.name === 'tv') {
    if (view === 'browse') return { box: { cx: clamp(cam.browseX, CAB.x - CAB.w / 2 + 34, CAB.x + CAB.w / 2 - 34), cy: CAB.boards[cam.browseRow || 0] + CAB.rowH / 2, cz: CAB.front - 8, w: narrow ? 50 : 84, h: 36 }, dir: new V3(0, .2, 1) };
    if (view === 'console') return { box: { cx: CAB.x, cy: 42, cz: 45, w: narrow ? 120 : 150, h: narrow ? 190 : 150 }, dir: new V3(0, .18, 1) };
    /* sitting cross-legged on the rug: the TV at eye height, the cabinet and the console on the rug below */
    return { box: { cx: CAB.x, cy: 50, cz: 25, w: narrow ? 160 : 200, h: narrow ? 230 : 170 }, dir: new V3(0, .1, 1) };
  }
  if (STAGE.name === 'pc' && view === 'console') return { box: narrow ? { cx: -58, cy: TABLE.top + 26, w: 86, h: 110 } : { cx: -50, cy: TABLE.top + 24, w: 120, h: 72 }, dir: new V3(.04, .2, 1) };
  return null;
}

/* =====================================================================
   EmuVR MODELS: picked in Settings, kept in this browser (IndexedDB),
   read and built when you walk into the room that uses them
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
    const parsed = UGC.parse(buf, { maxTex: 1024 }), root = UGC.build(parsed);   /* fails here if it cannot be read: nothing is stored */
    await this.tx('readwrite', st => st.put(buf, key));
    this.drop(key); this.adopt(key, root);
    this.meta()[key] = { name: file.name.replace(/\.ugc$/i, '').replace(/^[0-9a-f]{8}-/i, ''), size: file.size, rot: false }; savePrefs();
    return root;
  },
  async remove(key) { await this.tx('readwrite', st => st.delete(key)); this.drop(key); delete this.meta()[key]; savePrefs(); },
  adopt(key, root) { root.userData.dev = ugcDevice(root); root.visible = false; this.group.add(root); this.models.set(key, root); },
  drop(key) { const m = this.models.get(key); if (m) { this.group.remove(m); UGC.dispose(m); this.models.delete(key); } },
  ready(key) { return this.meta()[key] ? this.models.get(key) || null : null; },
  showOnly(list) { this.models.forEach(m => { m.visible = list.includes(m); }); },
  /* reads the models this room needs; resolves when they are built (or could not be) */
  load(keys) {
    return Promise.all(keys.filter(k => this.meta()[k] && !this.models.has(k)).map(k => {
      if (!this.building.has(k)) this.building.set(k, this.tx('readonly', st => st.get(k)).then(buf => {
        if (!buf) { delete this.meta()[k]; savePrefs(); return; }
        try { this.adopt(k, UGC.build(UGC.parse(buf, { maxTex: 1024 }))); } catch (e) { console.error(e); toast(T('No se ha podido leer {0}', this.meta()[k].name)); }
      }).catch(e => console.error(e)).finally(() => this.building.delete(k)));
      return this.building.get(k);
    }));
  },
  keysFor(sys) { const st = stageFor(sys); return st === 'table' ? [] : ['sys:' + sys, 'scr:' + screenFor(st, sys)]; }
};
scene.add(UGCS.group);
