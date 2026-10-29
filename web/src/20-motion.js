
/* =====================================================================
   MOTION HELPERS
   ===================================================================== */
const tweens = [];
function tween(dur, fn, ease = easeIO) { return new Promise(res => tweens.push({ t0: performance.now(), dur: Math.max(1, dur * 1000 * SPEED), fn, ease, res })); }
function runTweens(now) { for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i], t = clamp((now - tw.t0) / tw.dur, 0, 1); tw.fn(tw.ease(t)); if (t >= 1) { tweens.splice(i, 1); tw.res(); } } }
const wait = ms => new Promise(r => setTimeout(r, ms * SPEED));
/* hand-keyed motion smoothed with monotone cubic splines (the way Ann Nguyen's cd-case moves) */
function keyCurve(frames) {
  const n = frames.length, ts = frames.map(f => f[0]), vs = frames.map(f => f[1]), d = [], m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]));
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return t => {
    if (t <= ts[0]) return vs[0]; if (t >= ts[n - 1]) return vs[n - 1];
    let i = 0; while (t > ts[i + 1]) i++;
    const h = ts[i + 1] - ts[i], u = (t - ts[i]) / h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}
/* opening: the case turns once round while the lid swings and the two halves spread; closing: the lid lands with a small bounce */
/* the lid comes to rest flat, as the rest of the shelf expects; the curve overshoots a little first */
const LID_OPEN = Math.PI, OPEN_T = 2.3, CLOSE_T = 1.95;
const OPEN_K = {
  yaw: keyCurve([[0, 0], [.55, .3], [1, .85], [1.2, 2], [1.41, 3.4], [1.63, 4.9], [1.85, 6.05], [2.05, 6.36], [2.3, 2 * Math.PI]]),
  lid: keyCurve([[0, 0], [.97, 0], [1.2, .45], [1.41, 1.35], [1.63, 2.3], [1.85, 2.98], [2.05, 3.22], [2.3, LID_OPEN]]),
  spread: keyCurve([[0, 0], [1.12, 0], [1.9, .9], [2.3, 1]]),
  pitch: keyCurve([[0, 0], [1.35, 0], [2.3, -.1]])
};
const CLOSE_K = {
  lid: keyCurve([[0, LID_OPEN], [.22, 1.75], [.48, 1.55], [1.05, 1.08], [1.42, .6], [1.6, .26], [1.7, 0], [1.78, .07], [1.88, 0]]),
  spread: keyCurve([[0, 1], [.3, .92], [1.2, .55], [1.72, 0]]),
  yaw: keyCurve([[0, 0], [.5, .2], [1.3, .12], [1.88, 0]]),
  pitch: keyCurve([[0, -.1], [1.6, -.05], [1.7, .035], [1.82, -.01], [1.95, 0]]),
  roll: keyCurve([[0, 0], [.8, -.05], [1.95, 0]])
};
/* runs one of those timelines on a case; the case reads c.motion every frame */
function playMotion(c, K, T, noSpin) {
  return tween(T, t => { const q = t * T; c.motion = { lid: K.lid(q), spread: K.spread(q), yaw: K.yaw && !noSpin ? K.yaw(q) : 0, pitch: K.pitch ? K.pitch(q) : 0, roll: K.roll ? K.roll(q) : 0 }; }, t => t).then(() => { c.motion = null; });
}
function bez(a, b, c, t, out) { const u = 1 - t; return out.set(u * u * a.x + 2 * u * t * b.x + t * t * c.x, u * u * a.y + 2 * u * t * b.y + t * t * c.y, u * u * a.z + 2 * u * t * b.z + t * t * c.z); }

