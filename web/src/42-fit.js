/* =====================================================================
   FRAMING THE REAL PICTURES: which part of each picture goes on each face
   of the case, for when a scan comes out cut short or spills over.
   Opened from the card (Case pictures → Adjust framing); what is framed is
   kept next to the pictures, in the game's ExtraMetadata folder.
   The drawing side (artFit, layArt, splitWrap) is in 01-print.js.
   ===================================================================== */
const fitEl = $('#fitEd');
const FIT_ROOM = .16;   // room around the picture, for a framing that reaches past its edges
Object.assign(FIT, { tab: null, tabs: [], sel: 'move', drag: null, view: null, raf: 0, liveT: 0 });

/* the faces that have a picture to frame: the full scan as a whole, then each face from its own picture
   (or its part of the full scan, or Playnite's cover), the manual's cover and the disc */
function fitTabs(g) {
  const S = g.scans || {}, I = g.scanImg || {}, med = mediaOf(g), L = [];
  if (S.full && I.full) L.push(['full', T('Escaneo completo')]);
  [['front', T('Portada')], ['back', T('Contraportada')], ['spine', T('Lomo')]].forEach(t => { if (facePic(g, t[0])) L.push(t); });
  if (DIMS[g.fmt].man && DIMS[g.fmt].man[0] && facePic(g, 'manual')) L.push(['manual', T('Manual')]);
  if (S.disc && I.disc && (med === 'disc' || med === 'cart')) L.push(['disc', med === 'cart' ? T('Etiqueta') : T('Disco')]);
  return L;
}
function fitImg(g, kind) { return kind === 'full' || kind === 'disc' ? g.scanImg && g.scanImg[kind] : facePic(g, kind); }
function faceSize(g, kind) {
  if (kind === 'spine') return spineSize(g); if (kind === 'disc') return mediaOf(g) === 'cart' ? [512, 266] : [512, 512];
  if (kind === 'manual') { const m = manualSize(g, manualBand(g)); return [m[0], m[1]]; }
  return coverSize(g);
}
function faceA(g, kind) { const [W, H] = faceSize(g, kind); return W / H; }
/* what the case shows when nothing has been framed: the picture filling the face (a spine lying down, stood up) */
function fitDefault(g, kind, raw, r) {
  if (r === undefined) r = kind === 'spine' && !raw.wrapCut && imgW(raw) > imgH(raw) ? 1 : 0;
  const im = turned(raw, r), b = FIT.st[kind] ? FIT.st[kind].b : 1;
  if (kind === 'full') { const c = [0, 0, 1, 1]; return { r, c, k: wrapCuts(g, c), lock: false, explicit: false }; }
  /* the manual shows the whole picture */
  if (kind === 'manual' && !artPic(g, 'manual')) return { r, c: containRect(imgW(im), imgH(im), faceA(g, kind)), k: null, lock: true, explicit: false, b };
  /* a part of the full scan already cut where it was framed fills its face as it is */
  if (raw.wrapCut && raw.exact && !r) return { r, c: [0, 0, 1, 1], k: null, lock: false, explicit: false };
  return { r, c: coverRect(imgW(im), imgH(im), faceA(g, kind)), k: null, lock: true, explicit: false };
}
function fitState(g, kind) {
  if (FIT.st[kind]) return FIT.st[kind];
  const f = artFit(g, kind, faceA(g, kind));
  const s = f ? { r: f.r | 0, c: f.c.slice(), k: f.k ? f.k.slice() : null, lock: kind !== 'full' && f.l !== 0, explicit: true } : fitDefault(g, kind, fitImg(g, kind));
  if (kind === 'manual') s.b = manualBand(g) ? 1 : 0;
  s.dirty = false;
  return (FIT.st[kind] = s);
}
const fitCur = () => FIT.st[FIT.tab];
const fitPic = () => turned(fitImg(FIT.g, FIT.tab), fitCur().r);
/* the handles the keyboard and the controller go through, in order */
function fitHandles() { return FIT.tab === 'full' ? ['move', 'l', 'r', 't', 'b', 'k1', 'k2'] : ['move', 'l', 'r', 't', 'b']; }
function fitHandleName(h) {
  return T({ move: 'el recuadro', l: 'el borde izquierdo', r: 'el borde derecho', t: 'el borde de arriba', b: 'el borde de abajo', k1: 'la línea izquierda del lomo', k2: 'la línea derecha del lomo' }[h] || 'el recuadro');
}

