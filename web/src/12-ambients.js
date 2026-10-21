
/* =====================================================================
   AMBIENTS: the same room dressed in different ways (wall, wood, runner,
   light and a few props). Textures exist only for the active one.
   ===================================================================== */
const RT = {}, KEEP = new WeakSet();
function rtex(key, make, rep, data) { if (!RT[key]) { const c = make(); RT[key] = data ? dataTex(c, rep) : tex(c, rep); KEEP.add(RT[key]); } return RT[key]; }
function freeRT() { for (const k in RT) { RT[k].dispose(); delete RT[k]; } }

/* ---------- surfaces ---------- */
function makePaint(base, seed, blot = .035) {
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  /* soft roller marks: blurred, and drawn wrapped so the tiles never show a seam */
  if ('filter' in x) x.filter = 'blur(14px)';
  for (let i = 0; i < 70; i++) { const px = r() * S, py = r() * S, R = 14 + r() * 60; x.fillStyle = r() > .5 ? `rgba(255,255,255,${blot * r() * .8})` : `rgba(0,0,0,${blot * r()})`; for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { x.beginPath(); x.arc(px + ox, py + oy, R, 0, 7); x.fill(); } }
  if ('filter' in x) x.filter = 'none';
  const img = x.getImageData(0, 0, S, S), d = img.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - .5) * 9; d[i] += n; d[i + 1] += n; d[i + 2] += n; } x.putImageData(img, 0, 0);
  return c;
}
function makeBrick() {
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(51), bw = 64, bh = S / 22, gap = 3.6;
  x.fillStyle = '#b4ab9e'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 4000; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '60,50,40'},${r() * .12})`; x.fillRect(r() * S, r() * S, 2, 2); }
  const pal = ['#8e4a36', '#9c5340', '#7d3f2f', '#a3624a', '#6e3a2c', '#b07055', '#874633', '#94503b'], cols = {};
  for (let row = 0; row < 22; row++) {
    const off = (row % 2) * bw / 2;
    for (let col = -1; col < 8; col++) {
      const ci = ((col % 8) + 8) % 8, k = row * 8 + ci; if (!cols[k]) { const rr = rng(1000 + k); cols[k] = { c: pal[Math.floor(rr() * pal.length)], l: (rr() - .5) * .18, soot: rr() < .12, salt: rr() < .08, seed: k }; }
      const b = cols[k], bx = col * bw + off + gap / 2, by = row * bh + gap / 2, w = bw - gap, h = bh - gap;
      x.fillStyle = b.c; x.fillRect(bx, by, w, h);
      x.fillStyle = b.l > 0 ? `rgba(255,230,210,${b.l})` : `rgba(20,8,4,${-b.l})`; x.fillRect(bx, by, w, h);
      const rr = rng(2000 + b.seed);
      for (let i = 0; i < 60; i++) { x.fillStyle = `rgba(${rr() > .5 ? '30,12,6' : '255,220,190'},${rr() * .18})`; x.fillRect(bx + rr() * w, by + rr() * h, 1 + rr() * 3, 1 + rr() * 2); }
      if (b.soot) { x.fillStyle = 'rgba(20,14,12,.25)'; x.fillRect(bx, by, w, h); }
      if (b.salt) { x.fillStyle = 'rgba(235,228,215,.22)'; x.fillRect(bx + w * .2, by, w * .5, h); }
      x.strokeStyle = 'rgba(0,0,0,.18)'; x.lineWidth = 1.2; x.strokeRect(bx + .6, by + .6, w - 1.2, h - 1.2);
      x.fillStyle = 'rgba(255,240,225,.1)'; x.fillRect(bx, by, w, 1.5);
    }
  }
  return c;
}
function makeSlats() {
  const W = 512, H = 64, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(52), n = 12, p = W / n, sw = p * .66;
  x.fillStyle = '#0b0b0d'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(255,255,255,${r() * .03})`; x.fillRect(r() * W, r() * H, 1, 1); }
  for (let k = 0; k < n; k++) {
    const sx = k * p + (p - sw) / 2, t = (r() - .5) * .1;
    x.fillStyle = '#2e2620'; x.fillRect(sx, 0, sw, H);
    x.fillStyle = t > 0 ? `rgba(255,235,210,${t})` : `rgba(0,0,0,${-t})`; x.fillRect(sx, 0, sw, H);
    for (let g = 0; g < 9; g++) { x.fillStyle = `rgba(${r() > .5 ? '15,8,4' : '120,90,60'},${.08 + r() * .12})`; x.fillRect(sx + r() * sw, 0, .6 + r() * 1.2, H); }
    x.fillStyle = 'rgba(255,240,220,.1)'; x.fillRect(sx, 0, 1.2, H); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(sx + sw - 1.5, 0, 1.5, H);
  }
  return c;
}
function makeSlatwall() {
  const S = 256, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(53), n = 8, p = S / n;
  x.fillStyle = '#c3c9cf'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '40,50,60'},${r() * .05})`; x.fillRect(r() * S, r() * S, 1, 1); }
  for (let k = 0; k < n; k++) { const y = k * p + p * .62; x.fillStyle = 'rgba(25,30,36,.9)'; x.fillRect(0, y, S, p * .22); x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, y - 2, S, 2); x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(0, y + p * .22, S, 1.5); }
  return c;
}
function makeConcrete() {
  const S = 1024, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(54);
  x.fillStyle = '#8c8a85'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 140; i++) { x.fillStyle = r() > .5 ? `rgba(255,255,255,${r() * .05})` : `rgba(30,28,25,${r() * .06})`; x.beginPath(); x.ellipse(r() * S, r() * S, 30 + r() * 200, 20 + r() * 120, r() * 3, 0, 7); x.fill(); }
  x.strokeStyle = 'rgba(255,255,255,.035)'; for (let i = 0; i < 70; i++) { x.lineWidth = 6 + r() * 20; x.beginPath(); x.arc(r() * S, r() * S, 60 + r() * 140, r() * 6, r() * 6 + 1.2); x.stroke(); }
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() > .6 ? '255,255,255' : '20,18,16'},${r() * .14})`; x.fillRect(r() * S, r() * S, 1 + r() * 1.5, 1 + r() * 1.5); }
  x.fillStyle = 'rgba(20,18,16,.55)'; x.fillRect(0, 0, S, 2); x.fillRect(0, 0, 2, S); x.fillRect(0, S / 2, S, 1.5); x.fillRect(S / 2, 0, 1.5, S);
  return c;
}
function makeCarpet() {
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(55), t = S / 2;
  [[0, 0], [t, t]].forEach(([a, b]) => { x.fillStyle = '#3b4658'; x.fillRect(a, b, t, t); });
  [[t, 0], [0, t]].forEach(([a, b]) => { x.fillStyle = '#36414f'; x.fillRect(a, b, t, t); });
  const fl = ['rgba(150,165,190,.5)', 'rgba(20,24,32,.6)', 'rgba(170,60,70,.55)', 'rgba(60,150,150,.5)', 'rgba(220,200,120,.4)'];
  for (let i = 0; i < 26000; i++) { x.fillStyle = fl[i % 13 === 0 ? 2 + Math.floor(r() * 3) : Math.floor(r() * 2)]; x.fillRect(r() * S, r() * S, 1.2, 1.2); }
  x.fillStyle = 'rgba(10,12,16,.5)'; x.fillRect(0, 0, S, 1.5); x.fillRect(0, 0, 1.5, S); x.fillRect(0, t, S, 1.2); x.fillRect(t, 0, 1.2, S);
  return c;
}
function makeWainscot() {
  const W = 1024, H = 256, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(56);
  x.fillStyle = '#3a2618'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 260; i++) { x.strokeStyle = `rgba(${r() > .5 ? '15,8,4' : '120,80,50'},${.05 + r() * .1})`; x.lineWidth = .6 + r(); const y = r() * H; x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(W * .3, y + (r() - .5) * 8, W * .7, y + (r() - .5) * 8, W, y); x.stroke(); }
  const panel = (px, py, pw, ph) => {
    x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px, py, pw, ph);
    x.fillStyle = 'rgba(255,220,180,.12)'; x.fillRect(px + 4, py + 4, pw - 8, ph - 8);
    x.fillStyle = '#3d281a'; x.fillRect(px + 10, py + 10, pw - 20, ph - 20);
    x.fillStyle = 'rgba(255,225,190,.14)'; x.fillRect(px + 10, py + 10, pw - 20, 3); x.fillRect(px + 10, py + 10, 3, ph - 20);
    x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(px + 10, py + ph - 13, pw - 20, 3); x.fillRect(px + pw - 13, py + 10, 3, ph - 20);
  };
  panel(40, 40, W / 2 - 80, H - 80); panel(W / 2 + 40, 40, W / 2 - 80, H - 80);
  x.fillStyle = 'rgba(255,225,190,.1)'; x.fillRect(0, 0, W, 6); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(0, H - 8, W, 8);
  return c;
}
function makeBerberRug() {
  const W = 1024, H = 192, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(57);
  x.fillStyle = '#e6dfd2'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 40000; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '120,105,90'},${r() * .12})`; x.fillRect(r() * W, r() * H, 1, 1.5); }
  x.strokeStyle = 'rgba(60,55,50,.55)'; x.lineWidth = 3;
  for (let k = -2; k < 18; k++) { const cx = k * 64; x.beginPath(); x.moveTo(cx, 20); x.lineTo(cx + 32, H / 2); x.lineTo(cx, H - 20); x.moveTo(cx + 32, 20); x.lineTo(cx, H / 2); x.lineTo(cx + 32, H - 20); x.stroke(); }
  return c;
}
function makePersianRug() {
  const W = 1024, H = 192, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(58);
  x.fillStyle = '#6e1f22'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#1f2a48'; x.fillRect(0, 0, W, 26); x.fillRect(0, H - 26, W, 26); x.fillRect(0, 0, 26, H); x.fillRect(W - 26, 0, 26, H);
  x.strokeStyle = '#c9a25a'; x.lineWidth = 2.5; x.strokeRect(30, 30, W - 60, H - 60); x.strokeRect(10, 10, W - 20, H - 20);
  for (let k = 0; k < 7; k++) {
    const cx = 90 + k * 140, cy = H / 2;
    x.fillStyle = '#1f2a48'; x.beginPath(); x.moveTo(cx, cy - 46); x.lineTo(cx + 46, cy); x.lineTo(cx, cy + 46); x.lineTo(cx - 46, cy); x.closePath(); x.fill();
    x.fillStyle = '#c9a25a'; x.beginPath(); x.moveTo(cx, cy - 26); x.lineTo(cx + 26, cy); x.lineTo(cx, cy + 26); x.lineTo(cx - 26, cy); x.closePath(); x.fill();
    x.fillStyle = '#8a2a2c'; x.beginPath(); x.arc(cx, cy, 11, 0, 7); x.fill();
    for (let a = 0; a < 8; a++) { x.fillStyle = '#e1d2b0'; x.beginPath(); x.arc(cx + Math.cos(a * .785) * 34, cy + Math.sin(a * .785) * 34, 3, 0, 7); x.fill(); }
  }
  for (let i = 0; i < 30000; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,230,200' : '0,0,0'},${r() * .1})`; x.fillRect(r() * W, r() * H, 1, 1.5); }
  return c;
}
/* ---------- wall art ---------- */
function makeAbstractPrint(seed) {
  const W = 300, H = 400, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(seed);
  const pals = [['#e9e3d8', '#8a9a7b', '#2f3437', '#c9b28e'], ['#ece6dc', '#6c86a0', '#d6a77a', '#2b2b2b'], ['#efe9e1', '#b9876a', '#4f5d58', '#ddd2bf'], ['#e8e4dc', '#3f4a5a', '#a7b6a2', '#c48f5c']];
  const p = pals[seed % pals.length]; x.fillStyle = p[0]; x.fillRect(0, 0, W, H);
  x.fillStyle = p[1]; x.beginPath(); x.arc(W * (.3 + r() * .4), H * (.35 + r() * .2), W * (.22 + r() * .1), 0, 7); x.fill();
  x.fillStyle = p[3]; x.fillRect(W * .15, H * (.55 + r() * .1), W * .7, H * .22);
  x.fillStyle = p[2]; x.beginPath(); x.moveTo(W * .2, H * .82); x.quadraticCurveTo(W * .5, H * (.3 + r() * .2), W * .82, H * .82); x.lineTo(W * .78, H * .82); x.quadraticCurveTo(W * .5, H * (.36 + r() * .2), W * .24, H * .82); x.closePath(); x.fill();
  return c;
}
function makePainting(seed) {
  const W = 420, H = 300, c = mkCanvas(W, H), x = c.getContext('2d');
  const arts = ['mountains', 'sea', 'forest', 'desert', 'waves'], pals = [['#2b3a4a', '#6f8aa0', '#c9a25a', '#efe2c0', '#f4ead8'], ['#1d2a26', '#4b6b55', '#b88a4a', '#e6d6aa', '#f2e8d0'], ['#3a2a20', '#8a6a48', '#d49a5a', '#f1d9a8', '#f6ead6']];
  const g = { id: 'oil' + seed, art: arts[seed % arts.length], pal: pals[seed % pals.length], artOpt: {} };
  drawArt(x, W, H, g, seed); gradeArt(x, W, H, rng(seed + 3));
  if ('filter' in x) { const t = mkCanvas(W, H); t.getContext('2d').drawImage(c, 0, 0); x.filter = 'blur(1.4px) sepia(.35) saturate(.8)'; x.drawImage(t, 0, 0); x.filter = 'none'; }
  x.fillStyle = 'rgba(70,45,20,.18)'; x.fillRect(0, 0, W, H);
  return c;
}
function makeCityPhoto(seed) {
  const W = 360, H = 260, c = mkCanvas(W, H), x = c.getContext('2d');
  drawArt(x, W, H, { id: 'ph' + seed, art: seed % 2 ? 'city' : 'tram', pal: ['#111111', '#555555', '#bbbbbb', '#dddddd', '#ffffff'], artOpt: {} }, seed);
  if ('filter' in x) { const t = mkCanvas(W, H); t.getContext('2d').drawImage(c, 0, 0); x.filter = 'grayscale(1) contrast(1.15) blur(.4px)'; x.drawImage(t, 0, 0); x.filter = 'none'; }
  return c;
}
function makeNeon(text, color) {
  const W = 512, H = 200, c = mkCanvas(W, H), x = c.getContext('2d');
  x.font = `48px ${F.bungee}`; let fs = 120; x.font = `${fs}px ${F.bungee}`; while (x.measureText(text).width > W - 80 && fs > 40) { fs -= 4; x.font = `${fs}px ${F.bungee}`; }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  for (const [blur, a, lw] of [[40, .5, 14], [18, .8, 8], [0, 1, 4]]) { x.shadowColor = color; x.shadowBlur = blur; x.strokeStyle = blur ? color : '#ffffff'; x.globalAlpha = a; x.lineWidth = lw; x.strokeText(text, W / 2, H / 2 + 6); }
  x.globalAlpha = 1; x.shadowBlur = 0; return c;
}
function makeGlow() { const S = 128, c = mkCanvas(S, S), x = c.getContext('2d'); x.fillStyle = rg(x, S / 2, S / 2, 0, S / 2, [[0, 'rgba(255,255,255,1)'], [.25, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, S, S); return c; }
function makeWash() { const W = 128, H = 256, c = mkCanvas(W, H), x = c.getContext('2d'); x.fillStyle = rg(x, W / 2, H * .55, 0, H * .55, [[0, 'rgba(255,255,255,.9)'], [.5, 'rgba(255,255,255,.3)'], [1, 'rgba(255,255,255,0)']]); x.fillRect(0, 0, W, H); return c; }
function makeLeaf() {
  const W = 128, H = 256, c = mkCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = lg(x, 0, 0, W, 0, [[0, '#2f5a33'], [.5, '#4d7f45'], [1, '#2b5230']]);
  x.beginPath(); x.moveTo(W / 2, H - 4); x.bezierCurveTo(-10, H * .7, 6, H * .18, W / 2, 4); x.bezierCurveTo(W - 6, H * .18, W + 10, H * .7, W / 2, H - 4); x.fill();
  x.strokeStyle = 'rgba(210,235,180,.45)'; x.lineWidth = 2.4; x.beginPath(); x.moveTo(W / 2, H - 6); x.lineTo(W / 2, 10); x.stroke();
  x.lineWidth = 1; for (let i = 1; i < 9; i++) { const y = H - i * H / 10; x.beginPath(); x.moveTo(W / 2, y); x.quadraticCurveTo(W * .3, y - 12, W * .14, y - 22); x.moveTo(W / 2, y); x.quadraticCurveTo(W * .7, y - 12, W * .86, y - 22); x.stroke(); }
  return c;
}
function makeSignBoard(text, bg, ink, sub) {
  const W = 768, H = 160, c = mkCanvas(W, H), x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, W, H); x.fillStyle = 'rgba(255,255,255,.12)'; x.fillRect(0, 0, W, 10); x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(0, H - 10, W, 10);
  x.fillStyle = ink; x.textAlign = 'center'; x.textBaseline = 'middle'; let fs = 92; x.font = `${fs}px ${F.bungee}`; while (x.measureText(text).width > W - 70 && fs > 30) { fs -= 3; x.font = `${fs}px ${F.bungee}`; }
  x.shadowColor = 'rgba(0,0,0,.35)'; x.shadowOffsetY = 4; x.fillText(text, W / 2, sub ? H * .42 : H / 2 + 4); x.shadowOffsetY = 0;
  if (sub) { x.font = `700 24px ${F.mono}`; x.globalAlpha = .85; x.fillText(sub, W / 2, H * .8); x.globalAlpha = 1; }
  return c;
}
function makeAFrame(lines, seed) {
  const W = 256, H = 400, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = '#7a5532'; x.fillRect(0, 0, W, H); x.fillStyle = '#1f2421'; x.fillRect(14, 14, W - 28, H - 28);
  for (let i = 0; i < 500; i++) { x.fillStyle = `rgba(255,255,255,${r() * .05})`; x.fillRect(14 + r() * (W - 28), 14 + r() * (H - 28), 3, 1); }
  x.fillStyle = '#f2efe6'; x.textAlign = 'center'; x.textBaseline = 'middle';
  lines.forEach(([t, s, col], i) => { x.fillStyle = col || '#f2efe6'; x.font = `${s}px ${F.saira}`; x.font = `800 ${s}px ${F.saira}`; x.fillText(t, W / 2, 70 + i * (H - 120) / Math.max(1, lines.length - 1)); });
  return c;
}

/* ---------- decor helpers ---------- */
const decorGroup = new THREE.Group(); scene.add(decorGroup);
const DM = {};
function dmat(key, make) { if (!DM[key]) DM[key] = make(); return DM[key]; }
function freeDecor() {
  decorGroup.traverse(o => { if (o.isMesh || o.isSprite) { if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose(); } });
  decorGroup.clear(); for (const k in DM) { const m = DM[k]; if (m.map && !KEEP.has(m.map)) m.map.dispose(); m.dispose(); const i = allMats.indexOf(m); if (i >= 0) allMats.splice(i, 1); delete DM[k]; }
}
function dbox(w, h, d, mat, x, y, z, parent = decorGroup) { return addBox(w, h, d, mat, x, y, z, parent); }
function framed(parent, x, y, w, h, artCanvas, frameMat, o = {}) {
  const g = new THREE.Group(); g.position.set(x, y, -15.5 + (o.depth || 1.4) / 2); parent.add(g);
  const fw = o.fw || 1.2, d = o.depth || 1.4;
  if (o.mat !== false) { const mm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), dmat('mat', () => M(THREE.MeshStandardMaterial, { color: '#f1ece3', roughness: .9 }, .5))); mm.position.z = d / 2 - .25; g.add(mm); }
  const iw = o.mat === false ? w : w * .72, ih = o.mat === false ? h : h * .72;
  const art = new THREE.Mesh(new THREE.PlaneGeometry(iw, ih), M(THREE.MeshStandardMaterial, { map: tex(artCanvas), roughness: o.gloss ? .35 : .8 }, .6)); art.position.z = d / 2 - .2; g.add(art); DM['art' + decorGroup.id + Math.random()] = art.material;
  const gl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glassMat); gl.position.z = d / 2 - .05; g.add(gl);
  [[0, h / 2 + fw / 2, w + 2 * fw, fw], [0, -h / 2 - fw / 2, w + 2 * fw, fw], [-w / 2 - fw / 2, 0, fw, h], [w / 2 + fw / 2, 0, fw, h]].forEach(([dx, dy, bw, bh]) => dbox(bw, bh, d, frameMat, dx, dy, 0, g));
  return g;
}
function plant(x, z, s, potMat, seed) {
  const g = new THREE.Group(); g.position.set(x, 0, z); decorGroup.add(g); const r = rng(seed);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(4.6 * s, 3.6 * s, 10 * s, 32), potMat); pot.position.y = 5 * s; pot.castShadow = pot.receiveShadow = true; g.add(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(4.3 * s, 24), dmat('soil', () => M(THREE.MeshStandardMaterial, { color: '#2a2018', roughness: 1 }, .3))); soil.rotation.x = -Math.PI / 2; soil.position.y = 9.6 * s; g.add(soil);
  const leafMat = dmat('leaf', () => M(THREE.MeshStandardMaterial, { map: tex(makeLeaf()), alphaTest: .45, side: THREE.DoubleSide, roughness: .6 }, .6));
  const stemMat = dmat('stem', () => M(THREE.MeshStandardMaterial, { color: '#4a6a3a', roughness: .7 }, .5));
  const n = 9 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const a = (r() < .5 ? 1 : -1) * Math.PI / 2 + (r() - .5) * 1.1, tilt = .15 + r() * .35, len = (11 + r() * 11) * s;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(.18 * s, .25 * s, len, 6), stemMat);
    const piv = new THREE.Group(); piv.position.y = 9.5 * s; piv.rotation.set(Math.sin(a) * tilt, 0, -Math.cos(a) * tilt); g.add(piv);
    stem.position.y = len / 2; piv.add(stem);
    const leaf = new THREE.Mesh(new THREE.PlaneGeometry(6.5 * s, 13 * s), leafMat); leaf.position.y = len + 5 * s; leaf.rotation.set(-.5 - r() * .5, a + Math.PI / 2, 0); leaf.castShadow = true; piv.add(leaf);
  }
  return g;
}
function glowSprite(color, size, x, y, z, op = .8) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dmatTex('glow', makeGlow), color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  s.scale.set(size, size, 1); s.position.set(x, y, z); decorGroup.add(s); DM['spr' + Math.random()] = s.material; return s;
}
const DT = {};
function dmatTex(key, make) { if (!DT[key]) { DT[key] = new THREE.CanvasTexture(make()); KEEP.add(DT[key]); } return DT[key]; }

