
/* =====================================================================
   VIDEO: films and series from Jellyfin, in a room of their own.
   Each library is a bookcase, like in a video shop. A film is one case
   (VHS up to 1997, DVD up to 2014, Blu-ray from 2015, changeable); a
   series stands as one spine and, in your hands, shows a season: a box
   of six tapes or a case with a flip tray and four discs in view, with
   arrows to the next ones and a search for the exact episode. The tape
   or disc goes into a VCR or a disc player in the TV room, and the film
   plays in Jellyfin Media Player or VLC.
   ===================================================================== */
const VSTAT = { watched: 'Visto', partial: 'A medias', none: 'Sin ver' };
const TICKS = 1e7;
function clockOf(sec) { sec = Math.max(0, Math.round(sec)); const h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60; return (h ? h + ':' + String(m).padStart(2, '0') : String(m)) + ':' + String(s).padStart(2, '0'); }
function epCode(ep) { return (ep.season != null ? 'T' + ep.season + ' · ' : '') + 'E' + String(ep.n ?? '?').padStart(2, '0'); }
function videoStatus(it) { return it.played ? VSTAT.watched : it.pos > 60 * TICKS ? VSTAT.partial : VSTAT.none; }
/* the medium of a film: a pretend episode, so films and episodes play the same way */
function filmItem(g) { return { id: g.jf || g.id, n: null, season: null, t: g.t, runtime: g.runtime || 0, played: !!g.played, pos: g.pos || 0, film: true }; }

/* ---------- the demo's video shop: invented films and series, spread over the years ---------- */
function demoVideos() {
  const r = rng(19970815), pick = a => a[Math.floor(r() * a.length)], out = [];
  const arts = Object.keys(ART), fonts = ['saira', 'fraunces', 'bungee', 'saira'];
  const A = ['La noche', 'El último', 'Bajo', 'Más allá de', 'Regreso a', 'Los hijos de', 'El silencio de', 'Operación', 'Diario de', 'Cartas desde', 'El jardín de', 'Tormenta en'];
  const B = ['Valdemoro', 'la Bahía Gris', 'Medianoche', 'los Faros', 'Cobalto', 'Sierra Negra', 'Puerto Ánimas', 'la Calle Nueve', 'Ultramar', 'Kilómetro 40', 'Isla Bermeja', 'los Almendros'];
  const genres = ['Drama', 'Comedia', 'Ciencia ficción', 'Suspense', 'Aventuras', 'Terror', 'Animación', 'Documental', 'Western', 'Policiaco'];
  const studios = ['Cines Brezo', 'Faro Films', 'Producciones Cierzo', 'Linterna Mágica', 'Estudio Albar', 'Celuloide Norte'];
  const film = (lib, i, year) => {
    const h = r() * 360, t = `${pick(A)} ${pick(B)}`, played = r() < .45, pos = !played && r() < .3 ? Math.floor((10 + r() * 60) * 60 * TICKS) : 0, runtime = 80 + Math.floor(r() * 70);
    return { id: `v-${lib}-${i}`, video: true, kind: 'movie', lib, t, sort: t, year, genre: pick(genres), runtime, played, pos, tag: pick(['Basada en hechos reales', 'Nadie sale ileso', 'Una historia inolvidable', 'El estreno del año']), dev: pick(studios), pub: '', age: pick([7, 12, 16, 18]),
      art: pick(arts), font: pick(fonts), tpos: r() < .7 ? 'top' : 'bottom', pal: [hslHex(h, .45, .1), hslHex(h + 10, .4, .28), hslHex(h + 160, .7, .55), hslHex(h + 30, .75, .8), '#f7f3ea'],
      sum: `${pick(genres)} de ${pick(studios)}. Una película que no existe, en una caja que sí.`, last: played ? Math.floor(r() * 900) : null, added: 30 + Math.floor(r() * 1500) };
  };
  for (let i = 0; i < 34; i++) out.push(film('Películas', i, 1979 + Math.floor(r() * 47)));
  for (let i = 0; i < 9; i++) out.push(Object.assign(film('Documentales', i, 1990 + Math.floor(r() * 36)), { genre: 'Documental' }));
  const S = ['Comisaría Central', 'Los Vecinos del Quinto', 'Mareas', 'Planeta Hueco', 'La Fonda', 'Agentes del Tiempo', 'Hospital Norte', 'Pueblo Chico', 'Estación Polar', 'Detectives de Barrio'];
  S.forEach((t, i) => {
    const h = r() * 360, y0 = 1986 + Math.floor(r() * 36), n = 1 + Math.floor(r() * 5);
    const seasons = Array.from({ length: n }, (_, k) => ({ idx: k + 1, name: `Temporada ${k + 1}`, year: Math.min(2026, y0 + k), count: 6 + Math.floor(r() * 19) }));
    out.push({ id: `s-${i}`, video: true, kind: 'series', lib: 'Series', t, sort: t, year: y0, genre: pick(genres), runtime: 25 + Math.floor(r() * 30), played: false, pos: 0, tag: pick(['La serie de culto', 'Temporada tras temporada', 'Todos los episodios']), dev: pick(studios), pub: '', age: pick([7, 12, 16]),
      art: pick(arts), font: pick(fonts), tpos: 'top', pal: [hslHex(h, .45, .1), hslHex(h + 10, .4, .28), hslHex(h + 160, .7, .55), hslHex(h + 30, .75, .8), '#f7f3ea'],
      sum: `Una serie de ${pick(studios)} en ${n} temporada${n > 1 ? 's' : ''}.`, demoSeasons: seasons, episodes: seasons.reduce((a, s) => a + s.count, 0), last: r() < .5 ? Math.floor(r() * 500) : null, added: 30 + Math.floor(r() * 1500) });
  });
  out.forEach(g => Object.assign(g, { cats: [], ach: [0, 0], hours: 0, sessions: g.played ? 1 : 0, status: videoStatus(g), artOpt: {}, libOrder: ['Películas', 'Series', 'Documentales'].indexOf(g.lib) }));
  return out;
}
function demoEpisodes(g, s) {
  const r = rng(hash(g.id + ':' + s.idx)), names = ['Piloto', 'El regreso', 'Sin salida', 'La carta', 'Medianoche', 'El viaje', 'Secretos', 'La tormenta', 'Todo cambia', 'El juicio', 'Despedida', 'Nuevo comienzo', 'La fiesta', 'El error', 'Contra reloj', 'El hallazgo', 'Doble juego', 'Al límite', 'Vuelta a casa', 'El final'];
  return Array.from({ length: s.count }, (_, k) => { const played = r() < .35, pos = !played && r() < .2 ? Math.floor((3 + r() * 20) * 60 * TICKS) : 0; return { id: `${g.id}-${s.idx}-${k + 1}`, n: k + 1, season: s.idx, t: names[(k + s.idx * 3) % names.length], runtime: g.runtime, played, pos }; });
}