/* ---------- opening and closing ---------- */
async function openFit(g) {
  if (!g || !g.real || FIT.open) return;
  await Promise.all([LIB.bigCover(g), LIB.scansFor(g, SCAN_KINDS)]);
  if (!active || active.g !== g || FIT.open) return;
  const tabs = fitTabs(g);
  if (!tabs.length) { toast(T('Las imágenes todavía se están cargando')); return; }
  Object.assign(FIT, { open: true, g, st: {}, tabs, tab: null, sel: 'move', drag: null, view: null });
  setHovered(null);
  fitEl.innerHTML = `<div class="fit-card" tabindex="-1">
    <header class="fit-head"><h3 id="fitTitle">${T('Encuadre')} <span>· ${esc(g.t)}</span></h3>
      <div class="fit-tabs" role="tablist" aria-label="${esc(T('Caras de la caja'))}">${tabs.map(([k, l]) => `<button type="button" class="gact" role="tab" data-ftab="${k}">${esc(l)}</button>`).join('')}</div></header>
    <div class="fit-body">
      <div class="fit-stage"><canvas id="fitCv" role="img" aria-label="${esc(T('La imagen y lo que va a la caja'))}"></canvas></div>
      <aside class="fit-side">
        <div class="fit-prev" id="fitPrev" aria-label="${esc(T('Así queda'))}"></div>
        <div class="fit-tools" id="fitTools"></div>
        <p class="fit-help" id="fitHelp"></p>
      </aside>
    </div>
    <footer class="fit-foot"><p class="fit-keys" id="fitKeys"></p>
      <button type="button" class="pbtn" data-fact="cancel"><kbd>Esc</kbd>${T('Cancelar')}</button>
      <button type="button" class="pbtn primary" data-fact="save"><kbd>${T('Intro')}</kbd>${T('Guardar')}</button></footer>
  </div>`;
  fitEl.hidden = false;
  fitBind();
  fitTab(tabs[0][0]);
  fitEl.querySelector('.fit-card').focus({ preventScroll: true });
}
function closeFit(save) {
  if (!FIT.open) return;
  const g = FIT.g; let saved = 0;
  if (save) for (const [kind, s] of Object.entries(FIT.st)) {
    if (!s.dirty) continue;
    const r4 = v => Math.round(v * 1e4) / 1e4;
    if (s.explicit) {
      const f = { s: fitSrc(g, kind), r: s.r, c: s.c.map(r4) };
      if (kind === 'full') f.k = s.k.map(r4); else { f.a = r4(faceA(g, kind)); f.l = s.lock ? 1 : 0; }
      if (kind === 'manual') f.b = s.b === 0 ? 0 : 1;
      g.scanFit = Object.assign({}, g.scanFit, { [kind]: f }); LIB.send('setFit', { id: g.id, kind, data: JSON.stringify(f) }); saved++;
    } else if (g.scanFit && g.scanFit[kind]) {
      g.scanFit = Object.assign({}, g.scanFit); delete g.scanFit[kind]; LIB.send('setFit', { id: g.id, kind, data: '' }); saved++;
    }
  }
  clearTimeout(FIT.liveT); cancelAnimationFrame(FIT.raf);
  Object.assign(FIT, { open: false, st: {}, drag: null, view: null, raf: 0 });
  fitEl.hidden = true; fitEl.innerHTML = '';
  /* the case goes back to what is kept */
  fitApply(g); FIT.g = null;
  if (saved) toast(T('Encuadre guardado'));
  const back = $('#info [data-fit]'); if (back && !coarse) back.focus({ preventScroll: true });
}
/* the case in your hands, repainted with the framing as it is now */
function fitApply(g) { if (g.scanImg && g.scanImg.full) splitWrap(g, g.scanImg.full); LIB.refresh(g, true); }
function fitLive() { clearTimeout(FIT.liveT); FIT.liveT = setTimeout(() => { if (FIT.open) fitApply(FIT.g); }, 260); }