/* ---------- soft light helpers, more textures, small props ---------- */
/* glow that fades to nothing before the edge of its quad, so it never shows a hard border */
function makeHalo() {
  const S = 256, c = mkCanvas(S, S), x = c.getContext('2d');
  x.fillStyle = rg(x, S / 2, S / 2, 0, S / 2, [[0, 'rgba(255,255,255,1)'], [.22, 'rgba(255,255,255,.62)'], [.45, 'rgba(255,255,255,.26)'], [.7, 'rgba(255,255,255,.08)'], [1, 'rgba(255,255,255,0)']]);
  x.fillRect(0, 0, S, S); return c;
}
function haloMat(key, color, op) { return dmat(key, () => new THREE.MeshBasicMaterial({ map: dmatTex('halo', makeHalo), color, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); }
function haloQuad(mat, w, h, x, y, z, flat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(x, y, z); if (flat) m.rotation.x = -Math.PI / 2; m.renderOrder = 2; decorGroup.add(m); return m; }
const FX = { twinkle: [], flames: [] };

/* ---------- textures ---------- */
function makeLimewash(base, seed) {
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) { x.save(); x.translate(r() * S, r() * S); x.rotate(r() * 6.28); x.fillStyle = r() > .5 ? `rgba(255,245,230,${.03 + r() * .05})` : `rgba(80,40,20,${.03 + r() * .05})`; x.beginPath(); x.ellipse(0, 0, 30 + r() * 90, 10 + r() * 30, 0, 0, 7); x.fill(); x.restore(); }
  return c;
}
function makeKilim() {
  const W = 1024, H = 192, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(71);
  const cols = ['#a4482f', '#d39b3a', '#2f5d5a', '#e9dcc3', '#5a2a22'];
  x.fillStyle = cols[3]; x.fillRect(0, 0, W, H);
  [[0, 14, 4], [14, 8, 0], [H - 22, 8, 0], [H - 14, 14, 4]].forEach(([y, h, ci]) => { x.fillStyle = cols[ci]; x.fillRect(0, y, W, h); });
  for (let k = 0; k < 16; k++) { const cx = 32 + k * 64, cy = H / 2, ci = k % 3; x.fillStyle = cols[ci]; x.beginPath(); x.moveTo(cx, cy - 52); x.lineTo(cx + 30, cy); x.lineTo(cx, cy + 52); x.lineTo(cx - 30, cy); x.closePath(); x.fill(); x.fillStyle = cols[3]; x.beginPath(); x.moveTo(cx, cy - 26); x.lineTo(cx + 15, cy); x.lineTo(cx, cy + 26); x.lineTo(cx - 15, cy); x.closePath(); x.fill(); x.fillStyle = cols[(ci + 1) % 3]; x.fillRect(cx - 5, cy - 5, 10, 10); }
  for (let i = 0; i < 40000; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,240,220' : '30,15,8'},${r() * .1})`; x.fillRect(r() * W, r() * H, 1, 2); }
  return c;
}
function makeKnit(base) {
  const S = 256, c = mkCanvas(S, S), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, S, S);
  for (let col = 0; col < 16; col++) for (let row = 0; row < 32; row++) { const cx = col * 16 + 8, cy = row * 8; x.fillStyle = 'rgba(0,0,0,.14)'; x.beginPath(); x.ellipse(cx - 3, cy + 4, 3, 5, .5, 0, 7); x.ellipse(cx + 3, cy + 4, 3, 5, -.5, 0, 7); x.fill(); x.fillStyle = 'rgba(255,255,255,.12)'; x.beginPath(); x.ellipse(cx - 3, cy + 3, 2, 3.4, .5, 0, 7); x.ellipse(cx + 3, cy + 3, 2, 3.4, -.5, 0, 7); x.fill(); }
  return c;
}
function makeWicker() {
  const S = 256, c = mkCanvas(S, S), x = c.getContext('2d');
  x.fillStyle = '#8a6334'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 16; j++) { const over = (i + j) % 2; x.fillStyle = over ? '#c39253' : '#a77a40'; x.fillRect(i * 16 + 1, j * 16 + (over ? 1 : 5), 14, over ? 14 : 6); x.fillStyle = 'rgba(255,240,200,.18)'; x.fillRect(i * 16 + 1, j * 16 + 2, 14, 2); }
  return c;
}
function makeKnotty(w, h, base, seed, planks) {
  const c = makeRealWood(w, h, base, seed, { planks }), x = c.getContext('2d'), r = rng(seed + 5), ph = h / planks;
  for (let p = 0; p < planks; p++) for (let k = 0; k < 3; k++) { if (r() < .35) continue; const kx = r() * w, ky = p * ph + ph * (.3 + r() * .4), kr = 4 + r() * 9; x.fillStyle = 'rgba(60,30,12,.55)'; x.beginPath(); x.ellipse(kx, ky, kr * 1.6, kr, 0, 0, 7); x.fill(); x.strokeStyle = 'rgba(70,35,14,.35)'; for (let q = 1; q < 4; q++) { x.lineWidth = 1; x.beginPath(); x.ellipse(kx, ky, kr * 1.6 + q * 5, kr + q * 2.5, 0, 0, 7); x.stroke(); } x.fillStyle = 'rgba(25,12,5,.6)'; x.beginPath(); x.ellipse(kx, ky, kr * .5, kr * .35, 0, 0, 7); x.fill(); }
  for (let p = 0; p < planks; p++) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, p * ph, w, 3); x.fillStyle = 'rgba(255,220,180,.12)'; x.fillRect(0, p * ph + 3, w, 2); }
  return c;
}
function makePlaid() {
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), b = S / 8;
  x.fillStyle = '#a3161c'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 8; i += 2) { x.fillStyle = 'rgba(15,10,10,.72)'; x.fillRect(i * b, 0, b, S); x.fillRect(0, i * b, S, b); }
  const r = rng(73); for (let i = 0; i < 30000; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,200,190' : '0,0,0'},${r() * .1})`; x.fillRect(r() * S, r() * S, 2, 1); }
  return c;
}
function makeEndGrain() {
  const S = 128, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(74);
  x.fillStyle = '#c99a62'; x.fillRect(0, 0, S, S);
  for (let i = 1; i < 14; i++) { x.strokeStyle = `rgba(110,65,30,${.25 + r() * .25})`; x.lineWidth = 1 + r(); x.beginPath(); x.arc(S / 2 + (r() - .5) * 4, S / 2 + (r() - .5) * 4, i * 4.4, 0, 7); x.stroke(); }
  x.strokeStyle = 'rgba(60,35,15,.4)'; x.lineWidth = 2; for (let i = 0; i < 4; i++) { const a = r() * 6.28; x.beginPath(); x.moveTo(S / 2, S / 2); x.lineTo(S / 2 + Math.cos(a) * 55, S / 2 + Math.sin(a) * 55); x.stroke(); }
  x.strokeStyle = '#4a3020'; x.lineWidth = 10; x.beginPath(); x.arc(S / 2, S / 2, S / 2 - 5, 0, 7); x.stroke();
  return c;
}
function makeBark() {
  const W = 256, H = 128, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(75);
  x.fillStyle = '#4a3423'; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${r() > .5 ? '120,95,70' : '20,12,6'},${.2 + r() * .3})`; x.fillRect(r() * W, r() * H, 1 + r() * 3, 6 + r() * 20); }
  return c;
}
function makeShoji(emissive) {
  const W = 512, H = 512, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(76);
  x.fillStyle = emissive ? '#7a6d58' : '#efe8d8'; x.fillRect(0, 0, W, H);
  if (!emissive) for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '160,140,110'},${r() * .1})`; x.fillRect(r() * W, r() * H, 1, 3); }
  x.fillStyle = emissive ? '#000000' : '#8a6a44';
  for (let i = 0; i <= 4; i++) x.fillRect(i * W / 4 - (i === 0 ? 0 : i === 4 ? 10 : 5), 0, 10, H);
  for (let j = 0; j <= 6; j++) x.fillRect(0, j * H / 6 - (j === 0 ? 0 : j === 6 ? 8 : 4), W, 8);
  if (!emissive) { x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i <= 4; i++) x.fillRect(i * W / 4 + 4, 0, 2, H); }
  return c;
}
function makeTatami() {
  const W = 1024, H = 512, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(77);
  const mats = [[0, 0, 512, 256, 0], [512, 0, 256, 512, 1], [768, 0, 256, 512, 1], [0, 256, 512, 256, 0]];
  mats.forEach(([mx, my, mw, mh, v]) => {
    x.fillStyle = '#c6bd86'; x.fillRect(mx, my, mw, mh);
    x.strokeStyle = 'rgba(120,110,60,.35)'; x.lineWidth = 1;
    if (v) for (let i = 0; i < mh; i += 3) { x.beginPath(); x.moveTo(mx, my + i); x.lineTo(mx + mw, my + i); x.stroke(); } else for (let i = 0; i < mw; i += 3) { x.beginPath(); x.moveTo(mx + i, my); x.lineTo(mx + i, my + mh); x.stroke(); }
    for (let i = 0; i < 1500; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,250,220' : '90,80,40'},${r() * .12})`; x.fillRect(mx + r() * mw, my + r() * mh, 1, 2); }
    x.fillStyle = '#24302a'; if (v) { x.fillRect(mx, my, 12, mh); x.fillRect(mx + mw - 12, my, 12, mh); } else { x.fillRect(mx, my, mw, 12); x.fillRect(mx, my + mh - 12, mw, 12); }
  });
  return c;
}
function makeScroll(seed) {
  const W = 160, H = 420, c = mkCanvas(W, H), x = c.getContext('2d'), r = rng(seed);
  x.fillStyle = '#5b6e63'; x.fillRect(0, 0, W, H); x.fillStyle = '#efe6d2'; x.fillRect(16, 60, W - 32, H - 140);
  for (let i = 0; i < 3000; i++) { x.fillStyle = `rgba(150,130,100,${r() * .08})`; x.fillRect(16 + r() * (W - 32), 60 + r() * (H - 140), 1, 2); }
  const cx = W / 2, cy = 60 + (H - 140) * .42, R = 42;
  x.strokeStyle = 'rgba(20,18,16,.92)'; x.lineCap = 'round';
  for (let k = 0; k < 120; k++) { const t = k / 120, a0 = -1.4 + t * 5.6, a1 = a0 + .06; x.lineWidth = 10 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 1.5; x.beginPath(); x.arc(cx, cy, R + Math.sin(t * 9) * 1.5, a0, a1); x.stroke(); }
  x.fillStyle = 'rgba(160,30,25,.85)'; x.fillRect(W - 46, H - 110, 14, 14);
  x.fillStyle = '#2b2a28'; x.fillRect(0, H - 22, W, 10);
  return c;
}
function makeHull(emissive) {
  const S = 512, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(78);
  x.fillStyle = emissive ? '#000000' : '#5d6670'; x.fillRect(0, 0, S, S);
  const panels = [[0, 0, 256, 192], [256, 0, 256, 192], [0, 192, 170, 320], [170, 192, 342, 128], [170, 320, 342, 192]];
  panels.forEach(([px, py, pw, ph], i) => {
    if (!emissive) {
      x.fillStyle = ['#66707a', '#5f6973', '#6b757f', '#626c76', '#68727c'][i]; x.fillRect(px + 3, py + 3, pw - 6, ph - 6);
      x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(px + 3, py + 3, pw - 6, 2); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px + 3, py + ph - 5, pw - 6, 2);
      x.fillStyle = 'rgba(20,24,28,.7)'; [[8, 8], [pw - 12, 8], [8, ph - 12], [pw - 12, ph - 12]].forEach(([a, b]) => { x.beginPath(); x.arc(px + a + 2, py + b + 2, 2.4, 0, 7); x.fill(); });
      for (let k = 0; k < 300; k++) { x.fillStyle = `rgba(${r() > .5 ? '255,255,255' : '0,0,0'},${r() * .06})`; x.fillRect(px + r() * pw, py + r() * ph, 2, 1); }
    }
  });
  if (!emissive) { x.fillStyle = '#1e2329'; for (let i = 0; i < 6; i++) x.fillRect(40, 230 + i * 14, 90, 6); for (let k = 0; k < 10; k++) { x.fillStyle = k % 2 ? '#e0b62e' : '#1e2329'; x.beginPath(); x.moveTo(170 + k * 34, 500); x.lineTo(170 + k * 34 + 17, 500); x.lineTo(170 + k * 34 + 34, 470); x.lineTo(170 + k * 34 + 17, 470); x.closePath(); x.fill(); } }
  x.fillStyle = emissive ? '#5ee7ff' : '#9feeff'; x.fillRect(0, 189, S, 3); x.fillRect(253, 0, 3, 189); x.fillRect(190, 220, 300, 2);
  if (emissive) { x.fillStyle = '#ff4d5e'; x.fillRect(470, 40, 10, 10); x.fillStyle = '#7dff9a'; x.fillRect(486, 40, 10, 10); }
  return c;
}
function makePlate() {
  const S = 256, c = mkCanvas(S, S), x = c.getContext('2d');
  x.fillStyle = '#3a4047'; x.fillRect(0, 0, S, S);
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.save(); x.translate(i * 32 + 16, j * 32 + 16); x.rotate((i + j) % 2 ? .78 : -.78); x.fillStyle = 'rgba(255,255,255,.14)'; x.fillRect(-10, -2.5, 20, 5); x.fillStyle = 'rgba(0,0,0,.3)'; x.fillRect(-10, 2.5, 20, 1.5); x.restore(); }
  x.fillStyle = 'rgba(0,0,0,.5)'; x.fillRect(0, 0, S, 2); x.fillRect(0, 0, 2, S);
  return c;
}
function makeSpace(seed) { const S = 256, c = mkCanvas(S, S), x = c.getContext('2d'); drawArt(x, S, S, { id: 'sp' + seed, art: 'planet', pal: ['#02030a', '#0c1640', '#3b7bd8', '#ffd9a0', '#e8f0ff'], artOpt: {} }, seed); return c; }
function makeFlame() { const W = 64, H = 128, c = mkCanvas(W, H), x = c.getContext('2d'); x.fillStyle = rg(x, W / 2, H * .7, 2, H * .5, [[0, 'rgba(255,250,220,1)'], [.35, 'rgba(255,190,90,.9)'], [.7, 'rgba(255,110,30,.35)'], [1, 'rgba(255,80,20,0)']]); x.beginPath(); x.moveTo(W / 2, 2); x.bezierCurveTo(W * .95, H * .55, W * .8, H - 4, W / 2, H - 4); x.bezierCurveTo(W * .2, H - 4, W * .05, H * .55, W / 2, 2); x.fill(); return c; }