/* ---------- seasons and episodes: from Jellyfin when asked for, kept on the series ---------- */
async function videoSeasons(g) {
  if (g.kind !== 'series') return null;
  if (!g.seasons) g.seasons = (PLAYNITE && g.real ? await LIB.jfSeasons(g) : (g.demoSeasons || []).map(s => Object.assign({}, s))) || [];
  if (!g.seasons.length) g.seasons = [{ idx: 1, name: T('Temporada {0}', 1), year: g.year, count: g.episodes || 1 }];
  g.seasonIdx = clamp(g.seasonIdx || 0, 0, g.seasons.length - 1);
  return g.seasons;
}
async function videoEpisodes(g, s) {
  if (!s) return [];
  if (!s.eps) { s.eps = (PLAYNITE && g.real ? await LIB.jfEpisodes(g, s) : demoEpisodes(g, s)) || []; s.count = s.eps.length; }
  return s.eps;
}
/* where to start: the first episode not seen yet */
function firstUnseen(eps) { const i = eps.findIndex(e => !e.played); return i < 0 ? 0 : i; }

/* ---------- printed parts ---------- */
function drawVideoBack(g, coverCanvas) {
  const [W, H] = coverSize(g), c = mkCanvas(W, H), x = c.getContext('2d'), p = g.pal, pad = W * .07;
  x.fillStyle = mix(p[0], '#000000', .35); x.fillRect(0, 0, W, H);
  x.globalAlpha = .22; x.drawImage(coverCanvas, 0, 0, W, H); x.globalAlpha = 1;
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, 'rgba(0,0,0,.45)'], [1, 'rgba(0,0,0,.9)']]); x.fillRect(0, 0, W, H);
  let y = pad;
  x.fillStyle = '#f6f2ea'; x.textAlign = 'left'; x.textBaseline = 'top';
  let ts = W * .08; x.font = `800 ${Math.round(ts)}px ${F.saira}`; const tt = g.t.toUpperCase(); while (x.measureText(tt).width > W - 2 * pad && ts > 14) { ts *= .94; x.font = `800 ${Math.round(ts)}px ${F.saira}`; }
  x.fillText(tt, pad, y); y += ts * 1.1;
  const s = seasonOf(g), meta = [s ? s.name : null, (s && s.year) || g.year, g.genre, g.runtime ? T('{0} min', g.runtime) : null].filter(Boolean).join(' · ');
  x.fillStyle = lum(p[2]) > .25 ? p[2] : p[3]; x.font = `700 ${Math.round(W * .03)}px ${F.fig}`; setLS(x, 1.2); x.fillText(meta.toUpperCase(), pad, y); setLS(x, 0); y += W * .06;
  /* a still from the film where the backdrop allows it */
  const still = g.bg || (g.real ? null : null);
  const sw = W - 2 * pad, sh = Math.round(sw * 9 / 16);
  x.save(); x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 10; x.fillStyle = '#000'; x.fillRect(pad - 3, y - 3, sw + 6, sh + 6); x.restore();
  x.save(); x.beginPath(); x.rect(pad, y, sw, sh); x.clip();
  if (still) coverFit(x, still, pad, y, sw, sh); else if (!g.real) { const a = mkCanvas(sw, sh), ax = a.getContext('2d'); drawArt(ax, sw, sh, g, 7); gradeArt(ax, sw, sh, rng(hash(g.id) + 7)); x.drawImage(a, pad, y); } else coverFit(x, coverCanvas, pad, y, sw, sh, .5, .35);
  x.restore(); y += sh + W * .05;
  x.fillStyle = 'rgba(246,242,234,.86)'; x.font = `600 ${Math.round(W * .036)}px ${F.fig}`;
  y = wrapText(x, g.sum || T('Sin sinopsis en Jellyfin.'), pad, y, W - 2 * pad, W * .05, Math.max(3, Math.floor((H * .8 - y) / (W * .05)))) + W * .03;
  /* the strip at the foot: studio, rating, format, barcode */
  const sh2 = H * .12, sy2 = H - sh2;
  x.fillStyle = '#f4f1ea'; x.fillRect(0, sy2, W, sh2); x.fillStyle = p[2]; x.fillRect(0, sy2, W, 3);
  x.fillStyle = '#1b1b1f'; x.textAlign = 'left'; x.textBaseline = 'middle';
  x.font = `800 ${Math.round(sh2 * .24)}px ${F.saira}`; x.fillText((g.dev || 'Jellyfin').toUpperCase().slice(0, 26), pad * .8, sy2 + sh2 * .34);
  x.font = `600 ${Math.round(sh2 * .16)}px ${F.fig}`; x.fillStyle = '#55524c'; x.fillText(`${g.ageRating || (g.age ? T('No recomendada para menores de {0}', g.age) : '')}`.slice(0, 40), pad * .8, sy2 + sh2 * .62);
  x.fillText(T(DIMS[g.fmt].name), pad * .8, sy2 + sh2 * .82);
  barcode(x, W - pad * .8 - W * .25, sy2 + sh2 * .16, W * .25, sh2 * .66, hash(g.id + 'bc'));
  return c;
}
/* a tape's label, or a disc's face, for a film or one episode */
function drawVideoLabel(g, coverCanvas, ep) {
  if (mediaOf(g) === 'tape') return drawTapeLabel(g, coverCanvas, ep);
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), R = S / 2, p = g.pal, blue = g.fmt === 'bluray' || g.fmt === 'bdbox';
  x.save(); x.beginPath(); x.arc(R, R, R, 0, 7); x.clip();
  labelArt(x, g, coverCanvas, 0, 0, S, S, 2, .3);
  x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, 0, S, S);
  x.fillStyle = blue ? 'rgba(28,86,184,.9)' : 'rgba(12,12,16,.85)'; x.fillRect(0, S * .66, S, S * .34);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let ts = S * .085; x.font = `800 ${Math.round(ts)}px ${F.saira}`; const tt = g.t.toUpperCase(); while (x.measureText(tt).width > S * .62 && ts > 12) { ts *= .94; x.font = `800 ${Math.round(ts)}px ${F.saira}`; }
  x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 8; x.fillText(tt, R, R - S * .24); x.shadowBlur = 0;
  if (ep && !ep.film) {
    x.font = `800 ${Math.round(S * .07)}px ${F.saira}`; x.fillText(epCode(ep), R, S * .74);
    let es = S * .04; x.font = `700 ${Math.round(es)}px ${F.fig}`; const et = (ep.t || '').slice(0, 40); while (x.measureText(et).width > S * .56 && es > 10) { es *= .94; x.font = `700 ${Math.round(es)}px ${F.fig}`; }
    x.fillText(et, R, S * .82);
  } else { x.font = `800 ${Math.round(S * .06)}px ${F.saira}`; x.fillText(blue ? 'BLU-RAY DISC' : 'DVD VIDEO', R, S * .78); }
  x.fillStyle = rg(x, R, R, S * .06, S * .14, [[0, 'rgba(225,230,238,.95)'], [.6, 'rgba(190,198,210,.9)'], [1, 'rgba(160,170,184,0)']]); x.beginPath(); x.arc(R, R, S * .14, 0, 7); x.fill();
  x.restore();
  return c;
}
function drawTapeLabel(g, coverCanvas, ep) {
  const W = 512, H = 114, c = mkCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = '#f2ede1'; x.fillRect(0, 0, W, H);
  x.fillStyle = g.pal[2]; x.fillRect(0, 0, W * .035, H); x.fillRect(W * .965, 0, W * .035, H);
  x.save(); x.beginPath(); x.rect(W * .05, H * .12, H * .76, H * .76); x.clip(); labelArt(x, g, coverCanvas, W * .05, H * .12, H * .76, H * .76, 3); x.restore();
  x.fillStyle = '#1a1a1e'; x.textAlign = 'left'; x.textBaseline = 'middle';
  const tx = W * .07 + H * .8, room = W * .93 - tx;
  let ts = H * .3; x.font = `800 ${Math.round(ts)}px ${F.saira}`; const tt = g.t.toUpperCase(); while (x.measureText(tt).width > room && ts > 10) { ts *= .94; x.font = `800 ${Math.round(ts)}px ${F.saira}`; }
  x.fillText(tt, tx, H * .32);
  x.font = `700 ${Math.round(H * .2)}px ${F.mono}`; x.fillStyle = '#4a463e';
  x.fillText(ep && !ep.film ? `${epCode(ep)}  ${(ep.t || '').slice(0, 26)}` : `${g.year || ''}  VHS · PAL`, tx, H * .7);
  return c;
}
/* the spine of each tape case in a box: the episode number big, its title along it */
function drawTapeSpine(g, ep) {
  const W = 96, H = 640, c = mkCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = '#141416'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#f2ede1'; x.fillRect(W * .1, H * .03, W * .8, H * .94);
  x.fillStyle = g.pal[2]; x.fillRect(W * .1, H * .03, W * .8, H * .14);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `800 ${Math.round(W * .42)}px ${F.saira}`;
  x.fillText(ep ? String(ep.n ?? '') : '', W / 2, H * .1);
  x.save(); x.translate(W / 2, H * .58); x.rotate(-Math.PI / 2); x.fillStyle = '#1a1a1e';
  let ts = W * .34; x.font = `800 ${Math.round(ts)}px ${F.saira}`; const tt = ep ? (ep.t || '').toUpperCase() : ''; while (x.measureText(tt).width > H * .72 && ts > 8) { ts *= .94; x.font = `800 ${Math.round(ts)}px ${F.saira}`; }
  x.fillText(tt, 0, 0); x.restore();
  if (ep && ep.played) { x.fillStyle = '#2f8a4c'; x.beginPath(); x.arc(W / 2, H * .93, W * .14, 0, 7); x.fill(); }
  else if (ep && ep.pos > 60 * TICKS) { x.fillStyle = '#e3a02f'; x.beginPath(); x.arc(W / 2, H * .93, W * .14, 0, 7); x.fill(); }
  return c;
}

