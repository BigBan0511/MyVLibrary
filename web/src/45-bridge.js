
/* =====================================================================
   PLAYNITE BRIDGE
   The MyVLibrary extension hosts this page in WebView2. Both sides talk
   with small JSON messages; covers come from https://media.myvlibrary/
   (resized and cached by the extension). With ?mock the same code runs
   against a pretend Playnite, for testing in a normal browser.
   ===================================================================== */
const MEDIA = 'https://media.myvlibrary/';
const PLAT_SHORT = [
  [/playstation 5|ps5/i, 'PS5'], [/playstation 4|ps4/i, 'PS4'], [/playstation 3|ps3/i, 'PS3'], [/playstation 2|ps2/i, 'PS2'], [/playstation vita|psvita|ps vita/i, 'VITA'], [/psp|playstation portable/i, 'PSP'], [/playstation|psx|ps1/i, 'PS1'],
  [/xbox series/i, 'XSX'], [/xbox one/i, 'XONE'], [/xbox 360/i, 'X360'], [/xbox/i, 'XBOX'],
  [/switch 2/i, 'SWITCH 2'], [/switch/i, 'SWITCH'], [/wii u/i, 'WII U'], [/wii/i, 'WII'], [/gamecube/i, 'GC'], [/nintendo 64|n64/i, 'N64'], [/super nintendo|snes|super famicom/i, 'SNES'], [/nintendo entertainment|nes\b|famicom/i, 'NES'],
  [/3ds/i, '3DS'], [/nintendo ds|\bnds\b/i, 'DS'], [/game boy advance|gba/i, 'GBA'], [/game boy color|gbc/i, 'GBC'], [/game boy/i, 'GB'],
  [/dreamcast/i, 'DC'], [/saturn/i, 'SATURN'], [/sega cd|mega-cd|mega cd/i, 'MEGA CD'], [/genesis|mega drive/i, 'MD'], [/master system/i, 'SMS'], [/game gear/i, 'GG'],
  [/neo ?geo/i, 'NEO GEO'], [/pc engine|turbografx/i, 'PCE'], [/3do/i, '3DO'], [/arcade|mame/i, 'ARCADE'],
  [/windows|pc\b|\(windows\)|dos/i, 'PC'], [/linux/i, 'LINUX'], [/mac/i, 'MAC'], [/android/i, 'ANDROID'], [/ios/i, 'IOS']
];
function shortPlat(name) { if (!name) return 'PC'; for (const [re, s] of PLAT_SHORT) if (re.test(name)) return s; return name.split(/\s+/).pop().slice(0, 7).toUpperCase(); }
function defaultPal(seed) { const h = hash(seed) % 360; return [hslHex(h, .35, .14), hslHex(h + 10, .3, .3), hslHex(h + 160, .55, .55), hslHex(h + 30, .6, .8), '#f6f2ea']; }
function htmlToText(html) {
  if (!html) return '';
  if (!/[<&]/.test(html)) return html.trim();
  /* DOMParser builds an inert document: no scripts run, no images load */
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed').forEach(n => n.remove());
  doc.querySelectorAll('br').forEach(n => n.replaceWith('\n'));
  doc.querySelectorAll('p,div,li,h1,h2,h3,h4,h5,h6,tr').forEach(n => n.append('\n\n'));
  return (doc.body.textContent || '').replace(/[ \t ]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
}
/* a cover's colours: a dark base for the spine and plastic, its strongest colour as accent */
function paletteOf(img) {
  const W = 24, H = 34, c = mkCanvas(W, H), x = c.getContext('2d', { willReadFrequently: true });
  x.drawImage(img, 0, 0, W, H); let d;
  try { d = x.getImageData(0, 0, W, H).data; } catch (e) { return null; }
  let r = 0, g = 0, b = 0, n = 0, best = null, bestS = -1, light = null, bestL = -1;
  for (let i = 0; i < d.length; i += 4) {
    const R = d[i], G = d[i + 1], B = d[i + 2]; r += R; g += G; b += B; n++;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), l = (mx + mn) / 510, s = mx === mn ? 0 : (mx - mn) / (255 - Math.abs(mx + mn - 255));
    const score = s * (l > .25 && l < .78 ? 1 : .35); if (score > bestS) { bestS = score; best = [R, G, B]; }
    if (l > bestL) { bestL = l; light = [R, G, B]; }
  }
  const hx = a => '#' + a.map(v => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
  const avg = hx([r / n, g / n, b / n]);
  return [mix(avg, '#000000', .5), avg, hx(best), mix(hx(light), '#ffffff', .25), '#f6f2ea'];
}

const LIB = {
  pending: new Map(), pendingFetch: new Map(), fetched: new Map(), imgs: new Map(), queue: [], loading: 0, statusIds: {}, catIds: {}, booted: null, bootRes: null, hostPad: false, paused: false,
  send(type, data = {}) { const m = Object.assign({ type }, data); try { if (HOST) HOST.postMessage(m); else if (MOCK) MOCKHOST.receive(m); } catch (e) { console.error(e); } },
  boot() { this.booted = new Promise(res => { this.bootRes = res; }); this.send('ready', { version: 1 }); return this.booted; },
  coverUrl(g, w) { return MOCK ? `mock:cover:${g.id}:${w}` : `${MEDIA}cover/${g.id}?w=${w}&v=${encodeURIComponent(g.ver || '')}`; },
  logoUrl(g) { return MOCK ? `mock:logo:${g.id}:0` : `https://extra.myvlibrary/${g.id}/Logo.png`; },
  bgUrl(g, w) { return MOCK ? `mock:bg:${g.id}:${w}` : `${MEDIA}bg/${g.id}?w=${w}&v=${encodeURIComponent(g.ver || '')}`; },
  img(url) {
    if (this.imgs.has(url)) return this.imgs.get(url);
    const p = MOCK && url.startsWith('mock:') ? Promise.resolve(MOCKHOST.image(url)) : new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.decoding = 'async'; i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
    this.imgs.set(url, p); if (this.imgs.size > 900) { const k = this.imgs.keys().next().value; this.imgs.delete(k); }
    return p;
  },
  /* spines need a small cover each: load them a few at a time, nearest first */
  pageShown(list) {
    if (!PLAYNITE) return;
    this.queue = list.filter(g => g.real && ((g.hasCover && !g.coverSmall) || (g.hasLogo && !g.logo)));
    for (let k = 0; k < 6; k++) this.pump();
    /* the face-out ones show their front: load it straight away */
    navOrder.filter(c => c.faceOut).forEach(c => this.bigCover(c.g));
  },
  pump() {
    if (this.loading >= 6) return; const g = this.queue.shift(); if (!g) return; this.loading++;
    const jobs = [];
    if (g.hasCover && !g.coverSmall) jobs.push(this.img(this.coverUrl(g, 200)).then(img => { if (img) { g.coverSmall = img; if (!g.palFromCover) { const p = paletteOf(img); if (p) { g.pal = p; g.palFromCover = true; } } } }));
    if (g.hasLogo && !g.logo) jobs.push(this.img(this.logoUrl(g)).then(img => { if (img) g.logo = img; }));
    Promise.all(jobs).then(() => { this.loading--; this.refresh(g, false); this.pump(); });
  },
  refresh(g, detail) {
    for (const c of casesOf(g)) { c.dirty = true; c.refreshSpine(); c.edgeTint(); if (detail && c === active || c.faceOut || c === active) c.ensureDetail(); }
  },
  bigCover(g) {
    if (!g.real || !g.hasCover || g.cover || g.bigLoading) return g.bigLoading || Promise.resolve();
    return (g.bigLoading = this.img(this.coverUrl(g, 720)).then(i => { if (i) { g.cover = i; if (!g.palFromCover) { const p = paletteOf(i); if (p) { g.pal = p; g.palFromCover = true; } } } g.bigLoading = null; this.refresh(g, false); }));
  },
  /* pointing at a game is a good moment to start loading what its case will need */
  prefetch(g) { if (!PLAYNITE || !g || !g.real) return; this.bigCover(g); if (!g.detailLoaded && !g.detailLoading) this.detail(g); },
  /* everything the case needs in your hands: the big cover, the background, the description.
     Picking waits a moment for it; whatever arrives later still gets painted on */
  prepare(g, timeout = 1500) {
    const jobs = [this.bigCover(g)];
    if (g.hasBg && !g.bg) jobs.push(this.img(this.bgUrl(g, 1280)).then(i => { if (i) g.bg = i; }));
    if (!g.detailLoaded) jobs.push(g.detailLoading || this.detail(g));
    const all = Promise.all(jobs).then(() => { this.refresh(g, true); this.media(g); });
    return Promise.race([all, new Promise(r => setTimeout(r, timeout))]).then(() => this.refresh(g, true));
  },
  detail(g) {
    return (g.detailLoading = new Promise(res => {
      const done = () => { g.detailLoading = null; res(); };
      this.pending.set(g.id, done); this.send('detail', { id: g.id });
      setTimeout(() => { if (this.pending.get(g.id) === done) { this.pending.delete(g.id); done(); } }, 4000);
    }));
  },
  /* pictures and trailer from the description (or from Extra Metadata Loader), for the back and the TV */
  media(g) {
    if (!g.real || g.mediaLoading || g.mediaDone) return;
    g.mediaLoading = true; const jobs = [];
    (g.imageUrls || []).slice(0, 6).forEach(u => jobs.push(this.fetchRemote(g, u).then(local => local && this.img(local)).then(i => { if (i && imgW(i) >= 200) (g.shots = g.shots || []).push(i); })));
    const remoteVideo = !g.trailerUrl && (g.videoUrls || [])[0];
    if (remoteVideo) jobs.push(this.fetchRemote(g, remoteVideo).then(local => { if (local) g.trailerUrl = local; }));
    Promise.all(jobs).then(() => { g.mediaLoading = false; g.mediaDone = true; this.refresh(g, true); if (active && active.g === g) startTrailer(active); });
  },
  fetchRemote(g, url) {
    if (MOCK) return Promise.resolve(MOCKHOST.remote(url));
    if (this.fetched.has(url)) return this.fetched.get(url);
    const p = new Promise(res => { this.pendingFetch.set(url, res); this.send('fetch', { id: g.id, url }); setTimeout(() => { if (this.pendingFetch.get(url) === res) { this.pendingFetch.delete(url); res(null); } }, 90000); });
    this.fetched.set(url, p); return p;
  },
  start(g) { this.send('start', { id: g.id }); },
  openUrl(url) { if (/^https?:\/\//i.test(url || '')) this.send('openUrl', { url }); },
  update(g, fields) {
    const m = { id: g.id, fields: fields.slice() };
    if (fields.includes('status')) m.status = g.status || null;
    if (fields.includes('cats')) m.cats = g.cats.slice();
    if (fields.includes('rating')) m.score = g.rating ? g.rating * 20 : null;
    if (fields.includes('notes')) m.notes = g.notes || '';
    this.send('update', m);
  },

  /* ---------- from the host ---------- */
  fromHost(r, old) {
    const now = Date.now(), days = iso => { if (!iso) return null; const t = Date.parse(iso); return isNaN(t) ? null : Math.max(0, Math.floor((now - t) / 864e5)); };
    const plats = r.plats || [], plat = shortPlat(plats[0]), year = r.year || null;
    const g = old || { id: r.id, real: true, ach: [0, 0], font: 'saira', tag: '', tpos: 'top', artOpt: {}, tear: 0 };
    Object.assign(g, {
      t: r.name || T('Sin título'), sort: r.sort || r.name || '', status: r.status || '', cats: (r.cats || []).slice(), genres: r.genres || [], genre: (r.genres || []).slice(0, 2).join(' / '),
      dev: (r.devs || []).slice(0, 2).join(', '), pub: (r.pubs || []).slice(0, 2).join(', '), year, release: r.release || '', plat, platName: plats.join(', '), platFull: plats[0] || 'PC', fmt: old ? old.fmt : fmtFor(plat, year),
      hours: (r.playtime || 0) / 3600, sessions: r.playCount || 0, last: days(r.lastActivity), added: days(r.added), installed: !!r.installed, favorite: !!r.favorite,
      rating: r.score ? clamp(Math.round(r.score / 20), 0, 5) : 0, critic: r.critic || null, community: r.community || null, features: r.features || [], series: (r.series || []).join(', '),
      ageRating: (r.age || []).join(', '), age: (() => { const m = (r.age || []).join(' ').match(/\b(3|7|12|16|18)\b/); return m ? +m[1] : null; })(), src: r.src || '', sum: r.sum || '', hasCover: !!r.hasCover, hasBg: !!r.hasBg, hasLogo: !!r.hasLogo
    });
    if ('notes' in r) g.notes = r.notes || '';
    if (old && old.ver !== r.ver) { g.cover = g.coverSmall = g.bg = null; g.palFromCover = false; }
    g.ver = r.ver || '';
    if (!g.pal) g.pal = defaultPal(g.id);
    if (!old) {
      g.wrapped = !g.hours && !g.sessions && g.last === null;
      g.dust = g.wrapped ? 0 : dustFor(g.last !== null ? g.last : (g.added ?? 0));
      restoreUi(g); if (g.wrapped) g.dust = 0; g.dust0 = g.dust;
    } else if (g.wrapped && (g.hours || g.sessions)) { g.wrapped = false; }
    return g;
  },
  setLists(m) {
    const st = (m.statuses || []).slice().sort((a, b) => KIND_ORDER.indexOf(statusKind(a.name)) - KIND_ORDER.indexOf(statusKind(b.name)));
    STATUSES = st.map(s => s.name); STATUS_SHELF = {}; STATUS_KIND = {}; STATUS_CLASS = {}; this.statusIds = {};
    st.forEach(s => { STATUS_SHELF[s.name] = s.name; STATUS_KIND[s.name] = statusKind(s.name); STATUS_CLASS[s.name] = KIND_CLASS[STATUS_KIND[s.name]]; this.statusIds[s.name] = s.id; });
    prefs.cats = (m.categories || []).map(c => c.name).sort((a, b) => a.localeCompare(b, 'es'));
  },
  load(m) {
    this.setLists(m); PN_STATE.mode = m.mode || 'desktop'; this.hostPad = !!m.hostPad; this.running = m.running || []; if (m.lang) setLang(m.lang);
    document.documentElement.classList.toggle('pn-fullscreen', PN_STATE.mode === 'fullscreen');
    const old = new Map(GAMES.map(g => [g.id, g]));
    GAMES.length = 0; (m.games || []).forEach(r => GAMES.push(this.fromHost(r, old.get(r.id))));
    if (m.focusId) this.focusId = m.focusId;
    if (this.bootRes) { this.bootRes(); this.bootRes = null; }
    else if (mode === 'shelf') relayout({ follow: null }); else pendingRelayout = true;
  },
  upsert(list) {
    let regroup = false;
    for (const r of list || []) {
      const g = GAMES.find(q => q.id === r.id);
      if (!g) { GAMES.push(this.fromHost(r)); regroup = true; continue; }
      const before = keysOf(g).join('|') + '|' + g.t + '|' + (prefs.sort === 'hours' ? Math.round(g.hours) : '') + '|' + (prefs.sort === 'recent' ? g.last : '');
      this.fromHost(r, g);
      if (before !== keysOf(g).join('|') + '|' + g.t + '|' + (prefs.sort === 'hours' ? Math.round(g.hours) : '') + '|' + (prefs.sort === 'recent' ? g.last : '')) regroup = true;
      for (const c of casesOf(g)) { c.dirty = true; c.refreshSpine(); if (c === active || c.faceOut) c.ensureDetail(); }
    }
    if (active) renderInfo(true);
    if (regroup) { if (mode === 'shelf' && !busy) relayout(); else pendingRelayout = true; }
  },
  remove(ids) {
    const set = new Set(ids || []); if (!set.size) return;
    for (let i = GAMES.length - 1; i >= 0; i--) if (set.has(GAMES[i].id) && !(active && active.g === GAMES[i])) GAMES.splice(i, 1);
    if (mode === 'shelf' && !busy) relayout(); else pendingRelayout = true;
  },
  /* the game has closed: wait until the shelf is on screen again (Playnite is usually still minimised)
     so the disc coming out of the console is actually seen */
  eject(o, onScreen) {
    const go = () => { if (mode === 'playing' && !busy) closeGame(o); else PN_STATE.pendingEject = o; };
    if (onScreen && !document.hidden) { setTimeout(go, 700); return; }
    let done = false;
    const shown = () => { if (done || document.hidden) return; done = true; document.removeEventListener('visibilitychange', shown); this.onShown = null; setTimeout(go, 900); };
    this.onShown = shown; document.addEventListener('visibilitychange', shown);
  },
  onMessage(m) {
    if (!m || typeof m !== 'object') return;
    switch (m.type) {
      case 'library': this.load(m); break;
      case 'games': this.upsert(m.games); break;
      case 'removed': this.remove(m.ids); break;
      case 'lists': this.setLists(m); if (active) renderInfo(true); break;
      case 'detail': {
        const g = GAMES.find(q => q.id === m.id);
        if (g) {
          g.descText = htmlToText(m.desc || ''); g.links = (m.links || []).filter(l => /^https?:\/\//i.test(l.url || '')); if ('notes' in m) g.notes = m.notes || '';
          g.imageUrls = (m.images || []).filter(u => /^https?:\/\//i.test(u)); g.videoUrls = (m.videos || []).filter(u => /^https?:\/\//i.test(u));
          if (m.trailer) g.trailerUrl = m.trailer;
          g.detailLoaded = true;
        }
        const res = this.pending.get(m.id); if (res) { this.pending.delete(m.id); res(); } break;
      }
      case 'started': {
        if (PN_STATE.running === m.id) { PN_STATE.waiting = false; PN_STATE.selfTrack = false; if (active && active.g.id === m.id) { tvSet('play', active); playStart = performance.now(); sfx.boot(); renderPlayBanner(); } }
        else { const g = GAMES.find(q => q.id === m.id); if (g) toast(T('Jugando a {0}', g.t)); }
        break;
      }
      case 'stopped': {
        const g = GAMES.find(q => q.id === m.id), s = m.seconds || 0;
        if (active && active.g.id === m.id && (mode === 'playing' || PN_STATE.waiting)) this.eject({ auto: true, seconds: s }, m.active);
        else if (g) toast(s >= 60 ? T('+{0} min en {1}', Math.round(s / 60), g.t) : T('{0} se ha cerrado', g.t));
        if (PN_STATE.running === m.id) { PN_STATE.running = null; PN_STATE.selfTrack = false; }
        break;
      }
      /* Playnite has lost track of the game but a program from its folder is still open: the disc stays in */
      case 'tracking': if (PN_STATE.running === m.id) { PN_STATE.selfTrack = true; PN_STATE.waiting = false; if (mode === 'playing') renderPlayBanner(); } break;
      case 'cancelled': if (PN_STATE.running === m.id) this.eject({ auto: true, msg: T('Playnite ha cancelado el arranque.') }, true); break;
      case 'notInstalled': if (PN_STATE.running === m.id) this.eject({ auto: true, msg: T('No está instalado: Playnite se encarga de instalarlo.') }, true); break;
      case 'failed': if (PN_STATE.running === m.id) this.eject({ auto: true, msg: m.reason || T('No se ha podido arrancar.') }, true); break;
      case 'activated': if (this.onShown) this.onShown(); break;
      case 'fetched': { const res = this.pendingFetch.get(m.url); if (res) { this.pendingFetch.delete(m.url); res(m.local || null); } break; }
      case 'pad': this.pad(m.button, m.state); break;
      case 'focus': this.focusGame(m.id); break;
      case 'pause': this.paused = true; break;
      case 'resume': this.paused = false; lastT = performance.now(); break;
    }
  },
  /* Playnite may also turn the stick and the d-pad into arrow keys; the same press must not count twice */
  recent: { key: '', t: 0, from: '' },
  dupe(key, from) { const now = performance.now(), r = this.recent, d = r.key === key && r.from !== from && now - r.t < 160; this.recent = { key, t: now, from }; return d; },
  pad(button, state) {
    this.hostPad = true; if (state !== 'Pressed') return;
    const map = { A: 'Enter', B: 'Escape', X: 'm', Y: 'f', Start: 'Enter', Back: 'i', LeftShoulder: 'q', RightShoulder: 'e', TriggerLeft: 'z', TriggerRight: 'c', DPadUp: 'ArrowUp', DPadDown: 'ArrowDown', DPadLeft: 'ArrowLeft', DPadRight: 'ArrowRight', LeftStickUp: 'ArrowUp', LeftStickDown: 'ArrowDown', LeftStickLeft: 'ArrowLeft', LeftStickRight: 'ArrowRight' };
    const k = map[button]; if (!k) return;
    if (this.dupe(k, 'pad')) return;
    sfx.init();
    if (k === 'Escape' && mode === 'shelf' && PN_STATE.mode === 'fullscreen') { this.send('close'); return; }
    handleKey(k);
  },
  async focusGame(id) {
    const g = GAMES.find(q => q.id === id); if (!g) return;
    if (mode !== 'shelf') { this.focusId = id; return; }
    if (isRooms() && sysOf(g) !== curSysKey()) { prefs.sys = sysOf(g); prefs.shelf = '__all'; savePrefs(); buildGroups(); await swapShelf(() => { curGroup = 0; curPage = 0; setView('shelf'); }, true); }
    const gi = groups.findIndex(gr => gr.games.includes(g)), p = gi >= 0 ? pageOf(g, gi) : -1; if (p < 0) return;
    if (gi !== curGroup || p !== curPage) await swapShelf(() => { curGroup = gi; curPage = p; }, true);
    const c = navOrder.find(q => q.g === g); if (c) { focus = c; kbNav = true; setHovered(c); cam.browseX = c.home.x; setView('browse'); }
  }
};
if (HOST) HOST.addEventListener('message', e => LIB.onMessage(e.data));

/* ---------- a pretend Playnite for testing in a browser (?mock) ---------- */
const MOCKHOST = {
  lib: null,
  post(m) { setTimeout(() => LIB.onMessage(JSON.parse(JSON.stringify(m))), 40); },
  iso(days) { return days === null || days === undefined ? null : new Date(Date.now() - days * 864e5).toISOString(); },
  build() {
    const base = GAMES.concat(fillerGames(70));
    const plats = ['PC (Windows)', 'PC (Windows)', 'PC (Windows)', 'Sony PlayStation 2', 'Nintendo Switch', 'Sony PlayStation', 'Sega Dreamcast', 'Nintendo GameCube'];
    this.src = new Map(base.map(g => [g.id, g]));
    return base.map((g, i) => ({ id: g.id, name: g.t, sort: g.t, status: ST0[g.id] || g.status, cats: (CAT0[g.id] || []).slice(), plats: [plats[i % plats.length]], genres: [g.genre], devs: [g.dev], pubs: [g.pub], features: g.online ? ['Multijugador en línea', 'Mando'] : ['Un jugador'], series: [], age: [`PEGI ${g.age}`], src: i % 3 ? 'Steam' : 'GOG', year: g.year, release: String(g.year), playtime: Math.round(g.hours * 3600), playCount: g.sessions, lastActivity: this.iso(g.last), added: this.iso(g.added), installed: i % 5 !== 0, score: g.rating ? g.rating * 20 : null, critic: 70 + (i % 25), community: null, hasCover: true, hasBg: true, hasLogo: i % 4 === 1, ver: '1', sum: g.sum }));
  },
  receive(m) {
    if (m.type === 'ready') { this.lib = this.build(); this.post({ type: 'library', mode: 'desktop', statuses: ['Jugando', 'En espera', 'Planeado', 'No jugado', 'Jugado', 'Superado', 'Completado', 'Abandonado'].map((n, i) => ({ id: 's' + i, name: n })), categories: ['Favoritos', 'Con amigos', 'Partidas cortas', 'Retro', 'Pendientes'].map((n, i) => ({ id: 'c' + i, name: n })), games: this.lib }); }
    if (m.type === 'detail') { const s = this.src.get(m.id); this.post({ type: 'detail', id: m.id, desc: s ? `<p>${esc(s.desc)}</p><p>${esc(s.sum)}</p><script>alert(1)<\/script>` : '', links: [{ name: 'Web oficial', url: 'https://example.com' }, { name: 'Wiki', url: 'https://example.org/wiki' }] }); }
    if (m.type === 'start') { const r = this.lib.find(q => q.id === m.id); if (r && !r.installed) { this.post({ type: 'notInstalled', id: m.id }); return; } setTimeout(() => this.post({ type: 'started', id: m.id }), 1800);
      /* ?mock&leftover: Playnite gives up after a few seconds while the game keeps running */
      const left = /leftover/.test(location.search); if (left) setTimeout(() => this.post({ type: 'tracking', id: m.id }), 5000);
      this.stopT = setTimeout(() => { this.post({ type: 'stopped', id: m.id, seconds: 754, active: !document.hidden }); if (r) { r.playtime += 754; r.playCount++; r.lastActivity = new Date().toISOString(); this.post({ type: 'games', games: [r] }); } }, left ? 45000 : 14000); }
    if (m.type === 'update') { const r = this.lib.find(q => q.id === m.id); if (r) { if ('status' in m) r.status = m.status; if (m.cats) r.cats = m.cats; if ('score' in m) r.score = m.score; if ('notes' in m) r.notes = m.notes; this.post({ type: 'games', games: [r] }); } console.log('[mock] update', m); }
    if (m.type === 'release') { clearTimeout(this.stopT); console.log('[mock] release', m.id); }
    if (m.type === 'openUrl' || m.type === 'close') console.log('[mock]', m.type, m.url || '');
  },
  remote() { return null; },
  image(url) {
    const [, kind, id] = url.split(':'), s = this.src.get(id); if (!s) return null;
    if (kind === 'logo') { const c = mkCanvas(640, 200), x = c.getContext('2d'); let fs = 120; x.font = `${fs}px ${F.bungee}`; while (x.measureText(s.t).width > 600 && fs > 20) { fs -= 4; x.font = `${fs}px ${F.bungee}`; } x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineWidth = fs * .12; x.strokeStyle = s.pal[0]; x.strokeText(s.t, 320, 104); x.fillStyle = s.pal[3]; x.fillText(s.t, 320, 104); return c; }
    const W = kind === 'bg' ? 960 : 400, H = kind === 'bg' ? 540 : 600, c = mkCanvas(W, H), x = c.getContext('2d');
    drawArt(x, W, H, s, kind === 'bg' ? 7 : 0); gradeArt(x, W, H, rng(1));
    if (kind === 'cover') drawTitle(x, s, W, H, 0);
    return c;
  }
};
