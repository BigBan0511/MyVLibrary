
/* =====================================================================
   MOTION HELPERS
   ===================================================================== */
const tweens = [];
function tween(dur, fn, ease = easeIO) { return new Promise(res => tweens.push({ t0: performance.now(), dur: Math.max(1, dur * 1000 * SPEED), fn, ease, res })); }
function runTweens(now) { for (let i = tweens.length - 1; i >= 0; i--) { const tw = tweens[i], t = clamp((now - tw.t0) / tw.dur, 0, 1); tw.fn(tw.ease(t)); if (t >= 1) { tweens.splice(i, 1); tw.res(); } } }
const wait = ms => new Promise(r => setTimeout(r, ms * SPEED));
function bez(a, b, c, t, out) { const u = 1 - t; return out.set(u * u * a.x + 2 * u * t * b.x + t * t * c.x, u * u * a.y + 2 * u * t * b.y + t * t * c.y, u * u * a.z + 2 * u * t * b.z + t * t * c.z); }

/* ---------- camera: the whole wall, a closer look along the shelf, or the console ---------- */
const cam = { pos: new V3(), look: new V3(), tPos: new V3(), tLook: new V3(), view: 'shelf', par: { x: 0, y: 0 }, browseX: 0 };
function viewPose(name, outPos, outLook) {
  const narrow = camera.aspect < .95; let box, dir;
  if (name === 'browse') {
    const x = clamp(cam.browseX, SHELF.x0 + 30, SHELF.x1 - 30);
    box = { cx: x, cy: SHELF.board + 11, w: narrow ? 46 : 82, h: 40 }; dir = new V3(0, .06, 1);
  } else if (name === 'console') {
    box = narrow ? { cx: CON.x - 14, cy: TABLE.top + 22, w: 86, h: 110 } : { cx: (TV.x + CON.x) / 2 + 8, cy: TABLE.top + 26, w: 150, h: 70 }; dir = new V3(-.06, .2, 1);
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
function spanText(d) { if (d < 30) return d === 1 ? '1 día' : `${d} días`; if (d < 365) { const m = Math.round(d / 30); return m === 1 ? '1 mes' : `${m} meses`; } const y = Math.round(d / 365); return y === 1 ? '1 año' : `${y} años`; }