/* =====================================================================
   A SEASON IN YOUR HANDS: the discs on the leaves of the case, or the
   tapes in their box, labelled page by page
   ===================================================================== */
let MDISC_GEO = null;
function buildMultiInterior(c, parts) {
  const D = c.dim, { w, h, split } = D, g = c.g, m = c.multi = { kind: D.media, page: -1, want: 0, eps: [], slots: [], mats: [], flipA: 0, flipT: 0, anim: null, queued: null, rise: 0, riseT: 0, swapping: false };
  const add = (p, o, thick) => { p.add(o); parts.push([p, o]); if (thick) { o.userData.thick = true; c.thick.push(o); } return o; };
  const labelMat = () => { const mt = M(THREE.MeshPhysicalMaterial, { color: '#ffffff', roughness: .4, clearcoat: .8, clearcoatRoughness: .1, emissive: new THREE.Color('#000000') }, 1); m.mats.push(mt); return mt; };
  if (D.media === 'disc') {
    /* the leaves of the case, two discs each, overlapping: the lid's inside (L) with the previous discs just
       under it (LB), the two faces of the flip tray (TF, TB) and the base under the tray (S) */
    const R = D.discR, dy = [3.6, -3.6], leaf = (parent, x0, z0, back, dx = 0, ddy = 0) => dy.map((y, k) => {
      const mt = labelMat(), d = add(parent, makeDisc(R, mt), true);
      d.position.set(x0 + dx, y + ddy, z0 + (back ? -1 : 1) * (.075 + k * .13)); if (back) d.rotation.y = Math.PI;
      d.userData.mat = mt; c.tag(d, 'ep'); return d;
    });
    const trayPivot = add(c.inner, new THREE.Group()); trayPivot.position.set(-w / 2, 0, split + .6);
    const trayMesh = new THREE.Mesh(new THREE.BoxGeometry(w - .5, h - .5, .22), MAT.tray[g.fmt]); trayMesh.position.set(w / 2, 0, 0); trayMesh.castShadow = true;
    trayPivot.add(trayMesh); trayMesh.userData.thick = true; c.thick.push(trayMesh);
    m.tray = trayPivot; m.trayMesh = trayMesh;
    /* (the lid is seen from inside once open: a larger x there is further left, so the previous discs peek out on the left) */
    const LB = leaf(c.pivot, w / 2 - D.discX, -.02, true, .8, .35), L = leaf(c.pivot, w / 2 - D.discX, -.3, true);
    const TF = leaf(trayPivot, w / 2 + D.discX, .11), TB = leaf(trayPivot, w / 2 - D.discX, -.11, true), S = leaf(c.inner, D.discX, split, false, .8, .35);
    m.leaf = { L, LB, TF, TB, S }; m.slots = [...L, ...TF];
  } else {
    /* six tape cases standing in a row, spines to the front; the box is open on top */
    const cw = 3.2, ch = h - 1.4, cd = D.d - 1.2, geo = MDISC_GEO || (MDISC_GEO = { box: slabGeometry(cd, ch, cw, .3, .08), spine: new THREE.PlaneGeometry(cw - .3, ch - .4), hole: new THREE.PlaneGeometry(w - .8, D.d - .8) });
    Object.values(geo).forEach(q => { q.userData.shared = true; });
    const hole = add(c.inner, new THREE.Mesh(geo.hole, new THREE.MeshBasicMaterial({ color: '#0b0a09' }))); hole.rotation.x = -Math.PI / 2; hole.position.set(0, h / 2 + .03, 0);
    m.cases = [];
    for (let i = 0; i < 6; i++) {
      const grp = add(c.inner, new THREE.Group(), true), x0 = -w / 2 + .6 + cw / 2 + i * (cw + .1);
      const body = new THREE.Mesh(geo.box, MAT.edge.vhs); body.rotation.y = Math.PI / 2; body.castShadow = true; grp.add(body);
      const mt = labelMat(), sp = new THREE.Mesh(geo.spine, mt); sp.position.set(0, 0, cd / 2 + .02); grp.add(sp);
      /* inside the box, the spine just behind its front wall */
      grp.position.set(x0, 0, -.15); grp.userData.base = 0; grp.userData.mat = mt;
      c.tag(grp, 'ep'); m.cases.push(grp);
    }
    m.slots = m.cases;
  }
  /* the season's episodes arrive (they may already be here); the page with the first one not seen comes up */
  m.ready = (async () => {
    if (!seasonOf(g)) await videoSeasons(g); const eps = await videoEpisodes(g, seasonOf(g)); if (c.multi !== m) return;
    m.eps = eps; m.per = m.kind === 'disc' ? 4 : 6; m.page = m.want = Math.floor(firstUnseen(eps) / m.per);
    if (m.kind === 'disc') restDiscs(c); else labelSet(c, m.cases, m.page);
    renderEpBar();
  })();
}
function dropMultiInterior(c) {
  const m = c.multi; if (!m) return;
  m.mats.forEach(mt => { if (mt.map) mt.map.dispose(); unM(mt); });
  if (m.trayMesh) m.trayMesh.geometry.dispose();
  c.multi = null;
}
/* one disc or tape case shows an episode, or stays out of sight when there is none */
function paintSlot(c, o, ep) {
  const m = c.multi, mt = o.userData.mat; o.userData.ep = ep; o.userData.away = !ep;
  if (mt.map) { mt.map.dispose(); mt.map = null; }
  if (ep) { mt.map = tex(m.kind === 'disc' ? drawVideoLabel(c.g, c.coverCanvas, ep) : drawTapeSpine(c.g, ep)); mt.color.set('#ffffff'); }
  mt.needsUpdate = true;
}
/* paints a set of slots with the episodes of page p */
function labelSet(c, set, p) { const m = c.multi; set.forEach((o, k) => paintSlot(c, o, p >= 0 ? m.eps[p * m.per + k] || null : null)); }
/* the discs of page p, half by half (two per leaf); nothing before the first page or after the last */
function pageHalf(m, p, half) { return [0, 1].map(k => p >= 0 ? m.eps[p * 4 + half * 2 + k] || null : null); }
function paintLeaf(c, leaf, list) { leaf.forEach((o, k) => paintSlot(c, o, list[k])); }
/* the case at rest: this page on the lid and on the tray; under the lid the previous discs, if there are any;
   under the tray the next ones, if there are any */
