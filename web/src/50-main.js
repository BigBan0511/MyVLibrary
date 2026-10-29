
/* =====================================================================
   INPUT: pointer (pick, tear the seal, rub off dust), keyboard, gamepad
   ===================================================================== */
function setPointer(e) { pointer.cx = e.clientX; pointer.cy = e.clientY; pointer.x = e.clientX / innerWidth * 2 - 1; pointer.y = -(e.clientY / innerHeight) * 2 + 1; }
let drag = null;
const _plane = new THREE.Plane(), _hp = new V3(), _hit = new V3(), _nrm = new V3();
function onDrag(px, py) {
  const dist = Math.hypot(pointer.cx - px, pointer.cy - py), c = active; drag.moved += dist;
  if (!c) { drag = null; return; }
  if (drag.kind === 'tear') {
    if (!c.wrap) { drag = null; return; }
    c.inner.localToWorld(c.tearPoint(c.tear, _hp));
    camera.getWorldDirection(_nrm).negate(); _plane.setFromNormalAndCoplanarPoint(_nrm, _hp);
    ndc.set(pointer.x, pointer.y); ray.setFromCamera(ndc, camera);
    if (ray.ray.intersectPlane(_plane, _hit)) c.hand.copy(c.inner.worldToLocal(_hit));
    const pxPerCm = innerHeight / viewH(camera.position.distanceTo(c.root.position));
    c.tear = Math.min(c.L, c.tear + dist / pxPerCm * .85);
    drag.acc += dist / pxPerCm; if (drag.acc > 1.1) { sfx.crinkle(.8); drag.acc = 0; }
    c.updateStrip(); const th = $('#tearHint'); if (th) th.textContent = tearHintText(c);
    if (c.tear >= c.L - .01) { drag = null; c.dragging = false; canvasEl.style.cursor = 'default'; guarded(async () => { setMode('busy'); await finishWrap(c); setMode('inspect'); }); }
  } else if (drag.kind === 'turn') {
    /* turning the case by hand; it springs back when you let go */
    const gb = c.grab; gb.y = clamp(gb.y + (pointer.cx - px) * .008, -.9, .9); gb.x = clamp(gb.x + (pointer.cy - py) * .006, -.45, .45); gb.vx = gb.vy = 0;
  } else if (drag.kind === 'wipe') {
    if (drag.moved < 8) return;
    const h = hit([c.shell, c.lid, c.spine]);
    if (h) {
      const v = Math.max(0, c.g.dust - dist * .0011); c.setDust(v);
      if (Math.random() < .7) emit(h.point, 2, .8, .8);
      drag.acc += dist; if (drag.acc > 60) { sfx.brush(); drag.acc = 0; }
      if (v <= .01 && !drag.done) { drag.done = true; toast(T('Limpio como el primer día')); }
      renderInfo();
    }
  }
}
function endDrag() {
  if (!drag) return;
  if (active && drag.kind === 'tear' && active.wrap) { active.dragging = false; active.g.tear = active.tear; saveGame(active.g); }
  if (active && drag.kind === 'wipe') saveGame(active.g);
  if (active) active.grab.held = false;
  drag = null; canvasEl.style.cursor = 'default';
}
canvasEl.addEventListener('pointermove', e => {
  pointer.type = e.pointerType || 'mouse'; pointer.out = false; pointer.live = true; const px = pointer.cx, py = pointer.cy; setPointer(e);
  if (drag) { onDrag(px, py); return; }
  if (pointer.type !== 'mouse' || busy) return;
  if (mode === 'shelf') {
    const moved = Math.hypot(pointer.cx - px, pointer.cy - py);
    const wasKb = kbNav;
    if (kbNav && moved > 3) { kbNav = false; if (cam.view === 'browse') setView('shelf'); }
    if (kbNav) return;
    /* the lens follows the mouse first, so the hit matches what is drawn under it (taking over from the pad, it glides there instead) */
    if (lens.k > 0 && !wasKb) { lensAim(); lensApply(); }
    const h = hit(); setHovered(h ? h.case : null); canvasEl.style.cursor = h ? 'pointer' : 'default';
  }
  else if (mode === 'inspect') { const h = hit(); canvasEl.style.cursor = h && h.case === active ? (h.part === 'tab' ? 'grab' : active.g.dust > .02 ? 'crosshair' : 'pointer') : 'default'; }
  else if (mode === 'hifi') canvasEl.style.cursor = hifiHit() ? 'pointer' : 'default';
  else if (mode === 'roulette') canvasEl.style.cursor = !RL.spinning && hit(RL.hits) ? 'pointer' : 'default';
  else if (mode === 'open') { const h = hit(); hoverPart = h && h.case === active ? h.part : null; if (active.multi) setEpFocus(active, hoverPart === 'ep' ? slotOf(active, h.obj) : null, true); canvasEl.style.cursor = hoverPart === 'disc' || hoverPart === 'manual' || hoverPart === 'ep' ? 'pointer' : 'default'; }
});
canvasEl.addEventListener('pointerleave', () => { pointer.out = true; if (mode === 'shelf' && !kbNav) setHovered(null); });
canvasEl.addEventListener('pointerdown', e => {
  sfx.init(); pointer.type = e.pointerType || 'mouse'; setPointer(e); pointer.down = { x: e.clientX, y: e.clientY };
  if ((mode === 'inspect' || mode === 'open') && active && !busy) {
    const h = hit();
    if (h && h.case === active) {
      if (mode === 'inspect' && active.wrap && h.part === 'tab') { drag = { kind: 'tear', moved: 0, acc: 0 }; active.dragging = true; active.flipT = 0; try { canvasEl.setPointerCapture(e.pointerId); } catch (_) { } canvasEl.style.cursor = 'grabbing'; return; }
      if (mode === 'inspect' && active.g.dust > .02) { drag = { kind: 'wipe', moved: 0, acc: 0 }; try { canvasEl.setPointerCapture(e.pointerId); } catch (_) { } return; }
      drag = { kind: 'turn', moved: 0 }; active.grab.held = true; try { canvasEl.setPointerCapture(e.pointerId); } catch (_) { }
    }
  }
});
canvasEl.addEventListener('pointerup', e => {
  const was = drag; endDrag();
  if (!pointer.down) return; const moved = Math.hypot(e.clientX - pointer.down.x, e.clientY - pointer.down.y); pointer.down = null;
  if (moved > 10 || (was && was.kind === 'tear')) return;
  setPointer(e); kbNav = false; const h = hit();
  if (mode === 'shelf') { if (h) { focus = h.case; pick(h.case); } }
  else if (mode === 'inspect') { if (h && h.case === active && h.part !== 'tab') flipCase(); }
  else if (mode === 'hifi') { const b = hifiHit(); if (b) musicAct(b); }
  else if (mode === 'roulette') { if (!RL.spinning && hit(RL.hits)) rlSpin(); }
  else if (mode === 'open') { if (h && h.case === active) { if (h.part === 'ep') { const sl = slotOf(active, h.obj); if (sl) chooseVideo(active, sl); } else if (h.part === 'disc') insertDisc(); else if (h.part === 'manual') openManual(); } }
});
canvasEl.addEventListener('pointercancel', () => { endDrag(); pointer.down = null; });
canvasEl.addEventListener('wheel', e => {
  if (mode !== 'shelf' || busy || Math.abs(e.deltaY) + Math.abs(e.deltaX) < 30) return;
  clearTimeout(canvasEl.wheelT); canvasEl.wheelT = setTimeout(() => setPage(curPage + ((e.deltaY || e.deltaX) > 0 ? 1 : -1)), 60);
}, { passive: true });
function handleKey(k) {
  if (mode === 'manual') { if (k === 'ArrowRight' || k === 'PageDown' || k === 'e' || k === 'c') turn(1); else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'q' || k === 'z') turn(-1); else if (k === 'Escape' || k === 'm' || k === 'M') closeManual(); else return false; return true; }
  if (busy) return false;
  if (mode === 'roulette') return rlKey(k);
  if (mode === 'hifi') {
    /* the hi-fi's buttons from the keyboard */
    const a = { ' ': 'mToggle', Enter: 'mToggle', p: 'mToggle', P: 'mToggle', ArrowRight: 'mNext', ArrowLeft: 'mPrev', ArrowUp: 'mUp', ArrowDown: 'mDown', '+': 'mUp', '-': 'mDown', x: 'mEject', X: 'mEject', Escape: 'mBack', Backspace: 'mBack' }[k];
    if (!a) return false; musicAct(a); return true;
  }
  if ((k === 'p' || k === 'P') && MPLAY.state !== 'off' && mode === 'shelf') { musicAct('mToggle'); return true; }
  if (mode === 'shelf') {
    if (k.startsWith('Arrow')) { moveFocus(k.slice(5).toLowerCase()); return true; }
    if (k === 'Enter' || k === ' ') { if (focus && hovered === focus && navOrder.includes(focus)) pick(focus); else moveFocus('right'); return true; }
    if (k === 'q' || k === 'Q') { if (isRooms()) setSystem(-1); else setGroup(curGroup - 1); return true; }
    if (k === 'e' || k === 'E') { if (isRooms()) setSystem(1); else setGroup(curGroup + 1); return true; }
    if (k === 'z' || k === 'Z') { if (isRooms()) setGroup(curGroup - 1); else setPage(curPage - 1); return true; }
    if (k === 'c' || k === 'C') { if (isRooms()) setGroup(curGroup + 1); else setPage(curPage + 1); return true; }
    if (k === 'PageUp') { setPage(curPage - 1); return true; }
    if (k === 'PageDown') { setPage(curPage + 1); return true; }
    if (k === 'f' || k === 'F') return cycleFilter();
    /* R, or Back / View on the pad: the roulette */
    if (k === 'r' || k === 'R' || k === 'i' || k === 'I') { openRoulette(); return true; }
    if (k === 'h' || k === 'H') { switchRoom(ROOM_ORDER[(ROOM_ORDER.indexOf(prefs.room) + 1) % ROOM_ORDER.length]); return true; }
    if (k === 'Escape') { if (cam.view === 'browse' || (kbNav && hovered)) { kbNav = false; setHovered(null); if (cam.view === 'browse') setView('shelf'); return true; } if (PLAYNITE && PN_STATE.mode === 'fullscreen') { LIB.send('close'); return true; } return false; }
  }
  if ((mode === 'inspect' || mode === 'open') && (k === 'i' || k === 'I')) { setCard(prefs.card === 'hide' ? 'show' : 'hide'); return true; }
  if (mode === 'inspect') {
    if (k === 'f' || k === 'F' || k === 'ArrowLeft' || k === 'ArrowRight') { flipCase(); return true; }
    if ((k === 'Enter' || k === 'o' || k === 'O') && active && active.g.music && !musicOpenable(active.g)) { musicEnter(); return true; }
    if (k === 'Enter' || k === 'o' || k === 'O') { if (active && active.wrap) { if (prefs.seal === 'manual') toast(T('Tira de la lengüeta roja para quitar el precinto')); else unwrapAction(); } else openCase(); return true; }
    if (k === 'Escape' || k === 'Backspace') { putBack(); return true; }
  } else if (mode === 'open' && active && active.multi) {
    /* a season: left and right bring the previous or next episodes, up and down choose one */
    const m = active.multi;
    if (k === 'ArrowLeft' || k === 'q' || k === 'z' || k === 'PageUp') { multiGo(active, m.page - 1); return true; }
    if (k === 'ArrowRight' || k === 'e' || k === 'c' || k === 'PageDown') { multiGo(active, m.page + 1); return true; }
    if (k === 'ArrowUp' || k === 'ArrowDown') { const vis = m.slots.filter(o => !o.userData.away), i = Math.max(0, vis.indexOf(m.slots[m.focus || 0])); setEpFocus(active, vis[clamp(i + (k === 'ArrowDown' ? 1 : -1), 0, vis.length - 1)]); return true; }
    if (k === 'Enter' || k === 'd' || k === 'D') { const sl = m.slots[m.focus || 0]; if (sl && !sl.userData.away) chooseVideo(active, sl); return true; }
    if (k === '/' || k === 'b' || k === 'B') { $('#epQ').focus(); return true; }
    if (k === 'Escape' || k === 'Backspace') { closeCase(false); return true; }
  } else if (mode === 'open') {
    if (k === 'm' || k === 'M') { if (!active.g.video) openManual(); return true; }
    if (k === 'Enter' || k === 'd' || k === 'D') { insertDisc(); return true; }
    if (k === 'Escape' || k === 'Backspace') { closeCase(false); return true; }
  } else if (mode === 'playing') { if (k === 'Escape' || (!PLAYNITE && k === 'Enter')) { doAct('quit'); return true; } }
  return false;
}
window.addEventListener('keydown', e => {
  const tg = e.target, tag = tg.tagName;
  if (tag === 'TEXTAREA') { if (e.key === 'Escape') { closeManual(); e.preventDefault(); } return; }
  if (tag === 'INPUT' || tag === 'SELECT') { if (e.key === 'Escape') tg.blur(); return; }
  if (tag === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;
  if (e.key === 'Escape' && !setPop.hidden) { setPop.hidden = true; return; }
  if (e.key === 'Escape' && !$('#filterPop').hidden) { closeFilterPop(); return; }
  if (LIB.hostPad && /^(Arrow|Page)/.test(e.key) && LIB.dupe(e.key, 'key')) { e.preventDefault(); return; }
  sfx.init(); if (handleKey(e.key)) e.preventDefault();
});
const gp = { prev: {}, stickT: 0 };
function pollGamepad(dt) {
  if (LIB.hostPad) return;
  let pads; try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { return; }
  const p = pads && Array.from(pads).find(Boolean); if (!p) return;
  const map = { 0: 'Enter', 1: 'Escape', 2: 'm', 3: 'f', 4: 'q', 5: 'e', 6: 'z', 7: 'c', 8: 'i', 9: 'Enter', 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight' };
  for (const k in map) { const on = !!(p.buttons[k] && p.buttons[k].pressed); if (on && !gp.prev[k]) { sfx.init(); handleKey(map[k]); } gp.prev[k] = on; }
  const ax = p.axes[0] || 0, ay = p.axes[1] || 0; gp.stickT -= dt;
  if (gp.stickT <= 0 && (Math.abs(ax) > .6 || Math.abs(ay) > .6)) { gp.stickT = .16; handleKey(Math.abs(ax) > Math.abs(ay) ? (ax > 0 ? 'ArrowRight' : 'ArrowLeft') : (ay > 0 ? 'ArrowDown' : 'ArrowUp')); }
}
function onResize() {
  renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  syncHudHeight(); viewPose(cam.view, cam.tPos, cam.tLook);
  if (mode === 'manual') { const was = book.single; sizeBook(); if (was !== book.single) { book.i = 0; renderSpread(); } }
}
window.addEventListener('resize', onResize);
$('#closeBtn').addEventListener('click', () => LIB.send('close'));
/* the sidebar's window buttons, and the top bar as the window's title bar: drag to move it, double-click to maximise */
$('#winctl').addEventListener('click', e => { const b = e.target.closest('[data-win]'); if (b) LIB.send('window', { act: b.dataset.win }); });
const winGrip = e => document.documentElement.classList.contains('pn-desktop') && (e.target.classList.contains('tools') || e.target.closest('.brand'));
document.querySelector('.hud-top').addEventListener('mousedown', e => { if (e.button === 0 && winGrip(e)) LIB.send('window', { act: 'drag' }); });
document.querySelector('.hud-top').addEventListener('dblclick', e => { if (winGrip(e)) LIB.send('window', { act: 'max' }); });
/* the shelves bar: the mouse wheel scrolls it sideways */
$('#pills').addEventListener('wheel', e => { const el = e.currentTarget; if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return; el.scrollBy({ left: e.deltaY, behavior: 'auto' }); e.preventDefault(); }, { passive: false });

/* =====================================================================
   LOOP
   ===================================================================== */
let lastT = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  if (LIB.paused || document.hidden) { lastT = now; return; }
  const dt = clamp((now - lastT) / 1000, 0, .05); lastT = now;
  runTweens(now); updateCamera(dt); updateLens(dt, now); if (RL.group.visible) updateRoulette(dt, now);
  /* while zoomed the view still drifts a little with the mouse parallax: keep the hover on what is under the mouse */
  if (lens.k > 0 && mode === 'shelf' && !busy && !kbNav && !drag && !pointer.out && pointer.live && pointer.type === 'mouse' && now - lens.hitT > 120) { lens.hitT = now; const h = hit(); setHovered(h ? h.case : null); canvasEl.style.cursor = h ? 'pointer' : 'default'; } updateRoom(dt, now); pollGamepad(dt); updateStudio(dt, now);
  const inspecting = (mode === 'inspect' || mode === 'open') && !drag;
  tilt.tx = inspecting && pointer.type === 'mouse' && !RM ? -pointer.y * .1 : 0; tilt.ty = inspecting && pointer.type === 'mouse' && !RM ? pointer.x * .16 : 0;
  tilt.x += (tilt.tx - tilt.x) * (1 - Math.exp(-5 * dt)); tilt.y += (tilt.ty - tilt.y) * (1 - Math.exp(-5 * dt));
  const pulse = .55 + .3 * Math.sin(now * .005);
  for (const c of cases) { if (c.disposed) continue; c.glowT = mode === 'shelf' && c === hovered ? (kbNav ? 1 : .7) : c.match ? pulse : 0; c.update(dt); }
  if (heldTape && !heldTape.disposed) heldTape.update(dt);
  for (const c of looseCases) if (!c.disposed) c.update(dt);
  musicTick(dt, now);
  if (active && active.disc) {
    const on = mode === 'open';
    active.discLabelMat.emissive.setScalar(on && hoverPart === 'disc' ? .16 : 0);
    active.manMat.emissive.setScalar(on && hoverPart === 'manual' ? .14 : 0);
    if (on && active.dim.media === 'disc') active.disc.rotation.z += dt * (hoverPart === 'disc' ? 1.2 : 0);
  }
  updateParticles(dt); updateMotes(dt, now); updateContacts();
  drawTV(now); updateTvLight(now); drawBoard(); updateBackTrailer(now);
  if (mode === 'playing') { const m = Math.max(0, Math.floor((now - playStart) / 1000)); $('#playTime').textContent = PLAYNITE ? `${String(Math.floor(m / 3600)).padStart(2, '0')}:${String(Math.floor(m / 60) % 60).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
  renderer.render(scene, camera);
  if (!tipEl.hidden) placeTip();
}

/* =====================================================================
   BOOT
   ===================================================================== */
async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const faces = ['800 40px "Saira Extra Condensed"', '600 40px "Saira Extra Condensed"', '400 20px Figtree', '600 20px Figtree', '700 20px Figtree', '800 20px Figtree', '40px Bungee', 'italic 700 40px Fraunces', '700 40px Fraunces', '500 20px "JetBrains Mono"', '700 20px "JetBrains Mono"', '20px "Press Start 2P"', '40px "Permanent Marker"'];
  try { await Promise.race([Promise.all(faces.map(f => document.fonts.load(f))), new Promise(r => setTimeout(r, 3000))]); } catch (e) { }
}
async function boot() {
  await loadFonts();
  if (PLAYNITE) {
    $('#loadMsg').textContent = T('Leyendo tu biblioteca de Playnite…');
    const ok = await Promise.race([LIB.boot().then(() => true), new Promise(r => setTimeout(() => r(false), 20000))]);
    if (!ok) { $('#loadMsg').textContent = T('Playnite no ha contestado. Cierra la estantería y vuelve a abrirla.'); return; }
  } else initDemoGames();
  /* printed parts (stickers, the tray, the pull tab) are drawn once the language is known */
  buildSharedMaterials(); applyLight(prefs.light);
  document.documentElement.classList.toggle('is-demo', !PLAYNITE);
  applyStage(curSysKey());
  buildGroups();
  curGroup = Math.max(0, groups.findIndex(g => g.key === prefs.shelf)); curPage = 0;
  applyRoom(ROOMS[prefs.room] ? prefs.room : 'salon');
  layoutPage();
  /* the EmuVR models this room uses are read in the background and swapped in when ready */
  UGCS.load(UGCS.keysFor(curSysKey())).then(() => { if (UGCS.keysFor(curSysKey()).some(k => UGCS.models.has(k))) refreshStage(); });
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); syncHudHeight();
  setView('shelf'); cam.pos.copy(cam.tPos).add(new V3(RM ? 0 : 6, RM ? 0 : 10, RM ? 0 : 60)); cam.look.copy(cam.tLook);
  setTray(0); tvSet('standby'); setLed(false); renderSettings(); renderPills(); renderBrand();
  if (sfx.on) setTimeout(() => sfx.init(), 400);
  setMode('shelf');
  requestAnimationFrame(t => { lastT = t; frame(t); const l = $('#load'); l.classList.add('gone'); setTimeout(() => { l.hidden = true; }, 600); });
  if (PLAYNITE && LIB.running && LIB.running.length) { const r = LIB.running[0]; setTimeout(() => restorePlaying(r.id, r.seconds), 600); }
  else if (LIB.focusId) { const id = LIB.focusId; LIB.focusId = null; setTimeout(() => LIB.focusGame(id), 900); }
}
window.__mvl = { rlAt: t => { RL.debugT = t; }, camSnap: () => { cam.pos.copy(cam.tPos); cam.look.copy(cam.tLook); cam.snap = true; }, rl: () => { const w = x => { x %= 2 * Math.PI; return x > Math.PI ? x - 2 * Math.PI : x < -Math.PI ? x + 2 * Math.PI : x; }; return { mode, spinning: RL.spinning, result: RL.result && RL.result.t, pool: RL.pool.length, onWheel: new Set(RL.pockets.filter(Boolean)).size, idx: RL.resultIdx, ballOff: RL.resultIdx >= 0 ? +w(RLB.a - (rlPocketA(RL.resultIdx) - rlRotor.rotation.y)).toFixed(4) : null, ballR: +RLB.r.toFixed(2), glow: +RL.glow.material.opacity.toFixed(2), gp: RL.glow.position.toArray().map(v => +v.toFixed(1)), gr: RL.glow.rotation.toArray().slice(0, 3).map(v => +v.toFixed(2)) }; }, lens: () => ({ k: +lens.k.toFixed(3), want: lens.want, hovered: hovered && hovered.g.title }), spinePx: i => { const c = navOrder[i]; if (!c) return null; camera.updateMatrixWorld(); const v = spineWorld(c, new V3()).project(camera); return [Math.round((v.x + 1) / 2 * innerWidth), Math.round((1 - v.y) / 2 * innerHeight)]; }, mus: () => ({ state: MPLAY.state, i: MPLAY.i, n: MPLAY.q.length, t: +MPLAY.time().toFixed(1), held: MUSIC.held && MUSIC.held.g.id, heldMode: MUSIC.held && MUSIC.held.mode, bag: BAG.length, flipAt: MPLAY.flipAt, side: MPLAY.side, medium: MPLAY.medium() }), musicAct, bagAdd: id => bagAdd((GAMES.find(g => g.music && g.kind === 'song' && g.track.id === id) || {}).track), playBag, songs: () => GAMES.filter(g => g.music && g.kind === 'song').slice(0, 8).map(g => g.track.id), setSysKey: k => { prefs.sys = k; prefs.shelf = '__all'; applyStage(k); buildGroups(); curGroup = 0; curPage = 0; layoutPage(); setView('shelf'); renderPills(); renderBrand(); renderSysbar(); }, dbgActive: () => active && { fmt: active.g.fmt, dim: active.dim.name, multi: active.multi ? { kind: active.multi.kind, eps: active.multi.eps.length, page: active.multi.page } : null, interior: !!active.interior, seasons: active.g.seasons ? active.g.seasons.length : null, eps: seasonOf(active.g) && seasonOf(active.g).eps ? seasonOf(active.g).eps.length : null }, room: n => switchRoom(n), sfxState: () => ({ ctx: !!sfx.ctx, rec: Object.fromEntries(Object.entries(sfx.rec || {}).map(([k, v]) => [k, v.map(x => +x.hit.toFixed(3))])) }), pick: i => pick(navOrder[i]), pickId: id => pick(navOrder.find(c => c.g.id === id)), act: doAct, sys: setSystem, dbgCases: () => [...caseById.values()].filter(c => c.root.visible && (c.mode !== 'home' || c.root.position.distanceTo(c.home.pos) > 1)).map(c => [c.g.id, c.mode, c.root.position.toArray().map(v => +v.toFixed(1)), +c.root.scale.x.toFixed(2), c.openA]), cam: () => ({ pos: camera.position.toArray().map(v => +v.toFixed(1)), look: cam.look.toArray().map(v => +v.toFixed(1)), fov: camera.fov, room: tvRoom.visible, tv: tvGroup.visible, flat: flatTv.visible, con: conGroup.visible, pc: pcGroup.visible, tray: pcTray ? +pcTray.position.z.toFixed(2) : null, fmt: active && active.g.fmt, port: active && portOf(active).kind }), systems: () => systemsList().map(s => s.key), state: () => ({ mode, busy, view: cam.view, stage: STAGE.name, sys: STAGE.sys, device: DEV.cur && DEV.cur.name, screen: STAGE.screen, group: groups[curGroup] && groups[curGroup].label, page: curPage, pages: groups[curGroup] && groups[curGroup].pages.length, onShelf: navOrder.length, alive: caseById.size, games: GAMES.length }), turn, openManual, closeManual, setGroup, setPage, key: handleKey, lib: LIB, games: () => navOrder.map(c => ({ id: c.g.id, t: c.g.t, installed: c.g.installed, fmt: c.g.fmt })), ui: () => ({ studio: +studio.a.toFixed(3), toast: $('#toast').textContent, note: $('#playNote').textContent, eyebrow: $('#playEyebrow').textContent, pn: Object.assign({}, PN_STATE, { pendingEject: !!PN_STATE.pendingEject }), playnite: PLAYNITE }) };
boot();