/* ---------- camera: the whole wall, a closer look along the shelf, or the console ---------- */
const cam = { pos: new V3(), look: new V3(), tPos: new V3(), tLook: new V3(), view: 'shelf', par: { x: 0, y: 0 }, browseX: 0 };
function viewPose(name, outPos, outLook) {
  const narrow = camera.aspect < .95; let box, dir;
  if (name === 'roulette') {
    /* the casino corner: the wheel from above, the way you lean over a table */
    outLook.set(RL.x, RL.top + 6, RL.z + 4); dir = new V3(0, 1.2, 1).normalize();
    outPos.copy(outLook).addScaledVector(dir, narrow ? fitDist(110, 160) : fitDist(176, 116)); return;
  }
  const sb = typeof stageBox === 'function' ? stageBox(name) : null;
  if (sb) { sb.dir.normalize(); outLook.set(sb.box.cx, sb.box.cy, sb.box.cz ?? 0); outPos.copy(outLook).addScaledVector(sb.dir, fitDist(sb.box.w, sb.box.h)); return; }
  if (isCases() && (name === 'shelf' || name === 'browse')) {
    /* the earlier design: the camera stands in front of one bookcase */
    const u = units[curGroup], H = u ? u.H : 80;
    box = { cx: u ? u.x : SH.x0, cy: H / 2 + 11 + (narrow ? 6 : 0), w: narrow ? 46 : 62, h: Math.max(H + 38, 64) }; dir = new V3(0, .17, 1);
    dir.normalize(); outLook.set(box.cx, box.cy, 2); outPos.copy(outLook).addScaledVector(dir, fitDist(box.w, box.h)); return;
  }
  if (name === 'browse') {
    const x = clamp(cam.browseX, SHELF.x0 + 30, SHELF.x1 - 30);
    box = { cx: x, cy: SHELF.board + 11, w: narrow ? 46 : 82, h: 40 }; dir = new V3(0, .06, 1);
  } else if (name === 'console') {
    /* the TV, the console and the case resting beside it */
    box = narrow ? { cx: CON.x + 8, cy: TABLE.top + 22, w: 104, h: 120 } : { cx: (TV.x + CON.x) / 2 + 14, cy: TABLE.top + 26, w: 168, h: 74 }; dir = new V3(-.06, .2, 1);
  } else {
    /* the reference shot: shelf at the top, table and its things below, a little from above */
    box = narrow ? { cx: SHELF.cx, cy: 108, w: 200, h: 130 } : { cx: SHELF.cx, cy: 108, w: 232, h: 122 }; dir = new V3(0, .14, 1);
  }
  dir.normalize(); outLook.set(box.cx, box.cy, 0); outPos.copy(outLook).addScaledVector(dir, fitDist(box.w, box.h));
}
function setView(n) { cam.view = n; viewPose(n, cam.tPos, cam.tLook); renderInfo(); }
function updateCamera(dt) {
  const a = 1 - Math.exp(-3.2 * dt / SPEED); cam.pos.lerp(cam.tPos, a); cam.look.lerp(cam.tLook, a);
  const wantPar = mode === 'shelf' && !RM && pointer.type === 'mouse' && cam.view === 'shelf';
  cam.par.x += ((wantPar ? pointer.x * 5 : 0) - cam.par.x) * (1 - Math.exp(-3 * dt));
  cam.par.y += ((wantPar ? pointer.y * 3 : 0) - cam.par.y) * (1 - Math.exp(-3 * dt));
  camera.position.copy(cam.pos); camera.position.x += cam.par.x; camera.position.y += cam.par.y; camera.lookAt(cam.look);
  /* with the bookcases the ceiling light follows you along the room; over the wall shelf it stays put */
  const k = cam.snap ? 1 : 1 - Math.exp(-2.5 * dt / SPEED); cam.snap = false;
  /* the cinema light follows you into every room that is not the desk, always from the upper left */
  const roam = cam.view === 'roulette' || isCases() || STAGE.name === 'tv' || (LP.keyOff && (STAGE.name === 'video' || STAGE.name === 'music'));
  if (roam) { _kl.set(cam.look.x, Math.min(cam.look.y, 70), -4); key.target.position.lerp(_kl, k); _kp.copy(key.target.position).add(LP.keyOff ? _KOFF2.fromArray(LP.keyOff) : _KOFF); key.position.lerp(_kp, k); }
  else { key.target.position.lerp(KEY_AIM, k); key.position.lerp(KEY_POS, k); }
  key.target.updateMatrixWorld();
  const follow = roam;
  if (typeof shelfFill !== 'undefined') shelfFill.forEach((l, i) => { _kl.set(follow ? cam.look.x + (i ? 22 : -22) : SHELF.cx + (i ? 55 : -60), follow ? cam.look.y + 6 : SHELF.board + 26, follow ? 70 : SHELF.front + 75); l.position.lerp(_kl, k); });
}
const _kl = new V3(), _kp = new V3(), _KOFF = new V3(66, 222, 236), _KOFF2 = new V3();