/* ---------- small props ---------- */
function flameAt(x, y, z, s = 1) {
  const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: dmatTex('flame', makeFlame), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  f.scale.set(1.1 * s, 2.2 * s, 1); f.position.set(x, y + 1.1 * s, z); decorGroup.add(f); DM['fl' + Math.random()] = f.material;
  const g = glowSprite('#ffb15a', 9 * s, x, y + 1, z + .2, .45);
  FX.flames.push({ f, g, s, ph: Math.random() * 10 });
}
function candle(x, yTop, z, h, rad) {
  const wax = dmat('wax', () => M(THREE.MeshPhysicalMaterial, { color: '#f1e6d0', roughness: .55, transmission: 0, clearcoat: .2 }, .6));
  const c = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 1.02, h, 24), wax); c.position.set(x, yTop + h / 2, z); c.castShadow = true; decorGroup.add(c);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .5, 6), dmat('wick', () => M(THREE.MeshStandardMaterial, { color: '#1a1410' }, .3))); wick.position.set(x, yTop + h + .25, z); decorGroup.add(wick);
  flameAt(x, yTop + h + .2, z, .8);
}
function garland(points, bulbEvery = 3) {
  const wire = dmat('wire', () => M(THREE.MeshStandardMaterial, { color: '#1e2a1e', roughness: .5 }, .5));
  const bulb = dmat('fbulb', () => new THREE.MeshBasicMaterial({ color: '#ffd38a', toneMapped: false }));
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0, x1, y1, sag] = [points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], points[i][2]];
    const pts = []; for (let k = 0; k <= 16; k++) { const t = k / 16; pts.push(new V3(lerp(x0, x1, t), lerp(y0, y1, t) - sag * 4 * t * (1 - t), -14.2 + Math.sin(t * Math.PI) * 1.2)); }
    const curve = new THREE.CatmullRomCurve3(pts), tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, .07, 5, false), wire); decorGroup.add(tube);
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / bulbEvery));
    for (let k = 1; k < n; k++) { const p = curve.getPoint(k / n), b = new THREE.Mesh(new THREE.SphereGeometry(.34, 10, 8), bulb); b.position.copy(p); b.position.y -= .35; decorGroup.add(b); const g = glowSprite('#ffc06a', 3.4, p.x, p.y - .35, p.z + .3, .55); FX.twinkle.push({ m: g.material, base: .55, ph: Math.random() * 6.28 }); }
  }
  const hook = dmat('hook', () => M(THREE.MeshStandardMaterial, { color: '#8a6a3a', metalness: .8, roughness: .35 }, 1));
  points.forEach(p => { const h = new THREE.Mesh(new THREE.SphereGeometry(.35, 8, 6), hook); h.position.set(p[0], p[1], -15.1); decorGroup.add(h); });
}
function basket(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); decorGroup.add(g);
  const wick = dmat('wicker', () => M(THREE.MeshStandardMaterial, { map: tex(makeWicker(), [3, 1]), roughness: .8, side: THREE.DoubleSide }, .5));
  const b = new THREE.Mesh(new THREE.CylinderGeometry(6.5, 5.6, 12, 32, 1, true), wick); b.position.y = 6; b.castShadow = true; g.add(b);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(5.6, 24), wick); bottom.rotation.x = -Math.PI / 2; bottom.position.y = .2; g.add(bottom);
  const knit = dmat('knit', () => M(THREE.MeshStandardMaterial, { map: tex(makeKnit('#d9c9b0'), [2, 2]), roughness: 1 }, .4));
  const roll = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 13, 20), knit); roll.rotation.z = .5; roll.position.set(0, 14, 0); roll.castShadow = true; g.add(roll);
  const knit2 = dmat('knit2', () => M(THREE.MeshStandardMaterial, { map: tex(makeKnit('#8f5a3c'), [2, 2]), roughness: 1 }, .4));
  const roll2 = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 12, 20), knit2); roll2.rotation.set(.2, 0, -.7); roll2.position.set(1, 13, -2.5); g.add(roll2);
  return g;
}
function logStack(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); decorGroup.add(g);
  const bark = dmat('bark', () => M(THREE.MeshStandardMaterial, { map: tex(makeBark(), [2, 1]), roughness: .95 }, .4)), end = dmat('end', () => M(THREE.MeshStandardMaterial, { map: tex(makeEndGrain()), roughness: .9 }, .4));
  const r = rng(Math.round(x * 10));
  [[-3.4, 2.4], [0, 2.4], [3.4, 2.4], [-1.7, 5.4], [1.7, 5.4], [0, 8.4]].forEach(([lx, ly]) => { const rr = 1.55 + r() * .3; const l = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 14, 14), [bark, end, end]); l.rotation.x = Math.PI / 2; l.rotation.z = (r() - .5) * .08; l.position.set(lx + (r() - .5) * .3, ly, (r() - .5) * 1.5); l.castShadow = true; g.add(l); });
  return g;
}
function lantern(x, y, z) {
  const brass = dmat('lbrass', () => M(THREE.MeshStandardMaterial, { color: '#8a6a3a', metalness: .85, roughness: .35 }, 1.2));
  const glass = dmat('lglass', () => M(THREE.MeshPhysicalMaterial, { color: '#fff2d0', transparent: true, opacity: .25, roughness: .05, clearcoat: 1, depthWrite: false }, 1.8));
  const g = new THREE.Group(); g.position.set(x, y, z); decorGroup.add(g);
  dbox(4.4, .6, 4.4, brass, 0, .3, 0, g); dbox(4.4, .6, 4.4, brass, 0, 7, 0, g);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(3, 2.2, 4), brass); roof.rotation.y = Math.PI / 4; roof.position.y = 8.4; g.add(roof);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.8, .12, 6, 16), brass); ring.position.y = 10; g.add(ring);
  [[-2, -2], [2, -2], [-2, 2], [2, 2]].forEach(([a, b]) => dbox(.3, 6.4, .3, brass, a, 3.6, b, g));
  const gl = new THREE.Mesh(new THREE.BoxGeometry(3.8, 6, 3.8), glass); gl.position.y = 3.6; g.add(gl);
  candle(x, y + .6, z, 2.6, .7);
  return g;
}
function bonsai(x, z, seed) {
  const g = new THREE.Group(); g.position.set(x, 0, z); decorGroup.add(g); const r = rng(seed);
  const stand = dmat('stand', () => M(THREE.MeshStandardMaterial, { color: '#3a2a1e', roughness: .5 }, .6)), potM = dmat('bpot', () => M(THREE.MeshStandardMaterial, { color: '#2e4a5a', roughness: .35 }, .8));
  dbox(13, 1.2, 9, stand, 0, 6, 0, g); [[-5.5, -3.5], [5.5, -3.5], [-5.5, 3.5], [5.5, 3.5]].forEach(([a, b]) => dbox(1, 6, 1, stand, a, 3, b, g));
  dbox(10, 2.4, 6.5, potM, 0, 7.8, 0, g);
  const bark = dmat('bbark', () => M(THREE.MeshStandardMaterial, { color: '#5a4334', roughness: .9 }, .4)), leaf = dmat('bleaf', () => M(THREE.MeshStandardMaterial, { color: '#3d6a3a', roughness: .8, flatShading: true }, .5));
  let px = 0, py = 9, pr = .9; const pts = [];
  for (let k = 0; k < 5; k++) { const nx = px + (r() - .5) * 3, ny = py + 2.2 + r(); const len = Math.hypot(nx - px, ny - py), seg = new THREE.Mesh(new THREE.CylinderGeometry(pr * .75, pr, len, 8), bark); seg.position.set((px + nx) / 2, (py + ny) / 2, 0); seg.rotation.z = Math.atan2(px - nx, ny - py); g.add(seg); pts.push([nx, ny]); px = nx; py = ny; pr *= .78; }
  pts.slice(1).forEach(([a, b], i) => { const cl = new THREE.Mesh(new THREE.SphereGeometry(2.4 + r() * 1.4, 8, 6), leaf); cl.scale.y = .55; cl.position.set(a + (i % 2 ? 3 : -3), b + .5, (r() - .5) * 2); cl.castShadow = true; g.add(cl); });
  return g;
}
function paperLantern(x, y, z) {
  const paper = dmat('ppaper', () => new THREE.MeshBasicMaterial({ color: '#ffd9a0', toneMapped: false })), rib = dmat('prib', () => M(THREE.MeshStandardMaterial, { color: '#3a2a1e', roughness: .6 }, .5));
  const s = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 16), paper); s.scale.y = 1.15; s.position.set(x, y, z); decorGroup.add(s);
  for (let k = -2; k <= 2; k++) { const t = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(1 - (k / 3) ** 2) * 4.25, .07, 4, 32), rib); t.rotation.x = Math.PI / 2; t.position.set(x, y + k * 1.4 * 1.15, z); decorGroup.add(t); }
  dbox(.12, 30, .12, rib, x, y + 19, z);
  glowSprite('#ffb866', 22, x, y, z + .5, .4);
}
function sciCrate(x, z, seed) {
  const g = new THREE.Group(); g.position.set(x, 0, z); decorGroup.add(g);
  const body = dmat('crateB', () => M(THREE.MeshStandardMaterial, { color: '#c9ced4', metalness: .5, roughness: .4 }, 1)), dark = dmat('crateD', () => M(THREE.MeshStandardMaterial, { color: '#2a2f35', metalness: .6, roughness: .35 }, 1));
  const lit = dmat('crateL', () => new THREE.MeshBasicMaterial({ color: '#5ee7ff', toneMapped: false }));
  dbox(13, 10, 11, body, 0, 5, 0, g); dbox(13.4, 1, 11.4, dark, 0, .5, 0, g); dbox(13.4, 1, 11.4, dark, 0, 9.6, 0, g);
  dbox(5, 1.2, .2, lit, 0, 6, 5.55, g); if (seed % 2) { dbox(10, 7, 9, body, .5, 13.5, -.5, g); dbox(3, .8, .2, lit, 2, 14, 4.05, g); }
  return g;
}

