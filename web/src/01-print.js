
/* =====================================================================
   PRINTED MATERIAL: cover, back, spine, disc, manual
   ===================================================================== */
function setLS(x, px) { if ('letterSpacing' in x) x.letterSpacing = px + 'px'; }
function wrapText(x, text, X, Y, maxW, lh, maxLines = 99) {
  const words = text.split(/\s+/); let line = '', n = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (x.measureText(test).width > maxW && line) {
      if (n === maxLines - 1) { let l = line; while (x.measureText(l + '…').width > maxW && l.length) l = l.slice(0, -1); x.fillText(l + '…', X, Y + n * lh); return Y + (n + 1) * lh; }
      x.fillText(line, X, Y + n * lh); n++; line = words[i];
    } else line = test;
  }
  if (line) { x.fillText(line, X, Y + n * lh); n++; }
  return Y + n * lh;
}
function titleFont(g, size) {
  const fam = F[g.font];
  if (g.font === 'saira') return `800 ${Math.round(size)}px ${fam}`;
  if (g.font === 'fraunces') return `italic 700 ${Math.round(size)}px ${fam}`;
  return `${Math.round(size)}px ${fam}`;
}
function titleText(g) { return g.font === 'fraunces' ? g.t : g.t.toUpperCase(); }
/* real games (Playnite): the printed parts are built from the game's own cover and background */
function imgW(i) { return i.naturalWidth || i.videoWidth || i.width; }
function imgH(i) { return i.naturalHeight || i.videoHeight || i.height; }
function coverFit(x, img, X, Y, W, H, fx = .5, fy = .5) { const iw = imgW(img), ih = imgH(img); if (!iw || !ih) return; const sc = Math.max(W / iw, H / ih); x.drawImage(img, X + (W - iw * sc) * fx, Y + (H - ih * sc) * fy, iw * sc, ih * sc); }
function fmtLabel(g) {
  if (g.music) return DIMS[g.fmt].label;
  if (g.video) { const s = seasonOf(g); return (s && g.seasons.length > 1 ? T('TEMPORADA {0}', s.idx) + ' · ' : '') + DIMS[g.fmt].label; }
  if (!g.real && sysOf(g) === 'PC') return T(DIMS[g.fmt].label);
  return `${g.plat} · ` + ({ jewel: 'CD', bigjewel: 'CD', big: T('CAJA'), floppy: '3½" HD', cart: T('CARTUCHO') }[g.fmt] || 'DVD');
}
const isClear = g => DIMS[g.fmt].shell === 'clear', isCard = g => DIMS[g.fmt].shell === 'card', isWide = g => !!DIMS[g.fmt].wide;
function placeholderArt(x, W, H, g) {
  x.fillStyle = lg(x, 0, 0, W * .3, H, [[0, mix(g.pal[1], '#ffffff', .08)], [1, g.pal[0]]]); x.fillRect(0, 0, W, H);
  x.globalAlpha = .18; x.strokeStyle = g.pal[3]; x.lineWidth = Math.max(1, W * .004); for (let i = 0; i < 9; i++) { x.beginPath(); x.arc(W * .5, H * .62, W * (.12 + i * .07), 0, 7); x.stroke(); } x.globalAlpha = 1;
  let s = W * .14; x.font = titleFont(g, s); const t = titleText(g); while (x.measureText(t).width > W * .84 && s > 10) { s *= .94; x.font = titleFont(g, s); }
  x.fillStyle = g.pal[4]; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, W / 2, H * .3);
}
function coverSize(g) { if (g.video || g.music) return [512, Math.round(512 * DIMS[g.fmt].h / DIMS[g.fmt].w)]; return { jewel: [512, 452], bigjewel: [512, 470], big: [512, 592], floppy: [512, 694], cart: [512, 686] }[g.fmt] || [512, 720]; }
function spineSize(g) {
  if (g.video) { const d = DIMS[g.fmt]; return [Math.round(1000 * d.d / d.h), 1000]; }
  if (g.music) { const d = DIMS[g.fmt]; return [Math.max(28, Math.round(1000 * d.d / d.h)), 1000]; }
  const s = { big: [224, 1036], floppy: [200, 1080], cart: [192, 1060], bigjewel: [104, 760] }[g.fmt];
  if (s) return s;
  if (g.real) return g.fmt === 'jewel' ? [80, 704] : [72, 976];
  return g.fmt === 'jewel' ? [72, 900] : [64, 868];
}
const AGE_COL = { 3: '#3aa655', 7: '#3aa655', 12: '#e3a02f', 16: '#e3a02f', 18: '#d83a3a' };

function ageBadge(x, X, Y, s, age) {
  rr(x, X, Y, s, s * 1.18, s * .1); x.fillStyle = '#ffffff'; x.fill();
  rr(x, X + s * .06, Y + s * .06, s * .88, s * .88, s * .07); x.fillStyle = AGE_COL[age] || '#e3a02f'; x.fill();
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `800 ${Math.round(s * .62)}px ${F.saira}`; x.fillText(String(age), X + s / 2, Y + s * .52);
  x.fillStyle = '#222222'; x.font = `700 ${Math.round(s * .16)}px ${F.mono}`; x.fillText(T('EDAD'), X + s / 2, Y + s * 1.06);
}
function barcode(x, X, Y, w, h, seed) {
  const r = rng(seed); x.fillStyle = '#ffffff'; x.fillRect(X, Y, w, h); x.fillStyle = '#111111';
  let px = X + w * .05; while (px < X + w * .95) { const bw = 1 + Math.floor(r() * 3) * (w / 160); if (r() > .42) x.fillRect(px, Y + h * .06, bw, h * .72); px += bw + w / 160; }
  x.font = `500 ${Math.round(h * .17)}px ${F.mono}`; x.textAlign = 'center'; x.textBaseline = 'bottom';
  x.fillText(String(seed).padStart(10, '0').slice(0, 13).replace(/(\d)(\d{6})(\d+)/, '$1 $2 $3'), X + w / 2, Y + h);
}
function wear(x, W, H, r, amt) {
  x.save(); x.globalCompositeOperation = 'screen';
  x.strokeStyle = 'rgba(255,255,255,1)';
  for (let i = 0; i < 30 * amt; i++) { x.globalAlpha = .05 + r() * .1; x.lineWidth = .6 + r() * 1.4; const sx = r() * W, sy = r() * H, l = 10 + r() * 60; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (r() - .5) * l, sy + (r() - .5) * l * .4); x.stroke(); }
  x.globalAlpha = .18 * amt;
  [[0, 0], [W, 0], [0, H], [W, H]].forEach(([cx, cy]) => { x.fillStyle = rg(x, cx, cy, 0, Math.min(W, H) * .18, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, W, H); });
  x.restore();
}
function sticker(x, cx, cy, R, lines, fill, ink, rot = -.2, star = false) {
  x.save(); x.translate(cx, cy); x.rotate(rot);
  x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowBlur = 8; x.shadowOffsetY = 3;
  x.fillStyle = fill; x.beginPath();
  if (star) { const n = 18; for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * Math.PI * 2, rr2 = i % 2 ? R * .86 : R; x.lineTo(Math.cos(a) * rr2, Math.sin(a) * rr2); } x.closePath(); }
  else x.arc(0, 0, R, 0, 7);
  x.fill(); x.shadowBlur = 0; x.shadowOffsetY = 0;
  x.strokeStyle = hexA(ink, .5); x.lineWidth = 2; x.beginPath(); x.arc(0, 0, R * .78, 0, 7); x.stroke();
  x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach((l, i) => { x.font = l.f; x.fillText(l.t, 0, (i - (lines.length - 1) / 2) * R * .42); });
  x.restore();
}