/* ---------- hover zoom: the view closes in on the game under the mouse or the pad's focus ----------
   A lens, not a camera move: only part of the picture is drawn, larger. The point under the mouse stays
   under the mouse at every zoom, so what you point at never slips away while it closes in. */
const lens = { k: 0, want: 0, since: 0, lost: 0, px: .5, py: .5, sx: .5, sy: .5, hitT: 0, manual: 1, base: 1 };
const LENS_Z = { soft: 1.3, on: 1.6, big: 2.4 }, _lv = new V3();
/* the zoom kept on the shelf whatever you point at: the closer view, times what the wheel has added */
function lensBaseWant() { return mode === 'shelf' ? (prefs.near === 'on' ? 1.7 : 1) * lens.manual : 1; }
/* how much is magnified right now: the hover zoom or the kept one, whichever is more */
function lensZoomNow() { return Math.min(4.5, Math.max(1 + ((LENS_Z[prefs.zoom] || LENS_Z.on) - 1) * lens.k, lens.base)); }
/* the wheel (or + and -): a zoom that stays until you take it back */
function zoomBy(f) { lens.manual = clamp(lens.manual * f, 1, 3.2); if (lens.manual < 1.03 && f < 1) lens.manual = 1; }
/* px/py: the point of the full picture to show (0-1 across and down); sx/sy: where on screen it goes */
function lensApply() {
  const W = innerWidth, H = innerHeight, Z = lensZoomNow();
  if (Z < 1.001) { if (camera.view && camera.view.enabled) camera.clearViewOffset(); return; }
  const w = W / Z, h = H / Z;
  camera.setViewOffset(W, H, clamp(lens.px * W - lens.sx * w, 0, W - w), clamp(lens.py * H - lens.sy * h, 0, H - h), w, h);
}
/* with the mouse, the point under it; with the pad, the case in focus, drawn a little towards the middle.
   Without dt it jumps straight there (the mouse moving); with dt it glides (the pad, or the mouse taking over from it) */
function lensAim(dt) {
  let tx, ty, sx, sy;
  if (!kbNav) { if (!pointer.live) return; tx = sx = clamp((pointer.x + 1) / 2, 0, 1); ty = sy = clamp((1 - pointer.y) / 2, 0, 1); }
  else {
    if (!hovered || hovered.disposed) return;
    camera.clearViewOffset(); camera.updateMatrixWorld(); spineWorld(hovered, _lv).project(camera);
    tx = clamp((_lv.x + 1) / 2, 0, 1); ty = clamp((1 - _lv.y) / 2, 0, 1); sx = lerp(tx, .5, .35); sy = lerp(ty, .5, .35);
  }
  const a = dt == null || RM ? 1 : 1 - Math.exp(-(kbNav ? 7 : 14) * dt / SPEED);
  lens.px += (tx - lens.px) * a; lens.py += (ty - lens.py) * a; lens.sx += (sx - lens.sx) * a; lens.sy += (sy - lens.sy) * a;
}
function updateLens(dt, now) {
  const can = prefs.zoom !== 'off' && mode === 'shelf' && !busy;
  /* the pad already walks the camera up to the desk shelf and the TV cabinet: no lens on top of that */
  const over = can && hovered && !hovered.disposed && (kbNav ? !(cam.view === 'browse' && !isCases()) : pointer.type === 'mouse');
  /* a short wait before closing in, so crossing the shelf on the way elsewhere does not zoom,
     and a little longer before letting go, so the gaps between spines do not either */
  if (over) { lens.lost = 0; if (!lens.since) lens.since = now; if (now - lens.since > 160 * SPEED) lens.want = 1; }
  else { lens.since = 0; if (!lens.lost) lens.lost = now; if (!can || now - lens.lost > 380 * SPEED) lens.want = 0; }
  if (RM) lens.k = lens.want;
  else { lens.k += (lens.want - lens.k) * (1 - Math.exp(-(lens.want ? 5 : 8) * dt / SPEED)); if (!lens.want && lens.k < .002) lens.k = 0; }
  lens.base = RM ? lensBaseWant() : lens.base + (lensBaseWant() - lens.base) * (1 - Math.exp(-6 * dt / SPEED)); if (Math.abs(lens.base - 1) < .002 && lensBaseWant() === 1) lens.base = 1;
  /* out of the zoom it simply waits where it will be needed */
  lensAim(lensZoomNow() > 1.001 ? dt : undefined);
  lensApply();
}
function updateRowLights() { }