/* ---------- one face at a time ---------- */
function fitTab(kind) {
  if (!FIT.tabs.some(t => t[0] === kind)) return;
  /* the parts of the full scan, cut as it is framed right now */
  if (kind !== 'full' && FIT.g.scanImg && FIT.g.scanImg.full) splitWrap(FIT.g, FIT.g.scanImg.full);
  FIT.tab = kind; FIT.sel = 'move'; FIT.view = null; fitState(FIT.g, kind);
  fitEl.querySelectorAll('[data-ftab]').forEach(b => { const on = b.dataset.ftab === kind; b.classList.toggle('sel', on); b.setAttribute('aria-selected', on); });
  const full = kind === 'full', b = (t, l) => `<button type="button" class="gact" data-ftool="${t}">${l}</button>`;
  $('#fitTools').innerHTML = (full
    ? b('trim', T('Detectar bordes')) + b('all', T('Toda la imagen')) + b('split', T('Repartir según la caja'))
    : b('fill', T('Rellenar')) + b('whole', T('Entera')) + b('all', T('Toda la imagen')) + b('trim', T('Detectar bordes')))
    + b('rot', T('Girar 90°')) + b('reset', T('Restablecer'))
    + (full ? '' : `<label class="fit-lock"><input type="checkbox" id="fitLock"> ${T('Mantener la proporción')}</label>`)
    + (kind === 'manual' && !artPic(FIT.g, 'manual') ? `<label class="fit-lock"><input type="checkbox" id="fitBand"> ${T('Con la franja «Manual de instrucciones»')}</label>` : '');
  const cut = kind !== 'full' && fitImg(FIT.g, kind) && fitImg(FIT.g, kind).wrapCut;
  $('#fitHelp').textContent = full
    ? T('Arrastra los bordes de fuera hasta lo impreso y las dos líneas hasta los cantos del lomo. Cada parte se estira a su cara: contraportada, lomo y portada.')
    : (cut ? T('Esta cara sale del escaneo completo: aquí se encuadra dentro de su parte.') + ' ' : kind === 'manual' && !artPic(FIT.g, 'manual') ? T('Sin un escaneo del manual, su portada se hace con la imagen de la portada de la caja.') + ' ' : '')
      + T('Arrastra el recuadro o sus bordes, o acerca y aleja con la rueda. Lo que queda dentro va a la cara de la caja; sin mantener la proporción, se estira hasta llenarla.');
  $('#fitPrev').dataset.k = '';
  fitSync(); fitRedraw();
}
function fitSync() {
  const s = fitCur(), lk = $('#fitLock'), bd = $('#fitBand'); if (lk) lk.checked = !!s.lock; if (bd) bd.checked = s.b !== 0;
  const multi = FIT.tabs.length > 1;
  $('#fitKeys').innerHTML = `<kbd>←</kbd><kbd>→</kbd><kbd>↑</kbd><kbd>↓</kbd> ${T('mover')} <b>${fitHandleName(FIT.sel)}</b> · <kbd>Q</kbd><kbd>E</kbd> ${T('otro borde')} · <kbd>Z</kbd><kbd>C</kbd> ${T('zoom')} · <kbd>F</kbd> ${T('girar')}${multi ? ` · <kbd>M</kbd> ${T('otra cara')}` : ''}`;
}
function fitChanged(reframe) {
  const s = fitCur(); s.dirty = true;
  if (reframe || fitOutside()) FIT.view = null;
  fitSync(); fitRedraw(); fitLive();
}
/* the view only moves when the framing leaves it, so it does not shift under the mouse */
function fitOutside() { const V = FIT.view, c = fitCur().c, m = FIT_ROOM / 3; return !V || c[0] < V.L + m || c[1] < V.T + m || c[2] > V.R - m || c[3] > V.B - m; }

