/* =====================================================================
   THE MACHINES: one for each kind of media, all our own designs.
   The one the game in your hands needs slides onto the table.
   Each is built in its own frame: x across, y up from the table top,
   z = 0 at its front face. The pad rides with whichever is out.
   ===================================================================== */
const DEV = {};
let devKind = 'disc', devSwap = null;
/* where the media goes in, in the room (kept up to date for the machine on the table) */
const SLOT = new V3();
const QUP = new Q4();

function deviceGroup() { const g = new THREE.Group(); g.position.set(CON.x, TABLE.top, CON.zFront); g.visible = false; scene.add(g); return g; }
function deviceFeet(group, w, d, mat, inset = 4) { [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => addBox(3, .5, 3, mat, sx * (w / 2 - inset), .25, -d / 2 + sz * (d / 2 - inset), group)); }
function ledBox(group, x, y, z, w = 1.1, h = .4) { const m = new THREE.MeshBasicMaterial({ color: '#2a1a12', toneMapped: false }); addBox(w, h, .2, m, x, y, z, group).castShadow = false; return m; }
const footMat = M(THREE.MeshStandardMaterial, { color: '#0c0c0e', roughness: .8 }, .5);

/* ---------- disc: "ID-2", a black slab with a slot-loading drive ---------- */
{
  const g = deviceGroup(), W = 44, H = 8.4, D = 30, y0 = .6;
  const mat = M(THREE.MeshPhysicalMaterial, { color: '#141518', roughness: .5, metalness: .05, clearcoat: .35, clearcoatRoughness: .4 }, .9);
  const fc = mkCanvas(880, 168), x = fc.getContext('2d');
  x.fillStyle = lg(x, 0, 0, 0, 168, [[0, '#1a1b1f'], [.5, '#141518'], [1, '#101114']]); x.fillRect(0, 0, 880, 168);
  x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(0, 104, 880, 2); x.fillStyle = 'rgba(0,0,0,.4)'; x.fillRect(0, 106, 880, 2);
  x.fillStyle = '#030304'; rr(x, 60, 44, 440, 15, 7.5); x.fill();
  x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(66, 61, 428, 2); x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(64, 41, 432, 3);
  x.fillStyle = '#6d7078'; x.beginPath(); x.moveTo(528, 58); x.lineTo(538, 46); x.lineTo(548, 58); x.closePath(); x.fill(); x.fillRect(528, 61, 20, 3);
  x.fillStyle = '#0a0a0c'; x.beginPath(); x.arc(610, 52, 13, 0, 7); x.fill(); x.strokeStyle = 'rgba(255,255,255,.12)'; x.lineWidth = 2; x.beginPath(); x.arc(610, 52, 13, 0, 7); x.stroke();
  x.strokeStyle = '#7d8088'; x.lineWidth = 2.4; x.beginPath(); x.arc(610, 53, 6, -1.1, 4.25); x.stroke(); x.beginPath(); x.moveTo(610, 44); x.lineTo(610, 52); x.stroke();
  x.fillStyle = '#0a0a0c'; rr(x, 640, 46, 26, 12, 6); x.fill();
  [[700, 120], [790, 120]].forEach(([px, py]) => { x.fillStyle = '#060607'; rr(x, px, py, 66, 28, 5); x.fill(); x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(px + 8, py + 10, 50, 3); });
  x.fillStyle = '#5c5f66'; x.font = `800 22px ${F.saira}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('MYV', 60, 132); x.font = `700 13px ${F.mono}`; x.fillText('ID-2', 112, 133);
  const body = new THREE.Mesh(slabGeometry(W, H, D, .6, .4), [M(THREE.MeshStandardMaterial, { map: tex(fc), roughness: .5 }, .9), mat, mat]); body.position.set(0, y0 + H / 2, -D / 2); body.castShadow = body.receiveShadow = true; g.add(body);
  const vc = mkCanvas(440, 300), vx = vc.getContext('2d'); for (let i = 0; i < 18; i++) { vx.fillStyle = 'rgba(0,0,0,.6)'; rr(vx, 250, 24 + i * 14, 160, 5, 2.5); vx.fill(); vx.fillStyle = 'rgba(255,255,255,.04)'; vx.fillRect(252, 30 + i * 14, 156, 1); }
  const vent = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: tex(vc), transparent: true, depthWrite: false, roughness: .6 })); vent.rotation.x = -Math.PI / 2; vent.position.set(0, y0 + H + .02, -D / 2); g.add(vent);
  deviceFeet(g, W, D, footMat);
  const led = ledBox(g, 4.6, y0 + H - 2.6, .12);
  DEV.disc = {
    kind: 'disc', group: g, w: W, slot: new V3(-W / 2 + 14, y0 + H - 2.6, .05), pad: { pos: new V3(-5, y0 + H, -14), ry: -.42 },
    led(on) { led.color.set(on ? '#4dff88' : '#ff9b3a'); }
  };
}

/* ---------- floppy: a beige desktop computer with a 3½-inch drive ---------- */
{
  const g = deviceGroup(), W = 44, H = 13, D = 32, y0 = .5, k = 20;
  const beige = M(THREE.MeshPhysicalMaterial, { color: '#d6cfbb', roughness: .62, clearcoat: .1, clearcoatRoughness: .6 }, .7);
  const fc = mkCanvas(W * k, H * k), x = fc.getContext('2d'), cx = v => (v + W / 2) * k, cy = v => (H - v) * k;
  x.fillStyle = lg(x, 0, 0, 0, H * k, [[0, '#ddd6c3'], [.5, '#d4ccb7'], [1, '#c7bfaa']]); x.fillRect(0, 0, W * k, H * k);
  const r = rng(486); for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '90,80,60'},${r() * .05})`; x.fillRect(r() * W * k, r() * H * k, 2, 2); }
  const bay = (x0, y0b, w, h, col) => { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(cx(x0) - 2, cy(y0b + h) - 2, w * k + 4, h * k + 4); x.fillStyle = col; x.fillRect(cx(x0), cy(y0b + h), w * k, h * k); x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(cx(x0), cy(y0b + h), w * k, 2); };
  /* two 5¼-inch bays: a CD drive and a blank */
  bay(-20, 8.2, 14.6, 4.2, '#cfc7b1'); x.fillStyle = '#2a2824'; x.fillRect(cx(-19.4), cy(10.75), 13.4 * k, 4); x.fillStyle = '#bdb49d'; rr(x, cx(-8.2), cy(9.3), 1.6 * k, .55 * k, 4); x.fill(); x.fillStyle = '#5b5446'; x.fillRect(cx(-18.6), cy(9.2), 10, 5);
  x.fillStyle = '#6b6352'; x.font = `700 ${Math.round(.42 * k)}px ${F.mono}`; x.textBaseline = 'middle'; x.fillText('CD-ROM 4X', cx(-18.6), cy(11.8));
  bay(-20, 3.6, 14.6, 4.2, '#cdc5af');
  /* the 3½-inch drive */
  bay(-3.8, 8.9, 10.8, 2.9, '#c9c1ab');
  x.fillStyle = '#0d0c0b'; rr(x, cx(1.6 - 4.75), cy(10.6 + .3), 9.5 * k, .6 * k, 5); x.fill();
  x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(cx(1.6 - 4.6), cy(10.6 - .32), 9.2 * k, 2);
  x.fillStyle = '#6b6352'; x.font = `700 ${Math.round(.34 * k)}px ${F.mono}`; x.fillText('1.44 MB', cx(-3.2), cy(9.4));
  /* speed display, lights, buttons */
  x.fillStyle = '#1a0606'; rr(x, cx(10), cy(11.8), 5 * k, 2.6 * k, 6); x.fill();
  x.fillStyle = '#ff3b2a'; x.font = `800 ${Math.round(2.1 * k)}px ${F.mono}`; x.textAlign = 'center'; x.fillText('66', cx(12.5), cy(10.45)); x.textAlign = 'left';
  x.fillStyle = '#6b6352'; x.font = `700 ${Math.round(.36 * k)}px ${F.mono}`; x.fillText('POWER', cx(16.2), cy(9.6)); x.fillText('HDD', cx(18.8), cy(9.6)); x.fillText('TURBO', cx(10.4), cy(6.9)); x.fillText('RESET', cx(12.6), cy(6.9));
  for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(40,34,24,.55)'; rr(x, cx(-19 + i * 2.1), cy(2.5), 1.2 * k, 1.4 * k, 6); x.fill(); }
  x.fillStyle = '#5a5244'; x.font = `800 ${Math.round(.8 * k)}px ${F.saira}`; x.fillText('MYV', cx(-3.6), cy(5.6)); x.font = `700 ${Math.round(.42 * k)}px ${F.mono}`; x.fillText('4·86 DX2', cx(-1.4), cy(5.55));
  const body = new THREE.Mesh(slabGeometry(W, H, D, .5, .35), [M(THREE.MeshStandardMaterial, { map: tex(fc), roughness: .6 }, .7), beige, beige]); body.position.set(0, y0 + H / 2, -D / 2); body.castShadow = body.receiveShadow = true; g.add(body);
  /* the case lid's seam and a few vents on top */
  addBox(W - 1, .12, .2, M(THREE.MeshStandardMaterial, { color: '#a99f88', roughness: .7 }, .5), 0, y0 + H - .6, .02, g).castShadow = false;
  const btnMat = M(THREE.MeshStandardMaterial, { color: '#c4bba4', roughness: .55 }, .6);
  addBox(4, 3.4, .5, btnMat, 17.5, y0 + 5.4, .2, g); addBox(1.6, .9, .35, btnMat, 11.6, y0 + 5.6, .15, g); addBox(1.6, .9, .35, btnMat, 13.8, y0 + 5.6, .15, g);
  const eject = addBox(1.5, .45, .3, btnMat, 5.5, y0 + 9.5, .12, g);
  const act = ledBox(g, -2.6, y0 + 9.5, .1, .5, .3), power = ledBox(g, 16.9, y0 + 10.4, .1, .5, .3), hdd = ledBox(g, 19.3, y0 + 10.4, .1, .5, .3);
  deviceFeet(g, W, D, footMat);
  DEV.floppy = {
    kind: 'floppy', group: g, w: W, slot: new V3(1.6, y0 + 10.6, .05), pad: { pos: new V3(-8, y0 + H, -15), ry: -.3 },
    led(on) { power.color.set(on ? '#47ff7a' : '#1b2a1d'); hdd.color.set('#2a1a10'); },
    activity(on) { act.color.set(on ? '#47ff7a' : '#1b2a1d'); hdd.color.set(on ? '#ffb23a' : '#2a1a10'); },
    eject(out) { const z0 = eject.position.z, z1 = out ? .4 : .12; return tween(.12, t => { eject.position.z = lerp(z0, z1, t); }); }
  };
  DEV.floppy.led(false); DEV.floppy.activity(false);
}