function drawTitle(x, g, W, H, top) {
  const text = titleText(g), maxW = W * .86;
  let size = g.font === 'press' ? W * .075 : g.font === 'bungee' ? W * .13 : g.font === 'fraunces' ? W * .15 : W * .2;
  const minSize = W * .07;
  x.font = titleFont(g, size);
  while (x.measureText(text).width > maxW && size > minSize) { size *= .95; x.font = titleFont(g, size); }
  let lines = [text];
  if (x.measureText(text).width > maxW && text.includes(' ')) {
    const words = text.split(' '); let best = null;
    for (let i = 1; i < words.length; i++) { const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '); const m = Math.max(x.measureText(a).width, x.measureText(b).width); if (!best || m < best.m) best = { a, b, m }; }
    lines = [best.a, best.b];
    size = g.font === 'press' ? W * .07 : g.font === 'bungee' ? W * .12 : W * .17; x.font = titleFont(g, size);
    while (Math.max(...lines.map(l => x.measureText(l).width)) > maxW && size > minSize) { size *= .95; x.font = titleFont(g, size); }
  }
  const lh = size * (g.font === 'press' ? 1.35 : .95), total = lines.length * lh;
  const y0 = g.tpos === 'bottom' ? H * .84 - total : top + H * .045;
  x.textAlign = 'center'; x.textBaseline = 'top';
  if (g.tshadow !== false) { x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = size * .3; x.shadowOffsetY = size * .05; }
  if (g.font === 'bungee' || g.font === 'press') { x.lineJoin = 'round'; x.strokeStyle = 'rgba(0,0,0,.55)'; x.lineWidth = size * .16; lines.forEach((l, i) => x.strokeText(l, W / 2, y0 + i * lh)); }
  x.fillStyle = lg(x, 0, y0, 0, y0 + total, [[0, mix(g.pal[4], '#ffffff', .35)], [1, mix(g.pal[4], '#000000', .14)]]); lines.forEach((l, i) => x.fillText(l, W / 2, y0 + i * lh));
  x.shadowBlur = 0; x.shadowOffsetY = 0;
  if (g.font !== 'press') { x.globalAlpha = .35; x.strokeStyle = '#ffffff'; x.lineWidth = Math.max(1, size * .012); lines.forEach((l, i) => x.strokeText(l, W / 2, y0 + i * lh - size * .01)); x.globalAlpha = 1; }
  x.font = `700 ${Math.round(W * .03)}px ${F.fig}`; setLS(x, 2);
  x.fillStyle = g.pal[4]; x.globalAlpha = .92;
  if (g.tshadow !== false) { x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 6; }
  x.fillText(g.tag.toUpperCase(), W / 2, g.tpos === 'bottom' ? y0 - W * .055 : y0 + total + W * .02);
  x.globalAlpha = 1; x.shadowBlur = 0; setLS(x, 0);
}

/* ---------- real pictures (back, spine, disc, or a full wraparound scan), when the game has them ---------- */
/* every picture a case can have, as the extension names them */
const SCAN_KINDS = ['full', 'front', 'back', 'spine', 'disc', 'manual'];
function artPic(g, kind) { return g.real && g.scanImg ? g.scanImg[kind] || null : null; }
/* the framing editor (42-fit.js): while it is open, the case is painted with what is being framed */
const FIT = { open: false, g: null, st: {} };
/* which picture a framing was made for: when the picture changes, the framing no longer applies */
function fitSrc(g, kind) {
  const S = g.scans || {}, key = v => v.length > 300 ? v.length + ':' + v.slice(-48) : v;   // a picture kept in memory (the pretend Playnite) is a whole data address
  if (S[kind]) return key(S[kind]);
  if (kind === 'full') return '';
  /* a face with no picture of its own is printed from its part of the full scan; the front, from Playnite's cover; the manual, from the front */
  if ((kind === 'front' || kind === 'back' || kind === 'spine') && S.full) return 'full:' + key(S.full);
  if (kind === 'front') return 'cover:' + (g.coverVer || g.ver || '');
  if (kind === 'manual') return g.manualCover ? 'pdf:' + g.manualVer : 'manual:' + fitSrc(g, 'front');
  return '';
}
/* the manual's own cover: a picture of it, or the first page of the real manual */
function manualScan(g) { return artPic(g, 'manual') || (g.real && g.manualCover) || null; }
/* the picture a face is printed from, as fitSrc says */
function facePic(g, kind) {
  const own = artPic(g, kind); if (own) return own;
  if (kind === 'front' || kind === 'back' || kind === 'spine') { const w = artPic(g, 'wrap' + kind[0].toUpperCase() + kind.slice(1)); if (w) return w; }
  if (kind === 'front') return g.real ? g.cover || g.coverSmall || null : null;
  if (kind === 'manual') return manualScan(g) || facePic(g, 'front');
  return null;
}
/* the framing the player chose for a face: the part of the (turned) picture that goes on it, as fractions
   of the picture [left, top, right, bottom] (it may reach past the edges), and for a full scan the two
   lines of the spine. A framing made for a case of another shape is left aside until it has that shape again */
function artFit(g, kind, A) {
  if (FIT.open && FIT.g === g && FIT.st[kind]) { const s = FIT.st[kind]; return s.explicit ? s : null; }
  const f = g.scanFit && g.scanFit[kind], c = f && f.c;
  if (!f || f.s !== fitSrc(g, kind) || !Array.isArray(c) || c.length !== 4 || !(c[2] > c[0]) || !(c[3] > c[1])) return null;
  if (kind === 'full') return Array.isArray(f.k) && f.k.length === 2 && c[0] < f.k[0] && f.k[0] < f.k[1] && f.k[1] < c[2] ? f : null;
  return A && f.a && Math.abs(A / f.a - 1) > .03 ? null : f;
}
/* the picture turned a quarter at a time (clockwise), kept so it is only turned once */
function turned(img, r) {
  r = (((r | 0) % 4) + 4) % 4; if (!r) return img;
  const k = '_turn' + r; if (img[k]) return img[k];
  const w = imgW(img), h = imgH(img), c = mkCanvas(r % 2 ? h : w, r % 2 ? w : h), x = c.getContext('2d');
  x.translate(c.width / 2, c.height / 2); x.rotate(r * Math.PI / 2); x.drawImage(img, -w / 2, -h / 2);
  try { img[k] = c; } catch (e) { }
  return c;
}
function avgColor(im) {
  if (im._avg) return im._avg;
  let s = '#7f7a72'; try { const c = mkCanvas(1, 1), x = c.getContext('2d'); x.drawImage(im, 0, 0, 1, 1); const d = x.getImageData(0, 0, 1, 1).data; s = `rgb(${d[0]},${d[1]},${d[2]})`; } catch (e) { }
  try { im._avg = s; } catch (e) { }
  return s;
}
/* one part of a picture [l, t, r, b] stretched onto a face; past the picture's edges, its average colour */
function artCrop(x, im, c, X, Y, W, H) {
  const iw = imgW(im), ih = imgH(im); if (!iw || !ih) return;
  const sx = W / ((c[2] - c[0]) * iw), sy = H / ((c[3] - c[1]) * ih);
  x.save(); x.beginPath(); x.rect(X, Y, W, H); x.clip();
  if (c[0] < 0 || c[1] < 0 || c[2] > 1 || c[3] > 1) { x.fillStyle = avgColor(im); x.fillRect(X, Y, W, H); }
  x.drawImage(im, X - c[0] * iw * sx, Y - c[1] * ih * sy, iw * sx, ih * sy);
  x.restore();
}
/* the part of a picture that fills a face of shape A (width / height) without stretching it, or that shows all of it */
function coverRect(iw, ih, A) { const I = iw / ih; if (I > A) { const w = A / I; return [(1 - w) / 2, 0, (1 + w) / 2, 1]; } const h = I / A; return [0, (1 - h) / 2, 1, (1 + h) / 2]; }
function containRect(iw, ih, A) { const I = iw / ih; if (I > A) { const h = I / A; return [0, (1 - h) / 2, 1, (1 + h) / 2]; } const w = A / I; return [(1 - w) / 2, 0, (1 + w) / 2, 1]; }
/* the same, inside a part [l, t, r, b] of the picture */
function subCover(c, iw, ih, A) { const q = coverRect((c[2] - c[0]) * iw, (c[3] - c[1]) * ih, A), w = c[2] - c[0], h = c[3] - c[1]; return [c[0] + q[0] * w, c[1] + q[1] * h, c[0] + q[2] * w, c[1] + q[3] * h]; }
/* where the spine of a full scan is, by the case's own proportions */
function wrapCuts(g, c) { const D = DIMS[g.fmt] || DIMS.dvd, w = c[2] - c[0], ws = w * D.d / (2 * D.w + D.d), k1 = c[0] + (w - ws) / 2; return [k1, k1 + ws]; }
/* a full scan is back | spine | front, side by side: cut it where the player framed it, or where the case's proportions say */
function splitWrap(g, img) {
  const iw0 = imgW(img), ih0 = imgH(img); if (!iw0 || !ih0) return;
  const f = artFit(g, 'full');
  if (f) {
    const im = turned(img, f.r), iw = imgW(im), ih = imgH(im), c = f.c, k = f.k;
    const part = (a, b) => { const w = Math.max(2, Math.round((b - a) * iw)), h = Math.max(2, Math.round((c[3] - c[1]) * ih)), cv = mkCanvas(w, h); artCrop(cv.getContext('2d'), im, [a, c[1], b, c[3]], 0, 0, w, h); cv.wrapCut = cv.exact = true; return cv; };
    g.scanImg.wrapBack = part(c[0], k[0]); g.scanImg.wrapSpine = part(k[0], k[1]); g.scanImg.wrapFront = part(k[1], c[2]);
    return;
  }
  const D = DIMS[g.fmt] || DIMS.dvd, iw = iw0, ih = ih0;
  const tot = 2 * D.w + D.d, ws = Math.max(2, Math.round(iw * D.d / tot)), wb = Math.round((iw - ws) / 2), wf = iw - ws - wb;
  const cut = (x0, w) => { const c = mkCanvas(Math.max(1, w), ih); c.getContext('2d').drawImage(img, x0, 0, w, ih, 0, 0, w, ih); c.wrapCut = true; return c; };
  g.scanImg.wrapBack = cut(0, wb); g.scanImg.wrapSpine = cut(wb, ws); g.scanImg.wrapFront = cut(wb + ws, wf);
}
/* a part's picture: its own file first, then the slice of the full scan */
function artPart(g, kind) { return artPic(g, kind) || artPic(g, 'wrap' + kind[0].toUpperCase() + kind.slice(1)); }
/* a picture on a face of W x H: as the player framed it, or filling the face (a spine lying down is stood up) */
function layArt(x, img, g, kind, W, H) {
  const f = artFit(g, kind, W / H);
  if (f) { artCrop(x, turned(img, f.r), f.c, 0, 0, W, H); return; }
  /* a part of a full scan cut where the player framed it fits its face exactly */
  if (img.wrapCut && img.exact) { x.drawImage(img, 0, 0, W, H); return; }
  if (kind === 'spine' && !img.wrapCut && imgW(img) > imgH(img)) { x.save(); x.translate(W, 0); x.rotate(Math.PI / 2); coverFit(x, img, 0, 0, H, W); x.restore(); }
  else coverFit(x, img, 0, 0, W, H);
}
function drawCover(g) {
  if (g.music) return musicCover(g);
  const [W, H] = coverSize(g), c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(hash(g.id) + 3);
  if (g.real) {
    const scan = artPart(g, 'front'), src = scan || g.cover || g.coverSmall; if (src) layArt(x, src, g, 'front', W, H); else placeholderArt(x, W, H, g);
    /* lit like printed paper behind plastic, not like a screen */
    x.save(); x.globalCompositeOperation = 'soft-light'; x.fillStyle = lg(x, 0, 0, W * .8, H, [[0, 'rgba(255,238,215,.4)'], [.55, 'rgba(128,128,128,0)'], [1, 'rgba(0,0,0,.4)']]); x.fillRect(0, 0, W, H); x.restore();
    /* a scan of the real cover stays as printed: no band of ours, no stickers; only the wear and the jewel case hinge */
    if (scan) { if (g.hours >= 40) wear(x, W, H, r, clamp(g.hours / 100, .4, 1)); if (isClear(g)) jewelHinge(x, W, H); return x.canvas; }
    return finishCover(x, g, W, H, r, true);
  }
  drawArt(x, W, H, g);
  gradeArt(x, W, H, r);
  vignette(x, W, H, .35);
  return finishCover(x, g, W, H, r, false);
}
function finishCover(x, g, W, H, r, real) {
  const c = x.canvas;
  const band = isClear(g) ? H * .07 : isCard(g) ? H * .06 : H * .052;
  const blue = g.fmt === 'bluray' || g.fmt === 'bdbox';
  x.fillStyle = blue ? 'rgba(28,86,184,.95)' : 'rgba(10,10,14,.88)'; x.fillRect(0, 0, W, band);
  x.fillStyle = g.pal[2]; x.fillRect(0, band, W, 3);
  x.fillStyle = '#ffffff'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.font = `800 ${Math.round(band * .56)}px ${F.saira}`; setLS(x, 1.5);
  x.fillText(fmtLabel(g).toUpperCase(), isClear(g) ? W * .11 : W * .04, band * .54);
  x.textAlign = 'right'; x.font = `700 ${Math.round(band * .36)}px ${F.mono}`; x.fillText('MYVLIBRARY', W * .96, band * .54); setLS(x, 0);
  x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.arc(W * .96 - x.measureText('MYVLIBRARY').width - band * .45, band * .52, band * .2, 0, 7); x.fill();
  /* 16-bit boxes: four coloured stripes under the band, like the shop copies of the era */
  if (g.fmt === 'cart') ['#d83a3a', '#e3a02f', '#3aa655', '#3a7bd5'].forEach((c, i) => { x.fillStyle = c; x.fillRect(0, band + 3 + i * H * .007, W, H * .007); });
  if (!real) {
    drawTitle(x, g, W, H, band);
    const s = W * .1; ageBadge(x, W * .045, H - s * 1.18 - W * .045, s, g.age);
    x.fillStyle = g.pal[4]; x.globalAlpha = .9; x.textAlign = 'right'; x.textBaseline = 'alphabetic'; x.font = `700 ${Math.round(W * .028)}px ${F.fig}`; setLS(x, 1.5);
    x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 6; x.fillText(g.dev.toUpperCase(), W * .955, H - W * .05); x.shadowBlur = 0; x.globalAlpha = 1; setLS(x, 0);
  }
  if (g.burst) sticker(x, W * .78, band + H * .2, W * .13, [{ t: g.burst.split(' ').slice(0, 2).join(' '), f: `800 ${Math.round(W * .036)}px ${F.saira}` }, { t: g.burst.split(' ').slice(2).join(' '), f: `800 ${Math.round(W * .036)}px ${F.saira}` }], '#ffe23a', '#7a1010', .25, true);
  const full = kindOf(g) === 'completed' || (g.ach[1] > 0 && g.ach[0] >= g.ach[1]);
  if (full) sticker(x, W * .17, band + W * .19, W * .1, [{ t: '100%', f: `800 ${Math.round(W * .055)}px ${F.saira}` }, { t: T('LOGROS'), f: `700 ${Math.round(W * .022)}px ${F.mono}` }], '#f2c94c', '#4a3200', -.15, true);
  else if (kindOf(g) === 'beaten') sticker(x, W * .17, band + W * .18, W * .095, [{ t: T('SUPE-'), f: `800 ${Math.round(W * .038)}px ${F.saira}` }, { t: T('RADO'), f: `800 ${Math.round(W * .038)}px ${F.saira}` }], '#f6efe0', '#1e6b3a', -.2);
  if (g.fmt === 'floppy') {
    /* the little panel late-90s boxes had: what is inside and what drive you need */
    const pw = W * .3, ph = W * .1, px = W * .955 - pw, py = H - (real ? W * .05 : W * .13) - ph;
    x.save(); x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 8; rr(x, px, py, pw, ph, ph * .18); x.fillStyle = '#f4f1e8'; x.fill(); x.restore();
    x.fillStyle = '#16161a'; rr(x, px + ph * .14, py + ph * .14, ph * .72, ph * .72, ph * .06); x.fill();
    x.fillStyle = '#b8bcc4'; x.fillRect(px + ph * .3, py + ph * .14, ph * .38, ph * .26); x.fillStyle = '#f4f1e8'; x.fillRect(px + ph * .24, py + ph * .52, ph * .52, ph * .3);
    x.fillStyle = '#16161a'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.font = `800 ${Math.round(ph * .38)}px ${F.saira}`; x.fillText(T('{0} DISQUETES', DIMS.floppy.disks), px + ph * 1.02, py + ph * .36);
    x.font = `700 ${Math.round(ph * .2)}px ${F.mono}`; x.fillText('3½" · 1,44 MB', px + ph * 1.02, py + ph * .72);
  }
  if (g.hours >= 40) wear(x, W, H, r, clamp(g.hours / 100, .4, 1));
  if (isClear(g)) jewelHinge(x, W, H);
  return c;
}
/* the ridged hinge of a jewel case, over the left edge of the insert */
function jewelHinge(x, W, H) {
  const hw = W * .085; x.fillStyle = 'rgba(16,18,22,.66)'; x.fillRect(0, 0, hw, H);
  x.fillStyle = 'rgba(255,255,255,.13)'; for (let yy = 2; yy < H; yy += 5) x.fillRect(0, yy, hw, 1.6);
  x.fillStyle = 'rgba(255,255,255,.3)'; x.fillRect(hw - 2, 0, 2, H); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(hw, 0, 3, H);
}

function shot(g, i, w, h) {
  const big = mkCanvas(w * 2, Math.round(w * 2 * 1.3)), bx = big.getContext('2d');
  if (g.real) {
    const c = mkCanvas(w, h), x = c.getContext('2d');
    const pics = (g.shots || []).filter(Boolean);
    if (pics.length) { coverFit(x, pics[i % pics.length], 0, 0, w, h); return c; }
    const src = g.bg || g.cover;
    if (!src) { placeholderArt(x, w, h, g); return c; }
    const iw = imgW(src), ih = imgH(src), cw = iw * (g.bg ? .55 : .8), ch = cw * h / w, ox = [.05, .4, .25][i] * (iw - cw), oy = [.2, .5, .1][i] * Math.max(0, ih - ch);
    x.drawImage(src, ox, oy, cw, Math.min(ch, ih), 0, 0, w, h); return c;
  }
  drawArt(bx, big.width, big.height, g, i + 1);
  const c = mkCanvas(w, h), x = c.getContext('2d');
  const sy = [.15, .4, .55][i] * (big.height - h * 1.6);
  x.drawImage(big, w * .2 * i, sy, w * 1.6, h * 1.6, 0, 0, w, h);
  x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, 0, w, h * .13);
  x.fillStyle = g.pal[2]; x.fillRect(w * .04, h * .035, w * .3 * (1 - i * .25), h * .06);
  x.fillStyle = '#ffffff'; x.font = `700 ${Math.round(h * .08)}px ${F.mono}`; x.textAlign = 'right'; x.textBaseline = 'top'; x.fillText(String(1200 + i * 3450).padStart(6, '0'), w * .96, h * .025);
  return c;
}
function icon(x, type, cx, cy, s, col) {
  x.save(); x.translate(cx, cy); x.strokeStyle = col; x.fillStyle = col; x.lineWidth = s * .09; x.lineCap = 'round'; x.lineJoin = 'round';
  const person = (dx, sc) => { x.beginPath(); x.arc(dx, -s * .22 * sc, s * .16 * sc, 0, 7); x.fill(); x.beginPath(); x.arc(dx, s * .32 * sc, s * .3 * sc, Math.PI, 0); x.fill(); };
  if (type === 'one') person(0, 1);
  if (type === 'multi') { person(-s * .2, .8); person(s * .22, .8); }
  if (type === 'pad') { rr(x, -s * .45, -s * .2, s * .9, s * .45, s * .2); x.stroke(); x.beginPath(); x.moveTo(-s * .25, 0); x.lineTo(-s * .1, 0); x.moveTo(-s * .175, -s * .075); x.lineTo(-s * .175, s * .075); x.stroke(); x.beginPath(); x.arc(s * .15, -s * .02, s * .04, 0, 7); x.arc(s * .26, s * .06, s * .04, 0, 7); x.fill(); }
  if (type === 'trophy') { x.beginPath(); x.moveTo(-s * .28, -s * .35); x.lineTo(s * .28, -s * .35); x.lineTo(s * .22, -s * .02); x.quadraticCurveTo(0, s * .15, -s * .22, -s * .02); x.closePath(); x.fill(); x.fillRect(-s * .05, s * .05, s * .1, s * .18); x.fillRect(-s * .2, s * .23, s * .4, s * .08); x.beginPath(); x.arc(-s * .3, -s * .2, s * .1, Math.PI * .5, Math.PI * 1.5); x.arc(s * .3, -s * .2, s * .1, -Math.PI * .5, Math.PI * .5); x.stroke(); }
  if (type === 'net') { x.beginPath(); x.arc(0, 0, s * .36, 0, 7); x.stroke(); x.beginPath(); x.ellipse(0, 0, s * .15, s * .36, 0, 0, 7); x.stroke(); x.beginPath(); x.moveTo(-s * .36, 0); x.lineTo(s * .36, 0); x.stroke(); }
  if (type === 'pc') { rr(x, -s * .4, -s * .32, s * .8, s * .5, s * .05); x.stroke(); x.beginPath(); x.moveTo(-s * .15, s * .32); x.lineTo(s * .15, s * .32); x.moveTo(0, s * .18); x.lineTo(0, s * .32); x.stroke(); }
  x.restore();
}
function featureList(g) {
  if (g.real) {
    const fs = (g.features || []).join(' | ').toLowerCase(), f = [];
    f.push(/multi|co-?op|cooperat|split|local|pvp|jugadores/.test(fs) ? { i: 'multi', l: T('Multijugador') } : { i: 'one', l: T('1 jugador') });
    f.push(/controller|mando|gamepad/.test(fs) ? { i: 'pad', l: T('Mando') } : { i: 'pc', l: g.plat || 'PC' });
    if (g.ach[1] > 0) f.push({ i: 'trophy', l: T('{0} logros', g.ach[1]) });
    if (/online|en línea|en linea|mmo/.test(fs)) f.push({ i: 'net', l: T('En línea') });
    return f;
  }
  const f = [{ i: /^1 jugador/.test(g.players) ? 'one' : 'multi', l: g.players.replace(' jugadores', ' jug.').replace(' jugador', ' jug.').replace(' (red local)', ' red') }];
  f.push(g.pad ? { i: 'pad', l: T('Mando') } : { i: 'pc', l: T('Teclado') });
  f.push({ i: 'trophy', l: T('{0} logros', g.ach[1]) });
  if (g.online) f.push({ i: 'net', l: T('En línea') });
  return f;
}
function drawBack(g, coverCanvas) {
  if (g.video) return drawVideoBack(g, coverCanvas);
  if (g.music) return musicBack(g, coverCanvas);
  const [W, H] = coverSize(g), c = mkCanvas(W, H), x = c.getContext('2d'), p = g.pal;
  /* the real back cover, when there is one */
  const real = artPart(g, 'back'); if (real) { layArt(x, real, g, 'back', W, H); return c; }
  const dark = lum(p[0]) < .5, base = dark ? mix(p[0], '#000000', .15) : mix(p[0], '#ffffff', .2);
  const ink = dark ? '#f6f2ea' : '#1d1a17', soft = dark ? 'rgba(246,242,234,.82)' : 'rgba(29,26,23,.8)';
  x.fillStyle = base; x.fillRect(0, 0, W, H);
  x.globalAlpha = .2; x.drawImage(coverCanvas, 0, 0); x.globalAlpha = 1;
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, hexA(base, .6)], [1, hexA(base, .95)]]); x.fillRect(0, 0, W, H);
  const pad = W * .07, compact = isClear(g); let y = pad * .8;
  x.textAlign = 'left'; x.textBaseline = 'top'; x.fillStyle = ink;
  let ts = W * .075; x.font = titleFont(g, ts); while (x.measureText(titleText(g)).width > W - 2 * pad && ts > 14) { ts *= .94; x.font = titleFont(g, ts); }
  x.fillText(titleText(g), pad, y); y += ts * 1.08;
  x.fillStyle = dark ? (lum(p[2]) > .25 ? p[2] : p[3]) : p[2]; x.font = `700 ${Math.round(W * .03)}px ${F.fig}`; setLS(x, 1.5); x.fillText([g.genre, g.year].filter(Boolean).join(' · ').toUpperCase(), pad, y); setLS(x, 0); y += W * .055;
  x.fillStyle = soft; x.font = `600 ${Math.round(W * (compact ? .034 : .037))}px ${F.fig}`;
  y = wrapText(x, g.sum || T('Este juego no tiene descripción en tu biblioteca.'), pad, y, W - 2 * pad, W * (compact ? .045 : .05), compact ? 3 : 4) + W * .035;
  g.backSlot = null;
  if (g.real && g.trailerUrl) {
    /* a window for the trailer: the frame is painted live while the case is in your hands */
    const vw = W - 2 * pad, vh = Math.round(vw * 9 / 16), vx = pad, vy = Math.round(y);
    x.save(); x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 10; x.fillStyle = '#000'; x.fillRect(vx - 4, vy - 4, vw + 8, vh + 8); x.restore();
    const ph = g.bg || (g.shots && g.shots[0]) || g.cover; if (ph) { x.save(); x.beginPath(); x.rect(vx, vy, vw, vh); x.clip(); coverFit(x, ph, vx, vy, vw, vh); x.restore(); }
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(vx, vy, vw, vh); x.fillStyle = 'rgba(255,255,255,.9)'; x.beginPath(); x.moveTo(vx + vw / 2 - 16, vy + vh / 2 - 20); x.lineTo(vx + vw / 2 + 22, vy + vh / 2); x.lineTo(vx + vw / 2 - 16, vy + vh / 2 + 20); x.closePath(); x.fill();
    g.backSlot = { x: vx, y: vy, w: vw, h: vh };
    y += vh + W * .05;
  }
  const gap = W * .03, sw = (W - 2 * pad - 2 * gap) / 3, sh = sw * .62;
  for (let i = 0; i < (g.backSlot ? 0 : 3); i++) {
    const sc = shot(g, i, Math.round(sw * 1.5), Math.round(sh * 1.5)), sx = pad + i * (sw + gap), sy = y + (i === 1 ? W * .012 : 0);
    x.save(); x.translate(sx + sw / 2, sy + sh / 2); x.rotate((i - 1) * .035); x.shadowColor = 'rgba(0,0,0,.4)'; x.shadowBlur = 8;
    x.fillStyle = '#ffffff'; x.fillRect(-sw / 2 - 3, -sh / 2 - 3, sw + 6, sh + 6); x.shadowBlur = 0; x.drawImage(sc, -sw / 2, -sh / 2, sw, sh); x.restore();
  }
  if (!g.backSlot) y += sh + W * .06;
  const feats = featureList(g), fw = (W - 2 * pad) / feats.length, isz = W * (compact ? .06 : .075);
  if (y + isz * 2 < H * .8) {
    feats.forEach((f, i) => { const cx = pad + fw * i + fw / 2; icon(x, f.i, cx, y + isz * .5, isz, ink); x.fillStyle = soft; x.font = `700 ${Math.round(W * .024)}px ${F.mono}`; x.textAlign = 'center'; x.fillText(f.l.toUpperCase(), cx, y + isz * 1.15); });
  }
  if (!compact) {
    const req = requirements(g), bx = pad, bh = W * .155, by = H - H * .14 - bh - W * .035, bw = W - 2 * pad;
    if (by > y + isz * 1.75) { x.strokeStyle = dark ? 'rgba(246,242,234,.35)' : 'rgba(29,26,23,.35)'; x.lineWidth = 1.5; x.strokeRect(bx, by, bw, bh); x.fillStyle = soft; x.textAlign = 'left'; x.textBaseline = 'top'; req.forEach((l, i) => { x.font = `${i ? 500 : 700} ${Math.round(W * .021)}px ${F.mono}`; x.fillText(l, bx + W * .025, by + W * .022 + i * W * .032); }); }
  }
  const sh2 = H * (compact ? .17 : .14), sy2 = H - sh2;
  x.fillStyle = '#f4f1ea'; x.fillRect(0, sy2, W, sh2);
  x.fillStyle = p[2]; x.fillRect(0, sy2, W, 3);
  const bs = sh2 * .55; if (g.age) ageBadge(x, pad * .8, sy2 + (sh2 - bs * 1.18) / 2, bs, g.age);
  x.textAlign = 'left'; x.textBaseline = 'top'; x.fillStyle = '#1b1b1f';
  const tx = pad * .8 + (g.age ? bs + W * .035 : 0);
  let ds = sh2 * .2; x.font = `800 ${Math.round(ds)}px ${F.saira}`; setLS(x, 1); const devT = (g.dev || 'Estudio desconocido').toUpperCase(); while (x.measureText(devT).width > W * .58 - tx && ds > 8) { ds *= .94; x.font = `800 ${Math.round(ds)}px ${F.saira}`; } x.fillText(devT, tx, sy2 + sh2 * .2); setLS(x, 0);
  x.font = `600 ${Math.round(sh2 * .12)}px ${F.fig}`; x.fillStyle = '#55524c';
  if (g.pub) x.fillText(T('Distribuye {0}', g.pub).slice(0, 44), tx, sy2 + sh2 * .45); x.fillText(`${g.year ? '© ' + g.year + ' · ' : ''}${T(DIMS[g.fmt].name)}`, tx, sy2 + sh2 * .62);
  barcode(x, W - pad * .8 - W * .25, sy2 + sh2 * .16, W * .25, sh2 * .66, hash(g.id + 'bc'));
  if (g.hours > 0) {
    x.save(); x.translate(W - pad - W * .14, pad * 1.25); x.rotate(.06);
    x.shadowColor = 'rgba(0,0,0,.3)'; x.shadowBlur = 6; x.fillStyle = '#fff6b8'; x.fillRect(-W * .16, -W * .055, W * .32, W * .11); x.shadowBlur = 0;
    x.fillStyle = '#3a3200'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = `700 ${Math.round(W * .02)}px ${F.mono}`; setLS(x, 1.5); x.fillText(T('TU COPIA'), 0, -W * .025); setLS(x, 0);
    x.font = `800 ${Math.round(W * .036)}px ${F.saira}`; x.fillText(g.ach[1] > 0 ? T('{0} · {1}/{2} logros', fmtH(g.hours), g.ach[0], g.ach[1]) : T('{0} jugadas', fmtH(g.hours)), 0, W * .015);
    x.restore();
  }
  addGrain(x, W, H, rng(hash(g.id) + 5), 10);
  return c;
}