/* ---------- the view: the picture, with room around it ---------- */
function fitView() {
  const cv = $('#fitCv'); if (!cv) return null;
  const s = fitCur(), im = fitPic(), r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
  const cw = Math.max(60, r.width), ch = Math.max(60, r.height);
  if (cv.width !== Math.round(cw * dpr) || cv.height !== Math.round(ch * dpr)) { cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); }
  const iw = imgW(im), ih = imgH(im);
  const L = Math.min(0, s.c[0]) - FIT_ROOM, Tp = Math.min(0, s.c[1]) - FIT_ROOM, R = Math.max(1, s.c[2]) + FIT_ROOM, B = Math.max(1, s.c[3]) + FIT_ROOM;
  const pad = 10, sc = Math.min((cw - 2 * pad) / ((R - L) * iw), (ch - 2 * pad) / ((B - Tp) * ih));
  const ox = (cw - (R - L) * iw * sc) / 2 - L * iw * sc, oy = (ch - (B - Tp) * ih * sc) / 2 - Tp * ih * sc;
  return (FIT.view = { cw, ch, dpr, iw, ih, sc, ox, oy, im, L, T: Tp, R, B });
}
const fitX = u => FIT.view.ox + u * FIT.view.iw * FIT.view.sc, fitY = v => FIT.view.oy + v * FIT.view.ih * FIT.view.sc;
function fitRedraw() { if (!FIT.raf) FIT.raf = requestAnimationFrame(() => { FIT.raf = 0; if (FIT.open) { fitDraw(); fitPreview(); } }); }
function fitDraw() {
  const cv = $('#fitCv'); if (!cv) return;
  const V = FIT.view || fitView(); if (!V) return;
  const s = fitCur(), x = cv.getContext('2d'), sel = FIT.sel, drag = FIT.drag && FIT.drag.h;
  x.setTransform(V.dpr, 0, 0, V.dpr, 0, 0); x.clearRect(0, 0, V.cw, V.ch);
  x.imageSmoothingQuality = 'high';
  x.drawImage(V.im, fitX(0), fitY(0), V.iw * V.sc, V.ih * V.sc);
  x.strokeStyle = 'rgba(255,255,255,.2)'; x.lineWidth = 1; x.strokeRect(Math.round(fitX(0)) + .5, Math.round(fitY(0)) + .5, Math.round(V.iw * V.sc) - 1, Math.round(V.ih * V.sc) - 1);
  const L = fitX(s.c[0]), Tt = fitY(s.c[1]), R = fitX(s.c[2]), B = fitY(s.c[3]), W = R - L, H = B - Tt;
  /* what does not go on the case, dimmed */
  x.fillStyle = 'rgba(12,11,10,.66)'; x.beginPath(); x.rect(0, 0, V.cw, V.ch); x.rect(L, Tt, W, H); x.fill('evenodd');
  /* a disc is round, with its hole */
  if (FIT.tab === 'disc' && mediaOf(FIT.g) === 'disc') {
    x.save(); x.strokeStyle = 'rgba(255,255,255,.7)'; x.setLineDash([5, 4]); x.lineWidth = 1.2;
    x.beginPath(); x.ellipse(L + W / 2, Tt + H / 2, W / 2, H / 2, 0, 0, 7); x.stroke();
    x.beginPath(); x.ellipse(L + W / 2, Tt + H / 2, W * .065, H * .065, 0, 0, 7); x.stroke(); x.restore();
  }
  /* a full scan: the spine's two lines, and what each part is */
  if (FIT.tab === 'full') {
    const xs = [L, fitX(s.k[0]), fitX(s.k[1]), R], names = [T('Contraportada'), T('Lomo'), T('Portada')];
    x.save(); x.font = `600 11px ${F.fig}`; x.textAlign = 'center'; x.textBaseline = 'top';
    names.forEach((n, i) => {
      const w = xs[i + 1] - xs[i], tw = x.measureText(n).width + 12; if (w < tw + 4) return;
      const cx = (xs[i] + xs[i + 1]) / 2; x.fillStyle = 'rgba(12,11,10,.72)'; x.beginPath(); x.roundRect ? x.roundRect(cx - tw / 2, Tt + 6, tw, 18, 9) : x.rect(cx - tw / 2, Tt + 6, tw, 18); x.fill();
      x.fillStyle = '#f4ecdf'; x.fillText(n, cx, Tt + 9);
    });
    [1, 2].forEach(i => {
      const on = sel === 'k' + i || drag === 'k' + i, X = Math.round(xs[i]) + .5;
      x.strokeStyle = on ? '#ffb547' : 'rgba(255,181,71,.75)'; x.lineWidth = on ? 2 : 1.4; x.setLineDash(on ? [] : [6, 4]);
      x.beginPath(); x.moveTo(X, Tt); x.lineTo(X, B); x.stroke(); x.setLineDash([]);
      x.fillStyle = on ? '#ffb547' : '#2a1a05'; x.strokeStyle = '#ffb547'; x.lineWidth = 1.5;
      x.beginPath(); x.rect(X - 4, Tt + H / 2 - 11, 8, 22); x.fill(); x.stroke();
    });
    x.restore();
  }
  /* the frame and its handles */
  x.strokeStyle = '#ffb547'; x.lineWidth = sel === 'move' || drag === 'move' ? 2.5 : 1.6; x.strokeRect(L, Tt, W, H);
  const hd = (hx, hy, w, h, on) => { x.fillStyle = on ? '#ffb547' : '#2a1a05'; x.strokeStyle = on ? '#fff3dd' : '#ffb547'; x.lineWidth = 1.5; x.beginPath(); x.rect(hx - w / 2, hy - h / 2, w, h); x.fill(); x.stroke(); };
  const on = h => sel === h || drag === h;
  hd(L, Tt + H / 2, 7, 22, on('l')); hd(R, Tt + H / 2, 7, 22, on('r')); hd(L + W / 2, Tt, 22, 7, on('t')); hd(L + W / 2, B, 22, 7, on('b'));
  hd(L, Tt, 9, 9, on('tl')); hd(R, Tt, 9, 9, on('tr')); hd(L, B, 9, 9, on('bl')); hd(R, B, 9, 9, on('br'));
}
/* what the case will show, face by face */
function fitPreview() {
  const box = $('#fitPrev'); if (!box) return;
  const g = FIT.g, kind = FIT.tab, s = fitCur(), im = fitPic(), iw = imgW(im), ih = imgH(im), dpr = Math.min(2, devicePixelRatio || 1);
  const faces = kind === 'full' ? [['back', T('Contraportada')], ['spine', T('Lomo')], ['front', T('Portada')]] : [[kind, '']];
  const lying = kind === 'spine';
  const key = kind + '|' + g.fmt + '|' + box.clientWidth + '|' + (kind === 'manual' ? s.b : '');
  if (box.dataset.k !== key) {
    box.dataset.k = key;
    box.innerHTML = faces.map(([f, l]) => `<figure><canvas data-face="${f}"></canvas>${l ? `<figcaption>${esc(l)}</figcaption>` : ''}</figure>`).join('');
    const sizes = faces.map(([f]) => { if (f !== 'manual') return faceSize(g, f); const m = manualSize(g, true); return [m[0], m[2]]; }), avail = Math.max(120, box.clientWidth - 20 - 8 * (faces.length - 1));
    const sum = sizes.reduce((a, [w, h]) => a + (lying ? h / w : w / h), 0), Hpx = Math.min(lying ? 34 : 176, avail / sum);
    box.querySelectorAll('canvas').forEach((cv, i) => {
      const [w, h] = sizes[i], A = lying ? h / w : w / h, cw = Math.max(4, Math.round(Hpx * A)), ch = Math.round(Hpx);
      cv.width = Math.round(cw * dpr); cv.height = Math.round(ch * dpr); cv.style.width = cw + 'px'; cv.style.height = ch + 'px';
    });
  }
  box.querySelectorAll('canvas').forEach(cv => {
    const f = cv.dataset.face, x = cv.getContext('2d'), W = cv.width, H = cv.height;
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, W, H);
    let c = s.c;
    if (kind === 'full') { c = f === 'back' ? [s.c[0], s.c[1], s.k[0], s.c[3]] : f === 'spine' ? [s.k[0], s.c[1], s.k[1], s.c[3]] : [s.k[1], s.c[1], s.c[2], s.c[3]]; if (!s.explicit) c = subCover(c, iw, ih, faceA(g, f)); }
    x.save();
    if (f === 'manual') { const cc = active && active.g === g && active.coverCanvas ? active.coverCanvas : drawCover(g); x.drawImage(drawManualCover(g, cc), 0, 0, W, H); }
    else if (lying) { x.translate(0, H); x.rotate(-Math.PI / 2); artCrop(x, im, c, 0, 0, H, W); }
    else if (f === 'disc' && mediaOf(g) === 'disc') {
      x.beginPath(); x.arc(W / 2, H / 2, W / 2, 0, 7); x.clip(); artCrop(x, im, c, 0, 0, W, H);
      x.globalCompositeOperation = 'destination-out'; x.beginPath(); x.arc(W / 2, H / 2, W * .065, 0, 7); x.fill();
    } else artCrop(x, im, c, 0, 0, W, H);
    x.restore();
  });
}

