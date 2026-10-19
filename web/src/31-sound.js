/* =====================================================================
   SOUND: modelled foley. Each effect is a contact (a click, a knock, a
   rub) exciting the resonances of the material involved: polypropylene
   keep cases, polystyrene jewel cases, card, wood, the console chassis
   and a polycarbonate disc. Rendered once into buffers, played back with
   small variations through a short room reverb.
   ===================================================================== */
function makeFoley(SR) {
  const N = s => Math.max(1, Math.ceil(s * SR));
  const arr = s => new Float32Array(N(s));
  function biquad(x, type, f, q = .707) {
    const w = 2 * Math.PI * Math.min(f, SR * .45) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let b0, b1, b2; const a0 = 1 + al, a1 = -2 * c / a0, a2 = (1 - al) / a0;
    if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    else { b0 = al; b1 = 0; b2 = -al; }
    b0 /= a0; b1 /= a0; b2 /= a0;
    let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
    for (let n = 0; n < x.length; n++) { const xn = x[n], y = b0 * xn + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = xn; y2 = y1; y1 = y; x[n] = y; }
    return x;
  }
  /* state-variable filter with a cutoff that moves over time */
  function sweep(x, fAt, q, mode) {
    let ic1 = 0, ic2 = 0; const k = 1 / q;
    for (let n = 0; n < x.length; n++) {
      const g = Math.tan(Math.PI * Math.min(fAt(n / SR), SR * .45) / SR), a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
      const v3 = x[n] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3; ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
      x[n] = mode === 'lp' ? v2 : v1;
    }
    return x;
  }
  function norm(x, p) { let m = 0; for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > m) m = v; } if (m > 1e-9) { const k = p / m; for (let i = 0; i < x.length; i++) x[i] *= k; } return x; }
  function add(dst, src, at = 0, g = 1) { const o = Math.round(at * SR); for (let i = 0; i < src.length && o + i < dst.length; i++) if (o + i >= 0) dst[o + i] += src[i] * g; return dst; }
  function fadeOut(x, sec = .01) { const n = Math.min(x.length, N(sec)); for (let i = 0; i < n; i++) x[x.length - 1 - i] *= i / n; return x; }
  /* contact force: narrow = bright click, wide = dull knock */
  function pulse(len, at, widthMs, amp = 1, x = arr(len)) { const W = Math.max(2, Math.round(widthMs * SR / 1000)), o = Math.round(at * SR); for (let k = 0; k < W && o + k < x.length; k++) x[o + k] += amp * .5 * (1 - Math.cos(2 * Math.PI * k / W)); return x; }
  function burst(len, at, ms, amp, r, x = arr(len)) { const W = Math.max(2, Math.round(ms * SR / 1000)), o = Math.round(at * SR); for (let k = 0; k < W && o + k < x.length; k++) x[o + k] += amp * (r() * 2 - 1) * Math.pow(1 - k / W, 2); return x; }
  function modes(x, list, r, spread = .03) {
    const y = new Float32Array(x.length); let first = -1, last = -1;
    for (let n = 0; n < x.length; n++) if (x[n] !== 0) { if (first < 0) first = n; last = n; }
    if (first < 0) return y;
    for (const [f0, tau, g] of list) {
      const f = f0 * (1 + (r() - .5) * 2 * spread); if (f > SR * .45) continue;
      const w = 2 * Math.PI * f / SR, rr = Math.exp(-1 / (tau * SR)), a1 = 2 * rr * Math.cos(w), a2 = -rr * rr, b = g * Math.sin(w), end = Math.min(x.length, last + Math.ceil(8 * tau * SR));
      let y1 = 0, y2 = 0;
      for (let n = first; n < end; n++) { const v = a1 * y1 + a2 * y2 + b * x[n]; y2 = y1; y1 = v; y[n] += v; }
    }
    return y;
  }
  /* rubbing: stick-slip micro-impacts plus a little noise, following a speed envelope */
  function rub(len, env, rate, r, noise = .2, maxW = 3) {
    const x = arr(len);
    for (let n = 0; n < x.length; n++) {
      const e = env(n / SR); if (e <= 0) continue;
      if (r() < rate * e / SR) { const a = (.3 + .7 * r()) * e * (r() < .5 ? -1 : 1), W = 1 + Math.floor(r() * maxW); for (let k = 0; k < W && n + k < x.length; k++) x[n + k] += a * (1 - k / W); }
      x[n] += (r() * 2 - 1) * e * noise;
    }
    return x;
  }
  const hann = (t0, t1, p = 1) => t => t < t0 || t > t1 ? 0 : Math.pow(Math.max(0, Math.sin(Math.PI * (t - t0) / (t1 - t0))), p);
  /* table oscillators: much cheaper than Math.sin for long harmonic tones */
  const TS = 8192, SINT = new Float32Array(TS + 1); for (let i = 0; i <= TS; i++) SINT[i] = Math.sin(2 * Math.PI * i / TS);
  const K = TS / (2 * Math.PI);
  function readT(t, ph) { let u = ph * K; u -= Math.floor(u / TS) * TS; const i = u | 0, f = u - i; return t[i] + (t[i + 1] - t[i]) * f; }
  const fsin = ph => readT(SINT, ph);
  function table(fn) { const t = new Float32Array(TS + 1); for (let i = 0; i <= TS; i++) t[i] = fn(2 * Math.PI * i / TS); return t; }
  const MAT = {
    pp: [[340, .022, .55], [580, .018, .7], [860, .016, .8], [1240, .013, 1], [1710, .011, .95], [2280, .009, .85], [2950, .0075, .7], [3800, .006, .55], [4900, .005, .4], [6300, .004, .3], [8100, .003, .2]],
    ps: [[720, .034, .45], [1180, .03, .65], [1730, .027, .85], [2380, .024, 1], [3150, .021, .9], [4020, .018, .8], [5100, .015, .6], [6400, .012, .45], [8000, .01, .3], [9800, .008, .2]],
    card: [[150, .016, 1], [290, .013, .8], [520, .011, .6], [900, .008, .4], [1500, .006, .25], [2600, .004, .12]],
    wood: [[180, .032, 1], [410, .026, .75], [760, .02, .55], [1300, .015, .35], [2100, .01, .2], [3300, .007, .1]],
    disc: [[1310, .07, .45], [2210, .06, .7], [3080, .05, .6], [4460, .04, .45], [6020, .03, .3], [7900, .025, .2]],
    hub: [[2600, .006, 1], [3900, .005, .8], [5300, .004, .6], [7100, .003, .4]],
    chassis: [[150, .035, 1], [320, .025, .7], [700, .016, .5], [1400, .01, .35], [2600, .006, .2]],
    tick: [[1800, .007, 1], [2900, .005, .7], [4300, .004, .5]]
  };
  const bodyOf = fmt => fmt === 'jewel' ? MAT.ps : fmt === 'big' ? MAT.card : MAT.pp;
  /* rubbing excites the body only briefly; damped modes keep it from whistling */
  const damped = (list, k = .3) => list.map(([f, t, g]) => [f, t * k, g]);
  function rubBody(len, env, rate, r, fmt, noise, band) {
    const y = modes(rub(len, env, rate, r, noise * .35), damped(bodyOf(fmt)), r, .06);
    norm(y, 1); add(y, norm(biquad(biquad(rub(len, env, 0, r, 1), 'bp', band, .55), 'hp', 400, .7), noise));
    return y;
  }
  /* a latch or tab letting go: sharp contact into the case body, plus the click itself */
  function snap(len, at, fmt, r, amp = 1) {
    const ex = pulse(len, at, fmt === 'big' ? 2.5 : fmt === 'jewel' ? .12 : .22, 1); burst(len, at, fmt === 'jewel' ? .35 : .6, .5, r, ex);
    const y = norm(modes(ex, bodyOf(fmt), r), .85 * amp);
    add(y, norm(biquad(burst(len, at, .45, 1, r), 'hp', fmt === 'big' ? 900 : 2200, .7), (fmt === 'big' ? .12 : .32) * amp));
    return y;
  }
  /* the lid landing on the base: wider, duller */
  function knock(len, at, fmt, r, amp = 1, widthMs = 2.5) {
    const y = norm(modes(pulse(len, at, widthMs, 1), bodyOf(fmt), r), .8 * amp);
    add(y, norm(biquad(pulse(len, at, 6, 1), 'lp', 260, .7), .22 * amp));
    return y;
  }
  /* the living hinge flexing while the lid swings, and the air it moves */
  function hinge(len, t0, t1, fmt, r, amp) {
    const e = hann(t0, t1, 1.4);
    const y = rubBody(len, e, fmt === 'jewel' ? 220 : 110, r, fmt, fmt === 'big' ? .9 : .45, fmt === 'big' ? 1600 : fmt === 'jewel' ? 2800 : 2200); norm(y, amp);
    add(y, norm(biquad(rub(len, e, 0, r, 1), 'lp', 520, .7), amp * .5));
    if (fmt === 'jewel') {
      const sq = arr(len), f0 = 1900 + r() * 500; let ph = 0;
      for (let n = 0; n < sq.length; n++) { const t = n / SR, e2 = hann(t0, t0 + .09, 2)(t); if (!e2) continue; ph += 2 * Math.PI * (f0 + 300 * (t - t0) / .09) / SR; sq[n] = Math.sign(Math.sin(ph)) * e2 * (.6 + .4 * r()); }
      add(y, norm(biquad(sq, 'bp', 2400, 2), amp * .3));
    }
    return y;
  }
  const S = typeof SPEED === 'number' ? SPEED : 1;
  const SPIN = table(p => { let s = 0; for (let k = 1; k <= 12; k++) s += Math.sin(k * p + k * k) / k; return s; });
  const LOAD = table(p => { let s = 0; for (let k = 1; k <= 10; k++) s += Math.sin(k * p + k * 1.7) / Math.pow(k, .9); return s; });
  /* small DC motor and gear train that draws the disc in or pushes it out */
  function loader(len, T0, T1, env, fA, fB, r) {
    const out = arr(len), m = arr(len), wh = arr(len); let ph = 0, pw = 0;
    for (let n = N(T0); n < Math.min(m.length, N(T1)); n++) { const t = n / SR, e = env(t), u = (t - T0) / (T1 - T0), f = lerp(fA, fB, Math.min(1, u * 3)); ph += 2 * Math.PI * f / SR; m[n] = readT(LOAD, ph) * e * (1 + .3 * fsin(ph * 7.5)); pw += 2 * Math.PI * (f * 9.2) / SR; wh[n] = fsin(pw) * e; }
    biquad(m, 'bp', 1300, .6); biquad(m, 'lp', 4000, .7); add(out, norm(m, .07)); add(out, norm(wh, .008));
    add(out, norm(biquad(rub(len, env, 90, r, .25), 'bp', 900, .6), .025));
    return out;
  }
  const R = {
    caseOpen(r, fmt) {
      const L = .2 + .75 * S, y = arr(L);
      add(y, norm(modes(rub(L, hann(0, .03, 1), 900, r, .1), bodyOf(fmt), r), .07));
      add(y, snap(L, .032, fmt, r, 1));
      if (fmt !== 'big') add(y, snap(L, .037 + r() * .004, fmt, r, .45));
      add(y, hinge(L, .06, .06 + .6 * S, fmt, r, fmt === 'big' ? .1 : .055));
      add(y, knock(L, .745 * S, fmt, r, .14, 4));
      return fadeOut(y);
    },
    caseClose(r, fmt) {
      const T = .6 * S, L = T + .35, y = arr(L);
      add(y, hinge(L, 0, Math.max(.05, T - .02), fmt, r, fmt === 'big' ? .09 : .05));
      add(y, knock(L, T, fmt, r, 1, fmt === 'big' ? 4 : 2.2));
      if (fmt !== 'big') { add(y, snap(L, T + .004, fmt, r, .55)); add(y, snap(L, T + .011 + r() * .004, fmt, r, .42)); }
      else add(y, norm(biquad(burst(L, T, 4, 1, r), 'hp', 1400, .7), .18));
      if (fmt === 'jewel') for (let i = 0; i < 3; i++) add(y, snap(L, T + .02 + r() * .03, 'jewel', r, .12));
      return fadeOut(y);
    },
    handle(r, fmt) {
      const L = .32, y = arr(L);
      add(y, norm(rubBody(L, hann(0, .26, 1), 70, r, fmt, .6, 1500), .06));
      add(y, knock(L, .21, fmt, r, .12, 1.2));
      return fadeOut(y);
    },
    slideOut(r, fmt) {
      const L = .5, y = arr(L), e = t => t < .03 ? t / .03 : t < .3 ? 1 : t < .42 ? 1 - (t - .3) / .12 : 0;
      add(y, snap(L, 0, fmt, r, .25));
      add(y, norm(biquad(rubBody(L, e, 220, r, fmt, .5, 1400), 'lp', 6000, .7), .15));
      add(y, norm(modes(rub(L, e, 120, r, .03), damped(MAT.wood, .4), r), .08));
      return fadeOut(y);
    },
    slideIn(r, fmt) {
      const L = .62, y = arr(L), e = t => t < .04 ? t / .04 : t < .32 ? 1 : t < .4 ? 1 - (t - .32) / .08 : 0;
      add(y, norm(biquad(rubBody(L, e, 220, r, fmt, .5, 1400), 'lp', 6000, .7), .13));
      add(y, norm(modes(rub(L, e, 120, r, .03), damped(MAT.wood, .4), r), .07));
      add(y, norm(modes(pulse(L, .41, 3, 1), MAT.wood, r), .32));
      add(y, knock(L, .412, fmt, r, .2, 1.6));
      return fadeOut(y);
    },
    discOut(r) {
      const L = .45, y = arr(L), ex = pulse(L, .055, .1, 1);
      add(y, norm(modes(pulse(L, 0, .3, 1), MAT.hub, r), .22));
      add(y, norm(modes(ex, MAT.hub, r), .7)); add(y, norm(modes(ex, MAT.disc, r, .01), .1));
      add(y, norm(biquad(burst(L, .055, .3, 1, r), 'hp', 3000, .7), .25));
      return fadeOut(y);
    },
    discIn(r) {
      const L = .45, y = arr(L), ex = pulse(L, 0, .12, 1);
      add(y, norm(modes(ex, MAT.hub, r), .6)); add(y, norm(modes(ex, MAT.disc, r, .01), .14));
      add(y, norm(modes(pulse(L, .008 + r() * .004, .12, 1), MAT.hub, r), .45));
      return fadeOut(y);
    },
    discDrop(r) {
      const L = .4, y = arr(L), ex = pulse(L, 0, .5, 1);
      add(y, norm(modes(ex, MAT.disc, r, .01), .1)); add(y, norm(modes(ex, MAT.chassis, r), .22)); add(y, norm(modes(pulse(L, .018, .4, 1), MAT.disc, r, .01), .05));
      return fadeOut(y);
    },
    tray(r) {
      const T1 = .74 * S, L = T1 + .22, y = arr(L), env = t => t < .04 ? t / .04 : t < T1 - .05 ? 1 : t < T1 ? (T1 - t) / .05 : 0;
      add(y, norm(modes(pulse(L, 0, .3, 1), MAT.chassis, r), .18));
      const m = arr(L), H = 18, amps = [], phs = []; let ph = 0;
      for (let k = 1; k <= H; k++) { amps.push(Math.pow(k, -.8) * (.6 + .4 * r())); phs.push(r() * 6.28); }
      const W = table(p => { let s = 0; for (let k = 0; k < H; k++) s += amps[k] * Math.sin((k + 1) * p + phs[k]); return s; });
      for (let n = 0; n < m.length; n++) { const t = n / SR, e = env(t); if (!e) continue; ph += 2 * Math.PI * (96 + 12 * Math.min(1, t / .1) + 2 * Math.sin(t * 37)) / SR; m[n] = readT(W, ph) * e * (1 + .35 * fsin(ph * 12.5)); }
      biquad(m, 'bp', 950, .6); biquad(m, 'lp', 3200, .7); add(y, norm(m, .085));
      const wh = arr(L); let p2 = 0; for (let n = 0; n < wh.length; n++) { const t = n / SR; p2 += 2 * Math.PI * (1180 + 40 * Math.sin(t * 9)) / SR; wh[n] = fsin(p2) * env(t); } add(y, norm(wh, .01));
      add(y, norm(biquad(rub(L, env, 60, r, .3), 'bp', 700, .6), .03));
      add(y, norm(modes(pulse(L, T1, 2.5, 1), MAT.chassis, r), .45)); add(y, snap(L, T1 + .002, 'dvd', r, .18));
      return fadeOut(y);
    },
    spin(r) {
      const L = 2.1, y = arr(L), m = arr(L), air = arr(L); let ph = 0;
      const W = table(p => { let s = 0; for (let k = 1; k <= 12; k++) s += Math.sin(k * p + k * k) / k; return s; });
      for (let n = 0; n < m.length; n++) { const t = n / SR, u = Math.min(1, t / 1.25), f0 = 18 + 42 * (1 - Math.pow(1 - u, 2.2)), e = Math.min(1, t / .25) * (t > 1.95 ? (L - t) / .15 : 1); ph += 2 * Math.PI * f0 / SR; m[n] = readT(W, ph) * e * (.5 + .5 * u); air[n] = (r() * 2 - 1) * e * u * (1 + .25 * fsin(ph)); }
      biquad(m, 'lp', 900, .7); add(y, norm(m, .05));
      sweep(air, t => 300 + 1400 * Math.min(1, t / 1.3), .8, 'bp'); add(y, norm(air, .045));
      for (let i = 0; i < 8; i++) add(y, norm(modes(pulse(L, 1.32 + i * .07 + r() * .03, .15, 1), MAT.tick, r), .06 + r() * .05));
      const bz = arr(L); for (let n = N(1.5); n < N(1.56); n++) bz[n] = Math.sign(Math.sin(2 * Math.PI * 640 * n / SR)) * hann(1.5, 1.56)(n / SR);
      add(y, norm(biquad(bz, 'bp', 1300, 1.2), .025));
      return fadeOut(y, .1);
    },
    /* slot-loading drive: felt brushes, loading motor, clamp, spin-up, laser seeking */
    slotIn(r) {
      const L = 3.0, y = arr(L);
      add(y, norm(biquad(biquad(rub(L, hann(0, .3, 1.2), 60, r, .6), 'bp', 2200, .5), 'lp', 6000, .7), .045));
      const T0 = .26, T1 = .8, me = t => t < T0 ? 0 : t < T0 + .03 ? (t - T0) / .03 : t < T1 - .04 ? 1 : t < T1 ? (T1 - t) / .04 : 0;
      add(y, loader(L, T0, T1, me, 250, 340, r));
      add(y, norm(modes(pulse(L, T1 + .02, 2.5, 1), MAT.chassis, r), .35)); add(y, norm(modes(pulse(L, T1 + .03, .15, 1), MAT.hub, r), .18));
      const S0 = 1.0, sp = arr(L), air = arr(L); let p2 = 0;
      for (let n = N(S0); n < sp.length; n++) { const t = n / SR - S0, u = Math.min(1, t / 1.3), f0 = 12 + 88 * (1 - Math.pow(1 - u, 2)), e = Math.min(1, t / .2) * (n / SR > L - .25 ? (L - n / SR) / .25 : 1); p2 += 2 * Math.PI * f0 / SR; sp[n] = readT(SPIN, p2) * e * (.4 + .6 * u); air[n] = (r() * 2 - 1) * e * u; }
      biquad(sp, 'lp', 1400, .7); add(y, norm(sp, .045));
      sweep(air, t => 300 + 2000 * Math.min(1, Math.max(0, t - S0) / 1.3), .8, 'bp'); add(y, norm(air, .04));
      for (let i = 0; i < 9; i++) add(y, norm(modes(pulse(L, 2.15 + i * .065 + r() * .03, .15, 1), MAT.tick, r), .04 + r() * .04));
      return fadeOut(y, .2);
    },
    slotOut(r) {
      const L = 1.75, y = arr(L), sp = arr(L), air = arr(L); let p2 = 0;
      for (let n = 0; n < N(.92); n++) { const t = n / SR, u = t / .92, f0 = 100 * Math.pow(1 - u, 1.6) + 6, e = (1 - u) * Math.min(1, t / .02); p2 += 2 * Math.PI * f0 / SR; sp[n] = readT(SPIN, p2) * e; air[n] = (r() * 2 - 1) * e; }
      biquad(sp, 'lp', 1400, .7); add(y, norm(sp, .045)); sweep(air, t => 2200 - 1900 * Math.min(1, t / .92), .8, 'bp'); add(y, norm(air, .04));
      add(y, norm(modes(pulse(L, .95, 2.5, 1), MAT.chassis, r), .28)); add(y, norm(modes(pulse(L, .955, .15, 1), MAT.hub, r), .12));
      const T0 = 1.02, T1 = 1.52, me = t => t < T0 ? 0 : t < T0 + .03 ? (t - T0) / .03 : t < T1 - .04 ? 1 : t < T1 ? (T1 - t) / .04 : 0;
      add(y, loader(L, T0, T1, me, 330, 270, r));
      add(y, norm(modes(pulse(L, T1 + .01, .6, 1), MAT.chassis, r), .1));
      return fadeOut(y, .05);
    },
    tvOn(r) {
      const L = 1.5, y = arr(L);
      add(y, norm(modes(pulse(L, 0, .4, 1), MAT.chassis, r), .25));
      const hw = table(p => { let s = 0; for (let k = 1; k <= 8; k++) s += Math.sin(k * p + k) / Math.pow(k, .9); return s; });
      const h = arr(L); for (let n = 0; n < h.length; n++) { const t = n / SR, e = t < .015 ? t / .015 : Math.exp(-(t - .015) / .32); h[n] = readT(hw, 2 * Math.PI * 50 * t) * e; }
      biquad(h, 'lp', 900, .7); add(y, norm(h, .3), .02);
      add(y, norm(biquad(rub(L, t => t < .05 ? 0 : Math.exp(-(t - .05) / .3), 500, r, .05, 1), 'hp', 2500, .7), .1));
      const fb = arr(L); for (let n = 0; n < fb.length; n++) { const t = n / SR; fb[n] = fsin(2 * Math.PI * 15734 * t) * Math.min(1, t / .4) * Math.min(1, (L - t) / .3); } add(y, norm(fb, .006));
      return fadeOut(y, .1);
    },
    tvOff(r) {
      const L = .6, y = arr(L);
      add(y, norm(modes(pulse(L, 0, .4, 1), MAT.chassis, r), .2));
      const p = arr(L); for (let n = 0; n < p.length; n++) { const t = n / SR; p[n] = fsin(2 * Math.PI * (55 - 20 * t) * t) * Math.exp(-t / .08); } add(y, norm(p, .2), .01);
      add(y, norm(biquad(rub(L, t => Math.exp(-t / .12), 300, r, .05, 1), 'hp', 3000, .7), .06));
      return fadeOut(y, .05);
    },
    boot(r) {
      const L = 2.6, y = arr(L), notes = [293.66, 440, 554.37, 659.25, 880];
      notes.forEach((f, i) => { const at = i * .07, g = 1 / (1 + i * .3), tau = 1.1 - i * .1; for (let n = N(at); n < y.length; n++) { const t = n / SR - at, idx = 2.2 * Math.exp(-t / .35) + .25, env = Math.min(1, t / .006) * Math.exp(-t / tau); y[n] += g * fsin(2 * Math.PI * f * t + idx * fsin(2 * Math.PI * f * 3.5 * t) + 62.83) * env; } });
      biquad(y, 'lp', 4200, .7); return fadeOut(y, .3);
    },
    page(r) {
      const L = .5, y = arr(L), e = hann(0, .36, 1.2);
      const sw = rub(L, e, 0, r, 1), mod = biquad(rub(L, () => 1, 0, r, 1), 'lp', 28, .7); norm(mod, 1);
      for (let n = 0; n < sw.length; n++) sw[n] *= .6 + .4 * mod[n];
      add(y, norm(biquad(biquad(biquad(sw, 'bp', 2200, .5), 'hp', 500, .7), 'lp', 9000, .7), .12));
      add(y, norm(biquad(rub(L, e, 70, r, 0, 2), 'hp', 2500, .7), .1));
      add(y, norm(biquad(pulse(L, .38, 7, 1), 'lp', 500, .7), .07)); add(y, norm(biquad(burst(L, .38, 20, 1, r), 'bp', 1200, .8), .04));
      return fadeOut(y);
    },
    crinkle(r) {
      const L = .12, y = arr(L), n = 10 + Math.floor(r() * 16);
      for (let i = 0; i < n; i++) add(y, norm(biquad(burst(L, r() * .095, .05 + r() * .25, 1, r), 'hp', 2500 + r() * 3500, .8), .05 + r() * .13));
      const rip = rub(L, hann(0, .1, 1), 0, r, 1), f = 110 + r() * 90; for (let i = 0; i < rip.length; i++) rip[i] *= Math.pow(Math.max(0, Math.sin(2 * Math.PI * f * i / SR)), 6);
      add(y, norm(biquad(rip, 'bp', 3200, .8), .07));
      return fadeOut(y, .005);
    },
    wrap(r) {
      const L = .8, y = arr(L), e = hann(0, .7, .8);
      add(y, norm(biquad(rub(L, e, 650, r, .03, 1), 'hp', 2600, .7), .26));
      add(y, norm(biquad(rub(L, e, 0, r, 1), 'bp', 4500, .6), .05));
      return fadeOut(y);
    },
    brush(r) { const L = .24, y = arr(L); add(y, norm(biquad(biquad(rub(L, hann(0, .22, 1.5), 40, r, .6), 'bp', 1300, .45), 'lp', 3000, .7), .06)); return fadeOut(y); },
    tick(r) { const L = .06, y = arr(L); add(y, norm(modes(pulse(L, 0, .25, 1), MAT.tick, r), .1)); return fadeOut(y, .01); },
    click(r) { const L = .12, y = arr(L); add(y, snap(L, 0, 'dvd', r, .5)); return fadeOut(y, .01); },
    whoosh(r) { const L = .5, y = arr(L), x = rub(L, hann(0, .48, 2), 0, r, 1); sweep(x, t => 350 + 700 * Math.sin(Math.PI * Math.min(1, t / .48)), .7, 'lp'); add(y, norm(x, .04)); return fadeOut(y); }
  };
  /* a small furnished room: a few early reflections and a short, darkening tail */
  function impulse() {
    const L = .45, ch = [arr(L), arr(L)], r = rng(77);
    [[.0031, .5], [.0053, .42], [.0079, .35], [.0112, .3], [.0146, .24], [.0193, .2], [.0247, .16]].forEach(([t, g], i) => { ch[i % 2][N(t)] += g; ch[(i + 1) % 2][N(t + .0007)] += g * .6; });
    for (let c = 0; c < 2; c++) { let lp = 0; for (let n = N(.006); n < ch[c].length; n++) { const t = n / SR, k = Math.min(.93, .25 + t * 2.6); lp = lp * k + (r() * 2 - 1) * (1 - k); ch[c][n] += lp * 1.6 * Math.exp(-t / .09); } }
    return ch;
  }
  return { R, impulse };
}
const SFX_LEVEL = { slotIn: .5, slotOut: .45, caseOpen: .8, caseClose: .85, handle: .3, slideOut: .42, slideIn: .48, discOut: .5, discIn: .5, discDrop: .38, tray: .5, spin: .32, tvOn: .5, tvOff: .32, boot: .4, page: .38, crinkle: .32, wrap: .45, brush: .22, tick: .22, click: .42, whoosh: .16 };
const SFX_VARIANTS = { crinkle: 5, tick: 3, page: 3, click: 3, slideOut: 2, slideIn: 2, handle: 2, brush: 3, caseOpen: 2, caseClose: 2 };
const SFX_HIT = { caseOpen: .032, caseClose: .6, slideOut: .3, slideIn: .41, discOut: .055, discIn: .0, handle: .21 };
const REC_GAIN = { caseOpen: .8, caseClose: .85, slideOut: .6, slideIn: .62, handle: .42, discOut: .62, discIn: .62 };
const SFX_WET = { boot: .32, tvOn: .16, whoosh: 0, tick: .06, crinkle: .06, wrap: .08 };
const sfx = {
  ctx: null, on: true, lib: null, cache: new Map(),
  init() {
    if (this.ctx || !this.on) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext, c = this.ctx = new AC();
      this.lib = makeFoley(c.sampleRate);
      this.master = c.createGain(); this.master.gain.value = .85;
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 8; comp.ratio.value = 3; comp.attack.value = .003; comp.release.value = .12;
      this.out = c.createGain(); this.out.gain.value = (this.vol ?? 1) * (this.vol ?? 1); this.master.connect(comp); comp.connect(this.out); this.out.connect(c.destination);
      this.loadRec();
      this.rev = c.createConvolver(); const ir = this.lib.impulse(), b = c.createBuffer(2, ir[0].length, c.sampleRate); b.copyToChannel(ir[0], 0); b.copyToChannel(ir[1], 1); this.rev.buffer = b; this.rev.connect(this.master);
      const warm = ['page|', 'tick|', 'crinkle|', 'click|', 'whoosh|', 'slotIn|', 'tvOn|', 'boot|', 'slotOut|', 'tvOff|', 'wrap|', 'brush|', 'caseOpen|dvd', 'caseClose|dvd', 'slideOut|dvd', 'slideIn|dvd'];
      const idle = f => window.requestIdleCallback ? requestIdleCallback(f, { timeout: 1500 }) : setTimeout(f, 60);
      const step = () => { const k = warm.shift(); if (!k) return; const [n, a] = k.split('|'); this.buffer(n, a || undefined); idle(step); };
      setTimeout(() => idle(step), 900);
    } catch (e) { this.ctx = null; }
  },
  /* the user's recordings: decoded once; the hit time is re-measured on the decoded audio so any codec padding is accounted for */
  loadRec() {
    if (typeof REC === 'undefined') return; const c = this.ctx; this.rec = {};
    /* decode on an offline context: a live context stays suspended until the first tap and may hold decodes back */
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext; let dctx = c; try { if (OAC) dctx = new OAC(1, 1, c.sampleRate); } catch (e) { }
    const decode = buf => new Promise((res, rej) => { try { const p = dctx.decodeAudioData(buf, res, rej); if (p && p.then) p.then(res, rej); } catch (e) { rej(e); } });
    for (const [name, list] of Object.entries(REC)) {
      this.rec[name] = [];
      list.forEach((b64, i) => {
        try {
          const bin = atob(b64), u = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) u[k] = bin.charCodeAt(k);
          decode(u.buffer).then(buf => {
            const ch = buf.getChannelData(0); let on = -1; for (let k = 0; k < ch.length; k++) if (Math.abs(ch[k]) > .03) { on = k; break; }
            const m = (REC_META[name] || [])[i] || { hit: 0, on: 0 }, off = on >= 0 ? on / buf.sampleRate - m.on : 0;
            this.rec[name].push({ buf, hit: Math.max(0, m.hit + off) });
          }).catch(() => { });
        } catch (e) { }
      });
    }
  },
  vol: 1,
  setVolume(v) { this.vol = clamp(v, 0, 1); if (this.out) this.out.gain.setTargetAtTime(this.vol * this.vol, this.ctx.currentTime, .03); },
  ok() { if (!this.on) return false; this.init(); if (!this.ctx) return false; if (this.ctx.state === 'suspended') this.ctx.resume(); return true; },
  buffer(name, arg) {
    const key = name + '|' + (arg || ''), list = this.cache.get(key) || [], want = SFX_VARIANTS[name] || 1;
    if (list.length < want) {
      const r = rng(hash(key) + list.length * 7919), data = this.lib.R[name](r, arg);
      for (let i = 0; i < data.length; i++) if (!isFinite(data[i])) data[i] = 0;
      let m = 0; for (let i = 0; i < data.length; i++) m = Math.max(m, Math.abs(data[i])); if (m > 0) { const k = (SFX_LEVEL[name] || .4) / m; for (let i = 0; i < data.length; i++) data[i] *= k; }
      const b = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate); b.copyToChannel(data, 0); list.push(b); this.cache.set(key, list);
      return b;
    }
    return list[Math.floor(Math.random() * list.length)];
  },
  /* plays a sound and returns how many seconds from now its main hit lands */
  play(name, arg, o = {}) {
    if (!this.ok()) return SFX_HIT[name] ?? 0;
    try {
      const c = this.ctx, list = this.rec && this.rec[name], rec = list && list.length ? list[Math.floor(Math.random() * list.length)] : null;
      const fmtRate = rec ? (arg === 'jewel' ? 1.14 : arg === 'big' ? .86 : 1) : 1;
      const rate = o.exact ? 1 : fmtRate * (1 + (Math.random() - .5) * (rec ? .04 : .06));
      const s = c.createBufferSource(); s.buffer = rec ? rec.buf : this.buffer(name, arg); s.playbackRate.value = rate;
      const hit = (rec ? rec.hit : (SFX_HIT[name] ?? 0) * (name === 'caseClose' ? (typeof SPEED === 'number' ? SPEED : 1) : 1)) / rate;
      const delay = o.hitAt != null ? Math.max(0, o.hitAt - hit) : (o.delay || 0);
      let node = s;
      if (rec && arg === 'jewel') { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 320; node.connect(f); node = f; }
      if (rec && arg === 'big') { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2300; node.connect(f); node = f; }
      const g = c.createGain(); g.gain.value = (o.gain ?? 1) * (rec ? (REC_GAIN[name] ?? 1) : 1); node.connect(g); g.connect(this.master);
      const wet = o.wet ?? (rec ? .04 : SFX_WET[name] ?? .12); if (wet > 0) { const sg = c.createGain(); sg.gain.value = wet; g.connect(sg); sg.connect(this.rev); }
      s.start(c.currentTime + delay);
      return delay + hit;
    } catch (e) { return SFX_HIT[name] ?? 0; }
  },
  caseOpen(fmt) { return this.play('caseOpen', fmt || 'dvd'); },
  caseClose(fmt) { return this.play('caseClose', fmt || 'dvd'); },
  handle(fmt) { return this.play('handle', fmt || 'dvd'); },
  slide(fmt) { return this.play('slideOut', fmt || 'dvd'); },
  slideIn(fmt) { return this.play('slideIn', fmt || 'dvd'); },
  discOut() { return this.play('discOut'); }, discIn(o) { return this.play('discIn', undefined, o); }, thud() { return this.play('discDrop'); },
  slotIn() { return this.play('slotIn', undefined, { exact: true }); }, slotOut() { return this.play('slotOut', undefined, { exact: true }); },
  tray() { return this.play('tray', undefined, { exact: true }); }, spin() { return this.play('spin', undefined, { exact: true }); },
  tvOn() { this.play('tvOn', undefined, { exact: true }); }, tvOff() { this.play('tvOff'); }, boot() { this.play('boot', undefined, { exact: true }); },
  page() { this.play('page'); }, crinkle(v = 1) { this.play('crinkle', undefined, { gain: v }); }, wrap() { this.play('wrap'); },
  brush() { this.play('brush'); }, tick() { this.play('tick'); }, click(v = 1) { this.play('click', undefined, { gain: v }); }, whoosh() { this.play('whoosh'); },
  open(fmt) { this.caseOpen(fmt); }
};