function restDiscs(c) {
  const m = c.multi, p = m.page, { L, LB, TF, TB, S } = m.leaf;
  paintLeaf(c, L, pageHalf(m, p, 0)); paintLeaf(c, TF, pageHalf(m, p, 1));
  paintLeaf(c, LB, pageHalf(m, p - 1, 1)); paintLeaf(c, S, pageHalf(m, p + 1, 0)); paintLeaf(c, TB, [null, null]);
  m.flipA = m.flipT = 0; m.tray.rotation.y = 0;
}
function updateMultiInterior(c, dt) {
  const m = c.multi; if (!m) return;
  const s = dt / SPEED;
  if (m.kind === 'disc') {
    /* the tray turns at a steady pace; when it lands, the case goes back to its resting arrangement */
    const step = s * 1.6; m.flipA += clamp(m.flipT - m.flipA, -step, step);
    m.tray.rotation.y = -Math.PI * easeIO(clamp(m.flipA, 0, 1));
    if (m.anim && m.flipA === m.flipT) { const a = m.anim; m.anim = null; a(); if (m.queued != null) { const q = m.queued; m.queued = null; multiGo(c, q); } }
  } else {
    /* the tapes rise with the box opening; a page change sinks them, relabels them and brings them up again */
    m.rise += (m.riseT - m.rise) * (1 - Math.exp(-7 * s));
    const up = Math.min(c.openA, m.rise) * 8.5;
    m.cases.forEach((o, i) => { const lift = (o.userData.lift || 0) * c.openA; o.position.y = o.userData.base + up * (1 - i * .02) + lift; });
    if (m.swapping && m.rise < .04) { labelSet(c, m.cases, m.want); m.page = m.want; m.riseT = 1; m.swapping = false; }
  }
}
/* the next or previous four (or six), or the page with a given episode. Later episodes always come
   with the tray turning from right to left, earlier ones from left to right */