/* ---------- moving the frame, its edges and the spine's lines ---------- */
/* h: the handle; du, dv: how far, in fractions of the picture; o: the framing it started from */
function fitMove(h, du, dv, o) {
  const s = fitCur(), V = FIT.view || fitView(), c = o.c.slice(), k = o.k ? o.k.slice() : null, min = .02;
  const An = faceA(FIT.g, FIT.tab) * V.ih / V.iw, lock = s.lock && FIT.tab !== 'full';
  if (h === 'move') {
    du = clamp(du, V.L - c[0], V.R - c[2]); dv = clamp(dv, V.T - c[1], V.B - c[3]);
    c[0] += du; c[2] += du; c[1] += dv; c[3] += dv; if (k) { k[0] += du; k[1] += du; }
  } else if (h === 'k1' || h === 'k2') {
    const i = h === 'k1' ? 0 : 1; k[i] = clamp(k[i] + du, i ? k[0] + .003 : c[0] + .003, i ? c[2] - .003 : k[1] - .003);
  } else {
    const L = h.includes('l'), R = h.includes('r'), Tp = h.includes('t'), B = h.includes('b');
    if (L) c[0] = clamp(c[0] + du, V.L, c[2] - min); if (R) c[2] = clamp(c[2] + du, c[0] + min, V.R);
    if (Tp) c[1] = clamp(c[1] + dv, V.T, c[3] - min); if (B) c[3] = clamp(c[3] + dv, c[1] + min, V.B);
    if (lock) {
      const ow = o.c[2] - o.c[0], oh = o.c[3] - o.c[1];
      if ((L || R) && !(Tp || B)) { const nh = (c[2] - c[0]) / An, cy = (o.c[1] + o.c[3]) / 2; c[1] = cy - nh / 2; c[3] = cy + nh / 2; }
      else if ((Tp || B) && !(L || R)) { const nw = (c[3] - c[1]) * An, cx = (o.c[0] + o.c[2]) / 2; c[0] = cx - nw / 2; c[2] = cx + nw / 2; }
      else {
        /* a corner: the side that moved more decides, and the opposite corner stays put */
        const sw = (c[2] - c[0]) / ow, sh = (c[3] - c[1]) / oh, nw = Math.abs(sw - 1) > Math.abs(sh - 1) ? ow * sw : oh * sh * An, nh = nw / An;
        if (L) c[0] = o.c[2] - nw; else c[2] = o.c[0] + nw;
        if (Tp) c[1] = o.c[3] - nh; else c[3] = o.c[1] + nh;
      }
    }
    if (k) { k[0] = clamp(k[0], c[0] + .003, c[2] - .006); k[1] = clamp(k[1], k[0] + .003, c[2] - .003); }
  }
  s.c = c; if (k) s.k = k; s.explicit = true;
}
/* zooming: the frame grows or shrinks around a point (a smaller frame is a closer look) */
function fitZoom(f, ax, ay) {
  const s = fitCur(), c = s.c, n = [ax + (c[0] - ax) * f, ay + (c[1] - ay) * f, ax + (c[2] - ax) * f, ay + (c[3] - ay) * f];
  if (n[2] - n[0] < .02 || n[3] - n[1] < .02 || n[2] - n[0] > 4 || n[3] - n[1] > 4) return;
  s.c = n; if (s.k) s.k = s.k.map(k => ax + (k - ax) * f); s.explicit = true;
}
/* the frame back to the face's own shape, around the same middle */
function fitToShape(s) {
  const V = FIT.view || fitView(), An = faceA(FIT.g, FIT.tab) * V.ih / V.iw, c = s.c, cx = (c[0] + c[2]) / 2, w = (c[3] - c[1]) * An;
  s.c = [cx - w / 2, c[1], cx + w / 2, c[3]];
}

