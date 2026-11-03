
/* =====================================================================
   WALKING: the room in first person, the way EmuVR has you stand in it.
   V, the Walk button at the top or the left stick pressed in start and
   stop it. WASD walks (the arrows walk and turn), Shift runs, the mouse
   looks round once the view has it (a click on nothing gives it; Esc
   lets it go) or while you drag, the right stick looks round on the pad
   and X (or the right stick pressed in) crouches. What is in the middle
   of the view, or under the mouse while it is free, is what a click or
   Enter takes out; from there on all is as ever, and when the case goes
   back the view comes back to where you stood.
   You walk in the room you were looking at: walls and a ceiling close
   round it, its furniture is in your way, and moving to another room
   (another system, the video shop) takes you there.
   ===================================================================== */
const WALK = {
  on: false, pos: new V3(), yaw: 0, pitch: -.15, vel: new V3(), keys: new Set(), host: {}, pad: { lx: 0, ly: 0, rx: 0, ry: 0, up: 0, down: 0, left: 0, right: 0 },
  crouch: 0, crouchT: 0, bob: 0, follow: false, locked: false, unlockT: 0, padT: 0, hoverT: 0, scanT: 0,
  area: null, obs: [], key: '', group: -1, goal: null, fovK: 0, raw: false
};
const WALK_EYE = 158, WALK_LOW = 90, WALK_R = 24, WALK_V = 125, WALK_RUN = 250, WALK_FOV = 62, BASE_FOV = 28, WALK_SENS = .0023;
const WALK_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
const _kd = new V3(), _kf = new V3(), _kr = new V3(), _kv = new V3(), _kb = new THREE.Box3(), _kp0 = new V3(), _kl0 = new V3();

/* ---------- where you are and where you look ---------- */
function walkEye() { return lerp(WALK_EYE, WALK_LOW, easeIO(WALK.crouch)); }
function walkDir(out) { const c = Math.cos(WALK.pitch); return out.set(-Math.sin(WALK.yaw) * c, Math.sin(WALK.pitch), -Math.cos(WALK.yaw) * c); }
function walkPose(outPos, outLook) { outPos.set(WALK.pos.x, walkEye() + (RM ? 0 : Math.sin(WALK.bob) * .9), WALK.pos.z); outLook.copy(outPos).addScaledVector(walkDir(_kd), 100); }
function walkAim(at) { const dx = at.x - WALK.pos.x, dz = at.z - WALK.pos.z, dy = at.y - walkEye(); WALK.yaw = Math.atan2(-dx, -dz); WALK.pitch = clamp(Math.atan2(dy, Math.hypot(dx, dz)), -1.2, 1.2); }
/* the view the room would have without walking (its own lens, the narrow one) */
function walkFramed(outPos, outLook, name = 'shelf') { WALK.raw = true; try { viewPose(name, outPos, outLook); } finally { WALK.raw = false; } }

/* ---------- the room you walk in ---------- */
function walkArea() {
  const back = WALL_Z + 400;
  /* a row of bookcases is a hall as long as the row */
  if (isCases() && units.length) { const xs = units.map(u => u.x); return { x0: Math.min(...xs) - 120, x1: Math.max(...xs) + 120, z0: WALL_Z, z1: back, ceil: 260 }; }
  const cx = STAGE.name === 'tv' ? CAB.x : SHELF.cx;
  return { x0: cx - 255, x1: cx + 255, z0: WALL_Z, z1: back, ceil: 260 };
}
function walkRoomKey() { return [prefs.layout, STAGE.name, isCases() ? units.length + ':' + (units[0] ? units[0].x : 0) : ''].join('|'); }
/* what stands in your way: whatever solid there is in the room between your ankles and your waist (the cases
   themselves stand in their furniture); and how high the ceiling has to be for what hangs on the walls */