/* a real game's spine: plain and legible like a shop copy. Colour from the cover,
   a small square of the cover art under the platform band, the title big and high-contrast */
function spineColors(g) {
  const p = g.pal, light = lum(p[1]) > .58;
  const base = light ? mix(p[1], '#ffffff', .55) : mix(p[2], mix(p[1], '#000000', .45), .55);
  const ink = lum(base) > .5 ? '#141418' : '#f8f5ee';
  return { base, ink, light: lum(base) > .5 };
}
function drawRealSpine(g) {
  const [W, H] = spineSize(g), c = mkCanvas(W, H), x = c.getContext('2d'), p = g.pal, r = rng(hash(g.id) + 11);
  /* the real spine: stood upright if the picture came lying down */
  const sp = artPart(g, 'spine');
  if (sp) {
    layArt(x, sp, g, 'spine', W, H);
    if (g.hours >= 40) wear(x, W, H, r, clamp(g.hours / 100, .4, 1));
    return c;
  }
  const { base, ink, light } = spineColors(g);
  x.fillStyle = lg(x, 0, 0, W, 0, [[0, mix(base, '#000000', .22)], [.18, base], [.82, base], [1, mix(base, '#000000', .22)]]); x.fillRect(0, 0, W, H);
  const wide = isWide(g), bandH = Math.round(W * (wide ? .26 : .78));
  const blue = g.fmt === 'bluray' || g.fmt === 'bdbox';
  x.fillStyle = blue ? '#1c56b8' : light ? '#18181c' : '#0b0b0d'; x.fillRect(0, 0, W, bandH);
  x.fillStyle = '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let ls = W * (wide ? .2 : .36); const lab = (g.video ? DIMS[g.fmt].label : g.plat || 'PC').toUpperCase(); x.font = `800 ${Math.round(ls)}px ${F.saira}`;
  while (x.measureText(lab).width > W * .84 && ls > 6) { ls *= .92; x.font = `800 ${Math.round(ls)}px ${F.saira}`; }
  x.fillText(lab, W / 2, bandH * .54);
  x.fillStyle = p[2]; x.fillRect(0, bandH, W, Math.max(2, W * .04));
  let top = bandH + Math.max(2, W * .04);
  const src = g.coverSmall || g.cover;
  if (src) { const sq = W; x.save(); x.beginPath(); x.rect(0, top, W, sq); x.clip(); coverFit(x, src, 0, top, W, sq, .5, .3); x.restore(); top += sq; x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, top - 2, W, 2); }
  const bottom = H - W * .9;
  x.save(); x.translate(W / 2, (top + bottom) / 2); x.rotate(-Math.PI / 2);
  const maxLenL = (bottom - top) * .9;
  if (g.logo && imgW(g.logo) > 0) {
    /* Extra Metadata Loader's clear logo, laid along the spine like on a shop copy */
    const lw = imgW(g.logo), lh = imgH(g.logo), sc = Math.min(maxLenL / lw, (W * .78) / lh);
    x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = W * .08; x.drawImage(g.logo, -lw * sc / 2, -lh * sc / 2, lw * sc, lh * sc); x.shadowBlur = 0; x.restore();
    x.fillStyle = hexA(ink, .75); x.font = `700 ${Math.round(W * (wide ? .1 : .24))}px ${F.mono}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(g.year ? String(g.year) : initials(g.dev || g.t), W / 2, H - W * .45);
    return c;
  }
  const text = g.t.toUpperCase(), maxLen = (bottom - top) * .92, maxH = W * (wide ? .34 : .66);
  let size = maxH; x.font = `800 ${Math.round(size)}px ${F.saira}`;
  while (x.measureText(text).width > maxLen && size > 7) { size *= .95; x.font = `800 ${Math.round(size)}px ${F.saira}`; }
  if (x.measureText(text).width > maxLen && text.includes(' ') && g.fmt !== 'jewel') {
    /* very long titles go on two lines rather than shrinking to nothing */
    const words = text.split(' '); let best = null;
    for (let i = 1; i < words.length; i++) { const a = words.slice(0, i).join(' '), b2 = words.slice(i).join(' '), m = Math.max(x.measureText(a).width, x.measureText(b2).width); if (!best || m < best.m) best = { a, b: b2, m }; }
    size = W * .4; x.font = `800 ${Math.round(size)}px ${F.saira}`;
    while (Math.max(x.measureText(best.a).width, x.measureText(best.b).width) > maxLen && size > 6) { size *= .95; x.font = `800 ${Math.round(size)}px ${F.saira}`; }
    x.fillStyle = ink; x.textBaseline = 'middle'; x.fillText(best.a, 0, -size * .5); x.fillText(best.b, 0, size * .52);
  } else { x.fillStyle = ink; x.textBaseline = 'middle'; x.fillText(text, 0, size * .04); }
  x.restore();
  x.fillStyle = hexA(ink, .75); x.font = `700 ${Math.round(W * (wide ? .1 : .24))}px ${F.mono}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(g.year ? String(g.year) : initials(g.dev || g.t), W / 2, H - W * .45);
  if (g.hours >= 40) wear(x, W, H, r, clamp(g.hours / 100, .4, 1));
  return c;
}
function drawSpine(g) {
  if (g.music) return musicSpine(g);
  if (g.real) return drawRealSpine(g);
  const [W, H] = spineSize(g), c = mkCanvas(W, H), x = c.getContext('2d'), p = g.pal, r = rng(hash(g.id) + 11);
  const base = g.spine || p[0], ink = g.scol || p[4];
  x.fillStyle = lg(x, 0, 0, W, 0, [[0, mix(base, '#000000', .3)], [.5, base], [1, mix(base, '#000000', .3)]]); x.fillRect(0, 0, W, H);
  const wide = isWide(g);
  if (wide) { x.globalAlpha = .35; x.save(); x.translate(W, 0); x.rotate(Math.PI / 2); const a = mkCanvas(H, W), ax = a.getContext('2d'); drawArt(ax, H, W, g, 5); x.drawImage(a, 0, 0); x.restore(); x.globalAlpha = 1; x.fillStyle = hexA(base, .55); x.fillRect(0, 0, W, H); }
  const bandH = wide ? H * .1 : H * .08;
  const light = isClear(g);
  x.fillStyle = light ? '#ece8df' : '#0e0e12'; x.fillRect(0, 0, W, bandH);
  x.fillStyle = p[2]; x.fillRect(0, bandH, W, Math.max(3, H * .006));
  x.fillStyle = light ? '#16161a' : '#ffffff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `800 ${Math.round(wide ? W * .2 : W * .38)}px ${F.saira}`; x.fillText(DIMS[g.fmt].short, W / 2, bandH * .52);
  x.save(); x.translate(W / 2, H * .55); x.rotate(-Math.PI / 2);
  const text = titleText(g), maxLen = H * .66, maxH = W * (wide ? .36 : g.font === 'press' ? .3 : .64);
  let size = maxH; x.font = titleFont(g, size);
  while (x.measureText(text).width > maxLen && size > 6) { size *= .95; x.font = titleFont(g, size); }
  x.fillStyle = ink; x.textBaseline = 'middle';
  if (g.font === 'bungee' || g.font === 'press') { x.strokeStyle = 'rgba(0,0,0,.45)'; x.lineWidth = size * .12; x.lineJoin = 'round'; x.strokeText(text, 0, wide ? -W * .1 : 0); }
  x.fillText(text, 0, wide ? -W * .1 : 0);
  if (wide) { x.font = `700 ${Math.round(W * .1)}px ${F.fig}`; x.globalAlpha = .9; x.fillText(g.tag.toUpperCase(), 0, W * .2); x.globalAlpha = 1; }
  x.restore();
  const by = H * .935;
  x.strokeStyle = hexA(ink, .8); x.lineWidth = Math.max(2, W * .04); x.beginPath(); x.arc(W / 2, by - W * .45, W * .2, 0, 7); x.stroke();
  x.fillStyle = hexA(ink, .8); x.beginPath(); x.arc(W / 2, by - W * .45, W * .05, 0, 7); x.fill();
  x.font = `700 ${Math.round(W * (wide ? .12 : .25))}px ${F.mono}`; x.fillText(initials(g.dev), W / 2, by + W * .05);
  if (g.hours >= 40) wear(x, W, H, r, clamp(g.hours / 100, .4, 1));
  addGrain(x, W, H, r, 12);
  return c;
}