/* ---------- finding the edges by itself ---------- */
function fitPixels(im, w, h) { const cv = mkCanvas(w, h), x = cv.getContext('2d'); x.drawImage(im, 0, 0, w, h); try { return x.getImageData(0, 0, w, h).data; } catch (e) { return null; } }
/* the scanner's border around what is printed: rows and columns of the corners' colour (or see-through) */
function fitTrim(im) {
  const iw = imgW(im), ih = imgH(im), w = Math.max(16, Math.min(1000, iw)), h = Math.max(16, Math.min(1000, ih)), d = fitPixels(im, w, h);
  if (!d) return null;
  const at = (i, j) => (j * w + i) * 4, cs = [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]].map(([i, j]) => at(i, j));
  const dist = (o, p) => Math.abs(d[o] - d[p]) + Math.abs(d[o + 1] - d[p + 1]) + Math.abs(d[o + 2] - d[p + 2]);
  let same = true; for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) if (dist(cs[a], cs[b]) > 70 || Math.abs(d[cs[a] + 3] - d[cs[b] + 3]) > 60) same = false;
  const ref = cs[0], blank = o => d[o + 3] < 24 || (same && d[ref + 3] > 200 && dist(o, ref) < 60);
  const row = j => { let n = 0; for (let i = 0; i < w; i++) if (!blank(at(i, j))) n++; return n <= w * .02; };
  const col = i => { let n = 0; for (let j = 0; j < h; j++) if (!blank(at(i, j))) n++; return n <= h * .02; };
  let t = 0, b = h - 1, l = 0, r = w - 1;
  while (t < b && row(t)) t++; while (b > t && row(b)) b--; while (l < r && col(l)) l++; while (r > l && col(r)) r--;
  if ((r - l + 1) * (b - t + 1) < w * h * .2) return null;
  return [l / w, t / h, (r + 1) / w, (b + 1) / h];
}
/* the spine's edges in a full scan are lines from top to bottom where the colour changes: look for them near
   where the case's proportions put them. Gives the lines and how many of the two it found */
