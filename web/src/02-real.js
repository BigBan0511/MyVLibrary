
/* =====================================================================
   REALISM HELPERS: photographic grading for print, real materials
   ===================================================================== */
function addGrain() { }
/* soften the flat vector art, light it like a printed photo and add grain */
function gradeArt(x, W, H, r) {
  if ('filter' in x) {
    const tmp = mkCanvas(W, H); tmp.getContext('2d').drawImage(x.canvas, 0, 0);
    x.save(); x.filter = 'blur(0.8px) saturate(0.8) contrast(1.06)'; x.drawImage(tmp, 0, 0); x.restore(); x.filter = 'none';
  }
  x.save(); x.globalCompositeOperation = 'soft-light';
  x.fillStyle = lg(x, 0, 0, W * .8, H, [[0, 'rgba(255,238,215,.55)'], [.55, 'rgba(128,128,128,0)'], [1, 'rgba(0,0,0,.55)']]); x.fillRect(0, 0, W, H);
  x.restore();
  x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = 'rgba(232,222,206,1)'; x.fillRect(0, 0, W, H); x.restore();
  addGrain(x, W, H, r, 16);
}
function makeRealWood(w, h, base, seed, opts = {}) {
  const c = mkCanvas(w, h), x = c.getContext('2d'), r = rng(seed), planks = opts.planks || 1, ph = h / planks;
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let p = 0; p < planks; p++) {
    const y0 = p * ph, tint = (r() - .5) * .16;
    x.fillStyle = tint > 0 ? `rgba(255,232,205,${tint})` : `rgba(28,14,5,${-tint})`; x.fillRect(0, y0, w, ph);
    for (let i = 0; i < 16; i++) {
      const yy = y0 + r() * ph, bh = ph * (.04 + r() * .16), f = 1 + r() * .8, ph2 = r() * 6;
      x.fillStyle = r() > .5 ? `rgba(55,28,10,${.04 + r() * .07})` : `rgba(255,228,196,${.025 + r() * .05})`;
      x.beginPath(); x.moveTo(0, yy); for (let u = 0; u <= w; u += w / 32) x.lineTo(u, yy + Math.sin(u / w * 6.28 * f + ph2) * ph * .025);
      for (let u = w; u >= 0; u -= w / 32) x.lineTo(u, yy + bh + Math.sin(u / w * 6.28 * f + ph2 + .4) * ph * .025); x.closePath(); x.fill();
    }
    for (let i = 0; i < ph * 1.4; i++) {
      const yy = y0 + r() * ph, amp = .4 + r() * 1.8, f = 1 + r() * 2.5, ps = r() * 6;
      x.strokeStyle = `rgba(38,18,7,${.025 + r() * .085})`; x.lineWidth = .35 + r() * 1.1;
      x.beginPath(); x.moveTo(0, yy); for (let u = 0; u <= w; u += w / 40) x.lineTo(u, yy + Math.sin(u / w * 6.28 * f + ps) * amp); x.stroke();
    }
    for (let i = 0; i < w * ph / 80; i++) { x.fillStyle = `rgba(22,10,4,${.12 + r() * .22})`; x.fillRect(r() * w, y0 + r() * ph, 2 + r() * 7, .7); }
    if (planks > 1) { x.fillStyle = 'rgba(14,7,3,.6)'; x.fillRect(0, y0, w, 1.6); const cut = r() * w; x.fillRect(cut, y0, 1.6, ph); }
  }
  addGrain(x, w, h, r, 8);
  return c;
}
function makePlasterCanvas() {
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(41);
  x.fillStyle = '#8a8178'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) { x.fillStyle = r() > .5 ? `rgba(255,248,236,${.02 + r() * .035})` : `rgba(40,32,26,${.02 + r() * .035})`; x.beginPath(); x.arc(r() * S, r() * S, 20 + r() * 90, 0, 7); x.fill(); }
  addGrain(x, S, S, r, 12);
  return c;
}
function makeRugCanvas() {
  const W = 1024, H = 192, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(42);
  x.fillStyle = '#4d4038'; x.fillRect(0, 0, W, H);
  x.strokeStyle = '#3a2f29'; x.lineWidth = 14; x.strokeRect(10, 10, W - 20, H - 20);
  x.strokeStyle = 'rgba(150,120,95,.25)'; x.lineWidth = 2; x.strokeRect(26, 26, W - 52, H - 52);
  for (let i = 0; i < 9; i++) { const cx = 70 + i * 110; x.strokeStyle = 'rgba(140,110,88,.18)'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx, 60); x.lineTo(cx + 30, 96); x.lineTo(cx, 132); x.lineTo(cx - 30, 96); x.closePath(); x.stroke(); }
  for (let i = 0; i < W * H / 3; i++) { x.fillStyle = r() > .5 ? `rgba(255,240,220,${r() * .05})` : `rgba(0,0,0,${r() * .08})`; x.fillRect(r() * W, r() * H, 1, 1 + r() * 2); }
  return c;
}
function makeLinenCanvas() {
  const S = 256, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(43);
  x.fillStyle = '#e6dbc6'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < S; i += 2) { x.fillStyle = `rgba(120,100,70,${.04 + r() * .06})`; x.fillRect(0, i, S, 1); x.fillRect(i, 0, 1, S); }
  addGrain(x, S, S, r, 14); return c;
}
/* fake ambient occlusion inside shelf compartments */
function makeAOBack() {
  const W = 256, H = 160, c = mkCanvas(W, H), x = c.getContext('2d');
  const band = (x0, y0, x1, y1, w, h, a) => { x.fillStyle = lg(x, x0, y0, x1, y1, [[0, `rgba(0,0,0,${a})`], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, w, h); };
  /* one soft falloff from the dark top to the floor, with no lit stripe left in the middle */
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, 'rgba(0,0,0,.64)'], [.3, 'rgba(0,0,0,.38)'], [.6, 'rgba(0,0,0,.26)'], [.86, 'rgba(0,0,0,.3)'], [1, 'rgba(0,0,0,.42)']]); x.fillRect(0, 0, W, H);
  band(0, 0, W * .16, 0, W, H, .45); band(W, 0, W * .84, 0, W, H, .45);
  return c;
}
function makeAOFloor() {
  const W = 256, H = 192, c = mkCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = lg(x, 0, 0, 0, H * .55, [[0, 'rgba(0,0,0,.55)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, W, H);
  x.fillStyle = lg(x, 0, 0, W * .12, 0, [[0, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, W, H);
  x.fillStyle = lg(x, W, 0, W * .88, 0, [[0, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, W, H);
  return c;
}
function makeContactCanvas() {
  const S = 128, c = mkCanvas(S, S), x = c.getContext('2d');
  x.filter = 'blur(10px)'; x.fillStyle = 'rgba(0,0,0,.85)'; x.fillRect(S * .22, S * .22, S * .56, S * .56); x.filter = 'none';
  if (!('filter' in x)) { x.clearRect(0, 0, S, S); x.fillStyle = rg(x, S / 2, S / 2, S * .1, S * .5, [[0, 'rgba(0,0,0,.8)'], [1, 'rgba(0,0,0,0)']]); x.fillRect(0, 0, S, S); }
  return c;
}
function makeLabelCanvas(label, count) {
  const W = 768, H = 88, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(hash(label));
  x.fillStyle = '#ece4d3'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#26211c'; x.textBaseline = 'middle'; x.textAlign = 'left';
  let fs = 56; x.font = `800 ${fs}px ${F.saira}`; while (x.measureText(label.toUpperCase()).width > W - 200 && fs > 24) { fs -= 2; x.font = `800 ${fs}px ${F.saira}`; }
  x.fillText(label.toUpperCase(), 26, H / 2 + 2);
  x.textAlign = 'right'; x.font = `700 22px ${F.mono}`; x.fillStyle = '#6b5d4a'; x.fillText(T(count === 1 ? '{0} JUEGO' : '{0} JUEGOS', count), W - 24, H / 2 + 2);
  addGrain(x, W, H, r, 14); return c;
}
function makeBezelCanvas() {
  const W = 720, H = 600, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(44);
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#2a2b30'], [1, '#1c1d21']]); x.fillRect(0, 0, W, H);
  for (let i = 0; i < H; i += 2) { x.fillStyle = `rgba(255,255,255,${r() * .018})`; x.fillRect(0, i, W, 1); }
  x.fillStyle = 'rgba(0,0,0,.35)'; for (let row = 0; row < 3; row++) for (let i = 0; i < 46; i++) { x.beginPath(); x.arc(150 + i * 9.5, 520 + row * 10, 2.2, 0, 7); x.fill(); }
  x.fillStyle = '#b9bcc4'; x.font = `700 15px ${F.fig}`; x.textAlign = 'left'; x.fillText('VISIÓN 21', 40, 556);
  x.fillStyle = '#121316'; rr(x, 590, 535, 40, 16, 4); x.fill(); x.fillStyle = '#c23a2e'; x.beginPath(); x.arc(650, 543, 3.5, 0, 7); x.fill();
  addGrain(x, W, H, r, 6); return c;
}
function requirements(g) {
  if (g.real) return [T('TU COPIA'), T('Plataforma: {0}', (g.platName || g.plat || '—').slice(0, 34)), T('Origen: {0}', (g.src || '—').slice(0, 36)), T(g.installed ? 'Instalado en este equipo' : 'Sin instalar')];
  if (g.fmt === 'floppy') return [T('REQUISITOS MÍNIMOS'), `MS-DOS 6.22 · Windows ${g.year < 1996 ? '3.1' : '95'}`, T('{0} · {1} MB de RAM', g.year < 1996 ? '486 DX2 66 MHz' : 'Pentium 75 MHz', g.year < 1996 ? 4 : 8), T('Unidad de disquete de 3½" HD')];
  if (g.fmt === 'cart') return [T('EN LA CAJA'), T('Cartucho de 16 bits'), T('Pila para guardar la partida'), T('Manual de instrucciones')];
  if (g.year < 2005) return [T('REQUISITOS MÍNIMOS'), `Windows ${g.year < 1998 ? '95' : '98'} · Pentium ${g.year < 1998 ? '133' : '266'} MHz`, T('{0} MB de RAM · CD-ROM {1}', g.year < 1998 ? '16' : '64', g.year < 1998 ? '4x' : '24x'), T('Tarjeta de sonido compatible')];
  return [T('REQUISITOS MÍNIMOS'), T('Windows 10 de 64 bits · 4 núcleos'), T('{0} GB de RAM · {1} GB libres', g.year > 2021 ? 16 : 8, g.year > 2021 ? 40 : 20), T('GPU con 4 GB · DirectX 12')];
}