/* ---------- cartridge: "CX-16", a low console with a slot on top ---------- */
{
  const g = deviceGroup(), W = 34, H = 6.2, D = 24, y0 = .5, k = 20;
  const shell = M(THREE.MeshPhysicalMaterial, { color: '#c3bfb6', roughness: .55, clearcoat: .15, clearcoatRoughness: .5 }, .7);
  const dark = M(THREE.MeshPhysicalMaterial, { color: '#2a2b30', roughness: .5, clearcoat: .2, clearcoatRoughness: .4 }, .8);
  const fc = mkCanvas(W * k, H * k), x = fc.getContext('2d');
  x.fillStyle = lg(x, 0, 0, 0, H * k, [[0, '#bdb9af'], [1, '#aaa69c']]); x.fillRect(0, 0, W * k, H * k);
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 1.2 * k, W * k, 3);
  [[-11, 'I'], [-4, 'II']].forEach(([px, lab]) => { x.fillStyle = '#3a3b40'; rr(x, (px + W / 2) * k, 2.4 * k, 5 * k, 2.3 * k, 10); x.fill(); x.fillStyle = '#18181b'; rr(x, (px + W / 2 + .7) * k, 2.9 * k, 3.6 * k, 1.3 * k, 6); x.fill(); x.fillStyle = '#5a5a60'; x.font = `700 ${Math.round(.5 * k)}px ${F.mono}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(lab, (px + W / 2 + 2.5) * k, 5.3 * k); });
  x.fillStyle = '#4a4b52'; x.font = `800 ${Math.round(1.1 * k)}px ${F.saira}`; x.textAlign = 'left'; x.fillText('MYV', (6 + W / 2) * k, 3.8 * k); x.font = `700 ${Math.round(.55 * k)}px ${F.mono}`; x.fillText('CX-16', (9.2 + W / 2) * k, 3.85 * k);
  const body = new THREE.Mesh(slabGeometry(W, H, D, 1.4, .6), [M(THREE.MeshStandardMaterial, { map: tex(fc), roughness: .55 }, .7), shell, shell]); body.position.set(0, y0 + H / 2, -D / 2); body.castShadow = body.receiveShadow = true; g.add(body);
  /* the slot housing, its opening, and the controls beside it */
  const top = y0 + H, HZ = -13.5, HH = 2.6;
  const housing = new THREE.Mesh(slabGeometry(16, 7.2, HH, .8, .3), dark); housing.rotation.x = -Math.PI / 2; housing.position.set(0, top + HH / 2, HZ); housing.castShadow = housing.receiveShadow = true; g.add(housing);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 2.5), new THREE.MeshBasicMaterial({ color: '#030303' })); hole.rotation.x = -Math.PI / 2; hole.position.set(0, top + HH + .015, HZ); g.add(hole);
  [-1, 1].forEach(s => { const lip = addBox(12.6, .12, .5, dark, 0, top + HH + .04, HZ + s * 1.4, g); lip.castShadow = false; });
  const dc = mkCanvas(512, 128), dx = dc.getContext('2d'); dx.fillStyle = '#9c988f'; dx.font = `700 26px ${F.mono}`; dx.textAlign = 'center'; dx.textBaseline = 'middle'; dx.fillText('POWER', 90, 100); dx.fillText('RESET', 422, 100); dx.font = `700 18px ${F.mono}`; dx.fillText('OFF   ON', 90, 22);
  const decal = new THREE.Mesh(new THREE.PlaneGeometry(30, 7.5), new THREE.MeshBasicMaterial({ map: tex(dc), transparent: true, depthWrite: false })); decal.rotation.x = -Math.PI / 2; decal.position.set(0, top + .02, HZ + .3); g.add(decal);
  addBox(1.4, .1, 4.2, new THREE.MeshBasicMaterial({ color: '#141416' }), -11.7, top + .03, HZ, g).castShadow = false;
  const knob = addBox(2.2, .9, 1.4, dark, -11.7, top + .45, HZ - 1.2, g);
  addBox(2.2, .8, 1.6, dark, 11.7, top + .4, HZ, g);
  const led = ledBox(g, -14, y0 + H - .9, .1, .7, .35);
  deviceFeet(g, W, D, footMat, 3.5);
  DEV.cart = {
    kind: 'cart', group: g, w: W, slot: new V3(0, top + HH, HZ), pad: { pos: new V3(27, 0, -5), ry: -.62 },
    led(on) { led.color.set(on ? '#ff3d2e' : '#2a1210'); },
    power(on) { const z0 = knob.position.z, z1 = HZ + (on ? 1.2 : -1.2); return tween(.16, t => { knob.position.z = lerp(z0, z1, t); }, easeOut); }
  };
  DEV.cart.led(false);
}

function slotWorld(dev, out = SLOT) { dev.group.updateMatrixWorld(true); return out.copy(dev.slot).applyMatrix4(dev.group.matrixWorld); }
function mountPad(dev) { dev.group.add(pad); pad.position.copy(dev.pad.pos); pad.rotation.set(0, dev.pad.ry, 0); }
function showDevice(kind) {
  for (const d of Object.values(DEV)) { d.group.visible = d.kind === kind; d.group.position.x = CON.x; }
  devKind = kind; mountPad(DEV[kind]); slotWorld(DEV[kind]);
}
/* the machine on the table is swapped for the one this media needs: the old one slides off to the right, the new one in */
async function ensureDevice(kind, instant) {
  if (!DEV[kind]) kind = 'disc';
  while (devSwap) await devSwap;
  if (devKind === kind) return DEV[kind];
  const from = DEV[devKind], to = DEV[kind], off = 130;
  devSwap = (async () => {
    if (instant || RM) { showDevice(kind); return; }
    sfx.machine();
    await tween(.5, t => { from.group.position.x = CON.x + off * t; }, t => t * t);
    from.group.visible = false; from.group.position.x = CON.x;
    to.group.position.x = CON.x + off; to.group.visible = true; mountPad(to);
    sfx.machine();
    await tween(.75, t => { to.group.position.x = CON.x + off * (1 - t); }, easeOut);
    devKind = kind; slotWorld(to);
  })();
  try { await devSwap; } finally { devSwap = null; }
  return DEV[kind];
}
showDevice('disc');