function fitSpine(im, c, k) {
  const iw = imgW(im), ih = imgH(im), w = Math.max(64, Math.min(1400, iw)), h = Math.max(16, Math.min(320, ih)), d = fitPixels(im, w, h);
  if (!d) return { k, n: 0 };
  const j0 = clamp(Math.floor(c[1] * h) + 2, 0, h - 1), j1 = clamp(Math.ceil(c[3] * h) - 2, j0 + 1, h), rows = j1 - j0;
  const score = i => { let n = 0; for (let j = j0; j < j1; j++) { const a = (j * w + i - 2) * 4, b = a + 16; if (Math.abs(d[a] - d[b]) + Math.abs(d[a + 1] - d[b + 1]) + Math.abs(d[a + 2] - d[b + 2]) > 54) n++; } return n / rows; };
  const win = (c[2] - c[0]) * .045; let n = 0;
  const out = k.map(kk => {
    const a = Math.max(2, Math.floor((kk - win) * w)), b = Math.min(w - 3, Math.ceil((kk + win) * w)), sc = [];
    let bi = -1, bs = .5;
    for (let i = a; i <= b; i++) { sc[i] = score(i); if (sc[i] > bs) { bs = sc[i]; bi = i; } }
    if (bi < 0) return kk;
    /* the comparison spans a few columns, so the edge is in the middle of the run of high scores */
    let lo = bi, hi = bi; while (lo > a && sc[lo - 1] >= bs * .9) lo--; while (hi < b && sc[hi + 1] >= bs * .9) hi++;
    n++; return ((lo + hi) / 2 + .5) / w;
  });
  return out[1] - out[0] > .004 && out[0] > c[0] && out[1] < c[2] ? { k: out, n } : { k, n: 0 };
}

/* ---------- the buttons ---------- */
function fitTool(t) {
  const g = FIT.g, kind = FIT.tab, s = fitCur(), raw = fitImg(g, kind), im = fitPic(), iw = imgW(im), ih = imgH(im), A = faceA(g, kind);
  if (t === 'fill') { s.c = coverRect(iw, ih, A); s.lock = true; }
  else if (t === 'whole') { s.c = containRect(iw, ih, A); s.lock = true; }
  else if (t === 'all') { s.c = [0, 0, 1, 1]; if (kind === 'full') s.k = wrapCuts(g, s.c); else s.lock = false; }
  else if (t === 'split') s.k = wrapCuts(g, s.c);
  else if (t === 'trim') {
    const r = fitTrim(im), none = !r || (r[0] < .004 && r[1] < .004 && r[2] > .996 && r[3] > .996);
    if (kind === 'full') {
      if (r) s.c = r;
      const sp = fitSpine(im, s.c, wrapCuts(g, s.c)); s.k = sp.k;
      toast(none ? (sp.n ? T('Sin bordes que quitar; el lomo, encontrado') : T('No he encontrado bordes ni el lomo: ajústalos a mano')) : sp.n ? T('Bordes quitados y lomo encontrado') : T('Bordes quitados; el lomo, repartido según la caja'), 2600);
    } else {
      if (none) { toast(T('No he encontrado bordes que quitar')); return; }
      s.c = r; s.lock = false; toast(T('Bordes quitados: lo impreso llena la cara'), 2200);
    }
  }
  else if (t === 'rot') Object.assign(s, fitDefault(g, kind, raw, (s.r + 1) % 4));
  else if (t === 'reset') { Object.assign(s, fitDefault(g, kind, raw)); }
  if (t !== 'reset') s.explicit = true;
  fitChanged(true);
}

/* ---------- keys and the controller ---------- */
function fitKey(k) {
  if (k === 'Escape' || k === 'Backspace') { closeFit(false); return true; }
  if (k === 'Enter') { closeFit(true); return true; }
  const s = fitCur(); if (!s) return true;
  if (/^Arrow/.test(k)) {
    const st = .004, h = FIT.sel, du = k === 'ArrowLeft' ? -st : k === 'ArrowRight' ? st : 0, dv = k === 'ArrowUp' ? -st : k === 'ArrowDown' ? st : 0;
    const horiz = h === 'move' || h === 'l' || h === 'r' || h === 'k1' || h === 'k2', vert = h === 'move' || h === 't' || h === 'b';
    if ((du && !horiz) || (dv && !vert)) return true;
    fitMove(h, du, dv, { c: s.c, k: s.k }); fitChanged(); return true;
  }
  if ('qQeE'.includes(k) && k.length === 1) { const L = fitHandles(), i = Math.max(0, L.indexOf(FIT.sel)); FIT.sel = L[(i + ('qQ'.includes(k) ? -1 : 1) + L.length) % L.length]; fitSync(); fitRedraw(); return true; }
  if ('zZcC+-='.includes(k) && k.length === 1) { const c = s.c; fitZoom('zZ-'.includes(k) ? 1.04 : 1 / 1.04, (c[0] + c[2]) / 2, (c[1] + c[3]) / 2); fitChanged(); return true; }
  if (k === 'f' || k === 'F') { fitTool('rot'); return true; }
  if ((k === 'm' || k === 'M') && FIT.tabs.length > 1) { const i = FIT.tabs.findIndex(t => t[0] === FIT.tab); fitTab(FIT.tabs[(i + 1) % FIT.tabs.length][0]); return true; }
  return true;
}