function multiGo(c, p) {
  const m = c.multi; if (!m || !m.eps.length) return false;
  const last = Math.max(0, Math.ceil(m.eps.length / m.per) - 1); p = clamp(p, 0, last);
  if (m.anim) { m.queued = p; return true; }
  if (p === m.page) return false;
  const from = m.page; m.want = m.page = p;
  if (m.kind === 'disc') {
    const { L, LB, TF, TB, S } = m.leaf;
    if (p > from) {
      /* the new discs go on the back of the tray and under it, and the tray turns over to the left */
      paintLeaf(c, TB, pageHalf(m, p, 0)); paintLeaf(c, S, pageHalf(m, p, 1)); m.flipT = 1;
    } else {
      /* the tray is laid over on the left showing what is there now (it looks the same), the earlier discs
         go under it and on its other face, and it turns back to the right */
      paintLeaf(c, TB, pageHalf(m, from, 0)); paintLeaf(c, S, pageHalf(m, from, 1)); m.flipA = m.flipT = 1; m.tray.rotation.y = -Math.PI;
      paintLeaf(c, L, pageHalf(m, p, 0)); paintLeaf(c, TF, pageHalf(m, p, 1)); paintLeaf(c, LB, pageHalf(m, p - 1, 1)); m.flipT = 0;
    }
    m.anim = () => restDiscs(c);
    sfx.handle(c.g.fmt);
  } else { m.swapping = true; m.riseT = 0; sfx.slide(); }
  m.focus = 0; setEpFocus(c, m.slots[0]); renderEpBar(); return true;
}
function multiOpened(c) { const m = c.multi; if (!m) return; m.riseT = 1; epQ.value = ''; epList.hidden = true; setEpFocus(c, m.slots.find(o => o.userData.ep && !o.userData.ep.played) || m.slots[0]); }
/* the slot an object belongs to (a disc, or a tape case and its spine) */
function slotOf(c, obj) { const m = c.multi; for (let o = obj; o && m; o = o.parent) if (m.slots.includes(o)) return o; return null; }
/* the episode you are about to take: it glows a little (the mouse over it, or the arrows) */
function setEpFocus(c, slot, hover) {
  const m = c.multi; if (!m) return;
  if (slot) { const i = m.slots.indexOf(slot); if (i >= 0) m.focus = i; }
  else if (hover) { m.slots.forEach(o => o.userData.mat.emissive.setScalar(0)); return; }
  m.slots.forEach((o, i) => o.userData.mat.emissive.setScalar(i === (m.focus || 0) ? .07 : 0));
  if (m.kind === 'tape') m.slots.forEach((o, i) => { if (!(m.taken && m.taken.o === o)) o.userData.lift = i === (m.focus || 0) ? 1.2 : 0; });
}
/* the case is closing: a turn under way ends at once, and the tapes go down */
function multiClosing(c) {
  const m = c.multi; if (!m) return; m.riseT = 0; m.queued = null;
  if (m.anim) { const a = m.anim; m.anim = null; m.flipA = m.flipT; a(); }
}

