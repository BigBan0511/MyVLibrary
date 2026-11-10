
/* =====================================================================
   GRAPHICS: how sharp the room is drawn, so it stays smooth on any card.
   Settings → General → Graphics:
     Automatic  it watches how many pictures a second it manages and, when
                they are not enough, draws the room a little less sharp
                (and sharper again when there is room to spare);
     Sharp      always at the screen's own sharpness (up to 2×);
     Fast       softer, with smaller shadows and a still film grain, for
                modest graphics cards and laptops on battery.
   And whatever is chosen: while a game (or a film) is running in front of
   the shelf, the room is only drawn twice a second, so the game has the
   graphics card to itself.
   ===================================================================== */
const GFX = {
  steps: [1, .85, .72, .6, .5], i: 0, ceil: 0, ceilT: 0,
  n: 0, t0: 0, fps: 0, bad: 0, good: 0, skip: 2, last: 0,
  before: 0, tried: 0, useless: 0, gaveUp: false, upT: 0, saveT: 0, shadow: 2048, wake: 0
};
function gfxMode() { return prefs.gfx === 'high' || prefs.gfx === 'low' ? prefs.gfx : 'auto'; }
function gfxBase() { return Math.min(window.devicePixelRatio || 1, 2); }
function gfxScale() { const m = gfxMode(); return m === 'high' ? 1 : m === 'low' ? .72 : GFX.steps[GFX.i]; }
/* the sharpness and the shadows that go with the choice (and with where Automatic stands) */
function gfxApply() {
  const s = gfxScale(), pr = Math.max(.5, gfxBase() * s);
  if (Math.abs(renderer.getPixelRatio() - pr) > .001) { renderer.setPixelRatio(pr); renderer.setSize(innerWidth, innerHeight, false); }
  const sh = gfxMode() === 'low' || s <= .6 ? 1024 : 2048;
  if (sh !== GFX.shadow) { GFX.shadow = sh; key.shadow.mapSize.set(sh, sh); if (key.shadow.map) { key.shadow.map.dispose(); key.shadow.map = null; } }
  document.documentElement.classList.toggle('gfx-low', gfxMode() === 'low');
  gfxNote();
}
function gfxSet(i) {
  i = clamp(i, 0, GFX.steps.length - 1); if (i === GFX.i) return;
  GFX.i = i; GFX.skip = 2; GFX.bad = GFX.good = 0; gfxApply();
  /* where it settled is where it starts the next time */
  clearTimeout(GFX.saveT); GFX.saveT = setTimeout(() => { prefs.gfxAt = GFX.i; savePrefs(); }, 4000);
}
/* called with every picture drawn: counts them and, in Automatic, moves the sharpness a step when needed */
function gfxTick(now) {
  const gap = now - GFX.last; GFX.last = now;
  /* a pause (the window hidden, a file being read, a room being built) says nothing about the graphics card */
  if (gap > 1000 || busy || mode === 'loading' || mode === 'playing' || !document.hasFocus()) { GFX.n = 0; GFX.t0 = now; return; }
  if (!GFX.n) GFX.t0 = now - gap;
  GFX.n++;
  const span = now - GFX.t0; if (span < 1500) return;
  const fps = GFX.n * 1000 / span; GFX.n = 0; GFX.fps = fps; gfxNote();
  if (gfxMode() !== 'auto' || GFX.gaveUp) return;
  if (GFX.skip > 0) { GFX.skip--; return; }
  /* did the last step down help? If the pictures a second did not go up, it is not the sharpness that holds them back
     (a screen at 30 Hz, a busy processor): after two such steps it goes back to sharp and stops trying */
  if (GFX.tried) {
    GFX.tried = 0;
    if (fps < GFX.before * 1.08) { if (++GFX.useless >= 2) { GFX.gaveUp = true; gfxSet(0); return; } } else GFX.useless = 0;
  }
  if (fps < 48) {
    GFX.good = 0;
    if (++GFX.bad >= 2 && GFX.i < GFX.steps.length - 1) {
      /* stepping up just before did this: that step stays out of reach for a while */
      if (now - GFX.upT < 12000) { GFX.ceil = GFX.i + 1; GFX.ceilT = now; }
      GFX.before = fps; GFX.tried = 1; gfxSet(GFX.i + 1);
    }
  } else if (fps > 56) {
    GFX.bad = 0;
    if (GFX.ceil && now - GFX.ceilT > 180000) GFX.ceil = 0;
    if (++GFX.good >= 6 && GFX.i > GFX.ceil) { GFX.upT = now; gfxSet(GFX.i - 1); }
  } else { GFX.bad = 0; GFX.good = 0; }
}
/* true when this picture should not be drawn at all: a game is running in front and nobody is looking at the shelf
   (the window is not the one being used, and neither the mouse nor the pad has touched it for a few seconds) */
function gfxResting(now) { return mode === 'playing' && !document.hasFocus() && now - GFX.wake > 3000 && now - lastT < 480; }
function gfxWake() { GFX.wake = performance.now(); }
['pointerdown', 'keydown', 'wheel'].forEach(ev => window.addEventListener(ev, gfxWake, { passive: true, capture: true }));
/* (the browser also reports the mouse "moving" when the picture changes under a mouse at rest: only a real move counts) */
window.addEventListener('pointermove', e => { if (e.clientX === GFX.mx && e.clientY === GFX.my) return; GFX.mx = e.clientX; GFX.my = e.clientY; gfxWake(); }, { passive: true, capture: true });
/* the line under the setting: what it is managing right now */
function gfxNote() {
  const el = $('#gfxNow'); if (!el || setPop.hidden) return;
  const pct = Math.round(gfxScale() * 100), fps = GFX.fps ? Math.round(GFX.fps) : 0;
  el.textContent = fps ? T('Ahora: {0} imágenes por segundo, nitidez al {1} %.', fps, pct) : T('Ahora: nitidez al {0} %.', pct);
}
if (gfxMode() === 'auto' && Number.isInteger(prefs.gfxAt)) GFX.i = clamp(prefs.gfxAt, 0, GFX.steps.length - 1);
gfxApply();
/* moved to a screen with another scale: the sharpness follows */
window.addEventListener('resize', gfxApply);