function walkScan() {
  const A = WALK.area || (WALK.area = walkArea()), out = [], skip = new Set([walkRoom, camera, floor, wall, skirt]);
  cases.forEach(c => skip.add(c.root)); looseCases.forEach(c => skip.add(c.root));
  let top = 0;
  const visit = o => {
    if (!o.visible || skip.has(o)) return;
    if (o.isMesh && !o.isInstancedMesh && o.geometry && o.geometry.attributes.position) {
      const G = o.geometry; if (!G.boundingBox) G.computeBoundingBox();
      _kb.copy(G.boundingBox).applyMatrix4(o.matrixWorld);
      const mt = [].concat(o.material)[0], glow = mt && mt.transparent && !mt.depthWrite, sx = _kb.max.x - _kb.min.x, sz = _kb.max.z - _kb.min.z;
      const near = _kb.max.x > A.x0 - 40 && _kb.min.x < A.x1 + 40 && _kb.max.z > A.z0 - 40 && _kb.min.z < A.z1 + 40;
      if (near && !glow && isFinite(sx) && sx < 900 && sz < 600) {
        if (_kb.max.y < 400) top = Math.max(top, _kb.max.y);
        if (_kb.max.y > 6 && _kb.min.y < 105) out.push({ x0: _kb.min.x, x1: _kb.max.x, z0: _kb.min.z, z1: _kb.max.z });
      }
    }
    for (const k of o.children) visit(k);
  };
  scene.updateMatrixWorld(); visit(scene);
  WALK.obs = out;
  const ceil = clamp(Math.ceil(top + 12), 250, 340); if (ceil !== A.ceil) { A.ceil = ceil; buildWalkRoom(A); }
}
/* you are a circle on the floor: out of every box you would stand in, and inside the walls */
function walkCollide(p) {
  const A = WALK.area, r = WALK_R; if (!A) return;
  for (let it = 0; it < 3; it++) {
    for (const o of WALK.obs) {
      const cx = clamp(p.x, o.x0, o.x1), cz = clamp(p.z, o.z0, o.z1), dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      if (d2 > 1e-6) { const d = Math.sqrt(d2), k = (r - d) / d; p.x += dx * k; p.z += dz * k; continue; }
      /* right inside it: out by the nearest side */
      const e = [p.x - o.x0, o.x1 - p.x, p.z - o.z0, o.z1 - p.z], i = e.indexOf(Math.min(...e));
      if (i === 0) p.x = o.x0 - r; else if (i === 1) p.x = o.x1 + r; else if (i === 2) p.z = o.z0 - r; else p.z = o.z1 + r;
    }
    p.x = clamp(p.x, A.x0 + r, A.x1 - r); p.z = clamp(p.z, A.z0 + r, A.z1 - r);
  }
}

/* ---------- walls and a ceiling round it: only there while you walk ---------- */
const walkRoom = new THREE.Group(); walkRoom.visible = false; scene.add(walkRoom);
const walkCeilMat = M(THREE.MeshStandardMaterial, { color: '#2b2723', roughness: .95 }, .3);
/* a lamp on the ceiling, so that the rest of the room is there when you turn round (the light on the shelf stays the main one) */
const walkLampMat = new THREE.MeshBasicMaterial({ color: '#ffe6c4', toneMapped: false });
const walkLamp = new THREE.PointLight('#ffe2bf', .9, 760, 1);
/* the room's own wall, its texture as big as on the wall behind the shelf (1500 × 420 a tile set) */
function walkWall(w, h) { const g = new THREE.PlaneGeometry(w, h), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 1500, uv.getY(i) * h / 420); const m = new THREE.Mesh(g, wall.material); m.receiveShadow = true; return m; }
function buildWalkRoom(A) {
  walkRoom.children.slice().forEach(o => { walkRoom.remove(o); if (o.geometry) o.geometry.dispose(); });
  const W = A.x1 - A.x0, D = A.z1 - A.z0, H = A.ceil, cx = (A.x0 + A.x1) / 2, cz = (A.z0 + A.z1) / 2;
  const back = walkWall(W, H); back.rotation.y = Math.PI; back.position.set(cx, H / 2, A.z1); walkRoom.add(back);
  [[A.x0, Math.PI / 2], [A.x1, -Math.PI / 2]].forEach(([x, r]) => { const s = walkWall(D, H); s.rotation.y = r; s.position.set(x, H / 2, cz); walkRoom.add(s); });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), walkCeilMat); ceil.rotation.x = Math.PI / 2; ceil.position.set(cx, H, cz); walkRoom.add(ceil);
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(16, 19, 4, 32), walkLampMat); lamp.position.set(cx, H - 2, cz); walkRoom.add(lamp);
  walkLamp.position.set(cx, H - 30, cz); walkRoom.add(walkLamp);
  /* the skirting goes on round the room */
  const sk = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 8, d), skirtMat); m.position.set(x, 4, z); walkRoom.add(m); };
  sk(W, .5, cx, A.z1 - .25); sk(.5, D, A.x0 + .25, cz); sk(.5, D, A.x1 - .25, cz);
}

