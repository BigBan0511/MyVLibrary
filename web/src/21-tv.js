/* =====================================================================
   TELEVISION
   ===================================================================== */
const tvCtx = tvC.getContext('2d');
const tvVig = tvCtx.createRadialGradient(256, 192, 170, 256, 192, 360); tvVig.addColorStop(0, 'rgba(0,0,0,0)'); tvVig.addColorStop(1, 'rgba(0,0,0,.42)');
const tv = { state: 'standby', t0: 0, g: null, art: null, wide: null, last: 0, sky: null };
/* the idle picture: a washed-out sky drifting by, like an old channel left on */
function makeSkyTape() {
  const W = 1024, H = 384, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(808);
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#1c4fb8'], [.55, '#3f7ad6'], [1, '#86aee6']]); x.fillRect(0, 0, W, H);
  /* every puff is also drawn one tape-width left and right, so the loop has no seam */
  for (let i = 0; i < 70; i++) {
    const cx = r() * W, cy = 60 + r() * 280, R = 30 + r() * 90;
    for (let k = 0; k < 7; k++) {
      const px = cx + (r() - .5) * R * 1.6, py = cy + (r() - .5) * R * .5, pr = R * (.35 + r() * .5), a = .35 + r() * .35;
      for (const o of [-W, 0, W]) { x.fillStyle = rg(x, px + o, py, 0, pr, [[0, `rgba(255,255,255,${a})`], [1, 'rgba(255,255,255,0)']]); x.fillRect(px + o - pr, py - pr, pr * 2, pr * 2); }
    }
  }
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '10,30,90'},${r() * .12})`; x.fillRect(r() * W, r() * H, 2, 1); }
  return c;
}
function tvSet(state, c) {
  tv.state = state; tv.t0 = performance.now();
  if (c && tv.g !== c.g) {
    tv.g = c.g; tv.art = c.coverCanvas; tv.wide = mkCanvas(1024, 384); const wx = tv.wide.getContext('2d');
    if (c.g.real) { const src = c.g.bg || c.g.cover; if (src) coverFit(wx, src, 0, 0, 1024, 384, .5, .4); else placeholderArt(wx, 1024, 384, c.g); }
    else drawArt(wx, 1024, 384, c.g, 9);
  }
}
function drawTV(now) {
  if (now - tv.last < 40) return; tv.last = now;
  const x = tvCtx, W = 512, H = 384, t = (now - tv.t0) / 1000;
  x.globalAlpha = 1; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowBlur = 0;
  if (tv.state === 'standby') {
    if (!tv.sky) tv.sky = makeSkyTape();
    const off = (now * .006) % 1024; x.drawImage(tv.sky, -off, 0); x.drawImage(tv.sky, 1024 - off, 0);
    x.fillStyle = 'rgba(255,255,255,.06)'; const band = (now * .05) % (H + 60) - 30; x.fillRect(0, band, W, 18);
    for (let i = 0; i < 260; i++) { const v = Math.random() * 120 | 0; x.fillStyle = `rgba(${v + 120},${v + 130},${v + 160},.18)`; x.fillRect(Math.random() * W, Math.random() * H, 2, 1); }
    x.fillStyle = 'rgba(210,255,220,.85)'; x.font = `700 16px ${F.mono}`; x.textAlign = 'left'; x.fillText('AV 1', 22, 26);
  } else if (tv.state === 'boot') {
    x.fillStyle = '#000000'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 4; i++) { const R = ((t * 150) + i * 60) % 240; x.strokeStyle = `rgba(255,181,71,${Math.max(0, 1 - R / 240)})`; x.lineWidth = 3; x.beginPath(); x.arc(W / 2, H / 2 - 12, R, 0, 7); x.stroke(); }
    x.globalAlpha = clamp((t - .35) / .5, 0, 1); x.fillStyle = '#f4ecdf'; x.font = `800 60px ${F.saira}`; x.fillText('MYVLIBRARY', W / 2, H / 2 - 12);
    x.font = `700 16px ${F.mono}`; x.fillStyle = '#ffb547'; x.fillText('ID-2 · ' + T('LEYENDO DISCO') + '.'.repeat(1 + (Math.floor(t * 3) % 3)), W / 2, H / 2 + 42); x.globalAlpha = 1;
  } else if (tv.state === 'wait' && tv.g) {
    x.fillStyle = '#000000'; x.fillRect(0, 0, W, H);
    x.globalAlpha = .35; if (tv.wide) x.drawImage(tv.wide, -(Math.sin(t * .2) * .5 + .5) * (1024 - W), 0); x.globalAlpha = 1;
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, 0, W, H);
    x.fillStyle = '#ffffff'; x.font = `700 20px ${F.mono}`; x.fillText(T('ARRANCANDO') + '.'.repeat(1 + (Math.floor(t * 2) % 3)), W / 2, H * .5);
    x.font = `500 13px ${F.mono}`; x.fillStyle = 'rgba(255,255,255,.7)'; x.fillText(T('Playnite está abriendo el juego'), W / 2, H * .6);
  } else if (tv.state === 'title' && tv.art) {
    const a = tv.art, sc = Math.max(W / a.width, H / a.height); x.drawImage(a, (W - a.width * sc) / 2, (H - a.height * sc) / 2 + 40, a.width * sc, a.height * sc);
    x.fillStyle = 'rgba(0,0,0,.42)'; x.fillRect(0, 0, W, H);
    const g = tv.g; let s = 64; x.font = titleFont(g, s); while (x.measureText(titleText(g)).width > W * .82 && s > 14) { s *= .94; x.font = titleFont(g, s); }
    x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 14; x.fillStyle = g.pal[4]; x.fillText(titleText(g), W / 2, H * .42); x.shadowBlur = 0;
    if (Math.floor(t * 2) % 2 === 0) { x.fillStyle = '#ffffff'; x.font = `700 20px ${F.mono}`; x.fillText(T('PULSA START'), W / 2, H * .74); }
    x.font = `500 12px ${F.mono}`; x.fillStyle = 'rgba(255,255,255,.75)'; x.fillText(`© ${g.year || ''} ${(g.dev || '').toUpperCase()}`.trim(), W / 2, H * .92);
    if (t < .5) { x.fillStyle = `rgba(0,0,0,${1 - t / .5})`; x.fillRect(0, 0, W, H); }
  } else if (tv.state === 'trailer') {
    drawTrailerFrame(x, W, H);
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(14, 14, 98, 24); x.fillStyle = '#ffffff'; x.font = `700 13px ${F.mono}`; x.textAlign = 'left'; x.fillText('▶ ' + T('TRÁILER'), 22, 27); x.textAlign = 'center';
  } else if (tv.state === 'play' && tv.wide) {
    const g = tv.g, wa = tv.wide, off = (Math.sin(t * .22) * .5 + .5) * (wa.width - W); x.drawImage(wa, -off, 0);
    if (g.real) {
      x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, H - 40, W, 40);
      x.fillStyle = '#ff5a5a'; x.beginPath(); x.arc(24, H - 20, 6, 0, 7); x.fill();
      x.fillStyle = '#ffffff'; x.font = `700 15px ${F.mono}`; x.textAlign = 'left'; x.fillText(T('EN JUEGO'), 38, H - 19);
      const m = Math.floor(t); x.textAlign = 'right'; x.fillText(`${String(Math.floor(m / 3600)).padStart(2, '0')}:${String(Math.floor(m / 60) % 60).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`, W - 18, H - 19); x.textAlign = 'center';
    } else {
      const py = H * .7 - Math.abs(Math.sin(t * 2.6)) * 46; x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(W * .32 + 12, H * .7 + 26, 16, 5, 0, 0, 7); x.fill();
      x.fillStyle = g.pal[3]; x.fillRect(W * .32, py, 24, 24); x.fillStyle = g.pal[0]; x.fillRect(W * .32 + 14, py + 6, 5, 6);
      x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, 0, W, 36);
      for (let i = 0; i < 3; i++) { x.fillStyle = '#ff5a5a'; x.fillRect(16 + i * 24, 11, 16, 14); }
      x.fillStyle = '#ffffff'; x.font = `700 16px ${F.mono}`; x.textAlign = 'right'; x.fillText(String(Math.floor(t * 137)).padStart(7, '0'), W - 16, 19); x.textAlign = 'center';
    }
  }
  x.fillStyle = 'rgba(0,0,0,.16)'; for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
  x.fillStyle = tvVig; x.fillRect(0, 0, W, H);
  tvTex.needsUpdate = true;
}
function updateTvLight(now) {
  let col = '#5d8be0', I = .32;
  if (tv.state === 'boot') { col = '#ffb547'; I = .45; }
  if ((tv.state === 'title' || tv.state === 'play' || tv.state === 'wait') && tv.g) { col = tv.g.pal[2]; I = .6 + Math.sin(now * .013) * .06 + (Math.random() - .5) * .05; }
  tvLight.color.lerp(new THREE.Color(col), .08); tvLight.intensity += (I - tvLight.intensity) * .08;
}
function setLed(on) { ledMat.color.set(on ? '#4dff88' : '#ff9b3a'); }

/* ---------- trailer: on the TV and on the back of the case while the game is in your hands ---------- */
const trailer = { video: null, c: null, ready: false, lastBack: 0 };
function trailerVolume() { return prefs.sound === 'off' || prefs.trailer !== 'on' ? 0 : clamp(prefs.vol / 100, 0, 1) * .7; }
function startTrailer(c) {
  if (!c || !c.g.trailerUrl || prefs.trailer === 'off') return;
  if (trailer.c === c && trailer.video) { trailer.video.play().catch(() => { }); if (trailer.ready && tv.state === 'standby') tvSet('trailer', c); return; }
  stopTrailer();
  const v = document.createElement('video'); v.crossOrigin = 'anonymous'; v.loop = true; v.playsInline = true; v.preload = 'auto';
  v.volume = trailerVolume(); v.muted = v.volume === 0; v.src = c.g.trailerUrl;
  trailer.video = v; trailer.c = c; trailer.ready = false;
  v.addEventListener('canplay', () => { if (trailer.video !== v) return; trailer.ready = true; if (active === c && (mode === 'inspect' || mode === 'open' || mode === 'manual')) tvSet('trailer', c); }, { once: true });
  v.addEventListener('error', () => { if (trailer.video === v) stopTrailer(); }, { once: true });
  v.play().catch(() => { v.muted = true; v.play().catch(() => { }); });
}
function stopTrailer() {
  const v = trailer.video; if (!v) return;
  try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { }
  trailer.video = null; trailer.c = null; trailer.ready = false;
  if (tv.state === 'trailer') tvSet('standby');
}
function drawTrailerFrame(x, W, H) {
  const v = trailer.video; if (!v || v.readyState < 2) { x.fillStyle = '#000'; x.fillRect(0, 0, W, H); return; }
  const vw = v.videoWidth || 16, vh = v.videoHeight || 9, sc = Math.max(W / vw, H / vh);
  x.drawImage(v, (W - vw * sc) / 2, (H - vh * sc) / 2, vw * sc, vh * sc);
}
/* the back of the case has a window where the trailer plays, painted straight into its texture */
function updateBackTrailer(now) {
  const c = active;
  if (!c || c !== trailer.c || !trailer.ready || !c.backTex || !c.g.backSlot || now - trailer.lastBack < 50) return;
  if (!(c.flipA > 1.2 || mode === 'open')) return;
  trailer.lastBack = now;
  const cv = c.backTex.image, x = cv.getContext('2d'), s = c.g.backSlot;
  x.save(); x.beginPath(); x.rect(s.x, s.y, s.w, s.h); x.clip(); x.translate(s.x, s.y); drawTrailerFrame(x, s.w, s.h); x.restore();
  c.backTex.needsUpdate = true;
}
