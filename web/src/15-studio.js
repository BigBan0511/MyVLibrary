/* =====================================================================
   THE STUDIO: while a game is in your hands the room fades behind a grey
   backdrop, softboxes light the case and its edges catch little stars
   of light (after the CD Shelf video and Ann Nguyen's cd-case).
   ===================================================================== */
const studio = { a: 0, want: false, from: 0, t0: 0, on: false, env: null, roomEnv: scene.environment, roomK: 1, sway: { yaw: 0, pitch: 0, roll: 0, y: 0 } };
scene.add(camera);

/* softboxes, a strip light and a flag, prefiltered once: this is what the plastic reflects in the studio */
function buildStudioEnv() {
  const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.BoxGeometry(12, 8, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color(.05, .052, .058), side: THREE.BackSide })));
  const panel = (w, h, pos, rot, v) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.material.color.setRGB(v[0], v[1], v[2]); m.position.set(...pos); m.rotation.set(...rot); env.add(m); };
  panel(2.6, 3.6, [-4.2, 2.2, 3.4], [0, Math.PI * .72, 0], [7, 6.8, 6.4]);
  panel(.7, 5, [5.4, .8, 1.8], [0, -Math.PI * .6, 0], [5.2, 5.4, 5.8]);
  panel(6, .6, [0, 3.9, .5], [Math.PI / 2, 0, 0], [3.4, 3.4, 3.4]);
  panel(5, 2, [0, -3.9, 2], [-Math.PI / 2, 0, 0], [.32, .32, .34]);
  panel(1.2, 4, [1.2, .5, 5.9], [0, Math.PI, 0], [.05, .05, .05]);
  const rt = pm.fromScene(env, .02); pm.dispose(); return rt.texture;
}
studio.env = buildStudioEnv();