/* ---------- starting and stopping ---------- */
function walkCan() { return !coarse && mode === 'shelf' && !busy && !DECO.on; }
function walkToggle(on = !WALK.on) {
  if (on === WALK.on || (on && !walkCan())) return;
  WALK.on = on; prefs.walk = on ? 'on' : 'off'; savePrefs();
  WALK.keys.clear(); WALK.host = {}; WALK.vel.set(0, 0, 0); WALK.goal = null; kbNav = false; setHovered(null);
  if (on) {
    WALK.key = walkRoomKey(); WALK.area = walkArea(); walkScan(); buildWalkRoom(WALK.area); WALK.group = curGroup;
    /* you start where the camera stood (a step nearer if it stood far back), at eye height, looking at what it looked at */
    WALK.crouch = WALK.crouchT = STAGE.name === 'tv' ? 1 : 0;
    WALK.pos.set(cam.pos.x, 0, Math.min(cam.pos.z, WALL_Z + 260)); walkCollide(WALK.pos); walkAim(cam.look);
    WALK.follow = false;
    toast(T('Paseando: WASD para andar; haz clic para mirar con el ratón'), 3200);
  } else if (WALK.locked) { try { document.exitPointerLock(); } catch (e) { } }
  if (cam.view === 'shelf' || cam.view === 'browse') setView('shelf');
  renderWalkBtn(); renderPrompts(); walkDot();
}
/* another room (another system, another design): you are in it, where its camera would stand */
function walkSpawn() {
  WALK.area = walkArea(); walkScan(); buildWalkRoom(WALK.area); WALK.group = curGroup; WALK.goal = null; WALK.vel.set(0, 0, 0);
  walkFramed(_kp0, _kl0);
  WALK.crouch = WALK.crouchT = STAGE.name === 'tv' ? 1 : 0;
  WALK.pos.set(_kp0.x, 0, Math.min(_kp0.z, WALL_Z + 230)); walkCollide(WALK.pos); walkAim(_kl0);
  /* the change of room happens in the dark */
  const f = $('#fade'); f.classList.add('on'); setTimeout(() => f.classList.remove('on'), RM ? 20 : 260);
  walkPose(cam.tPos, cam.tLook); cam.pos.copy(cam.tPos); cam.look.copy(cam.tLook); WALK.follow = true;
}
/* in front of a bookcase (the next group of the row, or a game Playnite asked to show) */
function walkGoTo(x, z, look) { WALK.goal = { x, z, look: look.clone() }; }

