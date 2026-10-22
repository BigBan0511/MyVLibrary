/* =====================================================================
   MUSIC: albums, artists, songs and playlists from Navidrome, in a record
   shop of their own. An album or a playlist is one sleeve, box or case
   (vinyl up to 1972, cassette up to 1999, CD after; playlists on CD) and
   plays whole. Songs, picked one by one or from an artist's divider, go
   into a bag; one song plays as it is, several are burnt onto a CD or a
   cassette at the computer first. Everything plays on a 90s hi-fi
   (19-hifi.js), and keeps playing while you walk around the library.
   ===================================================================== */
const MSEC = ['Álbumes', 'Artistas', 'Canciones', 'Listas'];
function clockS(sec) { sec = Math.max(0, Math.round(sec || 0)); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0'); }
const sumDur = list => list.reduce((a, t) => a + (t.dur || 0), 0);

/* ---------- formats: by the year, unless chosen for the item or for all of its kind in Settings ---------- */
function musicFamily(year) { return !year ? 'cd' : year <= 1972 ? 'lp' : year <= 1999 ? 'cass' : 'cd'; }
function resolveMusicFmt(g) {
  if (g.kind === 'artist') return (g.fmt = 'artist');
  if (g.kind === 'mix') return g.fmt;
  const bulk = g.kind === 'playlist' ? prefs.mfPl : g.kind === 'song' ? prefs.mfSong : prefs.mfAlb;
  return (g.fmt = MUSIC_FMTS.includes(g.fmtPick) ? g.fmtPick : MUSIC_FMTS.includes(bulk) ? bulk : g.kind === 'playlist' ? 'cd' : musicFamily(g.year));
}
/* what plays when the medium goes in */
function tracksOf(g) { return g.kind === 'song' ? [g.track] : g.kind === 'artist' ? artistTracks(g) : g.tracks || []; }
function artistTracks(g) { return GAMES.filter(q => q.music && q.kind === 'song' && (q.track.artistId ? q.track.artistId === g.nd : q.track.artist === g.t)).map(q => q.track).sort((a, b) => (a.album || '').localeCompare(b.album || '', LANG) || (a.n || 0) - (b.n || 0)); }
function musicSub(g) { return g.kind === 'playlist' ? T('Lista') : g.kind === 'artist' ? T('Artista') : g.artist || ''; }

/* ---------- the demo's record shop ---------- */
function demoMusic() {
  const r = rng(19670601), pick = a => a[Math.floor(r() * a.length)], arts = Object.keys(ART), fonts = ['saira', 'fraunces', 'bungee', 'saira', 'press'];
  const ARTISTS = [['Los Bravíos', 1962, 'Rock and roll'], ['Marisol Vega', 1966, 'Canción'], ['Trueno Azul', 1974, 'Rock'], ['La Orquesta del Faro', 1979, 'Soul'], ['Neón Pacífico', 1984, 'Synth-pop'], ['Ultramarinos', 1991, 'Indie'], ['Cometa Rosa', 1996, 'Pop'], ['Brezo', 2004, 'Folk'], ['Ana Lisboa', 2011, 'Jazz'], ['Kilómetro Cero', 2019, 'Electrónica']];
  const A1 = ['Noches de', 'Canciones para', 'Lejos de', 'El sol de', 'Volver a', 'Luces de', 'Cartas a', 'Verano en', 'Ruido de', 'Mapas de'];
  const A2 = ['Medianoche', 'Valparaíso', 'la Costa', 'Neón', 'Cobalto', 'Madrid', 'Invierno', 'los Faros', 'Satélite', 'Papel'];
  const S1 = ['Te espero', 'Bailando', 'Sin ti', 'La carretera', 'Mar adentro', 'Luna llena', 'Domingo', 'Ciudad dormida', 'El último tren', 'Tormenta', 'Volar', 'Una vez más', 'Fuego lento', 'Calle sin nombre', 'Amanecer', 'Corazón de radio', 'Siete vidas', 'Por la ventana', 'Eléctrica', 'Hasta mañana'];
  const out = [], all = [];
  const base = (id, kind, t, year, sec, pal, art, font) => ({ id, music: true, real: false, kind, t, sort: t, year, sec, secOrder: MSEC.indexOf(sec), pal, art, font, tpos: 'top', tag: '', artOpt: {}, cats: [], ach: [0, 0], hours: 0, sessions: 0, status: '', wrapped: false, tear: 0, notes: '', last: Math.floor(r() * 600), added: 30 + Math.floor(r() * 1500) });
  ARTISTS.forEach(([name, y0, genre], ai) => {
    const h = r() * 360, apal = [hslHex(h, .45, .1), hslHex(h + 10, .4, .28), hslHex(h + 160, .7, .55), hslHex(h + 30, .75, .8), '#f7f3ea'];
    const ar = Object.assign(base('m-ar-' + ai, 'artist', name, y0, 'Artistas', apal, pick(arts), pick(fonts)), { nd: 'ar' + ai, genre, dev: name });
    out.push(ar);
    const nAl = 2 + Math.floor(r() * 2);
    for (let k = 0; k < nAl; k++) {
      const year = Math.min(2025, y0 + k * (3 + Math.floor(r() * 7))), ah = r() * 360;
      const pal = [hslHex(ah, .45, .1), hslHex(ah + 10, .4, .28), hslHex(ah + 160, .7, .55), hslHex(ah + 30, .75, .8), '#f7f3ea'];
      const al = Object.assign(base(`m-al-${ai}-${k}`, 'album', `${pick(A1)} ${pick(A2)}`, year, 'Álbumes', pal, pick(arts), pick(fonts)), { nd: `al${ai}-${k}`, artist: name, artistId: ar.nd, genre, dev: name, tracks: [] });
      const n = 6 + Math.floor(r() * 6), used = new Set();
      for (let i = 0; i < n; i++) {
        let t; do t = pick(S1); while (used.has(t) && used.size < S1.length); used.add(t);
        const tr = { id: `tr-${ai}-${k}-${i + 1}`, t, artist: name, artistId: ar.nd, album: al.t, albumId: al.nd, year, n: i + 1, dur: 140 + Math.floor(r() * 170), g: al };
        al.tracks.push(tr); all.push(tr);
        out.push(Object.assign(base(`m-so-${ai}-${k}-${i + 1}`, 'song', t, year, 'Canciones', pal, al.art, al.font), { nd: tr.id, artist: name, album: al.t, genre, dev: name, track: tr, sort: t + ' ' + name }));
      }
      al.dur = sumDur(al.tracks); out.push(al);
    }
  });
  ['Para conducir', 'Domingo por la mañana', 'Fiesta en casa', 'Mis favoritas'].forEach((t, i) => {
    const h = r() * 360, pal = [hslHex(h, .5, .12), hslHex(h + 20, .45, .3), hslHex(h + 180, .7, .58), hslHex(h + 40, .8, .82), '#f7f3ea'];
    const tracks = []; const n = 8 + Math.floor(r() * 7); while (tracks.length < n) { const tr = pick(all); if (!tracks.includes(tr)) tracks.push(tr); }
    out.push(Object.assign(base('m-pl-' + i, 'playlist', t, 2026, 'Listas', pal, pick(arts), pick(fonts)), { nd: 'pl' + i, tracks, dur: sumDur(tracks), dev: 'MyVLibrary' }));
  });
  out.forEach(g => { g.dust = dustFor(g.last); });
  return out;
}

/* =====================================================================
   PRINTED PARTS: sleeves, J-cards and inlays, labels
   ===================================================================== */
/* the square artwork: the real cover, or the demo's painting with its title */
function musicArt(g, S) {
  const c = mkCanvas(S, S), x = c.getContext('2d');
  if (g.kind === 'mix') { mixArt(x, g, S, S); return c; }
  if (g.real) { const src = g.cover || g.coverSmall; if (src) coverFit(x, src, 0, 0, S, S); else placeholderArt(x, S, S, g); return c; }
  if (g.kind === 'playlist' && g.tracks && g.tracks.length >= 4) {
    /* a playlist: four of its records in a grid */
    const seen = []; g.tracks.forEach(t => { if (t.g && !seen.includes(t.g)) seen.push(t.g); });
    seen.slice(0, 4).forEach((a, i) => { const s = musicArt(a, S / 2); x.drawImage(s, (i % 2) * S / 2, Math.floor(i / 2) * S / 2); });
    x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, S * .68, S, S * .32);
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; let fs = S * .09; x.font = `800 ${Math.round(fs)}px ${F.saira}`; const tt = g.t.toUpperCase(); while (x.measureText(tt).width > S * .9 && fs > 10) { fs *= .94; x.font = `800 ${Math.round(fs)}px ${F.saira}`; }
    x.fillText(tt, S / 2, S * .84); return c;
  }
  drawArt(x, S, S, g); gradeArt(x, S, S, rng(hash(g.id) + 3)); vignette(x, S, S, .3);
  x.textAlign = 'left'; x.textBaseline = 'top'; x.fillStyle = g.pal[4]; x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = S * .02;
  let ts = S * .085; x.font = titleFont(g, ts); while (x.measureText(titleText(g)).width > S * .86 && ts > 10) { ts *= .94; x.font = titleFont(g, ts); }
  const name = (g.kind === 'artist' ? T('Lo mejor de') : g.artist || '').toUpperCase();
  x.font = `700 ${Math.round(S * .04)}px ${F.fig}`; setLS(x, S * .006); x.fillText(name, S * .07, S * .07); setLS(x, 0);
  x.font = titleFont(g, ts); x.fillText(titleText(g), S * .07, S * .07 + S * .06); x.shadowBlur = 0;
  return c;
}
/* a burnt mix: written by hand */
function mixArt(x, g, W, H) {
  const r = rng(hash(g.id));
  x.fillStyle = g.fmt === 'cass' ? '#f4efe2' : '#e9edf2'; x.fillRect(0, 0, W, H);
  x.strokeStyle = 'rgba(70,90,160,.25)'; x.lineWidth = 2; for (let y = H * .22; y < H; y += H * .08) { x.beginPath(); x.moveTo(W * .06, y); x.lineTo(W * .94, y); x.stroke(); }
  x.fillStyle = '#1d2a6b'; x.textAlign = 'left'; x.textBaseline = 'alphabetic'; x.font = `${Math.round(H * .1)}px ${F.marker}`;
  x.save(); x.translate(W * .08, H * .16); x.rotate(-.03); x.fillText(g.t, 0, 0); x.restore();
  x.font = `${Math.round(H * .045)}px ${F.marker}`; x.fillStyle = '#7a1d2b'; x.fillText(g.date || '', W * .62, H * .16);
  x.fillStyle = '#1d2a6b'; x.font = `${Math.round(H * .045)}px ${F.marker}`;
  (g.tracks || []).slice(0, 10).forEach((t, i) => { x.save(); x.translate(W * .08, H * .29 + i * H * .068); x.rotate((r() - .5) * .02); x.fillText(`${i + 1}. ${(t.t || '').slice(0, 26)}`, 0, 0); x.restore(); });
  if ((g.tracks || []).length > 10) x.fillText('…', W * .08, H * .97);
}
function musicCover(g) {
  const [W, H] = coverSize(g), c = mkCanvas(W, H), x = c.getContext('2d'), D = DIMS[g.fmt];
  if (g.kind === 'mix') { mixArt(x, g, W, H); return c; }
  if (g.fmt === 'cass') {
    /* a J-card: the artwork on top, the title on a band under it */
    x.drawImage(musicArt(g, W), 0, 0);
    x.fillStyle = g.pal[0]; x.fillRect(0, W, W, H - W); x.fillStyle = g.pal[2]; x.fillRect(0, W, W, 6);
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let ts = (H - W) * .26; x.font = `800 ${Math.round(ts)}px ${F.saira}`; const tt = g.t.toUpperCase(); while (x.measureText(tt).width > W * .9 && ts > 10) { ts *= .94; x.font = `800 ${Math.round(ts)}px ${F.saira}`; }
    x.fillText(tt, W / 2, W + (H - W) * .36);
    x.fillStyle = hexA('#ffffff', .8); x.font = `700 ${Math.round((H - W) * .13)}px ${F.fig}`; x.fillText(musicSub(g).toUpperCase(), W / 2, W + (H - W) * .62);
    x.font = `700 ${Math.round((H - W) * .1)}px ${F.mono}`; x.fillStyle = hexA('#ffffff', .55); x.fillText('CrO₂ · DOLBY B NR', W / 2, W + (H - W) * .85);
  } else {
    x.drawImage(musicArt(g, W), 0, (H - W) / 2);
    if (g.kind === 'artist') { x.fillStyle = 'rgba(0,0,0,.55)'; x.fillRect(0, H * .78, W, H * .22); x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; let ts = H * .09; x.font = `800 ${Math.round(ts)}px ${F.saira}`; const tt = g.t.toUpperCase(); while (x.measureText(tt).width > W * .9 && ts > 10) { ts *= .94; x.font = `800 ${Math.round(ts)}px ${F.saira}`; } x.fillText(tt, W / 2, H * .89); }
    /* a CD's jewel case shows the hinge down the left */
    if (D.shell === 'clear') { const hw = W * .085; x.fillStyle = 'rgba(16,18,22,.6)'; x.fillRect(0, 0, hw, H); x.fillStyle = 'rgba(255,255,255,.13)'; for (let yy = 2; yy < H; yy += 5) x.fillRect(0, yy, hw, 1.6); }
    if (g.fmt === 'lp') { x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.arc(W * .88, H * .1, W * .055, 0, 7); x.fill(); x.fillStyle = '#ffffff'; x.font = `800 ${Math.round(W * .028)}px ${F.saira}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('33⅓', W * .88, H * .1); }
  }
  return c;
}
/* the back: the tracklist */
function musicBack(g, coverCanvas) {
  const [W, H] = coverSize(g), c = mkCanvas(W, H), x = c.getContext('2d'), p = g.pal;
  if (g.kind === 'mix') { mixArt(x, g, W, H); return c; }
  x.fillStyle = mix(p[0], '#000000', .2); x.fillRect(0, 0, W, H);
  x.globalAlpha = .1; x.drawImage(coverCanvas, 0, 0, W, H); x.globalAlpha = 1;
  const pad = W * .08; let y = pad; x.textAlign = 'left'; x.textBaseline = 'top';
  x.fillStyle = '#f6f2ea'; let ts = W * .07; x.font = `800 ${Math.round(ts)}px ${F.saira}`; const tt = g.t.toUpperCase(); while (x.measureText(tt).width > W - 2 * pad && ts > 10) { ts *= .94; x.font = `800 ${Math.round(ts)}px ${F.saira}`; } x.fillText(tt, pad, y); y += ts * 1.1;
  x.fillStyle = lum(p[2]) > .25 ? p[2] : p[3]; x.font = `700 ${Math.round(W * .032)}px ${F.fig}`; x.fillText([musicSub(g), g.year, g.genre].filter(Boolean).join(' · ').toUpperCase(), pad, y); y += W * .065;
  const list = g.kind === 'song' ? [g.track] : g.kind === 'artist' ? artistTracks(g) : tracksOf(g);
  const rows = Math.max(1, Math.floor((H - y - H * .14) / (W * .045))), cols = list.length > rows ? 2 : 1, cw = (W - 2 * pad) / cols;
  x.font = `600 ${Math.round(W * .03)}px ${F.fig}`;
  list.slice(0, rows * cols).forEach((t, i) => {
    const col = Math.floor(i / rows), row = i % rows, X = pad + col * cw, Y = y + row * W * .045;
    x.fillStyle = hexA('#f6f2ea', .55); x.fillText(String(i + 1).padStart(2, '0'), X, Y);
    x.fillStyle = '#f6f2ea'; let s = (t.t || '') + (g.kind === 'playlist' || g.kind === 'artist' ? '' : ''); while (x.measureText(s).width > cw - W * .2 && s.length > 4) s = s.slice(0, -2) + '…';
    x.fillText(s, X + W * .055, Y); x.fillStyle = hexA('#f6f2ea', .55); x.textAlign = 'right'; x.fillText(clockS(t.dur), X + cw - W * .02, Y); x.textAlign = 'left';
  });
  const sh = H * .1, sy = H - sh; x.fillStyle = '#f4f1ea'; x.fillRect(0, sy, W, sh); x.fillStyle = p[2]; x.fillRect(0, sy, W, 3);
  x.fillStyle = '#1b1b1f'; x.font = `800 ${Math.round(sh * .3)}px ${F.saira}`; x.textBaseline = 'middle'; x.fillText(T(DIMS[g.fmt].name).toUpperCase() + (g.dur ? ' · ' + clockS(g.dur) : ''), pad * .8, sy + sh * .5);
  barcode(x, W - pad * .8 - W * .22, sy + sh * .18, W * .22, sh * .64, hash(g.id + 'bc'));
  return c;
}
function musicSpine(g) {
  const [W, H] = spineSize(g), c = mkCanvas(W, H), x = c.getContext('2d'), p = g.pal;
  if (g.kind === 'mix') { x.fillStyle = '#f4efe2'; x.fillRect(0, 0, W, H); x.save(); x.translate(W / 2, H / 2); x.rotate(-Math.PI / 2); x.fillStyle = '#1d2a6b'; x.font = `${Math.round(W * .55)}px ${F.marker}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(g.t, 0, 0); x.restore(); return c; }
  const base = g.kind === 'artist' ? '#e9e2d0' : mix(p[1], '#000000', .25), ink = lum(base) > .5 ? '#16161a' : '#f6f2ea';
  x.fillStyle = base; x.fillRect(0, 0, W, H);
  x.fillStyle = p[2]; x.fillRect(0, 0, W, H * .012); x.fillRect(0, H * .988, W, H * .012);
  x.save(); x.translate(W / 2, H / 2); x.rotate(-Math.PI / 2); x.textAlign = 'center'; x.textBaseline = 'middle';
  const text = g.kind === 'artist' ? g.t.toUpperCase() : g.kind === 'playlist' ? g.t.toUpperCase() : `${(g.artist || '').toUpperCase()}  ·  ${g.t.toUpperCase()}`;
  let s = W * .62; x.font = `800 ${Math.round(s)}px ${F.saira}`; while (x.measureText(text).width > H * .86 && s > 5) { s *= .95; x.font = `800 ${Math.round(s)}px ${F.saira}`; }
  x.fillStyle = ink; x.fillText(text, 0, s * .04); x.restore();
  return c;
}
/* the medium itself: a vinyl's paper label, a CD's face, a cassette's sticker */
function musicLabel(g, coverCanvas) {
  const m = DIMS[g.fmt];
  if (g.fmt === 'cass') {
    const W = 512, H = 137, c = mkCanvas(W, H), x = c.getContext('2d');
    if (g.kind === 'mix') { x.fillStyle = '#f7f3e8'; x.fillRect(0, 0, W, H); x.fillStyle = '#1d2a6b'; x.font = `${Math.round(H * .42)}px ${F.marker}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(g.t, W / 2, H * .5); x.fillStyle = '#d43a3a'; x.font = `800 ${Math.round(H * .4)}px ${F.saira}`; x.fillText('A', W * .06, H * .52); return c; }
    x.fillStyle = '#f2ede1'; x.fillRect(0, 0, W, H); x.fillStyle = g.pal[2]; x.fillRect(0, 0, W, H * .2);
    x.fillStyle = '#ffffff'; x.font = `800 ${Math.round(H * .16)}px ${F.saira}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText((g.artist || musicSub(g)).toUpperCase(), W * .03, H * .1);
    x.fillStyle = '#1a1a1e'; let ts = H * .34; x.font = `800 ${Math.round(ts)}px ${F.saira}`; x.textAlign = 'center'; while (x.measureText(g.t.toUpperCase()).width > W * .78 && ts > 8) { ts *= .94; x.font = `800 ${Math.round(ts)}px ${F.saira}`; }
    x.fillText(g.t.toUpperCase(), W / 2, H * .55); x.fillStyle = '#d43a3a'; x.font = `800 ${Math.round(H * .4)}px ${F.saira}`; x.fillText('A', W * .06, H * .58);
    x.fillStyle = '#4a463e'; x.font = `700 ${Math.round(H * .13)}px ${F.mono}`; x.fillText(`C-${Math.max(46, Math.ceil(sumDur(tracksOf(g)) / 60 / 15) * 15)} · DOLBY`, W / 2, H * .86);
    return c;
  }
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), R = S / 2;
  if (m.vinyl) {
    /* the paper label: the art or a solid colour, the title round the top, the spindle hole */
    x.save(); x.beginPath(); x.arc(R, R, R, 0, 7); x.clip();
    x.fillStyle = g.pal[2]; x.fillRect(0, 0, S, S);
    if (g.real || g.kind === 'mix') { x.globalAlpha = .35; x.drawImage(coverCanvas || musicArt(g, S), 0, 0, S, S); x.globalAlpha = 1; }
    x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.arc(R, R, R * .92, 0, 7); x.lineWidth = 6; x.strokeStyle = 'rgba(0,0,0,.25)'; x.stroke();
    x.fillStyle = lum(g.pal[2]) > .5 ? '#16161a' : '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
    let ts = S * .09; x.font = `800 ${Math.round(ts)}px ${F.saira}`; const tt = g.t.toUpperCase(); while (x.measureText(tt).width > S * .74 && ts > 10) { ts *= .94; x.font = `800 ${Math.round(ts)}px ${F.saira}`; }
    x.fillText(tt, R, R - S * .2); x.font = `700 ${Math.round(S * .05)}px ${F.fig}`; x.fillText(musicSub(g).toUpperCase(), R, R - S * .1);
    x.font = `700 ${Math.round(S * .045)}px ${F.mono}`; x.fillText(T('CARA A') + ' · 33⅓ RPM', R, R + S * .2); x.fillText(String(g.year || ''), R, R + S * .28);
    x.fillStyle = '#0a0a0c'; x.beginPath(); x.arc(R, R, S * .03, 0, 7); x.fill();
    x.restore(); return c;
  }
  /* a CD: the art across the face, a silver hub; a burnt one is a green CD-R written on by hand */
  x.save(); x.beginPath(); x.arc(R, R, R, 0, 7); x.clip();
  if (g.kind === 'mix') { x.fillStyle = lg(x, 0, 0, S, S, [[0, '#cfe3d4'], [.5, '#e7f0ea'], [1, '#b9d3c4']]); x.fillRect(0, 0, S, S); x.fillStyle = '#1d2a6b'; x.font = `${Math.round(S * .085)}px ${F.marker}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(g.t, R, R - S * .24); x.font = `${Math.round(S * .05)}px ${F.marker}`; x.fillText(g.date || '', R, R + S * .25); }
  else {
    x.drawImage(coverCanvas || musicArt(g, S), 0, 0, S, S); x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(0, 0, S, S);
    x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; let ts = S * .08; x.font = `800 ${Math.round(ts)}px ${F.saira}`; const tt = g.t.toUpperCase(); while (x.measureText(tt).width > S * .62 && ts > 10) { ts *= .94; x.font = `800 ${Math.round(ts)}px ${F.saira}`; }
    x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 8; x.fillText(tt, R, R - S * .24); x.shadowBlur = 0;
    x.font = `700 ${Math.round(S * .032)}px ${F.mono}`; x.fillText('COMPACT DISC · DIGITAL AUDIO', R, R + S * .26);
  }
  x.fillStyle = rg(x, R, R, S * .06, S * .14, [[0, 'rgba(225,230,238,.95)'], [.6, 'rgba(190,198,210,.9)'], [1, 'rgba(160,170,184,0)']]); x.beginPath(); x.arc(R, R, S * .14, 0, 7); x.fill();
  x.restore(); return c;
}
/* the inside of a sleeve or a box */
function musicTray(fmt, W, H) {
  const c = mkCanvas(W, H), x = c.getContext('2d');
  if (fmt === 'lp') { x.fillStyle = '#16161a'; x.fillRect(0, 0, W, H); x.fillStyle = '#f2efe8'; x.beginPath(); x.arc(W / 2, H / 2, W * .49, 0, 7); x.fill(); x.fillStyle = '#d9d4c8'; x.beginPath(); x.arc(W / 2, H / 2, W * .06, 0, 7); x.fill(); }
  else if (fmt === 'cass') { x.fillStyle = '#2a2b30'; x.fillRect(0, 0, W, H); x.fillStyle = '#1b1c20'; [.38, .62].forEach(v => { x.beginPath(); x.arc(W / 2, H * v, W * .1, 0, 7); x.fill(); }); x.strokeStyle = 'rgba(255,255,255,.08)'; x.lineWidth = 4; rr(x, 10, 10, W - 20, H - 20, 16); x.stroke(); }
  return c;
}
function musicLid(fmt, W, H) {
  const c = mkCanvas(W, H), x = c.getContext('2d');
  if (fmt === 'lp') { x.fillStyle = '#1d1d22'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(246,242,234,.55)'; x.font = `600 ${Math.round(W * .018)}px ${F.fig}`; x.textAlign = 'left'; const r = rng(77); for (let i = 0; i < 38; i++) x.fillRect(W * .08, H * .08 + i * H * .022, W * (.3 + r() * .5), 2); x.font = `800 ${Math.round(W * .04)}px ${F.saira}`; x.fillText(T('LETRAS Y CRÉDITOS'), W * .08, H * .05); }
  else if (fmt === 'cass') { x.fillStyle = '#f2ede1'; x.fillRect(0, 0, W, H); x.strokeStyle = 'rgba(40,60,140,.3)'; x.lineWidth = 3; for (let y = H * .12; y < H; y += H * .06) { x.beginPath(); x.moveTo(W * .08, y); x.lineTo(W * .92, y); x.stroke(); } }
  return c;
}

/* =====================================================================
   THE PLAYER: what is playing, from Navidrome through the extension, or
   in the demo a little tune made up on the spot for every song
   ===================================================================== */
const MPLAY = {
  state: 'off', q: [], i: 0, c: null, side: 0, flipAt: -1, flipping: false, audio: null, synth: null, at: 0, startedAt: 0, scrob: false,
  get cur() { return this.q[this.i] || null; },
  medium() { return this.c ? (this.c.dim.vinyl ? 'vinyl' : this.c.dim.media === 'cass' ? 'cass' : 'cd') : ''; },
  start(c, list) {
    this.off(true); this.c = c; this.q = list.slice(); this.i = 0; this.side = 0;
    /* side B starts with the song that passes the middle of the running time */
    this.flipAt = -1; if (this.medium() !== 'cd' && this.q.length > 1) { const half = sumDur(this.q) / 2; let acc = 0; for (let k = 0; k < this.q.length; k++) { if (acc >= half) { this.flipAt = k; break; } acc += this.q[k].dur || 0; } }
    this.playTrack(0); renderMini();
  },
  time() { if (this.audio) return this.audio.currentTime || 0; if (this.synth) return this.state === 'playing' ? this.at + (this.synth.ctx.currentTime - this.startedAt) : this.at; return 0; },
  dur() { const t = this.cur; return (this.audio && isFinite(this.audio.duration) && this.audio.duration) || (t && t.dur) || 0; },
  real(t) { return PLAYNITE && !MOCK && t && t.real; },
  playTrack(i) {
    this.stopSound(); this.i = clamp(i, 0, this.q.length - 1); this.at = 0; this.scrob = false; const t = this.cur; if (!t) return;
    if (this.real(t)) {
      const a = this.audio = new Audio(); a.crossOrigin = 'anonymous'; a.preload = 'auto'; a.volume = this.gain(); a.src = LIB.trackUrl(t);
      a.addEventListener('ended', () => { if (this.audio === a) this.ended(); });
      a.addEventListener('error', () => { if (this.audio !== a) return; toast(T('No se puede reproducir «{0}»', t.t), 3000); setTimeout(() => { if (this.audio === a) this.ended(); }, 1200); });
      a.play().catch(() => { });
    } else this.synthStart(t);
    this.state = 'playing'; this.drawn = ''; renderMini();
  },
  gain() { return clamp(prefs.mvol / 100, 0, 1) ** 2; },
  stopSound() { if (this.audio) { try { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); } catch (e) { } this.audio = null; } this.synthStop(); },
  toggle() { if (this.state === 'playing') this.pause(); else if (this.state === 'paused') this.resume(); else if (this.state === 'stopped' && this.q.length) this.playTrack(this.i); renderMini(); },
  pause() { if (this.state !== 'playing') return; if (this.audio) this.audio.pause(); if (this.synth) { this.at = this.time(); this.synthStop(true); } this.state = 'paused'; renderMini(); },
  resume() { if (this.state !== 'paused') return; if (this.audio) this.audio.play().catch(() => { }); else this.synthStart(this.cur, this.at); this.state = 'playing'; renderMini(); },
  async next() { if (this.flipping) return; if (this.i + 1 >= this.q.length) { this.finish(); return; } await this.go(this.i + 1); },
  async prev() { if (this.flipping) return; if (this.time() > 3 || this.i === 0) { this.playTrack(this.i); return; } await this.go(this.i - 1); },
  /* moving to another song: crossing to the other side turns the record or the tape over first */
  async go(i) {
    const crossing = prefs.flip === 'on' && this.flipAt > 0 && ((i >= this.flipAt) !== (this.i >= this.flipAt));
    if (crossing && STAGE.name === 'music' && DEV.hifi) { this.flipping = true; this.stopSound(); this.state = 'paused'; renderMini(); try { await DEV.hifi.flip(this.medium()); } catch (e) { console.error(e); } this.flipping = false; }
    this.side = prefs.flip === 'on' && this.flipAt > 0 && i >= this.flipAt ? 1 : 0;
    this.playTrack(i);
  },
  ended() { this.scrobble(); this.next(); },
  finish() { this.stopSound(); this.state = 'stopped'; this.i = 0; this.side = 0; renderMini(); },
  scrobble() { const t = this.cur; if (!t || this.scrob) return; this.scrob = true; if (this.real(t)) LIB.send('ndScrobble', { id: t.id }); },
  setVol(v) { prefs.mvol = clamp(Math.round(v), 0, 100); savePrefs(); if (this.audio) this.audio.volume = this.gain(); if (this.synth) this.synth.master.gain.setTargetAtTime(this.gain() * .5, this.synth.ctx.currentTime, .05); renderMini(); },
  off(keep) { this.stopSound(); this.state = 'off'; if (!keep) { this.c = null; this.q = []; } renderMini(); },
  /* how loud it is right now, for the speaker cones */
  level(now) {
    if (this.state !== 'playing') return 0;
    if (this.synth) { const b = this.synth.beat; return b ? clamp(1 - ((this.synth.ctx.currentTime - b) / (60 / this.synth.bpm)), 0, 1) : 0; }
    return .45 + .35 * Math.sin(now * .021) * Math.sin(now * .0137) + Math.random() * .2;
  },
  tick(now) {
    if (this.state !== 'playing') return;
    if (this.synth) { this.synthSchedule(); if (this.time() >= (this.cur.dur || 180)) this.ended(); }
    if (!this.scrob && this.dur() && this.time() > Math.min(this.dur() / 2, 240)) this.scrobble();
  },
  /* ---------- the demo's tunes: a bass, chords and a melody from the song's own seed ---------- */
  synthStart(t, from = 0) {
    this.synthStop();
    let ctx; try { ctx = this.ctx || (this.ctx = new (window.AudioContext || window.webkitAudioContext)()); } catch (e) { ctx = null; }
    if (!ctx) { this.synth = { ctx: { currentTime: performance.now() / 1000 }, master: { gain: { setTargetAtTime() { } } }, bpm: 110, fake: true }; this.startedAt = this.synth.ctx.currentTime; this.at = from; return; }
    if (ctx.state === 'suspended') ctx.resume().catch(() => { });
    const r = rng(hash(t.id)), master = ctx.createGain(); master.gain.value = this.gain() * .5; master.connect(ctx.destination);
    const minor = r() < .5, scale = minor ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9], root = 45 + Math.floor(r() * 10), prog = [0, minor ? 5 : 3, 4, minor ? 3 : 5].map(k => [0, 2, 4, 5, 7, 9, 10][k] || 0);
    this.synth = { ctx, master, bpm: 92 + Math.floor(r() * 40), scale, root, prog, step: Math.floor(from * (92 / 60) * 2), next: ctx.currentTime + .05, melody: Array.from({ length: 16 }, () => r() < .7 ? scale[Math.floor(r() * 5)] + 12 * (r() < .3 ? 1 : 0) : null), wave: ['triangle', 'square', 'sawtooth'][Math.floor(r() * 3)], beat: 0 };
    this.startedAt = ctx.currentTime; this.at = from;
  },
  synthStop(keepAt) { const s = this.synth; this.synth = null; if (s && s.master && s.master.disconnect) { try { s.master.gain.setTargetAtTime(0, s.ctx.currentTime, .03); setTimeout(() => { try { s.master.disconnect(); } catch (e) { } }, 300); } catch (e) { } } },
  synthSchedule() {
    const s = this.synth; if (!s || s.fake) return; const ctx = s.ctx, spb = 60 / s.bpm / 2;
    const note = (midi, t0, len, type, vol) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = 440 * Math.pow(2, (midi - 69) / 12); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + .012); g.gain.exponentialRampToValueAtTime(.0005, t0 + len); o.connect(g); g.connect(s.master); o.start(t0); o.stop(t0 + len + .05); };
    while (s.next < ctx.currentTime + .35) {
      const k = s.step, bar = Math.floor(k / 8) % 4, chord = s.root + s.prog[bar], t0 = s.next;
      if (k % 8 === 0 || k % 8 === 4) { note(chord - 12, t0, spb * 3.6, 'triangle', .32); s.beat = t0; }
      if (k % 2 === 0) [0, 4, 7].forEach(iv => note(chord + 12 + iv, t0, spb * 1.6, 'sine', .045));
      const m = s.melody[k % 16]; if (m !== null && (k % 16) % 3 !== 2) note(s.root + 24 + m, t0, spb * 1.2, s.wave === 'sawtooth' ? 'triangle' : s.wave, .07);
      s.step++; s.next += spb;
    }
  }
};

/* =====================================================================
   THE BAG: songs picked one by one, until you choose to play them
   ===================================================================== */
const BAG = [];
function bagAdd(tr, quiet) {
  if (!tr) return false;
  if (BAG.some(t => t.id === tr.id)) { if (!quiet) toast(T('«{0}» ya está en la bolsa', tr.t), 1800); return false; }
  BAG.push(tr); renderBag(); const b = $('#bagBtn'); b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  if (!quiet) toast(T('«{0}» a la bolsa · {1}', tr.t, BAG.length), 1800); sfx.tick(); return true;
}
function renderBag() {
  const btn = $('#bagBtn'), pop = $('#bag'); if (!btn) return;
  btn.hidden = !(BAG.length || (STAGE.name === 'music' && mode === 'shelf'));
  $('#bagN').textContent = BAG.length;
  if (pop.hidden) return;
  const many = BAG.length > 1, onto = prefs.mixFmt === 'cass' ? T('un casete') : T('un CD');
  pop.innerHTML = `<div class="bag-head"><b>${T('Tu bolsa')}</b><span>${T(BAG.length === 1 ? '{0} canción' : '{0} canciones', BAG.length)} · ${clockS(sumDur(BAG))}</span></div>
    ${BAG.length ? `<ol class="bag-list">${BAG.map((t, i) => `<li><span><b>${esc(t.t)}</b><i>${esc(t.artist || '')}</i></span><time>${clockS(t.dur)}</time><button type="button" data-bag-del="${i}" aria-label="${T('Quitar')}">✕</button></li>`).join('')}</ol>` : `<p class="set-note">${T('Elige canciones en «Canciones» o en un artista y aparecerán aquí.')}</p>`}
    ${many ? `<p class="set-note">${T('Varias canciones se graban antes en {0} en el ordenador (Ajustes → Música).', onto)}</p>` : ''}
    <div class="bag-btns"><button type="button" class="pbtn" data-bag-clear${BAG.length ? '' : ' disabled'}>${T('Vaciar')}</button><button type="button" class="pbtn primary" data-bag-play${BAG.length ? '' : ' disabled'}>${many ? T('Grabar y escuchar') : T('Escuchar')}</button></div>`;
}
$('#bagBtn').addEventListener('click', () => { const p = $('#bag'); p.hidden = !p.hidden; sfx.init(); renderBag(); });
$('#bag').addEventListener('click', e => {
  const del = e.target.closest('[data-bag-del]');
  if (del) { BAG.splice(+del.dataset.bagDel, 1); renderBag(); return; }
  if (e.target.closest('[data-bag-clear]')) { BAG.length = 0; renderBag(); return; }
  if (e.target.closest('[data-bag-play]')) playBag();
});
document.addEventListener('pointerdown', e => { const p = $('#bag'); if (!p.hidden && !e.target.closest('#bag') && !e.target.closest('#bagBtn')) p.hidden = true; });

/* =====================================================================
   PUTTING IT ON, AND TAKING IT OFF
   ===================================================================== */
const MUSIC = { held: null };
const looseCases = new Set();
/* an album or a playlist opens; a song goes into the bag; an artist shows the songs to choose from */
function musicOpenable(g) { return g.kind === 'album' || g.kind === 'playlist' || g.kind === 'mix' || g.temp; }
function musicEnter() {
  const c = active; if (!c || mode !== 'inspect' || busy) return;
  if (c.g.kind === 'song') { bagAdd(c.g.track); putBack(); return; }
  if (c.g.kind === 'artist') { if (prefs.card === 'hide') setCard('show'); toast(T('Pulsa + en las canciones que quieras'), 2200); }
}
/* another record is in the player: it comes out at once (it goes back to its place by itself) */
function musicMakeRoom(c) { if (MUSIC.held && MUSIC.held !== c) ejectNow(); }
/* the medium is in and the machine has shut: the music starts and the hi-fi is yours */
async function musicInserted(c) {
  setLed(true); MUSIC.held = c; c.root.visible = true;
  MPLAY.start(c, tracksOf(c.g)); await wait(250);
  setMode('hifi'); toast(T('Sonando: {0}', c.g.t), 2200);
}
/* back to the shop: the music keeps playing; the case waits beside the hi-fi */
function musicLeave() {
  if (mode !== 'hifi' || busy) return;
  active = null; setView('shelf'); setMode('shelf'); renderMini(); renderBag();
  if (pendingRelayout) { pendingRelayout = false; relayout(); }
}
/* the medium goes back into its case without a show (another room, or another record going in) */
function ejectNow() {
  const c = MUSIC.held; MPLAY.off(); MUSIC.held = null; if (!c) return;
  const d = c.disc; if (d) { c.inner.attach(d); d.position.copy(c.discHome); d.quaternion.copy(c.discQuat || new Q4()); d.scale.set(1, 1, 1); d.visible = true; }
  if (DEV.hifi) DEV.hifi.reset(); setLed(false);
  c.openA = 0; returnCase(c);
}
function returnCase(c) {
  if (c.temp) { c.vanish = true; setTimeout(() => { c.dispose(); looseCases.delete(c); }, 500); return; }
  c.mode = 'home'; c.leaving = false; c.pullHold = 0; c.setShadow(false); c.releaseDetail(); c.placeExtras();
  if (mode === 'shelf' && !busy) relayout(); else pendingRelayout = true;
}
/* stop and eject: the medium comes out, flies back into its case and the case goes home */
function ejectMusic() {
  const c = MUSIC.held; if (!c || busy) return;
  if (STAGE.name !== 'music' || !(mode === 'hifi' || mode === 'shelf')) { ejectNow(); return; }
  return guarded(async () => {
    MPLAY.off(); setMode('busy'); active = c; setView('console');
    const d = c.disc, P = portOf(c), home = c.discHome, rest = c.mode === 'rest';
    setLed(false);
    const opened = rest ? (async () => { await waitReal(.3); await swingOpen(c); })() : null;
    await popOut(d, P); afterOut(P); await wait(320); if (opened) await opened;
    await flyIntoCase(c, d, P, rest ? new V3(home.x, home.y, home.z + 7) : discAbove(c, new V3()));
    MUSIC.held = null; await waitReal(.25);
    const h = clamp(sfx.caseClose(c.g.fmt), .3, .9); await tweenReal(h, t => { c.openA = 1 - t; }, t => t * t); c.openA = 0;
    setView('shelf'); await waitReal(.2);
    if (c.temp) { c.vanish = true; await wait(450); c.dispose(); looseCases.delete(c); }
    else { await slideHome(c); focus = c; }
    active = null; setMode('shelf');
  }).then(() => { if (pendingRelayout) { pendingRelayout = false; relayout(); } });
}
/* from the machine back to its place in the case, the way a game's disc comes back */
async function flyIntoCase(c, d, P, above) {
  const qIn = c.discQuat || new Q4(), home = c.discHome;
  _p0.copy(d.position); _q0.copy(d.quaternion);
  const tmp = new THREE.Object3D(); c.inner.add(tmp); tmp.position.copy(above); tmp.quaternion.copy(qIn); tmp.updateMatrixWorld(true); tmp.getWorldPosition(_p2); tmp.getWorldQuaternion(_q2); c.inner.remove(tmp);
  _p1.copy(_p0).lerp(_p2, .55); _p1.y = Math.max(_p0.y, _p2.y) + 22; const sT = c.root.scale.x, s0 = d.scale.x;
  await tween(1.1, t => { bez(_p0, _p1, _p2, t, d.position); d.scale.setScalar(lerp(s0, sT, t)); _qt.copy(_q0).slerp(_q2, easeIO(Math.min(1, t * 1.2))); _qz.setFromAxisAngle(ZAX, (1 - t) * Math.PI * 2); d.quaternion.copy(_qt).multiply(_qz); });
  c.inner.attach(d); d.position.copy(above); d.quaternion.copy(qIn); d.scale.set(1, 1, 1); d.visible = true;
  sfx.mediaIn(c.g.fmt, { hitAt: (.55 + .22) * SPEED });
  await tween(.55, t => { d.position.y = lerp(above.y, home.y, t); d.position.z = lerp(above.z, home.z + 1.4, t); });
  await tween(.22, t => { d.position.z = home.z + 1.4 * (1 - t); }); d.position.copy(home);
}
/* a case that is not on any shelf (one song, a burnt mix): it comes into your hands from below */
async function presentCase(g) {
  const n = new Case(g); n.temp = true; looseCases.add(n); n.ensureDetail(); n.setShadow(true);
  camera.getWorldDirection(_fwd); n.root.position.copy(camera.position).addScaledVector(_fwd, 60).add(new V3(0, -40, 0)); n.root.quaternion.copy(camera.quaternion); n.root.scale.setScalar(.3);
  n.mode = 'inspect'; n.leaving = true; active = n; return n;
}
/* the bag is played: one song as it is, several burnt first onto one CD or cassette */
function playBag() {
  if (!BAG.length) return;
  if (busy || mode !== 'shelf') { toast(T('Devuelve antes lo que tienes en la mano.'), 2200); return; }
  if (STAGE.name !== 'music') { toast(T('Ve a la tienda de música para escucharla.'), 2400); return; }
  $('#bag').hidden = true;
  if (BAG.length === 1) {
    const tr = BAG[0], g = GAMES.find(q => q.music && q.kind === 'song' && q.track === tr) || songItem(tr);
    return guarded(async () => { setMode('busy'); setHovered(null); const n = await presentCase(g); await wait(700); await swingOpen(n); BAG.length = 0; renderBag(); setMode('open'); }).then(() => insertDisc());
  }
  return burnBag();
}
function songItem(tr) { const a = tr.g || {}; return { id: 'song:' + tr.id, music: true, real: !!tr.real, kind: 'song', t: tr.t, artist: tr.artist, album: tr.album, year: tr.year, track: tr, pal: a.pal || defaultPal(tr.id), art: a.art || 'rings', font: 'saira', tpos: 'top', tag: '', artOpt: {}, cats: [], ach: [0, 0], hours: 0, cover: a.cover, coverSmall: a.coverSmall, fmt: resolveMusicFmt({ kind: 'song', year: tr.year }) }; }
/* ---------- burning: the songs go onto a blank at the computer, then it comes to your hands ---------- */
const BURN = { on: false, n: 0, t0: 0, dur: 1, fmt: 'cd', done: false };
function mixItem(list, fmt) {
  const d = new Date(), id = 'mix:' + d.getTime();
  return { id, music: true, real: list.some(t => t.real), kind: 'mix', t: T('Mi recopilación'), artist: T('Varios artistas'), year: d.getFullYear(), date: d.toLocaleDateString(LANG === 'es' ? 'es-ES' : 'en-GB'), tracks: list.slice(), dur: sumDur(list), fmt, pal: ['#1d2a6b', '#3d4f9b', '#d43a3a', '#f4efe2', '#ffffff'], art: 'rings', font: 'saira', tpos: 'top', tag: '', artOpt: {}, cats: [], ach: [0, 0], hours: 0 };
}
function burnBag() {
  const list = BAG.slice(), fmt = prefs.mixFmt === 'cass' ? 'cass' : 'cd';
  return guarded(async () => {
    setMode('busy'); setHovered(null); setView('burn'); await wait(900);
    const g = mixItem(list, fmt), n = new Case(g); n.temp = true; looseCases.add(n); n.ensureDetail(); n.root.visible = false;
    const d = n.disc; scene.attach(d); d.visible = true; d.scale.set(1, 1, 1);
    const B = burner(fmt); d.quaternion.copy(B.q); d.position.copy(B.entry);
    await B.open(); await tweenReal(.5, t => { d.position.lerpVectors(B.entry, B.inside, t); }, easeOut); await B.take(d);
    Object.assign(BURN, { on: true, n: list.length, t0: performance.now(), dur: clamp(2.2 + list.length * .35, 3, 8), fmt, done: false }); tvSet('burn'); B.led(true);
    await waitReal(BURN.dur); BURN.done = true; B.led(false); sfx.click(.6); await waitReal(.8);
    await B.give(d);
    /* the case comes into your hands, open, and the burnt medium flies into it */
    n.root.visible = true; camera.getWorldDirection(_fwd); n.root.position.copy(camera.position).addScaledVector(_fwd, 60).add(new V3(0, -40, 0)); n.root.quaternion.copy(camera.quaternion); n.root.scale.setScalar(.3);
    n.mode = 'inspect'; n.leaving = true; active = n; n.openA = 0; await wait(650); await swingOpen(n);
    await flyIntoCase(n, d, null, discAbove(n, new V3()));
    B.close(); BURN.on = false; tvSet('standby');
    BAG.length = 0; renderBag(); setMode('open'); toast(T('Grabado: {0} canciones', list.length), 2200);
  }).then(() => { if (mode === 'open' && active && active.g.kind === 'mix') insertDisc(); });
}
/* the computer's screen while it burns */
function drawBurnScreen(x, W, H, now) {
  x.fillStyle = '#0d1b3a'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#c9d3e8'; x.fillRect(0, 0, W, 34); x.fillStyle = '#0d1b3a'; x.font = `700 16px ${F.mono}`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(BURN.fmt === 'cass' ? 'MYV DUBBING' : 'MYV CD-R 4X', 14, 18);
  const p = BURN.done ? 1 : clamp((now - BURN.t0) / 1000 / BURN.dur, 0, 1), k = Math.min(BURN.n, Math.floor(p * BURN.n) + 1);
  x.fillStyle = '#ffffff'; x.font = `700 20px ${F.mono}`; x.textAlign = 'center';
  x.fillText(BURN.done ? T('¡LISTO!') : (BURN.fmt === 'cass' ? T('GRABANDO EL CASETE') : T('GRABANDO EL CD')) + '.'.repeat(1 + Math.floor(now / 400) % 3), W / 2, H * .38);
  x.font = `500 14px ${F.mono}`; x.fillStyle = '#9fb3dd'; x.fillText(BURN.done ? T('{0} canciones', BURN.n) : T('Canción {0} de {1}', k, BURN.n), W / 2, H * .5);
  x.strokeStyle = '#9fb3dd'; x.lineWidth = 2; x.strokeRect(W * .12, H * .6, W * .76, 26); x.fillStyle = BURN.done ? '#5dff8e' : '#ffb547'; x.fillRect(W * .12 + 3, H * .6 + 3, (W * .76 - 6) * p, 20);
  x.fillStyle = '#c9d3e8'; x.font = `700 14px ${F.mono}`; x.fillText(Math.round(p * 100) + ' %', W / 2, H * .6 + 44);
}

/* =====================================================================
   HUD: the mini player while you walk around, the card of what you hold
   ===================================================================== */
function renderMini() {
  const el = $('#mini'); if (!el) return;
  const on = MPLAY.state !== 'off' && MPLAY.c && mode !== 'hifi'; el.hidden = !on; if (!on) return;
  const t = MPLAY.cur;
  $('#miniT').textContent = t ? t.t : MPLAY.c.g.t; $('#miniA').textContent = t ? [t.artist, MPLAY.c.g.t !== t.t ? MPLAY.c.g.t : ''].filter(Boolean).join(' · ') : '';
  $('#miniPlay').textContent = MPLAY.state === 'playing' ? '❚❚' : '▶'; $('#miniPlay').setAttribute('aria-label', T(MPLAY.state === 'playing' ? 'Pausa' : 'Reproducir'));
  $('#miniGo').hidden = STAGE.name !== 'music'; $('#miniVol').textContent = prefs.mvol;
}
function musicAct(a) {
  if (a === 'mPrev') MPLAY.prev(); else if (a === 'mNext') MPLAY.next(); else if (a === 'mToggle') MPLAY.toggle();
  else if (a === 'mUp') MPLAY.setVol(prefs.mvol + 5); else if (a === 'mDown') MPLAY.setVol(prefs.mvol - 5);
  else if (a === 'mEject') ejectMusic(); else if (a === 'mBack') musicLeave(); else if (a === 'mGo') goToHifi(); else if (a === 'mBag') musicEnter(); else if (a === 'mArtist') musicEnter();
  if (DEV.hifi) DEV.hifi.press(a);
}
$('#mini').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) { sfx.init(); musicAct(b.dataset.m); } });
function goToHifi() { if (!MUSIC.held || STAGE.name !== 'music' || mode !== 'shelf' || busy) return; setHovered(null); setView('console'); setMode('hifi'); }
function musicPrompts() {
  if (mode === 'hifi') return `<span class="hint">${T('Botones de la cadena')} · <kbd>${T('Espacio')}</kbd> ${T('pausa')} · <kbd>←</kbd><kbd>→</kbd> ${T('canción')} · <kbd>↑</kbd><kbd>↓</kbd> ${T('volumen')}</span>` + btn('X', mediaT(MUSIC.held ? MUSIC.held.g : { fmt: 'cd' }, 'Sacar el disco'), 'mEject') + btn('Esc', T('Volver a la tienda'), 'mBack', true);
  const g = active.g;
  if (mode === 'inspect') return (g.kind === 'song' ? btn(T('Intro'), T('A la bolsa'), 'mBag', true) : g.kind === 'artist' ? btn(T('Intro'), T('Elegir canciones'), 'mArtist', true) : btn(T('Intro'), T('Abrir'), 'open', true)) + btn('F', active.flipT ? T('Ver portada') : T('Ver contraportada'), 'flip') + btn('Esc', T('Devolver'), 'back');
  if (mode === 'open') return btn(T('Intro'), mediaT(g, 'Poner el disco'), 'insert', true) + btn('Esc', T('Cerrar la caja'), 'close');
  return '';
}
/* the card: tracklist and format, or an artist's songs to pick */
function renderMusicInfo(el, g) {
  const list = g.kind === 'artist' ? artistTracks(g) : tracksOf(g), fmtOk = g.kind !== 'artist' && g.kind !== 'mix';
  const row = (t, i) => `<li><span class="n">${String(i + 1).padStart(2, '0')}</span><span class="t">${esc(t.t)}${g.kind === 'playlist' || g.kind === 'mix' || g.kind === 'artist' ? `<i>${esc(g.kind === 'artist' ? t.album || '' : t.artist || '')}</i>` : ''}</span><time>${clockS(t.dur)}</time>${g.kind === 'artist' ? `<button type="button" class="add" data-bag-tr="${esc(t.id)}" aria-label="${T('A la bolsa')}">${BAG.some(b => b.id === t.id) ? '✓' : '+'}</button>` : ''}</li>`;
  const kind = { album: T('Álbum'), playlist: T('Lista'), song: T('Canción'), artist: T('Artista'), mix: T('Recopilación') }[g.kind];
  el.innerHTML = `<div class="info-bar"><span></span><button type="button" class="info-hide" data-hide="1" aria-label="${T('Ocultar la ficha')}" title="${T('Ocultar la ficha')} (I)">${T('Ocultar')} <i aria-hidden="true">▴</i></button></div>
    <div class="eyebrow">${esc([kind, g.year, g.genre].filter(Boolean).join(' · '))}</div><h2>${esc(g.t)}</h2>
    ${g.kind !== 'artist' && g.kind !== 'playlist' && g.artist ? `<p class="m-artist">${esc(g.artist)}${g.kind === 'song' && g.album ? ' · ' + esc(g.album) : ''}</p>` : ''}
    <dl><dt>${T('Canciones')}</dt><dd>${list.length} · ${clockS(sumDur(list))}</dd></dl>
    ${g.kind === 'song' ? `<button type="button" class="pbtn primary m-bag" data-bag-tr="${esc(g.track.id)}">${BAG.some(b => b.id === g.track.id) ? T('Ya está en la bolsa') : T('A la bolsa')}</button>` : `<ol class="m-tracks">${list.map(row).join('')}</ol>`}
    ${g.kind === 'artist' && list.length ? `<button type="button" class="pbtn m-bag" data-bag-all="1">${T('Todas a la bolsa')}</button>` : ''}
    ${fmtOk ? `<div class="frow"><label for="mfmtSel">${T('Formato')}</label><span class="fmt-ico" aria-hidden="true">${{ lp: '◉', cass: '▭', cd: '◎' }[g.fmt] || ''}</span><select id="mfmtSel">${MUSIC_FMTS.map(f => `<option value="${f}"${f === g.fmt ? ' selected' : ''}>${esc(T(DIMS[f].name))}</option>`).join('')}</select></div>
    <p class="note">${esc(T(g.kind === 'playlist' ? 'Las listas vienen en CD; se puede cambiar cada una o todas en Ajustes → Música.' : 'Por defecto: vinilo hasta 1972, casete hasta 1999 y CD después. Todas a la vez en Ajustes → Música.'))}</p>` : ''}`;
}
$('#info').addEventListener('click', e => {
  if (!active || !active.g.music) return;
  const one = e.target.closest('[data-bag-tr]'), all = e.target.closest('[data-bag-all]');
  if (one) { const id = one.dataset.bagTr, tr = (active.g.kind === 'song' ? [active.g.track] : artistTracks(active.g)).find(t => t.id === id); if (tr) bagAdd(tr); renderInfo(true); if (active.g.kind === 'song') putBack(); }
  if (all) { let k = 0; artistTracks(active.g).forEach(t => { if (bagAdd(t, true)) k++; }); toast(T('{0} canciones a la bolsa · {1}', k, BAG.length), 2000); renderInfo(true); }
});
$('#info').addEventListener('change', e => {
  if (!active || !active.g.music || e.target.id !== 'mfmtSel') return;
  const g = active.g, f = e.target.value; if (!MUSIC_FMTS.includes(f) || f === g.fmt) return;
  swapCaseTo(active, () => { g.fmtPick = f; resolveMusicFmt(g); }, true);
});
/* Settings → Music: one kind, or everything at once; choosing for all forgets the ones chosen one by one */
function setMusicBulk(kinds, v) {
  kinds.forEach(k => { prefs[{ album: 'mfAlb', playlist: 'mfPl', song: 'mfSong' }[k]] = k === 'playlist' && v === 'year' ? 'cd' : v; });
  savePrefs(); GAMES.forEach(g => { if (g.music && kinds.includes(g.kind)) { if (g.fmtPick) { g.fmtPick = undefined; saveGame(g); } resolveMusicFmt(g); } });
  renderSettings(); if (mode === 'shelf' && !busy) relayout({ full: true }); else pendingRelayout = true;
}
function musicTick(dt, now) { MPLAY.tick(now); if (DEV.hifi) DEV.hifi.tick(dt, now); if (MPLAY.state !== 'off' && now - (MPLAY.miniT || 0) > 250) { MPLAY.miniT = now; const el = $('#miniTime'); if (el && !$('#mini').hidden) el.textContent = `${clockS(MPLAY.time())} / ${clockS(MPLAY.dur())}`; } }