/* ---------- the mouse, a pen or a finger ---------- */
const FIT_CURSOR = { l: 'ew-resize', r: 'ew-resize', t: 'ns-resize', b: 'ns-resize', tl: 'nwse-resize', br: 'nwse-resize', tr: 'nesw-resize', bl: 'nesw-resize', k1: 'col-resize', k2: 'col-resize', move: 'move' };
function fitHit(px, py) {
  const V = FIT.view; if (!V) return null;
  const s = fitCur(), L = fitX(s.c[0]), Tt = fitY(s.c[1]), R = fitX(s.c[2]), B = fitY(s.c[3]), d = coarse ? 16 : 9, near = (a, b) => Math.abs(a - b) < d;
  if (near(px, L) && near(py, Tt)) return 'tl'; if (near(px, R) && near(py, Tt)) return 'tr'; if (near(px, L) && near(py, B)) return 'bl'; if (near(px, R) && near(py, B)) return 'br';
  if (FIT.tab === 'full') { const a = fitX(s.k[0]), b = fitX(s.k[1]); if (py > Tt && py < B) { if (near(px, b) && Math.abs(px - b) <= Math.abs(px - a)) return 'k2'; if (near(px, a)) return 'k1'; } }
  const inY = py > Tt - d && py < B + d, inX = px > L - d && px < R + d;
  if (near(px, L) && inY) return 'l'; if (near(px, R) && inY) return 'r'; if (near(py, Tt) && inX) return 't'; if (near(py, B) && inX) return 'b';
  return px > L && px < R && py > Tt && py < B ? 'move' : null;
}
/* the picture's canvas is new each time the window opens */
function fitBind() {
  const cv = $('#fitCv'), at = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
  cv.addEventListener('pointerdown', e => {
    if (!FIT.view) fitView();
    const p = at(e), h = fitHit(p.x, p.y); if (!h) return;
    if (fitHandles().includes(h)) FIT.sel = h;
    const s = fitCur(); FIT.drag = { h, x: p.x, y: p.y, o: { c: s.c.slice(), k: s.k ? s.k.slice() : null } };
    try { cv.setPointerCapture(e.pointerId); } catch (er) { }
    e.preventDefault(); fitSync(); fitRedraw();
  });
  cv.addEventListener('pointermove', e => {
    const p = at(e);
    if (!FIT.drag) { const h = fitHit(p.x, p.y); cv.style.cursor = h ? FIT_CURSOR[h] : 'default'; return; }
    const V = FIT.view, d = FIT.drag;
    fitMove(d.h, (p.x - d.x) / (V.iw * V.sc), (p.y - d.y) / (V.ih * V.sc), d.o); fitCur().dirty = true; fitRedraw();
  });
  const end = () => { if (!FIT.drag) return; FIT.drag = null; fitChanged(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end); cv.addEventListener('lostpointercapture', end);
  cv.addEventListener('wheel', e => {
    e.preventDefault(); e.stopPropagation(); if (!FIT.view) fitView();
    const V = FIT.view, p = at(e), s = fitCur(), u = (p.x - V.ox) / (V.iw * V.sc), v = (p.y - V.oy) / (V.ih * V.sc);
    const inside = u > s.c[0] && u < s.c[2] && v > s.c[1] && v < s.c[3];
    fitZoom(Math.exp(clamp(e.deltaY, -120, 120) * .0016), inside ? u : (s.c[0] + s.c[2]) / 2, inside ? v : (s.c[1] + s.c[3]) / 2); fitChanged();
  }, { passive: false });
}
/* the window's own buttons and the proportions box, bound once */
fitEl.addEventListener('click', e => {
  /* after a click, Enter is Save again, not the same button once more */
  const refocus = () => { if (e.detail && FIT.open) fitEl.querySelector('.fit-card').focus({ preventScroll: true }); };
  const tb = e.target.closest('[data-ftab]'); if (tb) { fitTab(tb.dataset.ftab); refocus(); return; }
  const tl = e.target.closest('[data-ftool]'); if (tl) { fitTool(tl.dataset.ftool); refocus(); return; }
  const ac = e.target.closest('[data-fact]'); if (ac) closeFit(ac.dataset.fact === 'save');
});
fitEl.addEventListener('change', e => {
  const s = fitCur(); if (!s) return;
  if (e.target.id === 'fitLock') { s.lock = e.target.checked; if (s.lock) fitToShape(s); }
  else if (e.target.id === 'fitBand') { s.b = e.target.checked ? 1 : 0; const b = $('#fitPrev'); if (b) b.dataset.k = ''; if (s.lock) fitToShape(s); }
  else return;
  s.explicit = true; fitChanged(true);
});
window.addEventListener('resize', () => { if (FIT.open) { FIT.view = null; const b = $('#fitPrev'); if (b) b.dataset.k = ''; fitRedraw(); } });