/* ---------- the episode bar: page arrows and a search for the exact episode ---------- */
const epBar = $('#epbar'), epQ = $('#epQ'), epList = $('#epList');
function renderEpBar() {
  const c = active, m = c && c.multi, show = !!m && mode === 'open' && m.eps.length > 0;
  epBar.hidden = !show; if (!show) { epList.hidden = true; return; }
  const a = m.page * m.per, b = Math.min(m.eps.length, a + m.per), last = Math.ceil(m.eps.length / m.per) - 1;
  $('#epRange').textContent = T('{0} a {1} de {2}', epCode(m.eps[a]).replace(/^T\d+ · /, ''), epCode(m.eps[b - 1]).replace(/^T\d+ · /, ''), m.eps.length);
  $('#epPrev').disabled = m.page <= 0; $('#epNext').disabled = m.page >= last;
}
epBar.addEventListener('click', e => {
  const c = active; if (!c || !c.multi || mode !== 'open' || busy) return;
  if (e.target.closest('#epPrev')) multiGo(c, c.multi.page - 1);
  if (e.target.closest('#epNext')) multiGo(c, c.multi.page + 1);
  const it = e.target.closest('[data-ep]'); if (it) { const i = +it.dataset.ep; epQ.value = ''; epList.hidden = true; multiGo(c, Math.floor(i / c.multi.per)); }
});
epQ.addEventListener('input', () => {
  const c = active, m = c && c.multi; if (!m) return;
  const q = norm(epQ.value.trim()); if (!q) { epList.hidden = true; return; }
  const num = q.match(/^(?:e|ep|cap[ií]?t?u?l?o?)?\s*(\d+)$/), hits = m.eps.map((ep, i) => [ep, i]).filter(([ep]) => num ? ep.n === +num[1] : norm(ep.t || '').includes(q)).slice(0, 8);
  epList.innerHTML = hits.length ? hits.map(([ep, i]) => `<button type="button" data-ep="${i}"><b>${esc(epCode(ep))}</b>${esc(ep.t || '')}<i>${esc(T(videoStatus(ep)))}</i></button>`).join('') : `<span>${T('Ningún capítulo coincide')}</span>`;
  epList.hidden = false;
});
epQ.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = epList.querySelector('[data-ep]'); if (b) b.click(); e.preventDefault(); } if (e.key === 'Escape') { epQ.value = ''; epList.hidden = true; epQ.blur(); } });