/* ---------- table runners (square, laid as a diamond) ---------- */
function makeSquareCloth(kind) {
  const S = 1024, c = mkCanvas(S, S), x = c.getContext('2d'), r = rng(600 + kind.length), m = S * .035;
  x.save(); x.beginPath(); x.rect(m, m, S - 2 * m, S - 2 * m); x.clip();
  if (kind === 'linen' || kind === 'indigo') {
    const base = kind === 'linen' ? '#e4dfd4' : '#1f2c45', st = kind === 'linen' ? '#7d8a96' : '#e8e2d2';
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    for (let i = 0; i < S; i += 3) { x.fillStyle = kind === 'linen' ? `rgba(110,95,70,${.03 + r() * .05})` : `rgba(255,255,255,${.015 + r() * .03})`; x.fillRect(0, i, S, 1); x.fillRect(i, 0, 1, S); }
    if (kind === 'linen') { x.fillStyle = st; [.1, .13].forEach(k => { x.fillRect(0, S * k, S, 10); x.fillRect(0, S * (1 - k) - 10, S, 10); x.fillRect(S * k, 0, 10, S); x.fillRect(S * (1 - k) - 10, 0, 10, S); }); }
    else { x.strokeStyle = st; x.lineWidth = 3; x.setLineDash([14, 10]); for (let i = 64; i < S; i += 64) { x.beginPath(); x.moveTo(i, 40); x.lineTo(i, S - 40); x.stroke(); x.beginPath(); x.moveTo(40, i); x.lineTo(S - 40, i); x.stroke(); } x.setLineDash([]); }
  } else if (kind === 'kilim') {
    const cols = ['#a4482f', '#d39b3a', '#2f5d5a', '#e9dcc3', '#5a2a22'];
    x.fillStyle = cols[3]; x.fillRect(0, 0, S, S);
    for (let k = 7; k >= 1; k--) { const R = k * S / 15; x.fillStyle = cols[k % 3 === 0 ? 4 : k % 3]; x.beginPath(); x.moveTo(S / 2, S / 2 - R); x.lineTo(S / 2 + R, S / 2); x.lineTo(S / 2, S / 2 + R); x.lineTo(S / 2 - R, S / 2); x.closePath(); x.fill(); }
    x.fillStyle = cols[0]; [0, S - 60].forEach(p => { x.fillRect(0, p, S, 60); x.fillRect(p, 0, 60, S); });
    x.fillStyle = cols[1]; for (let i = 0; i < S; i += 40) { [10, S - 50].forEach(p => { x.beginPath(); x.moveTo(i, p + 40); x.lineTo(i + 20, p); x.lineTo(i + 40, p + 40); x.fill(); x.beginPath(); x.moveTo(p + 40, i); x.lineTo(p, i + 20); x.lineTo(p + 40, i + 40); x.fill(); }); }
    for (let i = 0; i < 60000; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,240,220' : '30,15,8'},${r() * .1})`; x.fillRect(r() * S, r() * S, 1, 2); }
  } else if (kind === 'plaid') {
    const p = makePlaid(); x.drawImage(p, 0, 0, S / 2, S / 2); x.drawImage(p, S / 2, 0, S / 2, S / 2); x.drawImage(p, 0, S / 2, S / 2, S / 2); x.drawImage(p, S / 2, S / 2, S / 2, S / 2);
  } else if (kind === 'persian') {
    x.fillStyle = '#6e1f22'; x.fillRect(0, 0, S, S);
    x.fillStyle = '#1f2a48'; [0, S - 90].forEach(p => { x.fillRect(0, p, S, 90); x.fillRect(p, 0, 90, S); });
    x.strokeStyle = '#c9a25a'; x.lineWidth = 5; x.strokeRect(100, 100, S - 200, S - 200); x.strokeRect(40, 40, S - 80, S - 80);
    const cx = S / 2; [[300, '#1f2a48'], [210, '#c9a25a'], [120, '#8a2a2c'], [50, '#e1d2b0']].forEach(([R, col]) => { x.fillStyle = col; x.beginPath(); x.moveTo(cx, cx - R); x.lineTo(cx + R, cx); x.lineTo(cx, cx + R); x.lineTo(cx - R, cx); x.closePath(); x.fill(); });
    for (let a = 0; a < 16; a++) { x.fillStyle = '#e1d2b0'; x.beginPath(); x.arc(cx + Math.cos(a * .3927) * 360, cx + Math.sin(a * .3927) * 360, 9, 0, 7); x.fill(); }
    for (let i = 0; i < 60000; i++) { x.fillStyle = `rgba(${r() > .5 ? '255,230,200' : '0,0,0'},${r() * .1})`; x.fillRect(r() * S, r() * S, 1, 1.5); }
  }
  x.restore();
  if (kind !== 'linen' && kind !== 'indigo') { x.strokeStyle = kind === 'plaid' ? '#7a1015' : kind === 'persian' ? '#e8dcc0' : '#d9c9a8'; x.lineWidth = 3; for (let i = m; i < S - m; i += 7) { [[i, m, i + (r() - .5) * 3, 0], [i, S - m, i + (r() - .5) * 3, S]].forEach(([a, b, c2, d]) => { x.beginPath(); x.moveTo(a, b); x.lineTo(c2, d); x.stroke(); }); } }
  return c;
}

/* ---------- where props can go in this room ---------- */
const SLOTS = { wallL: [-112, 118], wallR: [110, 118], floorL: [-120, 16], floorR: [118, 16], tableL: [-81, 31], tableR: [79, 31], shelfTop: SHELF.top + SHELF.th };
function onTable(g) { g.position.y += TABLE.top; return g; }

/* ---------- presets ---------- */
const RGB = { mats: [], color: new THREE.Color() };
const woodSpec = (key, base, seed, rough = .45) => () => ({ map: rtex(key, () => makeRealWood(1024, 512, base, seed)), color: '#ffffff', rough, metal: 0 });
const ROOMS = {
  salon: {
    name: 'Salón', sw: ['#2a2926', '#5a2f1d', '#ebe2cd'],
    wall: () => rtex('wall', () => makePaint('#2b2a27', 60, .05), [6, 2]), wallRough: .92,
    floor: () => rtex('floor', () => makeRealWood(1024, 1024, '#3b2a1e', 2, { planks: 8 }), [6, 2.2]), floorRough: .5,
    wood: woodSpec('wood', '#5a2f1d', 1, .4), shelf: woodSpec('shelf', '#3c2216', 4, .46), dark: () => ({ map: null, color: '#1d1410', rough: .7 }),
    skirt: '#161412', frame: '#1a1a1a', cloth: makeLaceCloth, props: true, lamp: false,
    sky: '#c9cbff', ground: '#3a2a20', hemiMul: .55, keyMul: 1.25, keyTint: '#ffd0a0', envMul: .6, expMul: 1.05, led: '#ffd59a', ledMul: 0, bg: '#0f0e0d',
    decor() { }
  },
  nordico: {
    name: 'Nórdico', sw: ['#e7e2da', '#c49a6c', '#7d8a96'],
    wall: () => rtex('wall', () => makePaint('#e4ded5', 61, .035), [6, 2]), wallRough: .92,
    floor: () => rtex('floor', () => makeRealWood(1024, 1024, '#c8aa82', 62, { planks: 8 }), [6, 2.2]), floorRough: .42,
    wood: woodSpec('wood', '#c39a6b', 63, .5), shelf: () => ({ map: null, color: '#ebe6de', rough: .6 }), dark: () => ({ map: null, color: '#e2ddd5', rough: .75 }),
    skirt: '#f2eee8', frame: '#efebe4', cloth: () => makeSquareCloth('linen'), props: false, lamp: true,
    sky: '#fff6ec', ground: '#9a8670', hemiMul: 2.2, keyMul: .95, keyTint: '#fff3e6', envMul: 1.3, expMul: 1.02, led: '#ffe6c4', ledMul: 0, bg: '#d8d1c7',
    decor() {
      const oak = dmat('oak', () => M(THREE.MeshStandardMaterial, { map: rtex('wood', () => makeRealWood(1024, 512, '#c39a6b', 63)), roughness: .5 }, .5)), black = dmat('blk', () => M(THREE.MeshStandardMaterial, { color: '#1c1c1e', roughness: .45 }, .8));
      framed(decorGroup, SLOTS.wallL[0], 126, 22, 30, makeAbstractPrint(1), black); framed(decorGroup, SLOTS.wallR[0], 112, 18, 24, makeAbstractPrint(6), oak);
      const pot = dmat('pot', () => M(THREE.MeshStandardMaterial, { color: '#efece6', roughness: .35 }, .8));
      plant(SLOTS.floorR[0], SLOTS.floorR[1], 2.1, pot, 70);
      const mug = new THREE.Mesh(new THREE.CylinderGeometry(4, 3.6, 9, 28), dmat('mug', () => M(THREE.MeshStandardMaterial, { color: '#d9d4cb', roughness: .3 }, 1))); mug.position.set(SLOTS.tableL[0], TABLE.top + 4.5, SLOTS.tableL[1]); mug.castShadow = true; decorGroup.add(mug);
    }
  },
  acogedor: {
    name: 'Acogedor', sw: ['#c08a6c', '#b98550', '#d39b3a'],
    wall: () => rtex('wall', () => makeLimewash('#a8735a', 81), [6, 2]), wallRough: .95,
    floor: () => rtex('floor', () => makeRealWood(1024, 1024, '#a8743f', 82, { planks: 8 }), [6, 2.2]), floorRough: .48,
    wood: woodSpec('wood', '#9a6a3c', 83, .5), shelf: woodSpec('shelf', '#7a5230', 84, .55), dark: () => ({ map: null, color: '#4a2f1c', rough: .7 }),
    skirt: '#e9dcc8', frame: '#e9dcc8', cloth: () => makeSquareCloth('kilim'), props: false, lamp: true,
    sky: '#ffd9a8', ground: '#4a2c1a', hemiMul: 1.1, keyMul: .7, keyTint: '#ffbe7a', envMul: .8, expMul: 1.1, led: '#ffb866', ledMul: .8, bg: '#1a120d',
    decorLight: { color: '#ffa04a', int: 1.1, x: SLOTS.tableL[0] + 4, y: TABLE.top + 14, z: SLOTS.tableL[1] + 6, dist: 90, flicker: true },
    decor() {
      garland([[SHELF.x0 - 6, SHELF.top + 22, 6], [SHELF.cx, SHELF.top + 24, 6], [SHELF.x1 + 6, SHELF.top + 22, 0]], 3.2);
      candle(SLOTS.tableL[0] - 4, TABLE.top, SLOTS.tableL[1] - 2, 9, 1.8); candle(SLOTS.tableL[0] + 2, TABLE.top, SLOTS.tableL[1] + 2, 6, 1.6); candle(SLOTS.tableL[0] + 6.5, TABLE.top, SLOTS.tableL[1] - 3, 4, 1.4);
      const oak = dmat('oakf', () => M(THREE.MeshStandardMaterial, { map: rtex('wood', () => makeRealWood(1024, 512, '#9a6a3c', 83)), roughness: .5 }, .5));
      framed(decorGroup, SLOTS.wallR[0], 118, 20, 26, makeAbstractPrint(3), oak);
      const pot = dmat('potT', () => M(THREE.MeshStandardMaterial, { color: '#b5653f', roughness: .8 }, .5));
      plant(SLOTS.floorR[0], SLOTS.floorR[1], 2, pot, 110);
      onTable(basket(SLOTS.tableR[0], SLOTS.tableR[1]));
    }
  },
  cabana: {
    name: 'Cabaña', sw: ['#9a6a3e', '#a0703f', '#a3161c'],
    wall: () => rtex('wall', () => makeKnotty(1024, 1024, '#8a5e36', 85, 10), [4, 1.6]), wallRough: .7,
    floor: () => rtex('floor', () => makeKnotty(1024, 1024, '#5a3b22', 86, 6), [5, 2.4]), floorRough: .55,
    wood: () => ({ map: rtex('wood', () => makeKnotty(1024, 512, '#a0703f', 87, 1)), color: '#ffffff', rough: .55 }), shelf: woodSpec('shelf', '#4a2f1a', 88, .6), dark: () => ({ map: null, color: '#2a1a0e', rough: .7 }),
    skirt: '#4a2f1a', frame: '#4a2f1a', cloth: () => makeSquareCloth('plaid'), props: false, lamp: true,
    sky: '#ffcf9a', ground: '#3a2214', hemiMul: 1.0, keyMul: .75, keyTint: '#ffb070', envMul: .7, expMul: 1.1, led: '#ffb060', ledMul: .7, bg: '#140d08',
    decorLight: { color: '#ff8a3a', int: 1.6, x: -170, y: 40, z: 90, dist: 320, flicker: true },
    decor() {
      const frameW = dmat('cframe', () => M(THREE.MeshStandardMaterial, { map: rtex('shelf', () => makeRealWood(1024, 512, '#4a2f1a', 88)), roughness: .6 }, .5));
      const art = mkCanvas(360, 260), x = art.getContext('2d'); drawArt(x, 360, 260, { id: 'cab', art: 'mountains', pal: ['#1d2a36', '#5b7a94', '#d68a4a', '#f1d7b0', '#ffffff'], artOpt: {} }, 1); gradeArt(x, 360, 260, rng(1));
      framed(decorGroup, SLOTS.wallR[0], 120, 26, 19, art, frameW, { mat: false, fw: 2, depth: 2 });
      lantern(SLOTS.tableL[0], TABLE.top, SLOTS.tableL[1]);
      const pot = dmat('potC2', () => M(THREE.MeshStandardMaterial, { color: '#6b4a32', roughness: .8 }, .5));
      plant(SLOTS.floorR[0], SLOTS.floorR[1], 1.9, pot, 120);
      const ls = logStack(SLOTS.floorL[0] + 4, SLOTS.floorL[1]); ls.scale.setScalar(1.6);
    }
  },
  japones: {
    name: 'Japonés', sw: ['#efe8d8', '#d9c29a', '#1f2c45'],
    wall: () => rtex('wall', () => makeShoji(false), [12, 2.4]), wallRough: .95, wallEm: () => rtex('wallEm', () => makeShoji(true), [12, 2.4]), wallEmI: .4,
    floor: () => rtex('floor', makeTatami, [4, 1.2]), floorRough: .85,
    wood: woodSpec('wood', '#b8986c', 89, .5), shelf: woodSpec('shelf', '#5a4430', 90, .55), dark: () => ({ map: null, color: '#3a2c20', rough: .7 }),
    skirt: '#5a4430', frame: '#5a4430', cloth: () => makeSquareCloth('indigo'), props: false, lamp: false,
    sky: '#fff4e0', ground: '#7a6a50', hemiMul: 1.8, keyMul: .8, keyTint: '#fff0dc', envMul: 1.1, expMul: 1.02, led: '#ffe2b0', ledMul: 0, bg: '#2a241c',
    decorLight: { color: '#ffc27a', int: .9, x: SLOTS.wallR[0] - 6, y: 150, z: 4, dist: 110 },
    decor() {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(13, 34), M(THREE.MeshStandardMaterial, { map: tex(makeScroll(131)), roughness: .85 }, .5)); m.position.set(SLOTS.wallL[0], 116, WALL_Z + .35); decorGroup.add(m); DM.scr = m.material;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(.4, .4, 15, 10), dmat('rod', () => M(THREE.MeshStandardMaterial, { color: '#2b2a28', roughness: .4 }, .6))); rod.rotation.z = Math.PI / 2; rod.position.set(SLOTS.wallL[0], 99, WALL_Z + .6); decorGroup.add(rod);
      paperLantern(SLOTS.wallR[0] - 6, 150, 4);
      onTable(bonsai(SLOTS.tableR[0] + 1, SLOTS.tableR[1] - 4, 140));
    }
  },
  biblioteca: {
    name: 'Biblioteca', sw: ['#2f4136', '#6b4b34', '#6e1f22'],
    wall: () => rtex('wall', () => makePaint('#2e4034', 66, .05), [6, 2]), wallRough: .85,
    floor: () => rtex('floor', () => makeRealWood(1024, 1024, '#5e402a', 67, { planks: 12 }), [8, 2.2]), floorRough: .38,
    wood: woodSpec('wood', '#6b4b34', 68, .42), shelf: woodSpec('shelf', '#4a3020', 69, .5), dark: () => ({ map: null, color: '#24180f', rough: .6 }),
    skirt: '#2a1c12', frame: '#3b2719', cloth: () => makeSquareCloth('persian'), props: false, lamp: true,
    sky: '#ffe6c4', ground: '#2a2018', hemiMul: 1.1, keyMul: .85, keyTint: '#ffd2a0', envMul: .75, expMul: 1.06, led: '#ffd08a', ledMul: .6, bg: '#120e0b',
    decor() {
      const gold = dmat('gold', () => M(THREE.MeshStandardMaterial, { color: '#b08d4a', roughness: .32, metalness: .85 }, 1.3));
      framed(decorGroup, SLOTS.wallR[0], 118, 24, 32, makePainting(2), gold, { mat: false, fw: 2.2, depth: 2.2, gloss: true });
      const pot = dmat('potg', () => M(THREE.MeshPhysicalMaterial, { color: '#2c4a37', roughness: .25, clearcoat: .8 }, 1));
      plant(SLOTS.floorR[0], SLOTS.floorR[1] + 4, 2, pot, 90);
      const r = rng(400), leathers = ['#5a1f1b', '#1f3348', '#2f4a2c', '#6b4a22', '#3a2a22'];
      let y = TABLE.top; for (let k = 0; k < 4; k++) { const w = 16 - k * 1.2 + r() * 1.5, h = 2.4 + r() * 1.6, b = dbox(w, h, 11 - k * .5, M(THREE.MeshStandardMaterial, { color: leathers[k % leathers.length], roughness: .55 }, .6), SLOTS.tableL[0] + (r() - .5) * 1.5, y + h / 2, SLOTS.tableL[1] - 2); b.rotation.y = (r() - .5) * .3; DM['bk' + k] = b.material; y += h; }
    }
  },
  loft: {
    name: 'Loft industrial', sw: ['#8e4a36', '#4a3526', '#8c8a85'],
    wall: () => rtex('wall', makeBrick, [8.3, 2.2]), wallRough: .9,
    floor: () => rtex('floor', makeConcrete, [6.25, 1.75]), floorRough: .55,
    wood: woodSpec('wood', '#4f3a2a', 65, .55), shelf: () => ({ map: null, color: '#1b1b1d', rough: .4, metal: .6 }), dark: () => ({ map: null, color: '#141416', rough: .4, metal: .6 }),
    skirt: '#1b1b1d', frame: '#1b1b1d', cloth: null, props: true, lamp: false,
    sky: '#ffd9b0', ground: '#3a2c22', hemiMul: 1.1, keyMul: .9, keyTint: '#ffcc90', envMul: .75, expMul: 1.05, led: '#ffb766', ledMul: 0, bg: '#14100e',
    decorLight: { color: '#ffb35c', int: 1.2, x: SLOTS.tableL[0] + 6, y: 112, z: 24, dist: 120 },
    decor() {
      const cord = dmat('cord', () => M(THREE.MeshStandardMaterial, { color: '#111111', roughness: .6 }, .5)), sock = dmat('sock', () => M(THREE.MeshStandardMaterial, { color: '#7a5a34', roughness: .3, metalness: .85 }, 1.2));
      const bulb = dmat('bulb', () => new THREE.MeshBasicMaterial({ color: '#ffcf88', toneMapped: false }));
      const bx = SLOTS.tableL[0] + 6, by = 115, bz = 24;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, 120, 6), cord); c.position.set(bx, by + 62, bz); decorGroup.add(c);
      const s = new THREE.Mesh(new THREE.CylinderGeometry(.8, .8, 2.6, 16), sock); s.position.set(bx, by + 3, bz); decorGroup.add(s);
      const b = new THREE.Mesh(new THREE.SphereGeometry(1.9, 18, 14), bulb); b.scale.y = 1.35; b.position.set(bx, by, bz); decorGroup.add(b);
      glowSprite('#ffb35c', 18, bx, by, bz + .2, .55);
      const blk = dmat('blkm', () => M(THREE.MeshStandardMaterial, { color: '#151517', roughness: .35, metalness: .6 }, 1));
      framed(decorGroup, SLOTS.wallR[0], 120, 24, 17, makeCityPhoto(1), blk, { mat: true });
      const potC = dmat('potc', () => M(THREE.MeshStandardMaterial, { color: '#8f8c86', roughness: .85 }, .6));
      plant(SLOTS.floorR[0], SLOTS.floorR[1], 2.1, potC, 80);
    }
  },
  videoclub: {
    name: 'Videoclub', sw: ['#c3c9cf', '#b9bdc2', '#c8202c'],
    wall: () => rtex('wall', makeSlatwall, [10, 5.9]), wallRough: .6,
    floor: () => rtex('floor', makeCarpet, [15, 4.2]), floorRough: 1,
    wood: () => ({ map: null, color: '#b7bcc2', rough: .42, metal: .45 }), shelf: () => ({ map: null, color: '#d4d7db', rough: .45, metal: .3 }), dark: () => ({ map: null, color: '#7d848c', rough: .55, metal: .3 }),
    skirt: '#2b3240', frame: '#2b3240', cloth: null, props: false, lamp: false,
    sky: '#f2f6ff', ground: '#5d6676', hemiMul: 2.4, keyMul: .8, keyTint: '#f0f6ff', envMul: 1.25, expMul: 1.02, led: '#f3f8ff', ledMul: 1.1, bg: '#1d2230',
    decor() {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(76, 15.8), M(THREE.MeshStandardMaterial, { map: tex(makeSignBoard(T('VIDEOCLUB'), '#c8202c', '#ffffff', T('ALQUILER Y VENTA · ABIERTO'))), roughness: .5 }, .6));
      sign.position.set(SHELF.cx, SHELF.top + SHELF.th + 12, WALL_Z + 1.4); decorGroup.add(sign); DM.sign = sign.material;
      const signs = [[[T('ALQUILER'), 46], [T('3 DÍAS'), 64, '#ffd23f'], [T('300 PTA'), 40]], [[T('MARTES'), 44], ['2×1', 80, '#ff6b5e'], [T('EN NOVEDADES'), 26]]];
      [[SLOTS.wallL[0], 0], [SLOTS.wallR[0], 1]].forEach(([x, i]) => {
        const face = M(THREE.MeshStandardMaterial, { map: tex(makeAFrame(signs[i], 90 + i)), roughness: .8 }, .5); DM['af' + i] = face;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(22, 34), face); m.position.set(x, 118, WALL_Z + .4); decorGroup.add(m);
      });
    }
  },
  gamer: {
    name: 'Gamer', sw: ['#141417', '#1b1b1e', '#9b5cff'],
    wall: () => rtex('wall', makeSlats, [31, 6]), wallRough: .8,
    floor: () => rtex('floor', () => makeRealWood(1024, 1024, '#2a2826', 64, { planks: 8 }), [6, 2.2]), floorRough: .35,
    wood: () => ({ map: null, color: '#1a1a1d', rough: .45, metal: .1 }), shelf: () => ({ map: null, color: '#141416', rough: .4, metal: .1 }), dark: () => ({ map: null, color: '#0f0f11', rough: .6 }),
    skirt: '#111113', frame: '#111113', cloth: null, props: false, lamp: false,
    sky: '#8a84c4', ground: '#16121a', hemiMul: .75, keyMul: .62, keyTint: '#d4d8ff', envMul: .5, expMul: 1.08, fillMul: 1.15, led: '#9b5cff', ledMul: 1.4, rgb: true, bg: '#0b0a0e',
    decor() {
      const halo = haloMat('gHalo', '#9b5cff', .45), tubeMat = dmat('tube', () => new THREE.MeshBasicMaterial({ color: '#9b5cff', toneMapped: false }));
      RGB.mats.push(halo, tubeMat);
      haloQuad(halo, 260, 80, SHELF.cx, SHELF.board + 12, WALL_Z + .2);
      haloQuad(halo, 120, 70, TV.x, TV.y + 4, WALL_Z + .2);
      [['PLAY', '#ff4fd8', SLOTS.wallL[0]], ['GG', '#33e1ff', SLOTS.wallR[0]]].forEach(([t, c, x], i) => {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(30, 11.7), new THREE.MeshBasicMaterial({ map: tex(makeNeon(t, c)), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.position.set(x, 120, WALL_Z + .7); decorGroup.add(m); DM['neon' + i] = m.material;
        haloQuad(haloMat('nh' + i, c, .35), 60, 30, x, 120, WALL_Z + .25);
      });
      [SLOTS.floorL[0] + 8, SLOTS.floorR[0] - 8].forEach(x => {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, 120, 12), tubeMat); tube.position.set(x, 62, -8); decorGroup.add(tube);
        dbox(4, 2, 4, dmat('base', () => M(THREE.MeshStandardMaterial, { color: '#121214', roughness: .4 }, .8)), x, 1, -8);
        const s = haloQuad(haloMat('gSpot', '#9b5cff', .45), 40, 150, x, 64, WALL_Z + .3); RGB.mats.push(s.material);
      });
    }
  },
  nave: {
    name: 'Nave espacial', sw: ['#5d6670', '#d5d9de', '#5ee7ff'],
    wall: () => rtex('wall', () => makeHull(false), [8, 2.2]), wallRough: .45, wallEm: () => rtex('wallEm', () => makeHull(true), [8, 2.2]), wallEmI: 1.3,
    floor: () => rtex('floor', makePlate, [24, 7]), floorRough: .4,
    wood: () => ({ map: null, color: '#d5d9de', rough: .35, metal: .35 }), shelf: () => ({ map: null, color: '#b9bec5', rough: .35, metal: .45 }), dark: () => ({ map: null, color: '#2a2f35', rough: .4, metal: .5 }),
    skirt: '#2a2f35', frame: '#2a2f35', cloth: null, props: false, lamp: false,
    sky: '#cdeaff', ground: '#121820', hemiMul: 1.4, keyMul: .85, keyTint: '#dff2ff', envMul: 1.2, expMul: 1.0, led: '#5ee7ff', ledMul: 1.3, bg: '#05070b',
    decor() {
      const ring = dmat('port', () => M(THREE.MeshStandardMaterial, { color: '#9aa3ad', metalness: .85, roughness: .3 }, 1.3));
      const strip = dmat('strip', () => new THREE.MeshBasicMaterial({ color: '#5ee7ff', toneMapped: false }));
      dbox(1500, .5, .3, strip, 0, 8.5, WALL_Z + .4);
      [[SLOTS.wallL[0], 0], [SLOTS.wallR[0], 1]].forEach(([x, i]) => {
        const g = new THREE.Group(); g.position.set(x, 120, WALL_Z + .5); decorGroup.add(g);
        const t = new THREE.Mesh(new THREE.TorusGeometry(11, 1.6, 14, 40), ring); g.add(t);
        const sp = new THREE.Mesh(new THREE.CircleGeometry(10.9, 40), new THREE.MeshBasicMaterial({ map: tex(makeSpace(150 + i)), toneMapped: false })); sp.position.z = -.2; g.add(sp); DM['sp' + i] = sp.material;
        const gl = new THREE.Mesh(new THREE.CircleGeometry(10.9, 40), glassMat); gl.position.z = .3; g.add(gl);
        for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2, b = new THREE.Mesh(new THREE.SphereGeometry(.5, 8, 6), ring); b.position.set(Math.cos(a) * 11, Math.sin(a) * 11, 1.2); g.add(b); }
      });
      const c1 = sciCrate(SLOTS.floorR[0], SLOTS.floorR[1], 1); c1.scale.setScalar(1.8);
      const c2 = sciCrate(SLOTS.floorL[0] + 6, SLOTS.floorL[1], 3); c2.scale.setScalar(1.6);
    }
  }
};
const ROOM_ORDER = ['salon', 'nordico', 'acogedor', 'cabana', 'japones', 'biblioteca', 'loft', 'videoclub', 'gamer', 'nave'];
let RP = ROOMS.salon;
const decorLight = new THREE.PointLight('#ffffff', 0, 90, 2); scene.add(decorLight);
const ledBase = new THREE.Color('#ffd59a');
/* a soft, shadowless fill in front of the shelf so the spines read in every room */
const shelfFill = [-60, 55].map(dx => { const l = new THREE.PointLight('#ffe9d2', 0, 260, 2); l.position.set(SHELF.cx + dx, SHELF.board + 26, SHELF.front + 75); scene.add(l); return l; });
const ledLights = [-62, 0, 62].map(dx => { const l = new THREE.PointLight('#ffd59a', 0, 120, 2); l.position.set(SHELF.cx + dx, SHELF.top - 3, SHELF.front + 4); scene.add(l); return l; });

