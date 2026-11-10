
/* =====================================================================
   SHOWCASE: left alone for a while, the shelf shows itself off the way a
   shop window does. The view walks up to one game after another, now and
   then takes one out, turns it round to show its back and puts it away,
   and moves on to the next room (or the next shelf). The top bar fades
   out meanwhile, and it makes no sound. Any key, click, wheel or button
   stops it (that first press does nothing else), and so does moving the
   mouse: you are back in the room and at the shelf you were at, unless it
   had a game out, which then stays in your hands.
   Settings → General → Showcase: after 1, 3 or 10 minutes, or never.
   It only starts with the shelf at rest and its window in use: nothing in
   your hands, no panel open, nothing being typed.
   ===================================================================== */
const SHOW = { on: false, idle: performance.now(), t: 0, n: 0, own: null, take: false, k: 0, roomT: 0, mx: -1, my: -1, eat: false, home: null };
function showAfter() { const m = +prefs.attract; return m > 0 ? m * 60000 : 0; }
function showFree() {
  return mode === 'shelf' && !busy && !swapBusy && !DECO.on && !(typeof FIT !== 'undefined' && FIT.open) && cam.view !== 'roulette'
    && !document.documentElement.classList.contains('rl-on') && setPop.hidden && $('#filterPop').hidden && $('#lib').hidden
    && document.activeElement !== $('#q') && navOrder.length > 0 && document.hasFocus() && !document.hidden;
}
function showStart(now) {
  SHOW.on = true; SHOW.n = 0; SHOW.own = null; SHOW.take = false; SHOW.roomT = now; SHOW.t = now + 400;
  /* where you were: stopping it brings you back here */
  SHOW.home = { sys: isRooms() ? curSysKey() : null, shelf: groups[curGroup] ? groups[curGroup].key : '__all', page: curPage };
  /* nobody is there to hear it: no clicks, no scrapes, no trailer playing aloud */
  sfx.hush = true;
  document.documentElement.classList.add('showcase'); tipEl.hidden = true; renderPrompts();
  if (!prefs.attractTold) { prefs.attractTold = 1; savePrefs(); toast(T('Escaparate: se para con cualquier tecla. Se elige en Ajustes → General.'), 7000); }
}
function showStop() {
  if (!SHOW.on) return;
  SHOW.on = false; SHOW.own = null; SHOW.take = false; SHOW.idle = performance.now();
  sfx.hush = false; if (trailer.video) trailer.video.volume = trailerVolume();
  document.documentElement.classList.remove('showcase');
  /* on the shelf the view steps back to the whole room, and to the room and the shelf you were at;
     a game it had taken out stays in your hands */
  const h = SHOW.home; SHOW.home = null;
  if (mode === 'shelf' && !busy && !swapBusy) {
    kbNav = false; setHovered(null); if (cam.view === 'browse') setView('shelf');
    const shelf = () => { const i = groups.findIndex(g => g.key === h.shelf); if (i >= 0 && i !== curGroup) return setGroup(i, true); if (i === curGroup && curPage !== h.page) return setPage(h.page, true); };
    if (h && h.sys && curSysKey() !== h.sys && systemsList().some(x => x.key === h.sys)) Promise.resolve(setSystem(0, h.sys)).then(shelf);
    else if (h) shelf();
  }
  renderPrompts();
}
/* something was touched: the wait starts again, and a showcase under way stops (true: that touch was only for stopping it) */
function showPoke() { SHOW.idle = performance.now(); if (!SHOW.on) return false; showStop(); return true; }
/* the view walks up to a game, the way the pad's focus does, without the pad's tick */
function showLook(c) {
  pointer.live = false; focus = c; kbNav = false; setHovered(c); kbNav = true;
  if (inCabinet()) { cam.browseX = c.home.x; cam.browseRow = c.row; setView('browse'); }
  else if (!isCases()) { cam.browseX = c.home.x; setView('browse'); }
}
/* the next room, the next shelf or the next page, whichever there is */
function showMove() {
  kbNav = false; setHovered(null);
  if (isRooms() && systemsList().length > 1) { setSystem(1); return true; }
  if (groups.length > 1) { setGroup(curGroup + 1, true); return true; }
  const gr = groups[curGroup], np = gr ? gr.pages.length : 1;
  if (np > 1) { setPage((curPage + 1) % np, true); return true; }
  if (cam.view === 'browse') setView('shelf');
  return false;
}
function showStep(now) {
  /* a game in its hands: the front, the back, the front again, and back to its place */
  if (SHOW.own) {
    if (busy || mode === 'busy') { SHOW.t = now + 300; return; }
    if (mode === 'shelf') { SHOW.own = null; SHOW.t = now + 1600; return; }
    if (mode !== 'inspect' || active !== SHOW.own) { showStop(); return; }
    SHOW.k++;
    if (SHOW.k === 1) SHOW.t = now + 4200;
    else if (SHOW.k === 2) { flipCase(); SHOW.t = now + 4400; }
    else if (SHOW.k === 3) { flipCase(); SHOW.t = now + 2000; }
    else { putBack(); SHOW.t = now + 500; }
    return;
  }
  /* the window is no longer the one in use, or something else took over: it stops */
  if (mode !== 'shelf' || !document.hasFocus()) { showStop(); return; }
  if (busy || swapBusy) { SHOW.t = now + 400; return; }
  SHOW.n++;
  /* every so often (or at once from an empty shelf), on to the next room */
  if (now - SHOW.roomT > 44000 || !navOrder.length) { SHOW.roomT = now; if (showMove()) { SHOW.t = now + 5600; return; } }
  const L = navOrder.filter(c => !c.disposed && c !== hovered); if (!L.length) { SHOW.t = now + 2500; return; }
  const c = L[Math.floor(Math.random() * L.length)];
  showLook(c);
  /* one in four comes out (never one still wrapped or under its dust, nor films and records, which have their own ways) */
  if (SHOW.n % 4 === 0 && !c.g.wrapped && !(c.g.dust > .3) && !c.g.video && !c.g.music) { SHOW.own = c; SHOW.k = 0; SHOW.t = now + 2600; SHOW.take = true; return; }
  SHOW.t = now + 5600;
}
function showTick(now) {
  if (!SHOW.on) {
    const after = showAfter();
    if (!after || !showFree()) { SHOW.idle = now; return; }
    if (now - SHOW.idle > after) showStart(now);
    return;
  }
  if (now < SHOW.t) return;
  if (SHOW.take) { SHOW.take = false; if (SHOW.own && mode === 'shelf' && !busy && !SHOW.own.disposed && navOrder.includes(SHOW.own)) { pick(SHOW.own); SHOW.t = now + 900; } else { SHOW.own = null; SHOW.t = now + 600; } return; }
  showStep(now);
}
/* what stops it: keys, clicks, the wheel and a touch (swallowed while it was on), and the mouse really moving */
['keydown', 'pointerdown', 'wheel', 'touchstart'].forEach(ev => window.addEventListener(ev, e => {
  if (!showPoke()) return;
  e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault();
  if (ev === 'pointerdown') SHOW.eat = true;
}, { capture: true, passive: false }));
['pointerup', 'click'].forEach(ev => window.addEventListener(ev, e => { if (!SHOW.eat) return; e.stopImmediatePropagation(); if (e.cancelable) e.preventDefault(); if (ev === 'click') SHOW.eat = false; else setTimeout(() => { SHOW.eat = false; }, 60); }, { capture: true }));
window.addEventListener('pointermove', e => {
  if (SHOW.mx < 0) { SHOW.mx = e.clientX; SHOW.my = e.clientY; return; }
  if (Math.abs(e.clientX - SHOW.mx) + Math.abs(e.clientY - SHOW.my) < 8) return;
  SHOW.mx = e.clientX; SHOW.my = e.clientY; showPoke();
}, { capture: true, passive: true });