/* ---------- the card: what it is, how far you got, the season and the format ---------- */
function renderVideoInfo(el, g) {
  const s = seasonOf(g), fam = VIDEO_FAMILY[g.fmt], st = g.kind === 'series' ? null : videoStatus(g);
  const seasons = g.seasons || [];
  el.innerHTML = `<div class="info-bar"><span></span><button type="button" class="info-hide" data-hide="1" aria-label="${T('Ocultar la ficha')}" title="${T('Ocultar la ficha')} (I)">${T('Ocultar')} <i aria-hidden="true">▴</i></button></div>
    <div class="eyebrow">${esc([g.kind === 'series' ? T('Serie') : T('Película'), g.year, g.genre, g.lib].filter(Boolean).join(' · '))}</div><h2>${esc(g.t)}</h2>
    <dl>${g.runtime ? `<dt>${T('Duración')}</dt><dd>${T(g.kind === 'series' ? '{0} min por capítulo' : '{0} min', g.runtime)}</dd>` : ''}${st ? `<dt>${T('Estado')}</dt><dd>${esc(T(st))}${g.pos > 60 * TICKS && !g.played ? ' · ' + T('vas por {0}', clockOf(g.pos / TICKS)) : ''}</dd>` : ''}${s && s.eps ? `<dt>${T('Vistos')}</dt><dd>${T('{0} de {1}', s.eps.filter(e => e.played).length, s.eps.length)}</dd>` : ''}</dl>
    ${seasons.length ? `<div class="frow"><label for="seasonSel">${T('Temporada')}</label><span class="fmt-ico" aria-hidden="true">▤</span><select id="seasonSel">${seasons.map((x, i) => `<option value="${i}"${i === (g.seasonIdx || 0) ? ' selected' : ''}>${esc(x.name || T('Temporada {0}', x.idx))}${x.year ? ' · ' + x.year : ''}</option>`).join('')}</select></div>` : ''}
    <div class="frow"><label for="vfmtSel">${T('Formato')}</label><span class="fmt-ico" aria-hidden="true">${FMT_ICON[g.fmt] || '▮'}</span><select id="vfmtSel">${VIDEO_FMTS.map(f => `<option value="${f}"${f === fam ? ' selected' : ''}>${esc(T({ vhs: 'VHS', dvd: 'DVD', bluray: 'Blu-ray' }[f]))}</option>`).join('')}</select></div>
    <p class="note">${esc(T(g.kind === 'series' ? 'Cada temporada guarda su formato. Por defecto: VHS hasta 1997, DVD hasta 2014 y Blu-ray después.' : 'Por defecto: VHS hasta 1997, DVD hasta 2014 y Blu-ray después.'))}</p>
    <p class="note">${esc(g.sum || '')}</p>`;
}
$('#info').addEventListener('change', e => {
  if (!active || !active.g.video) return;
  if (e.target.id === 'vfmtSel') setVideoFormat(e.target.value);
  if (e.target.id === 'seasonSel') setSeason(+e.target.value);
});
function setVideoFormat(fam) {
  const g = active && active.g; if (!g || !VIDEO_FMTS.includes(fam)) return;
  const s = seasonOf(g);
  return swapCaseTo(active, () => { if (s) { g.seasonPicks = Object.assign({}, g.seasonPicks || {}, { [s.idx]: fam }); } else g.fmtPick = fam; resolveVideoFmt(g); }, true);
}
function setSeason(i) {
  const g = active && active.g; if (!g || !g.seasons || i === (g.seasonIdx || 0)) return;
  return swapCaseTo(active, () => { g.seasonIdx = clamp(i, 0, g.seasons.length - 1); resolveVideoFmt(g); }, false);
}

/* ---------- start where you left off, or from the beginning ---------- */
const resumeEl = $('#resume');
function askResume(it) {
  if (it.played || !(it.pos > 60 * TICKS)) return Promise.resolve(0);
  return new Promise(res => {
    const total = it.runtime && it.runtime * 60 > it.pos / TICKS ? ` ${T('de')} ${clockOf(it.runtime * 60)}` : '';
    resumeEl.innerHTML = `<div class="resume-card"><h3>${esc(it.film ? it.t : epCode(it) + ' · ' + (it.t || ''))}</h3><p>${T('Te quedaste en {0}', clockOf(it.pos / TICKS))}${total}</p>
      <div class="resume-btns"><button type="button" class="pbtn primary" data-r="go">${T('Retomar')}</button><button type="button" class="pbtn" data-r="start">${T('Desde el principio')}</button><button type="button" class="pbtn" data-r="no">${T('Cancelar')}</button></div></div>`;
    resumeEl.hidden = false; const first = resumeEl.querySelector('button'); if (first && !coarse) first.focus();
    const done = v => { resumeEl.hidden = true; resumeEl.removeEventListener('click', on); window.removeEventListener('keydown', key, true); res(v); };
    const on = e => { const b = e.target.closest('[data-r]'); if (!b) return; done(b.dataset.r === 'go' ? it.pos : b.dataset.r === 'start' ? 0 : null); };
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(null); } };
    resumeEl.addEventListener('click', on); window.addEventListener('keydown', key, true);
  });
}

/* =====================================================================
   PUTTING IT ON: the chosen tape or disc goes into the player
   ===================================================================== */
const VPLAY = { item: null, start: 0, t0: 0, demoT: 0 };
/* a film's own medium, or one episode picked from the season */
async function chooseVideo(c, slot) {
  if (!c || mode !== 'open' || busy) return;
  const g = c.g, m = c.multi;
  if (m && m.anim) return;
  const it = m ? slot && slot.userData.ep : filmItem(g); if (!it) return;
  const start = await askResume(it); if (start === null) return;
  busy = true;
  try { if (m && m.kind === 'tape') await caseFromBox(c, slot, it); else if (m) takeFromSet(c, slot); } finally { busy = false; }
  g.ep = it; VPLAY.item = it; VPLAY.start = start;
  return insertDisc();
}
/* the episode's disc comes free of its leaf: it stops being part of the case's inside, so it is seen all the way into the player */
function takeFromSet(c, slot) {
  const m = c.multi, i = c.thick.indexOf(slot); if (i >= 0) c.thick.splice(i, 1); slot.userData.thick = false; slot.visible = true;
  m.taken = { o: slot, parent: slot.parent };
  c.inner.attach(slot); c.disc = slot; c.discHome = slot.position.clone(); c.discQuat = slot.quaternion.clone(); c.discLabelMat = slot.userData.mat;
}
/* the disc is back on its leaf */
function putBackInSet(c) {
  const m = c.multi; if (!m || !m.taken) return;
  const o = m.taken.o; m.taken.parent.attach(o); o.userData.thick = true; c.thick.push(o);
  m.taken = null; c.disc = null; c.discQuat = null;
}
/* ---------- a tape from the box: the episode's own case leaves the box and goes to the VCR like a
   film's; the box waits out of sight until it comes back ---------- */