/* ---------- dust particles: puffs and ambient motes in the light ---------- */
const PN = 260, pPos = new Float32Array(PN * 3).fill(-9999), pVel = new Float32Array(PN * 3), pLife = new Float32Array(PN);
const pGeo = new THREE.BufferGeometry(); pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
const pMat = new THREE.PointsMaterial({ color: '#efe3cc', size: .5, transparent: true, opacity: .9, depthWrite: false });
const dustPts = new THREE.Points(pGeo, pMat); dustPts.frustumCulled = false; scene.add(dustPts);
let pCursor = 0;
function emit(p, n, spread = 1, up = 1) { for (let k = 0; k < n; k++) { const i = pCursor = (pCursor + 1) % PN; pPos[i * 3] = p.x + (Math.random() - .5) * spread; pPos[i * 3 + 1] = p.y + (Math.random() - .5) * spread * 2; pPos[i * 3 + 2] = p.z + Math.random() * .6; pVel[i * 3] = (Math.random() - .5) * 4; pVel[i * 3 + 1] = (Math.random() * 1.8 + .3) * up; pVel[i * 3 + 2] = Math.random() * 4 + 1; pLife[i] = 1 + Math.random() * 1.2; } }
function updateParticles(dt) { let any = false; for (let i = 0; i < PN; i++) { if (pLife[i] <= 0) continue; any = true; pLife[i] -= dt; for (let k = 0; k < 3; k++) { pPos[i * 3 + k] += pVel[i * 3 + k] * dt; pVel[i * 3 + k] *= .965; } pVel[i * 3 + 1] -= .5 * dt; if (pLife[i] <= 0) pPos[i * 3 + 1] = -9999; } if (any) pGeo.attributes.position.needsUpdate = true; }
/* motes drift through the cone of the ceiling light */
const MN = 220, mPos = new Float32Array(MN * 3), mSeed = new Float32Array(MN);
for (let i = 0; i < MN; i++) { mPos[i * 3] = (Math.random() - .5) * 220; mPos[i * 3 + 1] = 70 + Math.random() * 110; mPos[i * 3 + 2] = Math.random() * 80 - 10; mSeed[i] = Math.random() * 100; }
const mGeo = new THREE.BufferGeometry(); mGeo.setAttribute('position', new THREE.BufferAttribute(mPos, 3));
const mMat = new THREE.PointsMaterial({ color: '#fff1d6', size: .34, transparent: true, opacity: .4, depthWrite: false, blending: THREE.AdditiveBlending });
const motes = new THREE.Points(mGeo, mMat); motes.frustumCulled = false; scene.add(motes);
function updateMotes(dt, now) {
  if (RM) { motes.visible = false; return; }
  mMat.opacity = LP.motes;
  for (let i = 0; i < MN; i++) {
    const j = i * 3, t = now * .0002 + mSeed[i];
    mPos[j] += Math.sin(t * 1.3) * dt * .8; mPos[j + 1] += (Math.sin(t) * .5 + .15) * dt * .9; mPos[j + 2] += Math.cos(t * .7) * dt * .5;
    if (mPos[j + 1] > 182) mPos[j + 1] = 70; if (mPos[j] < -110) mPos[j] += 220; if (mPos[j] > 110) mPos[j] -= 220;
  }
  mGeo.attributes.position.needsUpdate = true;
}
const _sp = new V3();
function spineWorld(c, out) { return c.spine.getWorldPosition(out); }
function spanText(d) { if (d < 30) return d === 1 ? T('1 día') : T('{0} días', d); if (d < 365) { const m = Math.round(d / 30); return m === 1 ? T('1 mes') : T('{0} meses', m); } const y = Math.round(d / 365); return y === 1 ? T('1 año') : T('{0} años', y); }