function drawDisc(g, coverCanvas) {
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), p = g.pal, R = S / 2;
  /* the real disc, scanned or photographed: it fills the label */
  const dk = artPic(g, 'disc'); if (dk) { x.save(); x.beginPath(); x.arc(R, R, R, 0, 7); x.clip(); layArt(x, dk, g, 'disc', S, S); x.restore(); return c; }
  x.save(); x.beginPath(); x.arc(R, R, R, 0, 7); x.clip();
  if (g.real) { if (coverCanvas) coverFit(x, coverCanvas, 0, 0, S, S, .5, .3); else placeholderArt(x, S, S, g); }
  else { const art = mkCanvas(S, S), ax = art.getContext('2d'); drawArt(ax, S, S, g, 2); gradeArt(ax, S, S, rng(hash(g.id) + 9)); x.drawImage(art, 0, 0); }
  x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, 0, S, S);
  x.lineWidth = S * .07; x.strokeStyle = hexA(p[0], .85); x.beginPath(); x.arc(R, R, R - S * .035, 0, 7); x.stroke();
  x.fillStyle = '#ffffff'; x.font = `700 ${Math.round(S * .024)}px ${F.mono}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  const ring = `MYVLIBRARY · ${fmtLabel(g).toUpperCase()} · ${T('DISCO 1 DE 1')} · ${(g.dev || g.t).toUpperCase()} · ${T('NO COPIAR')} · `;
  let ang = -Math.PI / 2; for (const ch2 of (ring + ring).slice(0, 120)) { const w = x.measureText(ch2).width; ang += (w / (R - S * .035)) * .5; x.save(); x.translate(R + Math.cos(ang) * (R - S * .035), R + Math.sin(ang) * (R - S * .035)); x.rotate(ang + Math.PI / 2); x.fillText(ch2, 0, 0); x.restore(); ang += (w / (R - S * .035)) * .5 + .004; if (ang > Math.PI * 1.5 - .05) break; }
  let ts = S * .1; x.font = titleFont(g, ts); while (x.measureText(titleText(g)).width > S * .62 && ts > 12) { ts *= .94; x.font = titleFont(g, ts); }
  x.shadowColor = 'rgba(0,0,0,.7)'; x.shadowBlur = 10; x.fillStyle = p[4]; x.textBaseline = 'middle';
  x.fillText(titleText(g), R, R - S * .23); x.shadowBlur = 0;
  x.font = `700 ${Math.round(S * .026)}px ${F.mono}`; x.fillStyle = 'rgba(255,255,255,.9)'; x.fillText(T('DISCO 1'), R, R + S * .2);
  x.fillStyle = rg(x, R, R, S * .06, S * .14, [[0, 'rgba(225,230,238,.95)'], [.6, 'rgba(190,198,210,.9)'], [1, 'rgba(160,170,184,.0)']]); x.beginPath(); x.arc(R, R, S * .14, 0, 7); x.fill();
  x.strokeStyle = 'rgba(255,255,255,.6)'; x.lineWidth = 1.5; [.08, .1, .12].forEach(k => { x.beginPath(); x.arc(R, R, S * k, 0, 7); x.stroke(); });
  x.restore();
  return c;
}
/* the art a small label uses: the real cover, or the demo's own painting */
function labelArt(x, g, coverCanvas, X, Y, W, H, seed, fy = .3) {
  if (g.real) { const src = g.cover || g.coverSmall || coverCanvas; if (src) coverFit(x, src, X, Y, W, H, .5, fy); else { x.save(); x.translate(X, Y); placeholderArt(x, W, H, g); x.restore(); } return; }
  const a = mkCanvas(Math.round(W), Math.round(H)), ax = a.getContext('2d'); drawArt(ax, a.width, a.height, g, seed); gradeArt(ax, a.width, a.height, rng(hash(g.id) + seed)); x.drawImage(a, X, Y, W, H);
}
/* a 3½" disk label: paper, a coloured band with the title, a thumbnail of the cover and the disk number */
function drawFloppyLabel(g, coverCanvas, i, n) {
  const W = 512, H = 398, c = mkCanvas(W, H), x = c.getContext('2d'), acc = inkAccent(g), r = rng(hash(g.id) + 70 + i);
  x.fillStyle = '#f3efe4'; x.fillRect(0, 0, W, H);
  for (let k = 0; k < 900; k++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '120,100,70'},${r() * .06})`; x.fillRect(r() * W, r() * H, 2, 2); }
  const bh = H * .27; x.fillStyle = acc; x.fillRect(0, 0, W, bh);
  x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, bh - 5, W, 2);
  let ts = bh * .56; x.font = `800 ${Math.round(ts)}px ${F.saira}`; const tt = g.t.toUpperCase();
  while (x.measureText(tt).width > W * .9 && ts > 14) { ts *= .94; x.font = `800 ${Math.round(ts)}px ${F.saira}`; }
  x.fillStyle = '#ffffff'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(tt, W * .05, bh * .52);
  const th = H * .52, ty = bh + H * .08;
  x.save(); x.beginPath(); x.rect(W * .05, ty, th, th); x.clip(); labelArt(x, g, coverCanvas, W * .05, ty, th, th, 3); x.restore();
  x.strokeStyle = 'rgba(0,0,0,.25)'; x.lineWidth = 2; x.strokeRect(W * .05, ty, th, th);
  const tx = W * .05 + th + W * .05, room = W * .95 - tx, num = T('DISCO {0} DE {1}', i + 1, n); x.fillStyle = '#1b1a1f';
  let ns = H * .13; x.font = `800 ${Math.round(ns)}px ${F.saira}`; while (x.measureText(num).width > room && ns > 12) { ns *= .94; x.font = `800 ${Math.round(ns)}px ${F.saira}`; }
  x.fillText(num, tx, ty + H * .07);
  x.fillStyle = acc; x.font = `700 ${Math.round(H * .055)}px ${F.mono}`; setLS(x, 1.5);
  x.fillText(T(i === 0 ? 'INSTALACIÓN' : i === n - 1 ? 'DATOS' : 'PROGRAMA'), tx, ty + H * .18); setLS(x, 0);
  x.fillStyle = '#4a463e'; x.font = `600 ${Math.round(H * .05)}px ${F.fig}`;
  x.fillText((g.dev || '').toUpperCase().slice(0, 22), tx, ty + H * .29); x.fillText(`${g.year ? '© ' + g.year + ' · ' : ''}3½" · 1,44 MB`, tx, ty + H * .37);
  x.fillStyle = '#8a8478'; x.font = `500 ${Math.round(H * .04)}px ${F.mono}`; x.fillText('MYV-' + String(hash(g.id) % 100000).padStart(5, '0') + '-' + (i + 1), tx, ty + H * .46);
  return c;
}
/* a cartridge label: the art edge to edge, a dark band on top and the title along the foot */
function drawCartLabel(g, coverCanvas) {
  const W = 512, H = 266, c = mkCanvas(W, H), x = c.getContext('2d');
  const lab = artPic(g, 'disc'); if (lab) { layArt(x, lab, g, 'disc', W, H); return c; }
  labelArt(x, g, coverCanvas, 0, 0, W, H, 4, .25);
  const tb = H * .17; x.fillStyle = '#141418'; x.fillRect(0, 0, W, tb);
  ['#d83a3a', '#e3a02f', '#3aa655', '#3a7bd5'].forEach((cl, i) => { x.fillStyle = cl; x.fillRect(0, tb + i * 3, W, 3); });
  x.fillStyle = '#ffffff'; x.textBaseline = 'middle'; x.textAlign = 'left'; x.font = `800 ${Math.round(tb * .6)}px ${F.saira}`; setLS(x, 2); x.fillText('MYVLIBRARY', W * .04, tb * .54);
  x.textAlign = 'right'; x.font = `700 ${Math.round(tb * .42)}px ${F.mono}`; x.fillText('16 BIT', W * .96, tb * .54); setLS(x, 0);
  x.fillStyle = lg(x, 0, H * .55, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,.78)']]); x.fillRect(0, H * .55, W, H * .45);
  let ts = H * .2; x.font = titleFont(g, ts); while (x.measureText(titleText(g)).width > W * .9 && ts > 10) { ts *= .94; x.font = titleFont(g, ts); }
  x.textAlign = 'center'; x.shadowColor = 'rgba(0,0,0,.8)'; x.shadowBlur = 8; x.fillStyle = g.pal[4]; x.fillText(titleText(g), W / 2, H * .82); x.shadowBlur = 0;
  return c;
}
function drawMediaLabel(g, coverCanvas) { if (g.music) return musicLabel(g, coverCanvas); if (g.video) return drawVideoLabel(g, coverCanvas, g.ep || null); const m = mediaOf(g); return m === 'floppy' ? drawFloppyLabel(g, coverCanvas, 0, DIMS.floppy.disks) : m === 'cart' ? drawCartLabel(g, coverCanvas) : drawDisc(g, coverCanvas); }
/* the manual's band: on by default, the player may take it off in the framing window */
function manualBand(g) {
  if (manualScan(g)) return false;
  const s = FIT.open && FIT.g === g && FIT.st.manual, f = s || (g.scanFit && g.scanFit.manual && g.scanFit.manual.s === fitSrc(g, 'manual') ? g.scanFit.manual : null);
  return !f || f.b !== 0;
}
function manualSize(g, band) { const W = 300, H = Math.round(300 * DIMS[g.fmt].man[1] / DIMS[g.fmt].man[0]); return [W, band ? Math.round(H * .72) : H, H]; }
function drawManualCover(g, coverCanvas) {
  const [W, ih0, H] = manualSize(g, true), c = mkCanvas(W, H), x = c.getContext('2d');
  /* a scan of the real manual, as printed */
  const scan = manualScan(g); if (scan) { layArt(x, scan, g, 'manual', W, H); return c; }
  const band = manualBand(g), ih = band ? ih0 : H;
  x.fillStyle = '#f3eee3'; x.fillRect(0, 0, W, H);
  /* the front's picture, as the player framed it on the manual, or whole over a blurred copy of itself */
  const src = g.real ? facePic(g, 'manual') : null, f = src && artFit(g, 'manual', W / ih);
  if (f) artCrop(x, turned(src, f.r), f.c, 0, 0, W, ih);
  else {
    const cw = coverCanvas.width, ch = coverCanvas.height, sc = Math.max(W / cw, ih / ch), sf = Math.min(W / cw, ih / ch);
    if ('filter' in x) x.filter = 'blur(6px) brightness(.7)';
    x.drawImage(coverCanvas, (W - cw * sc) / 2, (ih - ch * sc) / 2, cw * sc, ch * sc); x.filter = 'none';
    x.drawImage(coverCanvas, (W - cw * sf) / 2, (ih - ch * sf) / 2, cw * sf, ch * sf);
  }
  if (!band) return c;
  x.fillStyle = inkAccent(g); x.fillRect(0, ih, W, H - ih);
  x.fillStyle = '#ffffff'; x.textAlign = 'left'; x.textBaseline = 'top';
  x.font = `700 ${Math.round(W * .045)}px ${F.mono}`; setLS(x, 2); x.fillText(T('MANUAL DE INSTRUCCIONES'), W * .07, ih + H * .05); setLS(x, 0);
  let ts = W * .12; x.font = `800 ${Math.round(ts)}px ${F.saira}`; while (x.measureText(g.t.toUpperCase()).width > W * .86 && ts > 10) { ts *= .94; x.font = `800 ${Math.round(ts)}px ${F.saira}`; }
  x.fillText(g.t.toUpperCase(), W * .07, ih + H * .11);
  return c;
}