/* ---------- the mouse ---------- */
function walkLock() { if (!WALK.on || WALK.locked || mode !== 'shelf') return; try { const r = canvasEl.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (e) { } }
document.addEventListener('pointerlockchange', () => {
  const was = WALK.locked; WALK.locked = document.pointerLockElement === canvasEl;
  if (was && !WALK.locked) WALK.unlockT = performance.now();
  if (WALK.locked) { WALK.padT = 0; setHovered(null); }
  renderPrompts(); walkDot();
});
/* the mouse looks round while the view has it, or while you drag with it free; true when it was for looking */
function walkPointerMove(e, px, py) {
  if (!WALK.on || mode !== 'shelf' || busy || DECO.on) return false;
  WALK.padT = 0;
  if (WALK.locked) { walkTurn(e.movementX || 0, e.movementY || 0); return true; }
  if (pointer.down && (e.buttons & 1)) { walkTurn(e.clientX - px, e.clientY - py, true); canvasEl.style.cursor = 'grabbing'; return true; }
  return false;
}
function walkTurn(dx, dy, dragging) { const k = WALK_SENS * (dragging ? .9 : 1); WALK.yaw -= dx * k; WALK.pitch = clamp(WALK.pitch - dy * k, -1.25, 1.25); WALK.goal = null; }
/* a click on nothing gives the view the mouse */
function walkClickedNothing() { if (WALK.on && !WALK.locked) walkLock(); }

/* ---------- keys and pads ---------- */
function walkKeyDown(e) {
  if (!WALK.on) return false;
  /* the Esc that let the mouse go does nothing else */
  if (e.key === 'Escape' && (WALK.locked || performance.now() - WALK.unlockT < 350)) return true;
  if (mode !== 'shelf' || DECO.on || (typeof FIT !== 'undefined' && FIT.open)) return false;
  if (WALK_CODES.has(e.code) && !e.ctrlKey && !e.altKey && !e.metaKey) { WALK.keys.add(e.code); if (e.code !== 'ShiftLeft' && e.code !== 'ShiftRight') { WALK.goal = null; WALK.padT = 0; } return true; }
  return false;
}
function walkKeyUp(e) { WALK.keys.delete(e.code); }
window.addEventListener('keyup', walkKeyUp);
window.addEventListener('blur', () => { WALK.keys.clear(); WALK.host = {}; });
/* the keys handleKey hands over while you walk (the keyboard's and the pad's alike); undefined: not one of these */
function walkKey(k) {
  if (k === 'v' || k === 'V') { walkToggle(false); return true; }
  if (k === 'x' || k === 'X') { WALK.crouchT = WALK.crouchT ? 0 : 1; return true; }
  if (k === 'Enter' || k === ' ') { if (hovered && navOrder.includes(hovered)) pick(hovered); return true; }
  if (k === 'Escape') { walkToggle(false); return true; }
  if (k.startsWith('Arrow')) return true;
  return undefined;
}
/* Playnite's own pad events (fullscreen): the sticks and the d-pad come as presses and releases */
function walkHostPad(button, state) {
  if (!/^(LeftStick|RightStick|DPad)(Up|Down|Left|Right)$/.test(button)) return false;
  if (state !== 'Pressed') { if (!WALK.host[button]) return false; WALK.host[button] = false; return true; }
  if (!WALK.on || mode !== 'shelf') return false;
  WALK.host[button] = true; WALK.padT = performance.now(); WALK.goal = null; return true;
}
/* the browser's pad: analogue sticks; true while it is being used for walking */
function walkBrowserPad(p) {
  const P = WALK.pad; P.lx = P.ly = P.rx = P.ry = P.up = P.down = P.left = P.right = 0;
  if (!WALK.on || mode !== 'shelf' || busy || DECO.on) return false;
  const dz = v => { v = v || 0; const a = Math.abs(v); return a < .18 ? 0 : Math.sign(v) * ((a - .18) / .82); }, b = i => !!(p.buttons[i] && p.buttons[i].pressed);
  P.lx = dz(p.axes[0]); P.ly = dz(p.axes[1]); P.rx = dz(p.axes[2]); P.ry = dz(p.axes[3]);
  P.up = b(12) ? 1 : 0; P.down = b(13) ? 1 : 0; P.left = b(14) ? 1 : 0; P.right = b(15) ? 1 : 0;
  if (P.lx || P.ly || P.rx || P.ry || P.up || P.down || P.left || P.right) { WALK.padT = performance.now(); WALK.goal = null; }
  return true;
}

/* ---------- every frame ---------- */
function walkFree() { return mode === 'shelf' && !busy && !DECO.on && !(typeof FIT !== 'undefined' && FIT.open) && setPop.hidden && $('#lib').hidden; }
function walkUpdate(dt, now) {
  /* the lens: wide while you walk, the usual narrow one for everything else (a case in your hands, the console) */
  const wide = WALK.on && mode === 'shelf' && (cam.view === 'shelf' || cam.view === 'browse') && !DECO.on ? 1 : 0;
  WALK.fovK += (wide - WALK.fovK) * (RM ? 1 : 1 - Math.exp(-4.5 * dt / SPEED)); if (Math.abs(wide - WALK.fovK) < .002) WALK.fovK = wide;
  const fov = lerp(BASE_FOV, WALK_FOV, easeIO(WALK.fovK)); if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }
  walkRoom.visible = WALK.on;
  if (!WALK.on) return;
  const k = walkRoomKey(); if (k !== WALK.key) { WALK.key = k; walkSpawn(); }
  if (now - WALK.scanT > 2000) { WALK.scanT = now; walkScan(); }
  /* the bookcases: another group takes you to its bookcase */
  if (isCases() && curGroup !== WALK.group) { WALK.group = curGroup; const u = units[curGroup]; if (u) walkGoTo(u.x, Math.min(Math.max(WALK.pos.z, WALL_Z + 120), WALL_Z + 190), _kl0.set(u.x, u.H * .55, 0)); }
  /* and the other way round: the bookcase you are looking at becomes the one whose games you can take out
     (only it and its neighbours are filled) */
  if (isCases() && units.length > 1 && !WALK.goal && walkFree() && !swapBusy && now - (WALK.unitT || 0) > 250) {
    WALK.unitT = now; walkDir(_kd);
    const t = _kd.z < -.15 ? (0 - WALK.pos.z) / _kd.z : 0, x = WALK.pos.x + _kd.x * t;
    let best = curGroup; units.forEach((u, i) => { if (Math.abs(x - u.x) < Math.abs(x - units[best].x) - 8) best = i; });
    if (best !== curGroup && units[curGroup]) { WALK.group = best; setGroup(best, true); }
  }
  /* a game shown from Playnite: you go and stand in front of it */
  if (kbNav && hovered && !hovered.disposed && cam.view === 'browse') { const p = hovered.home.pos; walkGoTo(p.x, p.z + 120, p); kbNav = false; setView('shelf'); }
  const free = walkFree();
  if (WALK.locked && mode !== 'shelf') { try { document.exitPointerLock(); } catch (e) { } }
  if (free) {
    const K = WALK.keys, H = WALK.host, P = WALK.pad;
    let f = (K.has('KeyW') || K.has('ArrowUp') || H.LeftStickUp || H.DPadUp ? 1 : 0) - (K.has('KeyS') || K.has('ArrowDown') || H.LeftStickDown || H.DPadDown ? 1 : 0) - P.ly + P.up - P.down;
    let s = (K.has('KeyD') || H.LeftStickRight ? 1 : 0) - (K.has('KeyA') || H.LeftStickLeft ? 1 : 0) + P.lx;
    /* the arrows (and the d-pad) turn, as in the old games without a mouse */
    const turn = (K.has('ArrowRight') || H.DPadRight || H.RightStickRight ? 1 : 0) - (K.has('ArrowLeft') || H.DPadLeft || H.RightStickLeft ? 1 : 0) + P.right - P.left + Math.sign(P.rx) * P.rx * P.rx;
    const tilt = (H.RightStickDown ? 1 : 0) - (H.RightStickUp ? 1 : 0) + Math.sign(P.ry) * P.ry * P.ry;
    WALK.yaw -= turn * 2.2 * dt; WALK.pitch = clamp(WALK.pitch - tilt * 1.6 * dt, -1.25, 1.25);
    f = clamp(f, -1, 1); s = clamp(s, -1, 1);
    const mag = Math.min(1, Math.hypot(f, s)), run = K.has('ShiftLeft') || K.has('ShiftRight') || Math.hypot(P.lx, P.ly) > .95;
    _kf.set(-Math.sin(WALK.yaw), 0, -Math.cos(WALK.yaw)); _kr.set(Math.cos(WALK.yaw), 0, -Math.sin(WALK.yaw));
    _kv.set(0, 0, 0).addScaledVector(_kf, f).addScaledVector(_kr, s); if (_kv.lengthSq() > 1e-6) _kv.normalize().multiplyScalar(mag * (run ? WALK_RUN : WALK_V) * (WALK.crouch > .5 ? .6 : 1));
    if (mag > .05 || turn || tilt) WALK.goal = null;
    WALK.vel.lerp(_kv, 1 - Math.exp(-10 * dt));
    if (WALK.goal) {
      const G = WALK.goal, a = 1 - Math.exp(-4 * dt / SPEED); WALK.pos.x += (G.x - WALK.pos.x) * a; WALK.pos.z += (G.z - WALK.pos.z) * a; walkCollide(WALK.pos);
      const y0 = WALK.yaw, p0 = WALK.pitch; walkAim(G.look); let dy = WALK.yaw - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); WALK.yaw = y0 + dy * a; WALK.pitch = p0 + (WALK.pitch - p0) * a;
      if (Math.hypot(G.x - WALK.pos.x, G.z - WALK.pos.z) < .5 && Math.abs(dy) < .01) WALK.goal = null;
    } else { WALK.pos.addScaledVector(WALK.vel, dt); walkCollide(WALK.pos); }
    const sp = Math.hypot(WALK.vel.x, WALK.vel.z); if (sp > 8 && !WALK.goal) WALK.bob += dt * sp * .05; else WALK.bob += (Math.round(WALK.bob / Math.PI) * Math.PI - WALK.bob) * (1 - Math.exp(-8 * dt));
  } else WALK.vel.set(0, 0, 0);
  WALK.crouch += (WALK.crouchT - WALK.crouch) * (1 - Math.exp(-7 * dt / SPEED));
  /* the camera stands where you are; coming back from the console (or a case) it glides back first */
  if (cam.view === 'shelf' || cam.view === 'browse') {
    walkPose(cam.tPos, cam.tLook);
    if (WALK.follow) { cam.pos.copy(cam.tPos); cam.look.copy(cam.tLook); }
    else if (cam.pos.distanceTo(cam.tPos) < 1.5 && cam.look.distanceTo(cam.tLook) < 4) WALK.follow = true;
  } else WALK.follow = false;
  /* what you look at: in the middle of the view (the mouse is the view's, or the pad is walking), or under the free mouse */
  if (free && now - WALK.hoverT > 80) {
    WALK.hoverT = now; const mid = WALK.locked || now - WALK.padT < 5000;
    if (mid || (pointer.live && !pointer.out && pointer.type === 'mouse')) {
      const px = pointer.x, py = pointer.y; if (mid) { pointer.x = 0; pointer.y = 0; }
      const h = hit(); setHovered(h ? h.case : null); if (!mid) canvasEl.style.cursor = h ? 'pointer' : 'default';
      pointer.x = px; pointer.y = py;
    }
    walkDot();
  }
}