/* ---------- light presets ---------- */
const LIGHT = {
  /* the look of the CD Shelf video: a dark room, one warm spot from the upper left on the table, the rest in shadow */
  cine: { exp: .96, env: .36, hemi: .05, key: 2.6, keyCol: '#ffcf9c', lamp: .6, shade: .5, led: .7, motes: .3, fill: .16, bg: '#080908', keyPos: [-150, 330, 215], keyAim: [-6, 80, 8], angle: .4, grade: true },
  noche: { exp: .95, env: .45, hemi: .12, key: .8, keyCol: '#ffc28a', lamp: 1.7, shade: .95, led: 1.35, motes: .16, fill: .55, bg: '#0b0a0c' },
  tarde: { exp: 1.05, env: .7, hemi: .22, key: 1.15, keyCol: '#ffcc98', lamp: 1.05, shade: .6, led: .95, motes: .26, fill: .8, bg: '#141210' },
  dia: { exp: 1.1, env: 1.0, hemi: .45, key: 1.4, keyCol: '#fff2e2', lamp: .25, shade: .15, led: .35, motes: .2, fill: .95, bg: '#26232a' }
};
let LP = LIGHT.tarde;
/* film grain for the cinema light, made once */
try { document.documentElement.style.setProperty('--grain', `url(${makeGrainCanvas(7, 160, 128, 90).toDataURL()})`); } catch (e) { }
function applyLight(name) { LP = LIGHT[name] || LIGHT.tarde; applyEnv(); document.documentElement.classList.toggle('cine', !!LP.grade); }