/* the grey paper behind the case: lighter in the middle, a little grain */
function makeBackdropCanvas() {
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(515);
  x.fillStyle = rg(x, S * .5, S * .44, 0, S * .72, [[0, '#6a6c6f'], [.45, '#4b4d50'], [1, '#232427']]); x.fillRect(0, 0, S, S);
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '0,0,0'},${r() * .05})`; x.fillRect(r() * S, r() * S, 1.5, 1.5); }
  return c;
}
/* drawn first of the see-through things and written to depth, so the room's dust and labels stay behind it */
const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex(makeBackdropCanvas()), transparent: true, opacity: 0, depthWrite: true, fog: false }));
backdrop.renderOrder = -1; backdrop.visible = false; camera.add(backdrop);

/* lights that travel with the camera: a key softbox high on the left, a cool rim on the right, a soft fill */
const stTarget = new THREE.Object3D(); stTarget.position.set(0, 0, -80);
const stKey = new THREE.DirectionalLight('#fff3e6', 0), stRim = new THREE.DirectionalLight('#dce6ff', 0), stFill = new THREE.DirectionalLight('#ffffff', 0);
stKey.position.set(-70, 80, 30); stRim.position.set(90, 30, -90); stFill.position.set(40, -30, 70);
[stKey, stRim, stFill].forEach(l => { l.target = stTarget; l.visible = false; camera.add(l); }); camera.add(stTarget);
const ST_LIGHT = [[stKey, 1.5], [stRim, 1.1], [stFill, .35]];

/* glints: four-pointed stars where a corner of the case catches the key light */
function makeStarCanvas() {
  const S = 128, c = mkCanvas(S, S), x = c.getContext('2d'), h = S / 2;
  x.fillStyle = rg(x, h, h, 0, h * .32, [[0, 'rgba(255,255,255,1)'], [.35, 'rgba(220,235,255,.55)'], [1, 'rgba(200,220,255,0)']]); x.fillRect(0, 0, S, S);
  x.globalCompositeOperation = 'lighter';
  [[S, 2.2], [2.2, S]].forEach(([w, t]) => { const gr = w > t ? x.createLinearGradient(0, h, S, h) : x.createLinearGradient(h, 0, h, S); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(h - w / 2, h - t / 2, w, t); });
  return c;
}
const starTex = tex(makeStarCanvas());
const GLINTS = Array.from({ length: 8 }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex, color: '#ffffff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false })); s.visible = false; s.renderOrder = 5; scene.add(s); return s; });
const _gp = new V3(), _gn = new V3(), _gv = new V3(), _gr = new V3(), _gl = new V3(), _gq = new Q4();
function glintPoints(c) {
  /* four outer corners of the lid and four of the back, each with the direction its edge faces */
  const { w, h } = c.dim, lz = c.lidD, bz = -c.shellD / 2;
  return [[c.pivot, 0, h / 2, lz, -1, 1, 1], [c.pivot, w, h / 2, lz, 1, 1, 1], [c.pivot, 0, -h / 2, lz, -1, -1, 1], [c.pivot, w, -h / 2, lz, 1, -1, 1],
    [c.shell, -w / 2, h / 2, bz, -1, 1, -1], [c.shell, w / 2, h / 2, bz, 1, 1, -1], [c.shell, -w / 2, -h / 2, bz, -1, -1, -1], [c.shell, w / 2, -h / 2, bz, 1, -1, -1]];
}
function updateGlints(now) {
  const c = active, show = c && studio.a > .05 && c.mode === 'inspect' && !c.disposed;
  if (!show) { for (const s of GLINTS) s.visible = false; return; }
  _gl.set(-.55, .62, .56).normalize().applyQuaternion(camera.quaternion);
  const pts = glintPoints(c), t = now * .001;
  pts.forEach(([obj, px, py, pz, nx, ny, nz], i) => {
    const s = GLINTS[i]; obj.updateMatrixWorld(); _gp.set(px, py, pz).applyMatrix4(obj.matrixWorld);
    _gn.set(nx * .55, ny * .55, nz).normalize().transformDirection(obj.matrixWorld);
    _gv.copy(camera.position).sub(_gp).normalize();
    const nv = _gn.dot(_gv); if (nv <= 0) { s.visible = false; return; }
    _gr.copy(_gn).multiplyScalar(2 * nv).sub(_gv);
    const I = Math.pow(Math.max(0, _gr.dot(_gl)), 12) * (.7 + .3 * Math.sin(t * 9 + i * 1.7));
    if (I < .02) { s.visible = false; return; }
    s.visible = true; s.position.copy(_gp).addScaledVector(_gv, .4);
    const k = camera.position.distanceTo(_gp) / 60; s.scale.setScalar((1.6 + 4.2 * I) * k);
    s.material.opacity = Math.min(1, I * 1.5) * studio.a;
  });
}

/* the studio comes in while the case is held in front of you (not on its way to the machine) */
function updateStudio(dt, now) {
  const c = active, want = prefs.hold !== 'room' && c && !c.disposed && c.mode === 'inspect' && ['busy', 'inspect', 'open', 'manual'].includes(mode);
  /* timed from the moment it changes, so it takes the same time however fast the frames come */
  if (!!want !== studio.want) { studio.want = !!want; studio.from = studio.a; studio.t0 = now; }
  const dur = (studio.want ? .9 : .5) * 1000 * SPEED, k = easeIO(clamp((now - studio.t0) / dur, 0, 1));
  studio.a = lerp(studio.from, studio.want ? 1 : 0, k); if (studio.a < .002) studio.a = 0;
  const a = studio.a;
  backdrop.visible = a > 0;
  if (backdrop.visible) {
    const d = c && !c.disposed ? camera.position.distanceTo(c.root.position) : 90, z = d + 45, vh = viewH(z) * 1.25;
    backdrop.position.set(0, 0, -z); backdrop.scale.set(vh * Math.max(camera.aspect, 1) * 1.4, vh, 1); backdrop.material.opacity = a;
  }
  /* the case in your hands is lit softly even when it stays in the room */
  const hand = Math.max(a, prefs.hold === 'room' && c && !c.disposed && c.mode === 'inspect' ? .6 : 0);
  for (const [l, I] of ST_LIGHT) { l.intensity = I * hand; l.visible = hand > .01; }
  /* reflections switch to the softboxes once the room is mostly hidden */
  const on = a > .5;
  if (on !== studio.on) { studio.on = on; if (on) { studio.roomK = ENV_K; scene.environment = studio.env; setEnvK(Math.max(ENV_K, .9)); } else { scene.environment = studio.roomEnv; setEnvK(studio.roomK); } }
  /* a slow sway while you hold it, like a hand that is not quite still */
  const sw = studio.sway, amp = RM ? 0 : a, t = now * .001;
  sw.yaw = (.05 * Math.sin(t * .9) + .018 * Math.sin(t * 2.1)) * amp; sw.pitch = .022 * Math.sin(t * .7) * amp; sw.roll = .012 * Math.sin(t * .5) * amp; sw.y = .35 * Math.sin(t * 1.1) * amp;
  updateGlints(now);
}
