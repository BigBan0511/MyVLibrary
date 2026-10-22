/* =====================================================================
   THE HI-FI: a 90s mini system on the TV cabinet of the record shop, with
   its two speakers. Turntable on top (the dust cover lifts, the arm swings
   over), the CD tray and the display in the middle, the cassette deck at
   the bottom (its door tilts open). Its buttons work: play and pause,
   previous and next song, volume, stop and eject.
   And at the computer: the CD burner (the PC's own tray) and a cassette
   deck to record the bag's songs on.
   ===================================================================== */
const HF = { w: 38, d: 32, deckH: 11, ampH: 12.5, ttH: 5.5, coverH: 6.5 };
HF.top = HF.deckH + HF.ampH + HF.ttH;
const hifiGroup = new THREE.Group(); scene.add(hifiGroup); hifiGroup.visible = false;
const hifiLedMat = new THREE.MeshBasicMaterial({ color: '#2a1d10', toneMapped: false });
const hifiDispC = mkCanvas(512, 128), hifiDispTex = tex(hifiDispC);
let hfDoor = null, hfTray = null, hfPlatter = null, hfArm = null, hfCover = null, hfKnob = null;
const hfButtons = [], hfCones = [];
{
  const k = 20, silver = M(THREE.MeshStandardMaterial, { color: '#2c2d32', roughness: .42, metalness: .4 }, 1), dark = M(THREE.MeshStandardMaterial, { color: '#111114', roughness: .5 }, .8);
  const front = (w, h, draw) => M(THREE.MeshStandardMaterial, { map: tex(makeFrontCanvas(w * k, h * k, draw)), roughness: .45, metalness: .25 }, .9);
  const brushed = (x, W, H) => { x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#3a3b41'], [1, '#202126']]); x.fillRect(0, 0, W, H); for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,255,255,${.01 + (i % 3) * .006})`; x.fillRect(0, i * H / 70, W, 1); } };
  /* the cassette deck: two wells; the left one has the door that opens */
  const deckF = front(HF.w, HF.deckH, (x, W, H) => {
    brushed(x, W, H);
    [[.27, 'DECK A · PLAY'], [.73, 'DECK B · REC']].forEach(([u, lab]) => { x.fillStyle = '#0a0a0c'; rr(x, W * u - 7 * k, H * .1, 14 * k, 8.4 * k, 10); x.fill(); x.fillStyle = '#9a9ca3'; x.font = `700 ${Math.round(H * .07)}px ${F.mono}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(lab, W * u, H * .93); });
    x.fillStyle = '#1c1d22'; rr(x, W * .73 - 5.5 * k, H * .22, 11 * k, 5.4 * k, 6); x.fill(); x.fillStyle = '#26272c'; x.fillRect(W * .73 - 2.6 * k, H * .42, 5.2 * k, 1.4 * k);
  });
  const deck = new THREE.Mesh(slabGeometry(HF.w, HF.deckH, HF.d, .5, .25), [deckF, silver, silver]); deck.position.set(0, HF.deckH / 2, -HF.d / 2); deck.castShadow = deck.receiveShadow = true; hifiGroup.add(deck);
  hfDoor = new THREE.Group(); hfDoor.position.set(-HF.w * .23, HF.deckH * .1, .12); hifiGroup.add(hfDoor);
  const doorMat = M(THREE.MeshPhysicalMaterial, { color: '#1a1b20', transparent: true, opacity: .55, roughness: .1, clearcoat: 1, depthWrite: false }, 1.6);
  /* the door stands out from the front, the cassette sits behind its smoked window */
  const door = new THREE.Mesh(new THREE.BoxGeometry(13.6, 8.2, .3), doorMat); door.position.set(0, 4.1, 1.65); hfDoor.add(door);
  [-1, 1].forEach(s => { const side = new THREE.Mesh(new THREE.BoxGeometry(.3, 8.2, 1.5), dark); side.position.set(s * 6.65, 4.1, .9); hfDoor.add(side); });
  const lip = new THREE.Mesh(new THREE.BoxGeometry(13.6, .5, .6), dark); lip.position.set(0, 8.1, 1.8); hfDoor.add(lip);
  /* the middle: the display, the CD tray, the buttons and the volume knob */
  const ampF = front(HF.w, HF.ampH, (x, W, H) => {
    brushed(x, W, H);
    x.fillStyle = '#0a0a0c'; x.fillRect(W * .05, H * .12, W * .44, H * .12);
    x.fillStyle = '#c9c9cf'; x.font = `800 ${Math.round(H * .12)}px ${F.saira}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('MYV  MINI SYSTEM · 3 WAY', W * .05, H * .36);
    x.fillStyle = '#9a9ca3'; x.font = `700 ${Math.round(H * .06)}px ${F.mono}`; x.textAlign = 'center'; x.fillText('VOLUME', W * .86, H * .88);
  });
  const amp = new THREE.Mesh(slabGeometry(HF.w - .4, HF.ampH, HF.d - .6, .5, .25), [ampF, silver, silver]); amp.position.set(0, HF.deckH + HF.ampH / 2, -HF.d / 2 - .3); amp.castShadow = amp.receiveShadow = true; hifiGroup.add(amp);
  const disp = new THREE.Mesh(new THREE.PlaneGeometry(15, 3.75), new THREE.MeshBasicMaterial({ map: hifiDispTex, toneMapped: false })); disp.position.set(HF.w * .2, HF.deckH + HF.ampH * .72, .03); hifiGroup.add(disp);
  const trayC = makeFrontCanvas(256, 256, (x, W, H) => { x.fillStyle = '#1c1d21'; x.fillRect(0, 0, W, H); x.fillStyle = '#121316'; x.beginPath(); x.arc(W / 2, H / 2, W * .47, 0, 7); x.fill(); x.fillStyle = '#2b2d33'; x.beginPath(); x.arc(W / 2, H / 2, W * .1, 0, 7); x.fill(); });
  hfTray = new THREE.Mesh(new THREE.BoxGeometry(13.6, .5, 13.6), [dark, dark, M(THREE.MeshStandardMaterial, { map: tex(trayC), roughness: .6 }, .7), dark, dark, dark]);
  hfTray.userData.home = new V3(-HF.w * .23, HF.deckH + HF.ampH * .82, -7.1); hfTray.position.copy(hfTray.userData.home); hfTray.castShadow = true; hifiGroup.add(hfTray);
  /* the buttons: each one a key that goes in when pressed */
  const ICONS = [['mPrev', '⏮'], ['mToggle', '▶❚❚'], ['mEject', '■ ⏏'], ['mNext', '⏭'], ['mDown', 'VOL −'], ['mUp', 'VOL +']];
  ICONS.forEach(([a, ic], i) => {
    const c = mkCanvas(128, 72), x = c.getContext('2d'); x.fillStyle = '#4a4b52'; x.fillRect(0, 0, 128, 72); x.fillStyle = '#5a5b63'; x.fillRect(0, 0, 128, 8);
    x.fillStyle = '#e6e6ec'; x.font = `700 ${ic.length > 2 ? 26 : 34}px ${F.fig}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ic, 64, 40);
    const b = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, .7), [dark, dark, dark, dark, M(THREE.MeshStandardMaterial, { map: tex(c), roughness: .5 }, .8), dark]);
    b.position.set(-HF.w / 2 + 3 + i * 3.7, HF.deckH + 2.2, .2); b.userData.hifiBtn = a; b.userData.z0 = .2; hifiGroup.add(b); hfButtons.push(b);
  });
  hfKnob = new THREE.Group(); hfKnob.position.set(HF.w * .36, HF.deckH + HF.ampH * .38, .1); hifiGroup.add(hfKnob);
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.4, 1.4, 40), M(THREE.MeshStandardMaterial, { color: '#7d7f86', roughness: .25, metalness: .85 }, 1.3)); knob.rotation.x = Math.PI / 2; knob.position.z = .7; hfKnob.add(knob);
  const mark = new THREE.Mesh(new THREE.BoxGeometry(.3, 1.4, .1), new THREE.MeshBasicMaterial({ color: '#ffb547' })); mark.position.set(0, 1.4, 1.45); hfKnob.add(mark);
  const led = new THREE.Mesh(new THREE.BoxGeometry(.6, .3, .1), hifiLedMat); led.position.set(HF.w * .43, HF.deckH + HF.ampH * .2, .06); hifiGroup.add(led);
  /* the turntable: a plinth, the platter with its mat, the arm and the smoked dust cover */
  const wood = M(THREE.MeshStandardMaterial, { color: '#1e1f24', roughness: .35, metalness: .3 }, 1);
  const plinth = new THREE.Mesh(slabGeometry(HF.w, HF.ttH, HF.d, .5, .25), wood); plinth.position.set(0, HF.deckH + HF.ampH + HF.ttH / 2, -HF.d / 2); plinth.castShadow = plinth.receiveShadow = true; hifiGroup.add(plinth);
  hfPlatter = new THREE.Group(); hfPlatter.position.set(-3, HF.top, -HF.d / 2); hifiGroup.add(hfPlatter);
  const matC = makeFrontCanvas(256, 256, (x, W) => { x.fillStyle = '#141416'; x.fillRect(0, 0, W, W); x.strokeStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 30; i++) { x.beginPath(); x.arc(W / 2, W / 2, W * .48 * i / 30, 0, 7); x.stroke(); } });
  const platter = new THREE.Mesh(new THREE.CylinderGeometry(15.2, 15.2, .9, 72), [M(THREE.MeshStandardMaterial, { color: '#9c9fa6', roughness: .25, metalness: .9 }, 1.3), M(THREE.MeshStandardMaterial, { map: tex(matC), roughness: .8 }, .6), dark]);
  platter.position.y = .45; platter.castShadow = true; hfPlatter.add(platter);
  const spindle = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 1.4, 12), M(THREE.MeshStandardMaterial, { color: '#d0d2d8', metalness: .9, roughness: .2 }, 1.3)); spindle.position.y = 1.2; hfPlatter.add(spindle);
  hfArm = new THREE.Group(); hfArm.position.set(HF.w / 2 - 3, HF.top + 2.2, -HF.d + 5); hifiGroup.add(hfArm);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(.9, 1.1, 2.4, 20), M(THREE.MeshStandardMaterial, { color: '#b9bcc4', metalness: .85, roughness: .25 }, 1.3)); post.position.y = -1.1; hfArm.add(post);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(.18, .18, 21, 10), M(THREE.MeshStandardMaterial, { color: '#d0d2d8', metalness: .9, roughness: .2 }, 1.3)); arm.rotation.x = Math.PI / 2; arm.position.z = 10.5; hfArm.add(arm);
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.2, .6, 2.2), dark); head.position.set(0, -.3, 21.2); hfArm.add(head);
  hfArm.userData.rest = .05; hfArm.userData.play = -.52; hfArm.rotation.y = hfArm.userData.rest;
  hfCover = new THREE.Group(); hfCover.position.set(0, HF.top, -HF.d); hifiGroup.add(hfCover);
  const smoke = M(THREE.MeshPhysicalMaterial, { color: '#222327', transparent: true, opacity: .32, roughness: .05, clearcoat: 1, clearcoatRoughness: .02, depthWrite: false, side: THREE.DoubleSide }, 2);
  const lidTop = new THREE.Mesh(new THREE.BoxGeometry(HF.w, .3, HF.d), smoke); lidTop.position.set(0, HF.coverH, HF.d / 2); hfCover.add(lidTop);
  [[0, HF.coverH / 2, HF.d, HF.w, HF.coverH, .3], [-HF.w / 2, HF.coverH / 2, HF.d / 2, .3, HF.coverH, HF.d], [HF.w / 2, HF.coverH / 2, HF.d / 2, .3, HF.coverH, HF.d]].forEach(([x, y, z, w, h, d]) => { const s = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), smoke); s.position.set(x, y, z); hfCover.add(s); });
  /* the speakers: a woofer and a tweeter each, the cones move with the music */
  const grille = makeFrontCanvas(22 * k, 36 * k, (x, W, H) => { x.fillStyle = '#161619'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < W; i += 4) x.fillRect(i, 0, 1, H); x.fillStyle = '#9a9ca3'; x.font = `800 ${Math.round(W * .07)}px ${F.saira}`; x.textAlign = 'center'; x.fillText('MYV · 3 WAY', W / 2, H * .95); });
  const coneC = makeFrontCanvas(256, 256, (x, W) => { const R = W / 2; x.fillStyle = rg(x, R, R, R * .1, R, [[0, '#2c2d31'], [.3, '#111113'], [.85, '#1d1e22'], [1, '#3a3b40']]); x.fillRect(0, 0, W, W); x.fillStyle = '#5b5d63'; x.beginPath(); x.arc(R, R, R * .2, 0, 7); x.fill(); x.strokeStyle = '#4a4c52'; x.lineWidth = 8; x.beginPath(); x.arc(R, R, R * .96, 0, 7); x.stroke(); });
  const coneMat = M(THREE.MeshStandardMaterial, { map: tex(coneC), roughness: .7 }, .7), cab = M(THREE.MeshStandardMaterial, { color: '#1a1b1f', roughness: .5 }, .8);
  [-1, 1].forEach(s => {
    const sp = new THREE.Group(); sp.position.set(s * (HF.w / 2 + 16), 0, -12); hifiGroup.add(sp);
    const box = new THREE.Mesh(slabGeometry(22, 36, 24, .6, .3), [M(THREE.MeshStandardMaterial, { map: tex(grille), roughness: .8 }, .6), cab, cab]); box.position.set(0, 18, 0); box.castShadow = box.receiveShadow = true; sp.add(box);
    [[6.8, 12], [2.6, 27]].forEach(([R, y]) => { const c = new THREE.Mesh(new THREE.CircleGeometry(R, 40), coneMat); c.position.set(0, y, 12.05); c.userData.z0 = 12.05; c.userData.R = R; sp.add(c); hfCones.push(c); });
  });
}
/* ---------- the cassette deck on the computer desk, to record the bag on ---------- */
const BD = { x: 12, w: 30, h: 9, d: 22, front: 30 };
const burnGroup = new THREE.Group(); scene.add(burnGroup); burnGroup.visible = false;
const burnLedMat = new THREE.MeshBasicMaterial({ color: '#2a1d10', toneMapped: false });
let bdDoor = null;
{
  const k = 20, silver = M(THREE.MeshStandardMaterial, { color: '#c9c3b2', roughness: .5, metalness: .15 }, .9);
  const f = makeFrontCanvas(BD.w * k, BD.h * k, (x, W, H) => { x.fillStyle = '#d6cfbd'; x.fillRect(0, 0, W, H); x.fillStyle = '#25262b'; rr(x, W * .08, H * .1, 14 * k, 8 * k, 8); x.fill(); x.fillStyle = '#4b453a'; x.font = `800 ${Math.round(H * .13)}px ${F.saira}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('MYV DUBBING DECK', W * .62, H * .3); ['●', '▶', '■', '⏏'].forEach((t, i) => { x.fillStyle = '#b7ae98'; rr(x, W * .62 + i * W * .085, H * .52, W * .07, H * .22, 4); x.fill(); x.fillStyle = i === 0 ? '#c0392b' : '#3a362e'; x.font = `700 ${Math.round(H * .14)}px ${F.fig}`; x.textAlign = 'center'; x.fillText(t, W * .655 + i * W * .085, H * .63); }); });
  const body = new THREE.Mesh(slabGeometry(BD.w, BD.h, BD.d, .5, .25), [M(THREE.MeshStandardMaterial, { map: tex(f), roughness: .55 }, .8), silver, silver]); body.position.set(BD.x, TABLE.top + BD.h / 2 + .3, BD.front - BD.d / 2); body.castShadow = body.receiveShadow = true; burnGroup.add(body);
  bdDoor = new THREE.Group(); bdDoor.position.set(BD.x - BD.w / 2 + 2.4 + 7, TABLE.top + .3 + BD.h * .1, BD.front + .12); burnGroup.add(bdDoor);
  const door = new THREE.Mesh(new THREE.BoxGeometry(13.6, 7.8, .3), M(THREE.MeshPhysicalMaterial, { color: '#1a1b20', transparent: true, opacity: .55, roughness: .1, clearcoat: 1, depthWrite: false }, 1.6)); door.position.set(0, 3.9, 1.65); bdDoor.add(door); [-1, 1].forEach(s => { const side = new THREE.Mesh(new THREE.BoxGeometry(.3, 7.8, 1.5), M(THREE.MeshStandardMaterial, { color: '#2a2a2e', roughness: .5 }, .8)); side.position.set(s * 6.65, 3.9, .9); bdDoor.add(side); });
  const led = new THREE.Mesh(new THREE.BoxGeometry(.6, .3, .1), burnLedMat); led.position.set(BD.x + BD.w * .4, TABLE.top + .3 + BD.h * .8, BD.front + .06); burnGroup.add(led);
}
/* the music room: the hi-fi on the cabinet, the TV gone; the computer and its deck at the desk */
function musicStage(st) {
  const on = st === 'music'; hifiGroup.visible = on; burnGroup.visible = on;
  hifiGroup.position.set(CAB.x, CAB.h, CAB.front - 8);
  if (MUSIC.held) MUSIC.held.root.visible = on;
  SH.rowH = on ? 36 : 25;
  renderBag(); renderMini();
}
/* where a case waits while it plays: on the rug, left of the cabinet */
function musicRestPose(c, P, Q) {
  const D = c.dim, o = easeIO(c.openA), x = CAB.x - CAB.w / 2 + D.w / 2 + 4, z = CAB.front + 4 + D.h / 2, y = RUG.y * 2, yaw = .12;
  Q.copy(_rqY.setFromAxisAngle(YAX, yaw)).multiply(_rqF);
  P.set(x, y + D.d / 2, z).add(_rv.set(-D.w / 2 * o, 0, 0).applyQuaternion(Q));
}
/* ---------- the hi-fi as a machine: where each medium goes in ---------- */
const HFQ = { flat: new Q4().setFromEuler(new EU(-Math.PI / 2, 0, 0)), open: .55 };
function hfPlay(sec, fn) { return tweenReal(sec, fn, easeIO); }
const hifiAnim = { cover: 0, arm: 0, door: 0 };
function hfCoverTo(v, sec = .7) { const a = hifiAnim.cover; sfx.click(.5); return hfPlay(sec, t => { hifiAnim.cover = lerp(a, v, t); hfCover.rotation.x = -1.15 * hifiAnim.cover; }); }
function hfArmTo(v, sec = .9) { const a = hifiAnim.arm; return hfPlay(sec, t => { hifiAnim.arm = lerp(a, v, t); hfArm.rotation.y = lerp(hfArm.userData.rest, hfArm.userData.play, hifiAnim.arm); }); }
function hfDoorTo(v, sec = .4) { const a = hifiAnim.door; sfx.click(.6); return hfPlay(sec, t => { hifiAnim.door = lerp(a, v, t); hfDoor.rotation.x = HFQ.open * hifiAnim.door; }); }
function hfTrayTo(open) { const h = hfTray.userData.home, z0 = hfTray.position.z, z1 = h.z + (open ? 13.4 : 0); sfx.tray(); return hfPlay(.7, t => { hfTray.position.z = lerp(z0, z1, t); }); }
DEV.hifi = {
  name: 'hifi', group: hifiGroup, flaps: [], floppyLed: null,
  led(on) { hifiLedMat.color.set(on ? '#5dff8e' : '#2a1d10'); },
  reset() { hifiAnim.cover = hifiAnim.arm = hifiAnim.door = 0; hfCover.rotation.x = 0; hfArm.rotation.y = hfArm.userData.rest; hfDoor.rotation.x = 0; hfTray.position.copy(hfTray.userData.home); },
  port(m, c) {
    hifiGroup.updateMatrixWorld(true); const w = v => hifiGroup.localToWorld(v), rq = hifiGroup.getWorldQuaternion(new Q4());
    if (c && c.dim.vinyl) {
      /* onto the platter from above, under the lifted cover; it turns with the platter */
      const on = new V3(hfPlatter.position.x, HF.top + 1.0, hfPlatter.position.z);
      return {
        kind: 'socket', m: 'disc', q: rq.clone().multiply(HFQ.flat), s: 1, entry: w(on.clone().add(new V3(0, 14, 6))), inside: w(on.clone()), out: w(on.clone().add(new V3(0, 7, 0))),
        prepare() { hfCoverTo(1); },
        async seat(d) { sfx.thud(); hfPlatter.attach(d); await waitReal(.2); await hfArmTo(1); await waitReal(.15); await hfCoverTo(0, .55); },
        async unseat(d) { await hfCoverTo(1); await hfArmTo(0, .7); scene.attach(d); },
        after() { hfCoverTo(0, .55); },
        restore(d) { d.position.copy(w(on.clone())); hfPlatter.attach(d); hifiAnim.arm = 1; hfArm.rotation.y = hfArm.userData.play; }
      };
    }
    if (m === 'cass') {
      /* into the tilted door, standing on its edge, label to the front; the door swings shut with it */
      const doorQ = new Q4().setFromEuler(new EU(HFQ.open, 0, 0)), pocket = new V3(0, 4.2, .8).applyQuaternion(doorQ).add(hfDoor.position);
      return {
        kind: 'socket', m: 'cass', q: rq.clone().multiply(doorQ), s: 1, entry: w(pocket.clone().add(new V3(0, 9, 3))), inside: w(pocket.clone()), out: w(pocket.clone().add(new V3(0, 6, 3))),
        prepare() { hfDoorTo(1); },
        async seat(d) { sfx.slotIn(); hfDoor.attach(d); await waitReal(.15); await hfDoorTo(0); },
        async unseat(d) { await hfDoorTo(1); scene.attach(d); },
        after() { hfDoorTo(0); },
        restore(d) { hfDoor.rotation.x = HFQ.open; d.position.copy(w(pocket.clone())); hfDoor.attach(d); hfDoor.rotation.x = 0; }
      };
    }
    /* a CD rides the tray in */
    const h = hfTray.userData.home, onTray = new V3(h.x, h.y + .45, h.z + 13.4);
    return {
      kind: 'socket', m: 'disc', q: rq.clone().multiply(HFQ.flat), s: 1, entry: w(onTray.clone().add(new V3(0, 8, 0))), inside: w(onTray.clone()), out: w(onTray.clone().add(new V3(0, 4, 0))),
      prepare() { hfTrayTo(true); },
      async seat(d) { sfx.thud(); await waitReal(.2); hfTray.attach(d); await hfTrayTo(false); },
      async unseat(d) { await hfTrayTo(true); scene.attach(d); },
      after() { hfTrayTo(false); },
      restore(d) { d.position.copy(w(new V3(h.x, h.y + .45, h.z))); hfTray.attach(d); }
    };
  },
  /* side B: the record is lifted and turned over, the tape taken out and put back the other way round */
  async flip(medium) {
    const c = MUSIC.held, d = c && c.disc; if (!d) return;
    if (medium === 'vinyl') {
      await hfArmTo(0, .6); await hfCoverTo(1, .55);
      const y0 = d.position.y, q0 = d.quaternion.clone(), q1 = q0.clone().multiply(new Q4().setFromAxisAngle(X_AXIS, Math.PI));
      await hfPlay(.45, t => { d.position.y = y0 + 9 * t; }); await hfPlay(.6, t => { d.quaternion.copy(q0).slerp(q1, t); }); await hfPlay(.4, t => { d.position.y = y0 + 9 * (1 - t); });
      sfx.thud(); await hfArmTo(1, .7); await hfCoverTo(0, .5);
    } else if (medium === 'cass') {
      await hfDoorTo(1); const y0 = d.position.y, q0 = d.quaternion.clone(), q1 = q0.clone().multiply(new Q4().setFromAxisAngle(new V3(0, 1, 0), Math.PI));
      await hfPlay(.35, t => { d.position.y = y0 + 7 * t; }); await hfPlay(.5, t => { d.quaternion.copy(q0).slerp(q1, t); }); await hfPlay(.35, t => { d.position.y = y0 + 7 * (1 - t); });
      sfx.slotIn(); await hfDoorTo(0);
    }
  },
  /* a button goes in when it is used, from the screen or with the mouse on the hi-fi */
  press(a) { const b = hfButtons.find(o => o.userData.hifiBtn === a); if (!b) return; sfx.click(.5); hfPlay(.08, t => { b.position.z = b.userData.z0 - .25 * t; }).then(() => hfPlay(.12, t => { b.position.z = b.userData.z0 - .25 * (1 - t); })); },
  tick(dt, now) {
    if (!hifiGroup.visible) return;
    const playing = MPLAY.state === 'playing', med = MPLAY.medium();
    if (playing && med === 'vinyl') hfPlatter.rotation.y -= dt * (33.33 / 60) * Math.PI * 2;
    const reels = MUSIC.held && MUSIC.held.disc && MUSIC.held.disc.userData.reels;
    if (playing && med === 'cass' && reels) reels.forEach(rl => { rl.rotation.z -= dt * 2.4; });
    const lv = MPLAY.level(now); hfCones.forEach(c => { c.position.z = c.userData.z0 + lv * (c.userData.R > 4 ? .45 : .15); });
    hfKnob.rotation.z = -(prefs.mvol / 100 - .5) * 4.2;
    drawHifiDisplay(now);
  },
  bounds() { return new THREE.Box3().setFromObject(hifiGroup); }
};
/* the display: what plays, the song number and its time, the source and the volume */
function drawHifiDisplay(now) {
  const t = MPLAY.cur, key = [MPLAY.state, MPLAY.i, Math.floor(MPLAY.time()), prefs.mvol, MPLAY.side, Math.floor(now / 350)].join('|');
  if (key === MPLAY.drawn) return; MPLAY.drawn = key;
  const x = hifiDispC.getContext('2d'), W = 512, H = 128;
  x.fillStyle = '#06100a'; x.fillRect(0, 0, W, H);
  const ink = '#7dffb0', dim = 'rgba(125,255,176,.22)';
  x.fillStyle = dim; x.font = `700 46px ${F.mono}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('88 88:88', 14, 44);
  if (MPLAY.state === 'off') { x.fillStyle = ink; x.font = `700 30px ${F.mono}`; x.textAlign = 'center'; x.fillText(T('SIN DISCO'), W / 2, 64); hifiDispTex.needsUpdate = true; return; }
  x.fillStyle = ink; x.fillText(`${String(MPLAY.i + 1).padStart(2, '0')} ${MPLAY.state === 'stopped' ? '--:--' : clockS(MPLAY.time()).padStart(5, '0')}`, 14, 44);
  x.font = `700 18px ${F.mono}`; x.textAlign = 'right';
  x.fillText({ vinyl: 'PHONO', cass: 'TAPE', cd: 'CD' }[MPLAY.medium()] + (prefs.flip === 'on' && MPLAY.flipAt > 0 && MPLAY.medium() !== 'cd' ? (MPLAY.side ? ' · B' : ' · A') : ''), W - 14, 26);
  x.fillText(MPLAY.state === 'playing' ? '▶' : MPLAY.state === 'paused' ? '❚❚' : '■', W - 14, 56);
  /* the title scrolls when it does not fit */
  const s = t ? `${t.t}  ·  ${t.artist || ''}` : MPLAY.c ? MPLAY.c.g.t : '';
  x.font = `700 22px ${F.mono}`; x.textAlign = 'left'; const tw = x.measureText(s).width;
  x.save(); x.beginPath(); x.rect(14, 82, W - 150, 34); x.clip(); x.fillText(s, tw > W - 160 ? 14 - ((now * .05) % (tw + 60)) : 14, 100); if (tw > W - 160) x.fillText(s, 14 - ((now * .05) % (tw + 60)) + tw + 60, 100); x.restore();
  for (let i = 0; i < 10; i++) { x.fillStyle = i < Math.round(prefs.mvol / 10) ? ink : dim; x.fillRect(W - 130 + i * 12, 104 - i * 1.6, 8, 8 + i * 1.6); }
  hifiDispTex.needsUpdate = true;
}
/* ---------- burning: the PC's tray takes a CD-R, the deck takes a blank tape ---------- */
function burner(fmt) {
  if (fmt === 'cd') {
    const h = pcTray.userData.home, on = new V3(h.x, h.y + .45, h.z + pcTray.userData.out - .4);
    return {
      q: HFQ.flat.clone(), entry: on.clone().add(new V3(0, 10, 4)), inside: on.clone(),
      open: () => trayTo(true), take: async d => { sfx.thud(); await waitReal(.2); pcTray.attach(d); await trayTo(false); },
      give: async d => { await trayTo(true); scene.attach(d); await tweenReal(.4, t => { d.position.y = on.y + 6 * t; }, easeOut); },
      close: () => trayTo(false), led: on2 => { pcHddMat.color.set(on2 ? '#ffb02e' : '#3a2a14'); pcLedMat.color.set(on2 ? '#5dff6e' : '#2a3a24'); }
    };
  }
  const doorQ = new Q4().setFromEuler(new EU(HFQ.open, 0, 0)), pocket = new V3(0, 4, .8).applyQuaternion(doorQ).add(bdDoor.position);
  const doorTo = v => { const a = bdDoor.rotation.x / HFQ.open; sfx.click(.6); return hfPlay(.4, t => { bdDoor.rotation.x = HFQ.open * lerp(a, v, t); }); };
  return {
    q: doorQ.clone(), entry: pocket.clone().add(new V3(0, 9, 3)), inside: pocket.clone(),
    open: () => doorTo(1), take: async d => { sfx.slotIn(); bdDoor.attach(d); await doorTo(0); },
    give: async d => { await doorTo(1); scene.attach(d); await tweenReal(.4, t => { d.position.y = pocket.y + 6 * t; }, easeOut); },
    close: () => doorTo(0), led: on2 => burnLedMat.color.set(on2 ? '#ff3b2e' : '#2a1d10')
  };
}
/* the hi-fi's own buttons, with the mouse */
function hifiHit() { ndc.set(pointer.x, pointer.y); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(hfButtons, false)[0]; return h ? h.object.userData.hifiBtn : null; }
