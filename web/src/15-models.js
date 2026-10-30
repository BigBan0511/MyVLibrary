/* =====================================================================
   THE MODEL LIBRARY: a folder of EmuVR .ugc files, read once. Each file
   says what it is (console, box, medium, screen, prop), which systems it
   is for and how it looks (its thumbnail); that catalogue stays in this
   browser, the files themselves are only copied when one is chosen. A
   browser cannot reopen a folder by itself, so after restarting, choosing
   a new model asks for the folder again (reading it again is instant:
   what is already in the catalogue is not read twice).
   ===================================================================== */
/* the systems of the shelf, as EmuVR calls them */
const EMU_SYS = {
  PC: ['DOS (CD)', 'PC (CD)', 'PC (Disk)', 'PC (BlueDisk)', 'PC (Disk)(Blue)', 'Windows (CD)', 'Computer/Pc'], NES: ['NES', 'Famicom', 'Famicon', 'NES (Toast)'], SMS: ['Sega Master System'], MD: ['Sega Genesis', 'Sega Mega Drive (Japan)'],
  PCE: ['PC Engine / TurboGrafx-16 / PC Engine SuperGrafx', 'PC Engine CD / TurboGrafx-CD'], GB: ['Game Boy / Game Boy Color', 'GameBoy'], GBC: ['Game Boy / Game Boy Color', 'GameBoy'], GG: ['Sega Game Gear'],
  SNES: ['SNES', 'SNES (PAL)', 'Super Famicom (Japan)'], 'NEO GEO': ['Neo Geo (Cartridge)', 'Neo Geo CD', 'NeoGeo MVS'], 'MEGA CD': ['Sega CD / Sega Mega-CD'], '3DO': ['3DO'], SATURN: ['Sega Saturn'], PS1: ['PlayStation'], N64: ['Nintendo 64'],
  DC: ['Sega Dreamcast'], PS2: ['PlayStation 2 (DVD)', 'PlayStation 2 (CD)'], GBA: ['Game Boy Advance'], GC: ['GameCube'], XBOX: ['Xbox'], DS: ['Nintendo DS'], PSP: ['PSP'], X360: ['Xbox 360'], PS3: ['PlayStation 3'], WII: ['Wii'],
  '3DS': ['Nintendo 3DS'], VITA: ['Vita'], 'WII U': ['Wii U'], XONE: ['Xbox One'], PS4: ['PlayStation 4'], SWITCH: ['Nintendo Switch'], XSX: ['Xbox Series'], PS5: ['PlayStation 5'], ARCADE: ['Arcade', 'Dedicated Arcade', 'Astro City (Arcade)'],
  vhs: ['Video (VHS)'], dvd: ['Video (DVD)'], bluray: ['Video (DVD)'], tape: ['Video (VHS)'], disc: ['Video (DVD)'], lp: ['Vinyl Record'], cass: ['Music (Cassette Tape)'], cd: ['Music (CD)']
};
const MODELS = { list: null, files: new Map(), reading: false, stop: false, done: 0, total: 0, picker: null };
const norm2 = s => String(s || '').trim().toLowerCase();
function modelKind(p) {
  const n = p.name;
  if (p.medium || p.type === 'medium') return 'media';
  if (p.type === 'screen') return 'screen';
  if (/^system/.test(p.type) || p.art) {
    if (/^animated|fake plug|blinds/i.test(n) || p.systems.includes('LemonsAnimatedFurniture')) return 'prop';
    if (p.art) { if (/arcade|bartop|cab\b|cabinet|consolette|game & watch|neo geo mvs/i.test(n)) return 'console'; if (/comic|magazine|book|manual|mp3|insert/i.test(n) || p.systems.includes('Bookmark')) return 'prop'; return 'box'; }
    return 'console';
  }
  return 'prop';
}
/* what a medium is for: its socket names the system, after the variant ("Cassette (Red)>Music") */
function modelSystems(p) { const s = p.medium || p.type === 'medium' ? p.male.map(t => t.split('>').pop().trim()) : p.systems; return s.filter(Boolean); }
function modelFits(m, slot) { const want = (EMU_SYS[slot] || []).map(norm2); return !want.length ? false : m.s.some(x => want.includes(norm2(x))); }
async function modelsLoad() {
  if (MODELS.list) return MODELS.list;
  let v = null; try { v = await UGCS.tx('readonly', st => st.get('catalog')); } catch (e) { console.error(e); }
  return (MODELS.list = v || []);
}
function modelsSave() { return UGCS.tx('readwrite', st => st.put(MODELS.list, 'catalog')).catch(e => console.error(e)); }
function thumbUrl(img) {
  if (!img || !img.w) return ''; const c = mkCanvas(img.w, img.h), x = c.getContext('2d'), d = x.createImageData(img.w, img.h), row = img.w * 4;
  for (let r = 0; r < img.h; r++) d.data.set(img.rgba.subarray(r * row, (r + 1) * row), (img.h - 1 - r) * row);
  x.putImageData(d, 0, 0); return c.toDataURL('image/jpeg', .72);
}
/* a folder picked by hand (or any list of files): new files are read one by one, the rest only remembered */
async function modelsRead(fileList) {
  await modelsLoad();
  const known = new Map(MODELS.list.map(m => [m.k, m])), files = [...fileList].filter(f => /\.ugc$/i.test(f.name));
  const rel = f => (f.webkitRelativePath || f.name).split('/').slice(1).join('/') || f.name;
  files.forEach(f => MODELS.files.set(rel(f), f));
  const todo = files.filter(f => { const m = known.get(rel(f)); return !m || m.b !== f.size; });
  Object.assign(MODELS, { reading: true, stop: false, done: 0, total: todo.length }); renderLib();
  try {
    for (const f of todo) {
      if (MODELS.stop) break;
      const k = rel(f), rec = { k, b: f.size, n: f.name.replace(/\.ugc$/i, '').replace(/_[0-9a-f]{8}$/i, '').replace(/_/g, ' '), t: 'prop', s: [], by: '', th: '' };
      try { const p = UGC.peek(await f.arrayBuffer()); rec.n = p.name || rec.n; rec.by = p.by; rec.t = modelKind(p); rec.s = modelSystems(p); rec.a = p.state || undefined; rec.th = thumbUrl(p.thumb); } catch (e) { rec.bad = true; }
      if (known.has(k)) MODELS.list[MODELS.list.indexOf(known.get(k))] = rec; else MODELS.list.push(rec);
      known.set(k, rec); MODELS.done++;
      if (MODELS.done % 40 === 0) { renderLibProgress(); await new Promise(r => setTimeout(r, 0)); }
      if (MODELS.done % 300 === 0) await modelsSave();
    }
  } finally { MODELS.reading = false; await modelsSave(); renderLib(); renderUgcList(); }
}
/* the file of a catalogue entry: from the folder read in this session */
const modelFile = m => MODELS.files.get(m.k) || null;