function setSurface(mat, spec) { mat.map = spec.map || null; mat.color.set(spec.color); mat.roughness = spec.rough; mat.metalness = spec.metal || 0; mat.needsUpdate = true; }
function applyRoom(name) {
  RP = ROOMS[name] || ROOMS.salon;
  freeDecor(); RGB.mats = [];
  const olds = [wall.material.map, floorMat.map, woodMat.map, shelfMat.map, woodDark.map];
  freeRT();
  const wm = wall.material; wm.map = RP.wall(); wm.roughness = RP.wallRough;
  if (RP.wallEm) { wm.emissive.set('#ffffff'); wm.emissiveMap = RP.wallEm(); wm.emissiveIntensity = RP.wallEmI; } else { wm.emissive.set('#000000'); wm.emissiveMap = null; wm.emissiveIntensity = 0; }
  wm.needsUpdate = true;
  floorMat.map = RP.floor(); floorMat.roughness = RP.floorRough; floorMat.needsUpdate = true;
  setSurface(woodMat, RP.wood()); setSurface(shelfMat, RP.shelf()); setSurface(woodDark, RP.dark());
  skirtMat.color.set(RP.skirt); paint.color.set(RP.frame || '#e3ddd2');
  setCloth(RP.cloth ? RP.cloth() : null);
  propsGroup.visible = !!RP.props;
  lampGroup.visible = !!RP.lamp; lampShadeMat.color.set(RP.shade || '#f3ece0');
  olds.forEach(t => { if (t && !Object.values(RT).includes(t)) t.dispose(); });
  /* lights a room does not use are hidden, so they cost nothing in the shaders */
  decorLight.visible = !!RP.decorLight; lampLight.visible = !!RP.lamp;
  const ledOn = RP.ledMul > 0; shelfLed.visible = ledOn; ledLights.forEach(l => { l.visible = ledOn; });
  if (RP.decorLight) { const D = RP.decorLight; decorLight.position.set(D.x, D.y, D.z); decorLight.color.set(D.color); decorLight.distance = D.dist; }
  buildDecor(); applyEnv();
}
let decorLayout = '';
function buildDecor() {
  freeDecor(); RGB.mats = []; FX.twinkle = []; FX.flames = []; decorLayout = prefs.layout;
  if (RP.decor) RP.decor();
  /* with the bookcases standing on the right, what would collide with them stays out */
  if (prefs.layout === 'cases') { const p = new V3(); decorGroup.children.forEach(o => { o.getWorldPosition(p); if (p.x > 96) o.visible = false; }); }
}
function applyEnv() {
  const L = LP, R = RP;
  renderer.toneMappingExposure = L.exp * (R.expMul || 1); setEnvK(L.env * R.envMul);
  hemi.color.set(R.sky); hemi.groundColor.set(R.ground); hemi.intensity = L.hemi * R.hemiMul;
  key.intensity = L.key * R.keyMul; key.color.set(L.keyCol).lerp(new THREE.Color(R.keyTint), .55);
  KEY_POS.fromArray(L.keyPos || KEY_POS0); KEY_AIM.fromArray(L.keyAim || KEY_AIM0); key.angle = L.angle || .62; fill.intensity = L.grade ? .07 : .16;
  lampLight.intensity = R.lamp ? L.lamp : 0; lampShadeMat.emissiveIntensity = R.lamp ? L.shade : 0;
  shelfFill.forEach(l => { l.intensity = L.fill * (R.fillMul ?? 1); l.color.set(R.keyTint).lerp(new THREE.Color('#ffffff'), .5); });
  ledBase.set(R.led); stripLedMat.color.copy(ledBase).multiplyScalar(.25 + L.led * R.ledMul * .9); ledLights.forEach(l => { l.color.copy(ledBase); l.intensity = L.led * R.ledMul * .55; });
  const bg = new THREE.Color(R.bg).lerp(new THREE.Color(L.bg), .35); scene.background.copy(bg); scene.fog.color.copy(bg);
}
/* per frame: RGB cycling, flickering flames and twinkling fairy lights */
function flick(now, ph) { return .78 + .12 * Math.sin(now * .011 + ph) + .07 * Math.sin(now * .029 + ph * 2.1) + .05 * Math.sin(now * .061 + ph * .7); }
function updateRoom(dt, now) {
  if (RP.rgb) {
    const h = .53 + .25 * (.5 + .5 * Math.sin(now * .00035)); RGB.color.setHSL(h, .85, .58);
    stripLedMat.color.copy(RGB.color).multiplyScalar(.25 + LP.led * RP.ledMul * .9); ledLights.forEach(l => l.color.copy(RGB.color));
    RGB.mats.forEach(m => m.color.copy(RGB.color));
  }
  if (!RM) {
    for (const t of FX.twinkle) t.m.opacity = t.base * (.7 + .3 * Math.sin(now * .0021 + t.ph));
    for (const f of FX.flames) { const k = flick(now, f.ph); f.f.scale.set(1.1 * f.s * (.9 + .1 * k), 2.2 * f.s * k, 1); f.f.material.opacity = .75 + .25 * k; f.g.material.opacity = .3 + .2 * k; }
  }
  const D = RP.decorLight;
  if (D) decorLight.intensity = D.int * (D.flicker && !RM ? flick(now, 0) : 1);
}