/* ---------- shared surfaces ---------- */
function speckle(x, w, h, r, n, a0, a1) { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(255,255,255,${a0 + r() * (a1 - a0)})`; const s = r() < .88 ? 1 + r() : 2 + r() * 3; x.fillRect(r() * w, r() * h, s, s); } }
function fibers(x, w, h, r, n) { x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1; for (let i = 0; i < n; i++) { const sx = r() * w, sy = r() * h, l = 10 + r() * 30; x.beginPath(); x.moveTo(sx, sy); x.bezierCurveTo(sx + (r() - .5) * l, sy + (r() - .5) * l, sx + (r() - .5) * l, sy + (r() - .5) * l, sx + (r() - .5) * l, sy + (r() - .5) * l); x.stroke(); } }
/* dust film for covers: soft blotches, specks and a few hairs */
function makeFilmCanvas(w, h, seed) {
  const c = mkCanvas(w, h), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = 'rgba(255,255,255,.62)'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) { x.fillStyle = `rgba(255,255,255,${.06 + r() * .16})`; x.beginPath(); x.ellipse(r() * w, r() * h, w * (.05 + r() * .22), h * (.03 + r() * .12), r() * 3, 0, 7); x.fill(); }
  speckle(x, w, h, r, w * h / 110, .2, .6); fibers(x, w, h, r, 9);
  return c;
}
/* spine: dust settles more near the top edge */
function makeSpineDustCanvas() {
  const w = 64, h = 512, c = mkCanvas(w, h), x = c.getContext('2d'), r = rng(31);
  x.fillStyle = lg(x, 0, 0, 0, h, [[0, 'rgba(255,255,255,.95)'], [.07, 'rgba(255,255,255,.7)'], [.3, 'rgba(255,255,255,.48)'], [1, 'rgba(255,255,255,.36)']]); x.fillRect(0, 0, w, h);
  speckle(x, w, h, r, 900, .4, 1); fibers(x, w, h, r, 6);
  return c;
}
function makeTopDustCanvas() {
  const w = 256, h = 64, c = mkCanvas(w, h), x = c.getContext('2d'), r = rng(32);
  x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${.5 + r() * .5})`; x.beginPath(); x.arc(r() * w, r() * h, 2 + r() * 6, 0, 7); x.fill(); }
  speckle(x, w, h, r, 700, .5, 1);
  return c;
}
/* dust left on the shelf around a case, with the clean footprint where it stands */
function makeFootCanvas(cu, cv) {
  const w = 128, h = 256, c = mkCanvas(w, h), x = c.getContext('2d'), r = rng(33 + Math.round(cu * 100));
  x.fillStyle = 'rgba(255,255,255,.8)'; x.fillRect(0, 0, w, h); speckle(x, w, h, r, 1600, .3, 1);
  x.fillStyle = lg(x, 0, 0, w, 0, [[0, 'rgba(255,255,255,0)'], [.12, 'rgba(255,255,255,1)'], [.88, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
  x.globalCompositeOperation = 'destination-in'; x.fillRect(0, 0, w, h);
  x.fillStyle = lg(x, 0, 0, 0, h, [[0, 'rgba(255,255,255,0)'], [.08, 'rgba(255,255,255,1)'], [.92, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.shadowColor = '#000'; x.shadowBlur = 4;
  x.fillRect(w * (1 - cu) / 2, h * (1 - cv) / 2, w * cu, h * cv);
  return c;
}
function makeWebCanvas() {
  const S = 256, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(34);
  x.strokeStyle = 'rgba(255,255,255,.75)'; x.lineWidth = 1.1;
  const ax = 6, ay = 6, spokes = 9, ang = [];
  for (let i = 0; i < spokes; i++) { const a = (i / (spokes - 1)) * Math.PI / 2 + (r() - .5) * .08; ang.push(a); x.beginPath(); x.moveTo(ax, ay); x.lineTo(ax + Math.cos(a) * S * 1.3, ay + Math.sin(a) * S * 1.3); x.stroke(); }
  for (let k = 1; k < 13; k++) { const R = k * S / 11 + r() * 6; x.beginPath(); ang.forEach((a, i) => { const px = ax + Math.cos(a) * R, py = ay + Math.sin(a) * R; if (i === 0) x.moveTo(px, py); else x.quadraticCurveTo(ax + Math.cos(a - .09) * R * .93, ay + Math.sin(a - .09) * R * .93, px, py); }); x.globalAlpha = .45 + r() * .4; x.stroke(); }
  x.globalAlpha = .5; for (let i = 0; i < 5; i++) { const sx = r() * S, sy = r() * S * .5; x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(sx + 10, sy + 40, sx + (r() - .5) * 20, sy + 90); x.stroke(); }
  return c;
}
function makeGrainCanvas(seed, n = 256, base = 128, amp = 50) {
  const c = mkCanvas(n, n), x = c.getContext('2d'), r = rng(seed), img = x.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = base + (r() - .5) * amp * 2; img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0); return c;
}
function makeCrinkleCanvas() {
  const c = mkCanvas(256, 360), x = c.getContext('2d'), r = rng(35);
  x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 360);
  for (let i = 0; i < 50; i++) { x.strokeStyle = r() > .5 ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.3)'; x.lineWidth = 1 + r() * 4; x.beginPath(); const sx = r() * 256; x.moveTo(sx, -10); x.bezierCurveTo(sx + (r() - .5) * 90, 120, sx + (r() - .5) * 90, 240, sx + (r() - .5) * 60, 370); x.stroke(); }
  for (let i = 0; i < 18; i++) { x.strokeStyle = 'rgba(255,255,255,.25)'; x.lineWidth = 1; x.beginPath(); const sy = r() * 360; x.moveTo(0, sy); x.lineTo(256, sy + (r() - .5) * 40); x.stroke(); }
  return c;
}
function makeSealStickerCanvas() {
  const c = mkCanvas(128, 128), x = c.getContext('2d');
  x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(64, 64, 60, 0, 7); x.fill();
  x.strokeStyle = 'rgba(42,26,5,.5)'; x.lineWidth = 3; x.beginPath(); x.arc(64, 64, 50, 0, 7); x.stroke();
  x.fillStyle = '#2a1a05'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `800 34px ${F.saira}`; x.fillText(T('NUEVO'), 64, 56); x.font = `700 12px ${F.mono}`; x.fillText(T('PRECINTADO'), 64, 84);
  return c;
}
function makeTabCanvas() {
  const c = mkCanvas(96, 72), x = c.getContext('2d');
  x.fillStyle = '#d4202c'; x.fillRect(0, 0, 96, 72); x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(0, 0, 96, 8);
  x.fillStyle = '#ffffff'; x.font = `800 18px ${F.saira}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(T('TIRAR'), 48, 30);
  x.beginPath(); x.moveTo(30, 52); x.lineTo(66, 52); x.lineTo(58, 44); x.moveTo(66, 52); x.lineTo(58, 60); x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke();
  return c;
}
function makePlaqueCanvas(label, count) {
  const W = 640, H = 136, c = mkCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = lg(x, 0, 0, 0, H, [[0, '#f3ead6'], [1, '#e2d5ba']]); x.fillRect(0, 0, W, H);
  x.strokeStyle = '#8a6a3a'; x.lineWidth = 6; x.strokeRect(8, 8, W - 16, H - 16); x.lineWidth = 2; x.strokeRect(18, 18, W - 36, H - 36);
  x.fillStyle = '#231d18'; x.textAlign = 'center'; x.textBaseline = 'middle';
  let fs = 62; x.font = `800 ${fs}px ${F.saira}`; while (x.measureText(label.toUpperCase()).width > W - 90 && fs > 26) { fs -= 2; x.font = `800 ${fs}px ${F.saira}`; }
  x.fillText(label.toUpperCase(), W / 2, H * .44);
  x.font = `700 20px ${F.mono}`; x.fillStyle = '#6d5a40'; x.fillText(T(count === 1 ? '{0} JUEGO' : '{0} JUEGOS', count), W / 2, H * .78);
  return c;
}
function makeWindowCanvas(kind) {
  const c = mkCanvas(400, 520), x = c.getContext('2d'), r = rng(99);
  const sky = kind === 'day' ? [[0, '#6fa8e8'], [.7, '#b8d8f5'], [1, '#e8eef2']] : kind === 'dusk' ? [[0, '#3a3f7a'], [.5, '#c46a6a'], [1, '#ffb36b']] : [[0, '#0b1230'], [.7, '#24305e'], [1, '#4a3a6a']];
  x.fillStyle = lg(x, 0, 0, 0, 520, sky); x.fillRect(0, 0, 400, 520);
  if (kind === 'night') { stars(x, 400, 300, r, 60, '#ffffff', 1.2); x.fillStyle = '#f2ead8'; x.beginPath(); x.arc(300, 90, 26, 0, 7); x.fill(); }
  if (kind === 'day') { x.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 5; i++) { const cx = r() * 400, cy = 60 + r() * 180; for (let k = 0; k < 5; k++) { x.beginPath(); x.arc(cx + k * 18, cy + (k % 2) * 8, 18 + r() * 10, 0, 7); x.fill(); } } }
  if (kind === 'dusk') { x.fillStyle = 'rgba(255,214,150,.9)'; x.beginPath(); x.arc(110, 330, 40, 0, 7); x.fill(); }
  x.fillStyle = kind === 'day' ? '#8a97a8' : kind === 'dusk' ? '#3b2c3e' : '#0a0d1d'; let xx = 0; while (xx < 400) { const bw = 30 + r() * 50, bh = 80 + r() * 160; x.fillRect(xx, 520 - bh, bw, bh); xx += bw + 4; }
  if (kind !== 'day') { x.fillStyle = 'rgba(255,214,140,.75)'; for (let i = 0; i < 90; i++) x.fillRect(r() * 400, 360 + r() * 160, 3, 4); }
  return c;
}
function makeTrayCanvas(fmt) {
  const d = DIMS[fmt], W = 512, H = Math.round(512 * d.h / d.w);
  if (fmt === 'lp' || fmt === 'cass') return musicTray(fmt, W, H);
  const c = mkCanvas(W, H), x = c.getContext('2d');
  const cx = W * (.5 + d.discX / d.w), cy = H / 2, R = d.discR / d.w * W;
  if (fmt === 'big') {
    x.fillStyle = '#d9c9a8'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(90,70,40,.18)'; for (let i = 0; i < 40; i++) { x.beginPath(); x.moveTo(0, i * H / 40); x.lineTo(W, i * H / 40 + 6); x.stroke(); }
    x.fillStyle = '#5a4528'; x.font = `800 26px ${F.saira}`; x.textAlign = 'center'; x.fillText(T('GRACIAS POR JUGAR'), W / 2, H * .07);
    x.font = `600 15px ${F.fig}`; x.fillText(T('Guarda el disco aquí cuando no lo uses.'), W / 2, H * .935);
    x.fillStyle = 'rgba(60,40,20,.25)'; x.beginPath(); x.arc(cx, cy, R * 1.04, 0, 7); x.fill();
  } else if (fmt === 'floppy' || fmt === 'cart') {
    /* card insert: kraft, a printed card on top and the dent the media leaves */
    const r = rng(fmt === 'cart' ? 61 : 62), k = W / d.w, px = X => (X + d.w / 2) * k, py = Y => (d.h / 2 - Y) * k;
    x.fillStyle = fmt === 'cart' ? '#cfc3a6' : '#d6c7a4'; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,250,235' : '90,70,40'},${r() * .08})`; x.fillRect(r() * W, r() * H, 1 + r() * 2, 1); }
    x.strokeStyle = 'rgba(90,70,40,.16)'; for (let i = 0; i < 30; i++) { x.beginPath(); x.moveTo(0, i * H / 30); x.lineTo(W, i * H / 30 + 5); x.stroke(); }
    x.fillStyle = '#5a4528'; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
    if (fmt === 'floppy') {
      const m = MSIZE.floppy, top = py(m.h / 2 - d.h * .1) - 18;
      rr(x, W * .07, H * .035, W * .86, top - H * .05, 10); x.fillStyle = '#f2ead6'; x.fill(); x.strokeStyle = 'rgba(90,70,40,.35)'; x.lineWidth = 2; x.stroke();
      x.fillStyle = '#3d2f1b'; x.font = `800 30px ${F.saira}`; x.fillText(T('INSTALACIÓN'), W / 2, H * .035 + 40);
      x.textAlign = 'left'; x.font = `600 17px ${F.fig}`;
      [T('1. Enciende el equipo con la unidad A: vacía.'), T('2. Mete el disco 1 y escribe A:\\INSTALAR'), T('3. Cambia de disco cuando te lo pida.'), T('4. Guarda los discos lejos de imanes.')].forEach((l, i) => x.fillText(l, W * .11, H * .035 + 74 + i * 26));
      x.fillStyle = 'rgba(60,40,20,.28)'; x.filter = 'blur(6px)'; x.fillRect(px(-m.w / 2 + .6) - 4, py(m.h / 2 - d.h * .1) - 4, m.w * k + 40, m.h * k + 30); x.filter = 'none';
    } else {
      const m = MSIZE.cart, X0 = px(-m.w / 2) - 8, Y0 = py(m.h / 2 - d.h * .13) - 8, w = m.w * k + 16, h = m.h * k + 16;
      x.fillStyle = 'rgba(40,28,14,.42)'; rr(x, X0, Y0, w, h, 16); x.fill();
      x.strokeStyle = 'rgba(255,250,235,.35)'; x.lineWidth = 2; rr(x, X0 - 4, Y0 - 4, w + 8, h + 8, 18); x.stroke();
      x.fillStyle = '#5a4528'; x.font = `800 26px ${F.saira}`; x.fillText(T('GRACIAS POR JUGAR'), W / 2, H * .08);
      x.font = `600 15px ${F.fig}`; x.fillText(T('Guarda el cartucho aquí cuando no lo uses.'), W / 2, H * .13);
    }
    x.textAlign = 'center'; x.fillStyle = '#5a4528'; x.font = `700 13px ${F.mono}`; x.fillText('MYVLIBRARY', W / 2, H * .965);
  } else if (d.video) {
    /* video: a VHS clamshell with the ribs that hold the tape, or a DVD/Blu-ray tray with one hub or two */
    const blue = fmt === 'bluray' || fmt === 'bdbox';
    x.fillStyle = blue ? '#173f8a' : '#141518'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 3; rr(x, 14, 14, W - 28, H - 28, 18); x.stroke();
    if (d.media === 'tape') { x.fillStyle = '#0c0c0e'; const k = W / d.w; rr(x, W / 2 - MSIZE.tape.h / 2 * k - 6, H / 2 - MSIZE.tape.w / 2 * k - 6, MSIZE.tape.h * k + 12, MSIZE.tape.w * k + 12, 10); x.fill(); [.2, .8].forEach(v => { x.fillStyle = '#26272c'; x.fillRect(W * .12, H * v, W * .76, 8); }); }
    else (d.multi ? [-3.6, 3.6] : [0]).forEach(dy => {
      const yy = cy + dy / d.h * H;
      x.fillStyle = blue ? '#123374' : '#0f1013'; x.beginPath(); x.arc(cx, yy, R * 1.03, 0, 7); x.fill();
      x.fillStyle = blue ? '#2a5bb8' : '#2a2c32'; x.beginPath(); x.arc(cx, yy, R * .24, 0, 7); x.fill();
    });
    x.fillStyle = 'rgba(255,255,255,.18)'; x.font = `700 13px ${F.mono}`; x.textAlign = 'center'; x.fillText('MYVLIBRARY', W / 2, H - 30);
  } else {
    const dark = fmt === 'dvd' || fmt === 'bigjewel';
    x.fillStyle = dark ? '#18191d' : '#9aa3ad'; x.fillRect(0, 0, W, H);
    x.strokeStyle = dark ? 'rgba(255,255,255,.06)' : 'rgba(255,255,255,.25)'; x.lineWidth = 3; rr(x, 14, 14, W - 28, H - 28, 18); x.stroke();
    x.fillStyle = dark ? '#111215' : '#8a939e'; x.beginPath(); x.arc(cx, cy, R * 1.03, 0, 7); x.fill();
    if (fmt !== 'dvd') for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; x.strokeStyle = dark ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.25)'; x.beginPath(); x.moveTo(cx + Math.cos(a) * R * .2, cy + Math.sin(a) * R * .2); x.lineTo(cx + Math.cos(a) * R * .95, cy + Math.sin(a) * R * .95); x.stroke(); }
    x.fillStyle = dark ? '#2a2c32' : '#b8c0c9'; x.beginPath(); x.arc(cx, cy, R * .24, 0, 7); x.fill();
    x.fillStyle = dark ? 'rgba(255,255,255,.2)' : 'rgba(0,0,0,.25)'; x.font = `700 13px ${F.mono}`; x.textAlign = 'center'; x.fillText('MYVLIBRARY', cx, H - 40);
  }
  return c;
}
function makeLidCanvas(fmt) {
  const d = DIMS[fmt], W = 512, H = Math.round(512 * d.h / d.w);
  if (fmt === 'lp' || fmt === 'cass') return musicLid(fmt, W, H);
  const c = mkCanvas(W, H), x = c.getContext('2d');
  if (d.shell === 'card') { x.fillStyle = fmt === 'big' ? '#e4d6b8' : '#ddd0b0'; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(90,70,40,.12)'; for (let i = 0; i < 30; i++) x.fillRect(0, i * H / 30, W, 2); }
  else if (d.video) {
    /* video cases: black (VHS, DVD) or Blu-ray blue, the multi-disc ones with two hubs on the lid side */
    const blue = fmt === 'bluray' || fmt === 'bdbox'; x.fillStyle = blue ? '#163f8c' : '#18191d'; x.fillRect(0, 0, W, H);
    x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 3; rr(x, 14, 14, W - 28, H - 28, 18); x.stroke();
    if (d.multi) { const R = d.discR / d.w * W; [-1, 1].forEach(s => { x.fillStyle = blue ? '#123374' : '#121317'; x.beginPath(); x.arc(W * (.5 - d.discX / d.w), H / 2 + s * 3.6 / d.h * H, R * 1.03, 0, 7); x.fill(); }); }
  }
  else { const dark = fmt === 'dvd'; x.fillStyle = dark ? '#1b1c21' : '#a7afb9'; x.fillRect(0, 0, W, H); x.fillStyle = dark ? '#26282e' : '#c3cad2'; [[.06, .1], [.06, .82]].forEach(([u, v]) => { rr(x, W * u, H * v, W * .05, H * .08, 6); x.fill(); }); x.strokeStyle = dark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.3)'; x.lineWidth = 3; rr(x, 14, 14, W - 28, H - 28, 18); x.stroke(); }
  return c;
}
function makeRainbowCanvas() {
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), R = S / 2;
  x.fillStyle = '#cfd5de'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 360; i++) { const a0 = i / 360 * Math.PI * 2, a1 = (i + 1.5) / 360 * Math.PI * 2; x.fillStyle = `hsla(${(i * 2) % 360},70%,72%,.55)`; x.beginPath(); x.moveTo(R, R); x.arc(R, R, R, a0, a1); x.closePath(); x.fill(); }
  x.fillStyle = rg(x, R, R, R * .1, R, [[0, 'rgba(235,240,246,.9)'], [.35, 'rgba(235,240,246,.15)'], [1, 'rgba(235,240,246,.35)']]); x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(255,255,255,.45)'; for (let k = .26; k < 1; k += .012) { x.lineWidth = .7; x.beginPath(); x.arc(R, R, R * k, 0, 7); x.stroke(); }
  return c;
}
function makeWoodCanvas(w, h, base, seed, planks) {
  const c = mkCanvas(w, h), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  const ph = planks ? h / planks : h;
  for (let pl = 0; pl < (planks || 1); pl++) {
    const y0 = pl * ph; x.fillStyle = hexA(mix(base, r() > .5 ? '#000000' : '#ffffff', .08 + r() * .08), 1); x.fillRect(0, y0, w, ph);
    for (let i = 0; i < 60; i++) { x.strokeStyle = `rgba(40,20,8,${.04 + r() * .1})`; x.lineWidth = .6 + r() * 1.6; const yy = y0 + r() * ph; x.beginPath(); x.moveTo(0, yy); for (let u = 0; u <= w; u += w / 16) x.lineTo(u, yy + Math.sin(u * .02 + i) * (1 + r() * 2)); x.stroke(); }
    if (planks) { x.fillStyle = 'rgba(20,10,4,.45)'; x.fillRect(0, y0, w, 2); const cut = r() * w; x.fillRect(cut, y0, 2, ph); }
  }
  return c;
}
