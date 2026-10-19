/* =====================================================================
   WHITEBOARD: whatever you are looking at, written in marker
   ===================================================================== */
const boardCtx = boardC.getContext('2d');
const BW = boardC.width, BH = boardC.height;
const bd = { key: '', ghost: null };
const INK = '#26282e', INK2 = '#2a4f9e', INK3 = '#a3282c';
function makeBoardGhost() {
  const c = mkCanvas(BW, BH), x = c.getContext('2d'), r = rng(77);
  x.fillStyle = lg(x, 0, 0, BW, BH, [[0, '#fbfbf8'], [.5, '#f2f2ee'], [1, '#e9e9e4']]); x.fillRect(0, 0, BW, BH);
  /* old writing that was never quite wiped */
  x.globalAlpha = .045; x.fillStyle = '#30343c'; x.font = `64px ${F.marker}`;
  ['REPASAR', 'LUNES', 'NIVEL 4', 'CLAVE: 3-1-4'].forEach((t, i) => { x.save(); x.translate(80 + r() * BW * .6, 140 + i * 150 + r() * 40); x.rotate((r() - .5) * .12); x.fillText(t, 0, 0); x.restore(); });
  x.globalAlpha = .05; x.strokeStyle = '#30343c'; x.lineWidth = 40; x.lineCap = 'round';
  for (let i = 0; i < 7; i++) { x.beginPath(); const y = r() * BH; x.moveTo(r() * BW * .3, y); x.bezierCurveTo(BW * .4, y + (r() - .5) * 90, BW * .6, y + (r() - .5) * 90, BW * (.7 + r() * .3), y + (r() - .5) * 60); x.stroke(); }
  x.globalAlpha = 1;
  /* a soft reflection of the ceiling light */
  x.fillStyle = lg(x, 0, 0, BW * .9, BH * .6, [[0, 'rgba(255,255,255,0)'], [.5, 'rgba(255,255,255,.55)'], [.62, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, BW, BH);
  return c;
}
function marker(x, text, X, Y, size, o = {}) {
  x.save(); x.translate(X, Y); x.rotate(o.rot ?? -.012); x.font = `${size}px ${F.marker}`; x.fillStyle = o.col || INK; x.textBaseline = 'alphabetic'; x.textAlign = o.align || 'left';
  x.globalAlpha = o.a ?? .93; x.fillText(text, 0, 0); x.restore();
  x.font = `${size}px ${F.marker}`; return x.measureText(text).width;
}
function scribbleLine(x, X0, X1, Y, col = INK, w = 4) {
  x.save(); x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.globalAlpha = .9; x.beginPath(); x.moveTo(X0, Y);
  for (let px = X0; px <= X1; px += 18) x.lineTo(px, Y + Math.sin(px * .045) * 2.2 + (px - X0) * .004);
  x.stroke(); x.restore();
}
function fitMarker(x, text, maxW, size, min = 26) { x.font = `${size}px ${F.marker}`; while (x.measureText(text).width > maxW && size > min) { size -= 2; x.font = `${size}px ${F.marker}`; } return size; }
function wrapMarker(x, text, X, Y, maxW, size, lh, maxLines, col) {
  x.font = `${size}px ${F.marker}`; const words = String(text).split(/\s+/); let line = '', n = 0;
  for (let i = 0; i < words.length; i++) {
    const t = line ? line + ' ' + words[i] : words[i];
    if (x.measureText(t).width > maxW && line) { if (n === maxLines - 1) { marker(x, line + '…', X, Y + n * lh, size, { col, rot: -.008 }); return n + 1; } marker(x, line, X, Y + n * lh, size, { col, rot: -.008 }); n++; line = words[i]; } else line = t;
  }
  if (line) { marker(x, line, X, Y + n * lh, size, { col, rot: -.008 }); n++; }
  return n;
}
function discDoodle(x, cx, cy, R) { x.save(); x.strokeStyle = INK; x.lineWidth = 4; x.globalAlpha = .85; x.beginPath(); x.arc(cx, cy, R, 0, 6.1); x.stroke(); x.beginPath(); x.arc(cx, cy, R * .28, 0, 7); x.stroke(); x.beginPath(); x.arc(cx, cy, R * .62, .3, 1.4); x.stroke(); x.restore(); }
function starsDoodle(x, X, Y, n, s) { x.save(); x.strokeStyle = INK3; x.fillStyle = INK3; x.lineWidth = 3; for (let i = 0; i < 5; i++) { const cx = X + i * s * 1.25; x.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr2 = k % 2 ? s * .22 : s * .52; x.lineTo(cx + Math.cos(a) * rr2, Y + Math.sin(a) * rr2); } x.closePath(); if (i < n) x.fill(); else x.stroke(); } x.restore(); }
function arrowDoodle(x, X, Y) { x.save(); x.strokeStyle = INK2; x.lineWidth = 5; x.lineCap = 'round'; x.globalAlpha = .9; x.beginPath(); x.moveTo(X, Y); x.quadraticCurveTo(X - 40, Y - 60, X - 120, Y - 92); x.stroke(); x.beginPath(); x.moveTo(X - 120, Y - 92); x.lineTo(X - 92, Y - 94); x.moveTo(X - 120, Y - 92); x.lineTo(X - 106, Y - 68); x.stroke(); x.restore(); }

function boardKey() {
  const g = mode === 'shelf' ? (hovered ? hovered.g : null) : (active ? active.g : null);
  const play = mode === 'playing' || (active && (tv.state === 'wait' || tv.state === 'play'));
  const gr = groups[curGroup];
  if (play && g) return ['play', g.id, Math.floor((performance.now() - playStart) / 60000), PN_STATE.waiting].join('|');
  if (g) return ['game', g.id, g.status, Math.round(g.hours * 10), g.last, g.rating, g.wrapped, g.cats.join(',')].join('|');
  return ['shelf', gr ? gr.key + gr.games.length : '', curPage, prefs.group, LANG].join('|');
}
function drawBoard(force) {
  const key = boardKey(); if (key === bd.key && !force) return; bd.key = key;
  if (!bd.ghost) bd.ghost = makeBoardGhost();
  const x = boardCtx; x.clearRect(0, 0, BW, BH); x.drawImage(bd.ghost, 0, 0);
  const L = 70, maxW = BW - 2 * L, kind = key.split('|')[0];
  const g = mode === 'shelf' ? (hovered ? hovered.g : null) : (active ? active.g : null);
  if (kind === 'shelf') {
    const gr = groups[curGroup]; if (!gr) { bd.key = ''; return; }
    discDoodle(x, L + 26, 92, 26);
    const s = fitMarker(x, gr.label.toUpperCase(), maxW - 80, 66), w = marker(x, gr.label.toUpperCase(), L + 70, 116, s);
    scribbleLine(x, L + 66, L + 74 + w, 138);
    const hrs = gr.games.reduce((a, b) => a + (b.hours || 0), 0), np = gr.pages.length;
    marker(x, T(gr.games.length === 1 ? '{0} juego' : '{0} juegos', gr.games.length) + ' · ' + T('{0} jugadas', fmtH(hrs)), L, 250, 44);
    if (np > 1) marker(x, T('Página {0} de {1}', curPage + 1, np), L, 320, 40, { col: INK2 });
    const lastG = gr.games.filter(q => q.last !== null && q.last !== undefined).sort((a, b) => a.last - b.last)[0];
    if (lastG) wrapMarker(x, T('Lo último: {0}', lastG.t), L, np > 1 ? 380 : 320, maxW * .8, 36, 46, 1);
    marker(x, T('Elige uno de la estantería'), L, BH * .64, 40, { col: INK3, rot: -.03 });
    arrowDoodle(x, BW - 110, BH * .58);
  } else if (g) {
    let s = fitMarker(x, g.t.toUpperCase(), maxW, 64, 34), title = g.t.toUpperCase(), y = 112;
    if (s <= 34 && title.includes(' ')) { const n = wrapMarker(x, title, L, 96, maxW, 46, 56, 2); y = 96 + (n - 1) * 56 + 16; scribbleLine(x, L, L + Math.min(maxW, 520), y + 22); }
    else { const w = marker(x, title, L, y, s); scribbleLine(x, L - 6, L + w + 8, y + 22); }
    y += 96;
    if (kind === 'play') {
      marker(x, T(PN_STATE.waiting ? 'ARRANCANDO…' : 'JUGANDO AHORA'), L, y + 20, 70, { col: INK3, rot: -.025 });
      const m = Math.max(0, Math.floor((performance.now() - playStart) / 60000));
      marker(x, PN_STATE.waiting ? T('Playnite está abriendo el juego') : T('Esta sesión: {0}', m < 1 ? T('acaba de empezar') : m === 1 ? T('1 minuto') : T('{0} minutos', m)), L, y + 110, 40);
      wrapMarker(x, T(PLAYNITE ? 'Al cerrar el juego, el disco vuelve solo a su caja' : 'Esc para sacar el disco'), L, y + 190, maxW * .9, 34, 44, 2, INK2);
      boardTex.needsUpdate = true; return;
    }
    const st = g.status ? TD(g.status) : T('Sin estado');
    marker(x, `${st} · ${fmtH(g.hours)}`, L, y, 44, { col: kindOf(g) === 'playing' ? INK3 : INK });
    marker(x, T('Última vez: {0}', lastText(g.last).toLowerCase()), L, y + 62, 38);
    const meta = [g.genre, g.year].filter(Boolean).join(' · ');
    let yy = y + 120; if (meta) { wrapMarker(x, meta, L, yy, maxW, 34, 44, 1, INK2); yy += 56; }
    if (g.wrapped) { marker(x, T('¡Precintado!'), BW - L - 250, y - 6, 44, { col: INK3, rot: .06 }); x.save(); x.strokeStyle = INK3; x.lineWidth = 4; x.globalAlpha = .8; x.beginPath(); x.ellipse(BW - L - 128, y - 22, 150, 46, .06, 0, 7); x.stroke(); x.restore(); }
    if (g.sum) wrapMarker(x, g.sum, L, yy + 10, maxW, 31, 42, Math.max(1, Math.floor((BH - 120 - yy) / 42)), '#3b3e46');
    if (g.rating) starsDoodle(x, L + 14, BH - 72, g.rating, 34);
    if (g.cats.length) { const t = g.cats.slice(0, 3).map(c => '#' + TD(c).replace(/\s+/g, '')).join('  '); marker(x, t, BW - L, BH - 60, fitMarker(x, t, maxW * .62, 32, 20), { col: INK2, align: 'right', rot: -.02 }); }
  }
  boardTex.needsUpdate = true;
}