/* a case standing in the box (its thin side across the box, its spine to the front), turned the way a case is built */
const QBOX = new Q4().setFromAxisAngle(new V3(0, 1, 0), Math.PI / 2);
let heldTape = null;
function slotPose(slot, P, Q) { slot.updateWorldMatrix(true, false); slot.getWorldPosition(P); slot.getWorldQuaternion(Q).multiply(QBOX); }
async function caseFromBox(c, slot, it) {
  const m = c.multi, g = c.g, rise = DIMS.vhsbox.h + 2;
  setMode('busy'); m.taken = { o: slot }; setEpFocus(c, slot);
  const l0 = slot.userData.lift || 0;
  sfx.slide(); await tweenReal(.6, t => { slot.userData.lift = lerp(l0, rise, t); }, easeIO);
  /* the episode as a film of its own: the series' cover, this episode on the spine and on the tape */
  const eg = Object.assign(Object.create(g), { fmt: 'vhs', ep: it, wrapped: false, dust: 0 });
  const n = new Case(eg); n.box = c; n.slot = slot; heldTape = n;
  const sc = n.spineCanvas; sc.getContext('2d').drawImage(drawTapeSpine(g, it), 0, 0, sc.width, sc.height); n.spineTex.needsUpdate = true;
  n.ensureDetail(); n.setShadow(true);
  slotPose(slot, n.root.position, n.root.quaternion); n.root.scale.setScalar(c.root.scale.x);
  slot.userData.away = true;
  n.mode = 'inspect'; n.leaving = true; active = n;
  /* the box shrinks away; the case comes to your hands and opens */
  c.vanish = true; c.fast = true; sfx.whoosh();
  await wait(560); c.root.visible = false; c.fast = false;
  await swingOpen(n); setMode('open');
}
/* after the episode: the box comes back, the case flies into its place and slides down */
async function caseBackInBox(n) {
  const b = n.box, slot = n.slot, m = b.multi, rise = DIMS.vhsbox.h + 2, P = new V3(), Q = new Q4();
  setView('shelf'); b.root.visible = true; b.vanish = false; b.mode = 'inspect'; active = b;
  slot.userData.lift = rise;
  await wait(420);
  n.pinned = true; const p0 = n.root.position.clone(), q0 = n.root.quaternion.clone(), s0 = n.root.scale.x;
  sfx.whoosh();
  await tween(1, t => { const e = easeIO(t); slotPose(slot, P, Q); n.root.position.lerpVectors(p0, P, e); n.root.position.y += Math.sin(Math.PI * t) * 12; n.root.quaternion.copy(q0).slerp(Q, e); n.root.scale.setScalar(lerp(s0, b.root.scale.x, e)); });
  /* its spine now shows whether it has been seen */
  if (m) paintSlot(b, slot, slot.userData.ep);
  slot.userData.away = false; heldTape = null; n.dispose();
  sfx.slide(); await tweenReal(.55, t => { slot.userData.lift = rise * (1 - t); }, easeIO);
  if (m) { m.taken = null; setEpFocus(b, slot); }
}
/* the films play outside the shelf: Jellyfin Media Player or VLC (the extension starts them) */
function startVideo(c) {
  const it = VPLAY.item; VPLAY.t0 = performance.now();
  if (PLAYNITE && c.g.real) { PN_STATE.waiting = true; PN_STATE.running = c.g.id; LIB.send('jfPlay', { id: it.id, start: Math.round(VPLAY.start), series: c.g.kind === 'series' ? c.g.jf : null }); return; }
  /* the demo pretends: a few seconds count as the whole film */
  clearTimeout(VPLAY.demoT);
  VPLAY.demoT = setTimeout(() => { if (mode === 'playing' && active === c) closeGame({ auto: true, video: { pos: 0, played: true } }); }, 12000);
}
/* pulled out by hand: the player tells later how far it got */
function videoLate(m) {
  const L = VPLAY.last; if (!L || L.it.id !== m.id) return;
  if (m.played) { L.it.played = true; L.it.pos = 0; } else if (m.pos != null) L.it.pos = m.pos;
  if (L.it.film) { L.g.played = L.it.played; L.g.pos = L.it.pos; L.g.status = videoStatus(L.g); }
  for (const c of casesOf(L.g)) { c.dirty = true; c.refreshSpine(); }
}
function stopVideo() { clearTimeout(VPLAY.demoT); if (PLAYNITE && active && active.g.real) LIB.send('jfStop', {}); }
/* what changed once it has been watched: the episode or film, the season's labels, the case */
function videoDone(c, o) {
  const it = VPLAY.item, g = c.g; if (!it) return '';
  const v = o.video || {};
  if (v.played) { it.played = true; it.pos = 0; } else if (v.pos != null) it.pos = v.pos;
  if (it.film) { g.played = it.played; g.pos = it.pos; } else { g.last = 0; }
  g.status = g.kind === 'series' ? g.status : videoStatus(g); g.sessions = (g.sessions || 0) + 1; g.last = 0; g.dust = 0; c.setDust(0);
  if (g.wrapped) g.wrapped = false;
  saveGame(g);
  const msg = it.played ? T('Visto: {0}', it.film ? g.t : epCode(it)) : it.pos > 60 * TICKS ? T('Te quedas en {0}. La próxima vez podrás retomarlo.', clockOf(it.pos / TICKS)) : T('{0} de vuelta en su caja.', it.film ? g.t : epCode(it));
  VPLAY.last = { it, g }; VPLAY.item = null; g.ep = null;
  return msg;
}