/* ---------- the picker ---------- */
const LIB_KINDS = { console: 'Consolas', box: 'Cajas', media: 'Medios', screen: 'Pantallas', prop: 'Decoración' };
function libOpen(o = {}) { MODELS.picker = Object.assign({ kind: 'prop', slot: '', key: '', q: '', all: !o.slot, n: 120 }, o); $('#lib').hidden = false; modelsLoad().then(renderLib); }
function libClose() { $('#lib').hidden = true; MODELS.picker = null; }
function libItems() {
  const P = MODELS.picker, q = norm(P.q.trim()), seen = new Set();
  return (MODELS.list || []).filter(m => {
    if (m.bad || m.t !== P.kind) return false;
    if (!P.all && P.slot && !modelFits(m, P.slot)) return false;
    if (q && !norm(m.n + ' ' + m.s.join(' ') + ' ' + m.by).includes(q)) return false;
    const id = m.n + '|' + m.b; if (seen.has(id)) return false; seen.add(id); return true;
  }).sort((a, b) => a.n.localeCompare(b.n, LANG, { numeric: true }));
}
function renderLibProgress() { const el = $('#libProg'); if (el) el.textContent = T('Leyendo {0} de {1}…', MODELS.done, MODELS.total); }
function renderLib() {
  const el = $('#lib'), P = MODELS.picker; if (el.hidden || !P) return;
  const items = libItems(), shown = items.slice(0, P.n), counts = {}; (MODELS.list || []).forEach(m => { counts[m.t] = (counts[m.t] || 0) + 1; });
  const cur = P.key && UGCS.meta()[P.key];
  el.innerHTML = `<div class="lib-box"><div class="lib-top"><div><b>${esc(P.title || T('Biblioteca de modelos'))}</b><span>${cur ? T('Ahora: {0}', esc(cur.name)) : T('{0} modelos en tu carpeta', (MODELS.list || []).length)}</span></div><div class="lib-acts">${cur ? `<button type="button" class="pbtn" data-lib-clear>${T('Quitar')}</button>` : ''}<button type="button" class="pbtn" data-lib-folder>${MODELS.files.size ? T('Volver a leer') : T('Elegir la carpeta')}</button><button type="button" class="pbtn" data-lib-close>${T('Cerrar')}</button></div></div>
    ${MODELS.reading ? `<div class="lib-read"><span id="libProg">${T('Leyendo {0} de {1}…', MODELS.done, MODELS.total)}</span><button type="button" class="pbtn" data-lib-stop>${T('Parar')}</button></div>` : ''}
    <div class="lib-bar">${P.key ? '' : `<div class="lib-tabs">${Object.entries(LIB_KINDS).map(([k, v]) => `<button type="button" data-lib-kind="${k}" aria-pressed="${k === P.kind}">${T(v)} <i>${counts[k] || 0}</i></button>`).join('')}</div>`}<input id="libQ" type="search" placeholder="${T('Buscar')}" value="${esc(P.q)}" autocomplete="off">${P.slot ? `<label class="lib-all"><input type="checkbox" id="libAll"${P.all ? ' checked' : ''}> ${T('Ver todos')}</label>` : ''}</div>
    ${(MODELS.list || []).length ? (items.length ? `<div class="lib-grid">${shown.map(m => `<button type="button" class="lib-it" data-lib-k="${esc(m.k)}" title="${esc(m.n + (m.by ? ' · ' + m.by : ''))}"><span class="th"${m.th ? ` style="background-image:url(${m.th})"` : ''}></span><b>${esc(m.n)}</b><i>${esc(m.t === 'prop' ? m.by : m.s.slice(0, 2).join(' · ') || m.by)}</i></button>`).join('')}</div>${items.length > shown.length ? `<button type="button" class="pbtn lib-more" data-lib-more>${T('Ver más ({0})', items.length - shown.length)}</button>` : ''}` : `<p class="lib-none">${T(P.all ? 'Nada coincide.' : 'No hay modelos para este sistema. Marca «Ver todos» para elegir otro.')}</p>`) : `<p class="lib-none">${T('Elige la carpeta donde tienes tus .ugc. Se lee una vez y puede tardar unos minutos si son muchos.')}</p>`}</div>`;
}
$('#lib').addEventListener('input', e => {
  if (e.target.id !== 'libQ') return; const P = MODELS.picker; P.q = e.target.value; P.n = 120; const pos = e.target.selectionStart;
  clearTimeout(MODELS.qT); MODELS.qT = setTimeout(() => { renderLib(); const q = $('#libQ'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }, 160);
});
$('#lib').addEventListener('change', e => { if (e.target.id === 'libAll') { MODELS.picker.all = e.target.checked; renderLib(); } });
$('#lib').addEventListener('click', async e => {
  const P = MODELS.picker; if (!P) return; const on = s => e.target.closest(s);
  if (e.target.id === 'lib' || on('[data-lib-close]')) { libClose(); return; }
  if (on('[data-lib-folder]')) { const f = $('#libDir'); f.value = ''; f.click(); return; }
  if (on('[data-lib-stop]')) { MODELS.stop = true; return; }
  if (on('[data-lib-more]')) { P.n += 240; renderLib(); return; }
  const k = on('[data-lib-kind]'); if (k) { P.kind = k.dataset.libKind; P.n = 120; renderLib(); return; }
  if (on('[data-lib-clear]')) { try { await UGCS.remove(P.key); } catch (err) { console.error(err); } libClose(); skinsChanged(); renderUgcList(); return; }
  const it = on('[data-lib-k]'); if (!it) return;
  const m = MODELS.list.find(x => x.k === it.dataset.libK); if (!m) return;
  const file = modelFile(m);
  if (!file) { toast(T('Elige otra vez la carpeta: el navegador la olvida al cerrarse.'), 3600); const f = $('#libDir'); f.value = ''; f.click(); return; }
  const P2 = Object.assign({}, P); libClose();
  await libApply(P2, m, file);
});
async function libApply(P, m, file) {
  toast(T('Leyendo {0}…', m.n), 8000); await new Promise(r => setTimeout(r, 40));
  try {
    if (P.key) { await UGCS.put(P.key, file); toast(T('{0} listo', m.n), 2200); skinsChanged(); renderUgcList(); }
    else { await decoAddFile(file); toast(T('Colócalo donde quieras'), 2600); renderDecoList(); }
  } catch (err) { console.error(err); toast(T(err && err.message ? err.message : 'No se ha podido leer el .ugc', err && err.arg), 5000); }
}
/* a box changes a case's size, so the shelf is laid out again */
function skinsChanged() { refreshStage(); if (mode === 'shelf' && !busy) relayout({ full: true }); else pendingRelayout = true; }
$('#libDir').addEventListener('change', e => { const f = e.target.files; if (f && f.length) modelsRead(f); });

/* ---------- Settings → EmuVR: what each system wears ---------- */
function libSlots() {
  return systemsList().flatMap(s => s.key === 'VIDEO' ? [['VHS', [['vid:tape', 'console', 'tape', 'Vídeo'], ['box:vhs', 'box', 'vhs', 'Caja'], ['med:vhs', 'media', 'vhs', 'Cinta']]], ['DVD', [['vid:disc', 'console', 'disc', 'Reproductor'], ['box:dvd', 'box', 'dvd', 'Caja']]], ['Blu-ray', [['box:bluray', 'box', 'bluray', 'Caja']]]]
    : s.key === 'MUSIC' ? [[T('Vinilo'), [['box:lp', 'box', 'lp', 'Funda'], ['med:lp', 'media', 'lp', 'Disco']]], [T('Casete'), [['box:cass', 'box', 'cass', 'Caja'], ['med:cass', 'media', 'cass', 'Casete']]], ['CD', [['box:cd', 'box', 'cd', 'Caja']]]]
    : [[s.name, [['sys:' + s.key, 'console', s.key, s.key === 'PC' ? 'Ordenador' : 'Consola'], ['box:' + s.key, 'box', s.key, 'Caja'], ['med:' + s.key, 'media', s.key, 'Medio']]]]).concat([[T('Pantallas'), [['scr:crt', 'screen', '', 'Tele de tubo'], ['scr:flat', 'screen', '', 'Tele plana'], ['scr:monitor', 'screen', '', 'Monitor']]]]);
}
function renderLibRows() {
  const el = $('#libList'); if (!el) return; const L = MODELS.list || [], n = L.length;
  const counts = {}; L.forEach(m => { counts[m.t] = (counts[m.t] || 0) + 1; });
  el.innerHTML = `<div class="ugc-item"><div class="ugc-what"><b>${T('Biblioteca de modelos')}</b><span${n ? ' class="on"' : ''}>${n ? T('{0} modelos', n) : T('Lee tu carpeta de .ugc una vez')}</span></div><div class="ugc-btns"><button type="button" data-lib-open>${n ? T('Abrir') : T('Elegir la carpeta')}</button>${n ? `<button type="button" data-lib-auto title="${esc(T('Pone lo que encaje en cada hueco vacío'))}">${T('Asignar solo')}</button>` : ''}</div></div>`
    + libSlots().map(([name, slots]) => `<div class="lib-row"><b>${esc(name)}</b><div>${slots.map(([key, kind, slot, label]) => { const m = UGCS.meta()[key]; return `<button type="button" class="lib-slot${m ? ' on' : ''}" data-lib-slot="${esc(key)}" data-kind="${kind}" data-sl="${esc(slot)}" data-name="${esc(name + ' · ' + T(label))}" title="${esc(m ? m.name : T('Genérico'))}"><i>${T(label)}</i>${esc(m ? m.name : T('Genérico'))}</button>`; }).join('')}</div></div>`).join('');
}
$('#libList').addEventListener('click', async e => {
  if (e.target.closest('[data-lib-open]')) { libOpen({}); return; }
  if (e.target.closest('[data-lib-auto]')) { libAuto(); return; }
  const b = e.target.closest('[data-lib-slot]'); if (b) libOpen({ key: b.dataset.libSlot, kind: b.dataset.kind, slot: b.dataset.sl, title: b.dataset.name });
});
/* every empty place gets the first thing that fits it */
async function libAuto() {
  if (!MODELS.files.size) { toast(T('Elige otra vez la carpeta: el navegador la olvida al cerrarse.'), 3600); libOpen({}); return; }
  const slots = libSlots().flatMap(r => r[1]).filter(([key]) => !UGCS.meta()[key]); let k = 0;
  for (const [key, kind, slot] of slots) {
    if (!slot) continue;
    const list = (MODELS.list || []).filter(m => !m.bad && m.t === kind && modelFits(m, slot) && modelFile(m)).sort((a, b) => (a.a === b.a ? 0 : a.a ? -1 : 1) || a.n.localeCompare(b.n, LANG, { numeric: true }));
    if (!list.length) continue;
    toast(T('Asignando {0}…', list[0].n), 4000); await new Promise(r => setTimeout(r, 30));
    try { await UGCS.put(key, modelFile(list[0])); k++; } catch (err) { console.warn(err); }
  }
  toast(T(k === 1 ? '{0} modelo asignado' : '{0} modelos asignados', k), 3000); skinsChanged(); renderUgcList();
}