/* ---------- on screen: the button, the dot in the middle, the hints ---------- */
function walkDot() { const d = $('#walkDot'); if (!d) return; const show = WALK.on && mode === 'shelf' && (WALK.locked || performance.now() - WALK.padT < 5000); d.hidden = !show; d.classList.toggle('on', show && !!hovered); }
function renderWalkBtn() {
  const b = $('#walkBtn'); if (!b) return;
  b.hidden = coarse; b.setAttribute('aria-pressed', String(WALK.on)); b.querySelector('span').textContent = T('Pasear'); b.title = T(WALK.on ? 'Dejar de pasear (V)' : 'Pasear por la habitación (V)');
  b.disabled = !(WALK.on || (mode === 'shelf' && !DECO.on));
}
function walkHints() {
  const pad = performance.now() - WALK.padT < 5000;
  if (pad) return `<span class="hint">${T('Stick izquierdo: andar')} · ${T('stick derecho: mirar')} · <kbd>A</kbd> ${T('sacar')} · <kbd>R3</kbd> ${T('agacharse')} · <kbd>L3</kbd> ${T('dejar de pasear')}</span>`;
  return `<span class="hint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> ${T('andar')} · <kbd>${T('Mayús')}</kbd> ${T('correr')} · <kbd>X</kbd> ${T('agacharse')} · ${WALK.locked ? `${T('clic o')} <kbd>${T('Intro')}</kbd> ${T('sacar')} · <kbd>Esc</kbd> ${T('suelta el ratón')}` : `${T('clic en un lomo para sacarlo, en lo demás para mirar con el ratón')}`} · <kbd>V</kbd> ${T('dejar de pasear')}</span>`;
}
$('#walkBtn').addEventListener('click', () => { sfx.init(); walkToggle(); });
