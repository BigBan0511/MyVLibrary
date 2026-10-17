/* =====================================================================
   MANUAL (paper booklet)
   ===================================================================== */
const book = { el: $('#book'), L: $('#slotL'), R: $('#slotR'), g: null, pages: [], i: 0, single: false, anim: false };
function realManualPages(c) {
  const g = c.g, cov = c.coverCanvas.toDataURL('image/jpeg', .88);
  const shotUrl = (g.bg || g.cover) ? shot(g, 1, 640, 400).toDataURL('image/jpeg', .85) : '';
  const bc = mkCanvas(360, 120); barcode(bc.getContext('2d'), 0, 0, 360, 120, hash(g.id + 'bc')); const bcUrl = bc.toDataURL();
  const pn = k => `<span class="pn">${k + 1}</span>`, row = (t, v) => v ? `<dt>${t}</dt><dd>${esc(v)}</dd>` : '';
  const desc = g.descText || g.sum || '';
  const paras = desc ? desc.split(/\n{2,}|\n/).map(t => t.trim()).filter(Boolean).slice(0, 40).map(t => `<p>${esc(t)}</p>`).join('') : '<p class="small">Este juego no tiene descripción en tu biblioteca de Playnite. Puedes añadirla desde Playnite (Editar → Descripción) o con un proveedor de metadatos.</p>';
  const pages = [
    () => `<div class="mp cover"><img src="${cov}" alt="Portada de ${esc(g.t)}"><div class="cv-band"><span>Manual de instrucciones</span><b>${esc(g.t)}</b></div></div>`,
    k => `<div class="mp"><div class="warn"><strong>Aviso sobre la salud</strong><p>Un pequeño porcentaje de personas puede sufrir ataques al ver ciertas luces o destellos. Si notas mareos, visión alterada o movimientos involuntarios, deja de jugar y consulta a un médico.</p><p>Juega en una habitación bien iluminada y descansa 15 minutos cada hora.</p></div>
      <h4>Índice</h4><ol class="toc">${[['Historia', 3], ['Ficha técnica', 4], ['Tus partidas', 5], ...(g.links && g.links.length ? [['Enlaces', 6]] : []), ['Notas', g.links && g.links.length ? 7 : 6], ['Tarjeta de registro', g.links && g.links.length ? 8 : 7]].map(([t, p]) => `<li><span>${t}</span><i></i><b>${p}</b></li>`).join('')}</ol>${pn(k)}</div>`,
    k => `<div class="mp"><span class="eye">Capítulo 1</span><h3>Historia</h3><div class="lead story">${paras}</div>${shotUrl ? `<img class="shot" src="${shotUrl}" alt="">` : ''}${pn(k)}</div>`,
    k => `<div class="mp"><span class="eye">Capítulo 2</span><h3>Ficha técnica</h3>
      <dl class="spec">${row('Género', g.genres && g.genres.join(', '))}${row('Estudio', g.dev)}${row('Distribuye', g.pub)}${row('Lanzamiento', g.release || (g.year ? String(g.year) : ''))}${row('Plataforma', g.platName)}${row('Origen', g.src)}${row('Serie', g.series)}${row('Edad', g.ageRating)}${row('Funciones', g.features && g.features.slice(0, 6).join(', '))}${row('Instalado', g.installed ? 'Sí' : 'No')}${row('En tu biblioteca', g.added != null ? lastText(g.added).replace('Hace', 'Desde hace') : '')}</dl>
      <p class="small">Esta ficha sale de los metadatos de Playnite.</p>${pn(k)}</div>`,
    k => `<div class="mp"><span class="eye">Capítulo 3</span><h3>Tus partidas</h3>
      <div class="big4"><div><b>${fmtH(g.hours)}</b><span>Tiempo jugado</span></div><div><b>${g.sessions || 0}</b><span>Veces jugado</span></div><div><b>${lastText(g.last)}</b><span>Última partida</span></div><div><b>${esc(g.status || 'Sin estado')}</b><span>Estado</span></div></div>
      ${g.critic || g.community ? `<h4>Puntuaciones</h4><dl class="spec">${row('Crítica', g.critic ? g.critic + ' / 100' : '')}${row('Comunidad', g.community ? g.community + ' / 100' : '')}</dl>` : ''}
      <p class="small">Estos datos los registra Playnite cada vez que juegas.</p>${pn(k)}</div>`
  ];
  if (g.links && g.links.length) pages.push(k => `<div class="mp"><span class="eye">Capítulo 4</span><h3>Enlaces</h3><ul class="links">${g.links.slice(0, 10).map((l, i) => `<li><button type="button" class="lnk" data-link="${i}"><b>${esc(l.name || 'Enlace')}</b><small>${esc((l.url || '').replace(/^https?:\/\//, '').slice(0, 48))}</small></button></li>`).join('')}</ul><p class="small">Se abren en tu navegador.</p>${pn(k)}</div>`);
  pages.push(
    k => `<div class="mp"><span class="eye">Notas</span><h3>Notas</h3><textarea class="notes" aria-label="Tus notas sobre ${esc(g.t)}" placeholder="Dónde te quedaste, contraseñas de nivel, a quién se lo prestaste…">${esc(g.notes || '')}</textarea><p class="small">Se guardan en las notas del juego en Playnite.</p>${pn(k)}</div>`,
    k => `<div class="mp"><span class="eye">Tarjeta</span><h3>Tarjeta de registro</h3><div class="card">
      <span class="cut">Recorta por la línea de puntos</span>
      <dl class="spec"><dt>Juego</dt><dd>${esc(g.t)}</dd><dt>Estado</dt><dd>${esc(g.status || 'Sin estado')}</dd></dl>
      <div><span class="eye">Tu valoración</span><div class="stars" role="group" aria-label="Valoración">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" class="${n <= g.rating ? 'on' : ''}" aria-label="${n} de 5">★</button>`).join('')}</div></div>
      <p class="small">Tu valoración va a la puntuación de usuario de Playnite (cada estrella son 20 puntos).</p></div>${pn(k)}</div>`,
    k => `<div class="mp" style="justify-content:flex-end"><img class="barcode" src="${bcUrl}" alt=""><p class="small">${g.year ? '© ' + g.year + ' ' : ''}${esc(g.dev || g.pub || '')}</p><p class="small">Manual generado por MyVLibrary con los datos de tu biblioteca de Playnite.</p>${pn(k)}</div>`
  );
  return pages;
}
function manualPages(c) {
  if (c.g.real) return realManualPages(c);
  const g = c.g, cov = c.coverCanvas.toDataURL('image/jpeg', .88);
  const shotUrl = shot(g, 1, 640, 400).toDataURL('image/jpeg', .85);
  const bc = mkCanvas(360, 120); barcode(bc.getContext('2d'), 0, 0, 360, 120, hash(g.id + 'bc')); const bcUrl = bc.toDataURL();
  const r = rng(hash(g.id) + 21), pool = ACH_POOL.slice();
  const achs = []; while (achs.length < 6) achs.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  const unlocked = Math.round(6 * g.ach[0] / Math.max(1, g.ach[1]));
  const pct = Math.round(100 * g.ach[0] / Math.max(1, g.ach[1]));
  const pn = k => `<span class="pn">${k + 1}</span>`;
  return [
    () => `<div class="mp cover"><img src="${cov}" alt="Portada de ${esc(g.t)}"><div class="cv-band"><span>Manual de instrucciones</span><b>${esc(g.t)}</b></div></div>`,
    k => `<div class="mp"><div class="warn"><strong>Aviso sobre la salud</strong><p>Un pequeño porcentaje de personas puede sufrir ataques al ver ciertas luces o destellos. Si notas mareos, visión alterada o movimientos involuntarios, deja de jugar y consulta a un médico.</p><p>Juega en una habitación bien iluminada y descansa 15 minutos cada hora.</p></div>
      <h4>Índice</h4><ol class="toc">${[['Historia', 3], ['Ficha técnica', 4], ['Controles', 5], ['Tus partidas', 6], ['Logros', 7], ['Notas', 8], ['Tarjeta de registro', 9]].map(([t, p]) => `<li><span>${t}</span><i></i><b>${p}</b></li>`).join('')}</ol>${pn(k)}</div>`,
    k => `<div class="mp"><span class="eye">Capítulo 1</span><h3>Historia</h3><p class="lead">${esc(g.desc)}</p><img class="shot" src="${shotUrl}" alt="">${pn(k)}</div>`,
    k => `<div class="mp"><span class="eye">Capítulo 2</span><h3>Ficha técnica</h3>
      <dl class="spec"><dt>Género</dt><dd>${esc(g.genre)}</dd><dt>Estudio</dt><dd>${esc(g.dev)}</dd><dt>Distribuye</dt><dd>${esc(g.pub)}</dd><dt>Año</dt><dd>${g.year}</dd><dt>Jugadores</dt><dd>${esc(g.players)}</dd><dt>En línea</dt><dd>${g.online ? 'Sí' : 'No'}</dd><dt>Control</dt><dd>${g.pad ? 'Mando recomendado' : 'Teclado y ratón'}</dd><dt>Formato</dt><dd>${DIMS[g.fmt].name}</dd><dt>Edad</dt><dd>${g.age} años o más</dd></dl>
      <p class="small">En la versión para Playnite, esta ficha sale de los metadatos del juego.</p>${pn(k)}</div>`,
    k => `<div class="mp"><span class="eye">Capítulo 3</span><h3>Controles</h3><table class="ctl"><thead><tr><th>Acción</th><th>Mando</th><th>Teclado</th></tr></thead><tbody>${CONTROLS[g.ctl].map(([a, p, kb]) => `<tr><td>${a}</td><td>${p}</td><td>${kb}</td></tr>`).join('')}</tbody></table>
      <p class="small">Puedes cambiar los controles en el menú de opciones del juego.</p>${pn(k)}</div>`,
    k => `<div class="mp"><span class="eye">Capítulo 4</span><h3>Tus partidas</h3>
      <div class="big4"><div><b>${fmtH(g.hours)}</b><span>Tiempo jugado</span></div><div><b>${g.sessions}</b><span>Sesiones</span></div><div><b>${lastText(g.last)}</b><span>Última partida</span></div><div><b>${esc(g.status)}</b><span>Estado</span></div></div>
      <h4>Logros · ${g.ach[0]} de ${g.ach[1]}</h4><div class="bar" role="img" aria-label="${pct} % de logros"><i style="width:${pct}%"></i></div>
      <p class="small">Estos datos ya los registra Playnite: tiempo de juego, sesiones, última partida y estado.</p>${pn(k)}</div>`,
    k => `<div class="mp"><span class="eye">Capítulo 5</span><h3>Logros</h3><ul class="ach">${achs.map(([t, dsc], i) => `<li class="${i < unlocked ? 'on' : 'off'}"><span class="ico">${i < unlocked ? '✓' : '?'}</span><span><b>${i < unlocked ? t : 'Logro oculto'}</b><small>${i < unlocked ? dsc : 'Sigue jugando para descubrirlo'}</small></span></li>`).join('')}</ul>${pn(k)}</div>`,
    k => `<div class="mp"><span class="eye">Capítulo 6</span><h3>Notas</h3><textarea class="notes" aria-label="Tus notas sobre ${esc(g.t)}" placeholder="Dónde te quedaste, contraseñas de nivel, a quién se lo prestaste…">${esc(g.notes || '')}</textarea>${pn(k)}</div>`,
    k => `<div class="mp"><span class="eye">Capítulo 7</span><h3>Tarjeta de registro</h3><div class="card">
      <span class="cut">Recorta por la línea de puntos</span>
      <dl class="spec"><dt>Juego</dt><dd>${esc(g.t)}</dd><dt>En tu biblioteca</dt><dd>${lastText(g.added)}</dd><dt>Estado</dt><dd>${esc(g.status)}</dd></dl>
      <div><span class="eye">Tu valoración</span><div class="stars" role="group" aria-label="Valoración">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-star="${n}" class="${n <= g.rating ? 'on' : ''}" aria-label="${n} de 5">★</button>`).join('')}</div></div>
      <p class="small">En Playnite, esta nota iría al campo de puntuación del usuario.</p></div>${pn(k)}</div>`,
    k => `<div class="mp" style="justify-content:flex-end"><img class="barcode" src="${bcUrl}" alt=""><p class="small">© ${g.year} ${esc(g.dev)}. Todos los derechos reservados. Juego y estudio inventados para este prototipo.</p><p class="small">Manual generado por MyVLibrary con los datos de tu biblioteca.</p>${pn(k)}</div>`
  ];
}
function pageAt(k) { return (k < 0 || k >= book.pages.length) ? null : book.pages[k](k); }
function fillSlot(slot, k) { const h = pageAt(k); slot.classList.toggle('empty', h === null); slot.innerHTML = h || ''; }
function maxSpread() { return book.single ? book.pages.length - 1 : Math.ceil(book.pages.length / 2); }
function renderSpread() { if (book.single) fillSlot(book.R, book.i); else { fillSlot(book.L, 2 * book.i - 1); fillSlot(book.R, 2 * book.i); } updateCount(); }
function updateCount() {
  const n = book.pages.length; let t;
  if (book.single) t = book.i === 0 ? 'Portada' : `${book.i + 1} / ${n}`;
  else { const a = 2 * book.i - 1, b = 2 * book.i; t = book.i === 0 ? 'Portada' : b >= n ? `${a + 1} / ${n}` : `${a + 1}–${b + 1} / ${n}`; }
  $('#mCount').textContent = t; $('#mPrev').disabled = book.i === 0; $('#mNext').disabled = book.i >= maxSpread();
  $('#mPrev').style.opacity = book.i === 0 ? .4 : 1; $('#mNext').style.opacity = book.i >= maxSpread() ? .4 : 1;
}
function sizeBook() {
  if (!book.g) return;
  const [mw, mh] = DIMS[book.g.fmt].man, r = mw / mh;
  book.single = innerWidth < 760;
  const availH = innerHeight - 140, availW = innerWidth - 32;
  const pw = book.single ? Math.min(availW, availH * r, 520) : Math.min(availW / 2, availH * r, 470), ph = pw / r;
  book.el.style.width = (book.single ? pw : pw * 2) + 'px'; book.el.style.height = ph + 'px';
  book.el.style.fontSize = Math.max(9, Math.min(pw, ph * .74) / 25) + 'px';
  book.el.classList.toggle('single', book.single);
  book.el.style.setProperty('--acc', inkAccent(book.g)); book.el.style.setProperty('--accbg', inkAccent(book.g));
}
function openManual() {
  if (!active || busy || mode !== 'open') return;
  const wasSingle = book.single;
  book.g = active.g; book.pages = manualPages(active); book.i = 0; sizeBook(); if (wasSingle !== book.single) book.i = 0;
  renderSpread(); $('#manual').hidden = false; setMode('manual'); sfx.page(); $('#mNext').focus();
}
function closeManual() { if (mode !== 'manual') return; $('#manual').hidden = true; setMode('open'); canvasEl.focus(); }
async function turn(dir) {
  if (book.anim) return; const ni = book.i + dir; if (ni < 0 || ni > maxSpread()) return;
  book.anim = true; sfx.page();
  if (book.single) {
    const oldHTML = book.R.innerHTML; book.i = ni; fillSlot(book.R, ni);
    const old = document.createElement('div'); old.className = 'slide-out' + (dir < 0 ? ' prev' : ''); old.innerHTML = oldHTML; book.R.appendChild(old);
    updateCount(); await new Promise(r => setTimeout(r, RM ? 20 : 430)); old.remove();
  } else {
    const L0 = 2 * book.i - 1, R0 = 2 * book.i, L1 = 2 * ni - 1, R1 = 2 * ni;
    const leaf = document.createElement('div'); leaf.className = 'leaf ' + (dir > 0 ? 'r' : 'l');
    const front = document.createElement('div'); front.className = 'face front';
    const back = document.createElement('div'); back.className = 'face back';
    if (dir > 0) { front.innerHTML = pageAt(R0) || ''; back.innerHTML = pageAt(L1) || ''; fillSlot(book.R, R1); }
    else { front.innerHTML = pageAt(L0) || ''; back.innerHTML = pageAt(R1) || ''; fillSlot(book.L, L1); }
    leaf.append(front, back); book.el.appendChild(leaf); leaf.getBoundingClientRect();
    requestAnimationFrame(() => { leaf.style.transform = `rotateY(${dir > 0 ? -180 : 180}deg)`; });
    await new Promise(r => setTimeout(r, RM ? 30 : 660));
    if (dir > 0) fillSlot(book.L, L1); else fillSlot(book.R, R1);
    leaf.remove(); book.i = ni; updateCount();
  }
  book.anim = false;
}
$('#mPrev').addEventListener('click', () => turn(-1));
$('#mNext').addEventListener('click', () => turn(1));
$('#mClose').addEventListener('click', closeManual);
$('#mBack').addEventListener('click', closeManual);
let notesTimer = 0;
book.el.addEventListener('input', e => { if (e.target.matches('.notes') && book.g) { const g = book.g; g.notes = e.target.value; clearTimeout(notesTimer); notesTimer = setTimeout(() => { saveGame(g); if (PLAYNITE) LIB.update(g, ['notes']); }, 600); } });
book.el.addEventListener('click', e => {
  const l = e.target.closest('[data-link]'); if (l && book.g && book.g.links) { const u = book.g.links[+l.dataset.link]; if (u) LIB.openUrl(u.url); return; }
  const s = e.target.closest('[data-star]'); if (!s || !book.g) return;
  book.g.rating = +s.dataset.star === book.g.rating ? 0 : +s.dataset.star; saveGame(book.g); sfx.tick(); if (PLAYNITE) LIB.update(book.g, ['rating']);
  s.parentElement.querySelectorAll('[data-star]').forEach(b => b.classList.toggle('on', +b.dataset.star <= book.g.rating));
});

