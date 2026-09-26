'use strict';
// Claude — Motion Designer resume. 1080x1920, 30s.
// Everything on screen is a pure function of time: draw(t).

const W = 1080, H = 1920, DUR = 30;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const COL = {
  ink: '#0D0D11', ink2: '#1A1A21', cream: '#F2EDE2', coral: '#FF5A2C',
  blue: '#3D5AFE', mute: '#8C877C', line: 'rgba(242,237,226,0.14)',
};
const F = { sans: '"Space Grotesk"', serif: '"Instrument Serif"', mono: '"JetBrains Mono"' };
const TAU = Math.PI * 2;

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  linear: x => x,
  inQuad: x => x * x,
  outQuad: x => 1 - (1 - x) * (1 - x),
  inCubic: x => x * x * x,
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  inExpo: x => (x === 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outExpo: x => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutExpo: x => (x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  inBack: x => { const c1 = 1.70158, c3 = c1 + 1; return c3 * x * x * x - c1 * x * x; },
};
// damped spring step response, tau in seconds
const spring = (tau, zeta = 0.4, w = 18) => {
  if (tau <= 0) return 0;
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * tau) * (Math.cos(wd * tau) + (zeta * w / wd) * Math.sin(wd * tau));
};
function rng(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let r = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- drawing helpers ----------
function font(w, size, fam, style = '') { ctx.font = `${style} ${w} ${size}px ${fam}`; }
function bg(c) { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function label(s, x, y, color, size = 24, alpha = 1, align = 'left', ls = 3) {
  ctx.save();
  font(500, size, F.mono); ctx.letterSpacing = ls + 'px';
  ctx.textAlign = align; ctx.fillStyle = color; ctx.globalAlpha *= alpha;
  ctx.fillText(s, x, y);
  ctx.restore();
}
// typed label: characters appear one at a time
function typed(s, x, y, color, t, t0, cps = 40, size = 24) {
  const n = Math.floor(clamp((t - t0) * cps, 0, s.length));
  if (n > 0) label(s.slice(0, n), x, y, color, size);
}
function layout(str, size, w, fam, style = '') {
  font(w, size, fam, style);
  const xs = [];
  for (let i = 0; i < str.length; i++) xs.push(ctx.measureText(str.slice(0, i)).width);
  const total = ctx.measureText(str).width;
  const ws = xs.map((x, i) => (i < str.length - 1 ? xs[i + 1] : total) - x);
  return { xs, ws, total };
}
function fitSize(str, maxW, w, fam, style = '', cap = 400) {
  font(w, 100, fam, style);
  return Math.min(cap, (maxW / ctx.measureText(str).width) * 100);
}
// letters rise out of a mask line, and optionally leave upward
function rise(str, x, y, size, o, t, t0, stg = 0.05, dur = 0.6, tOut = null) {
  const { outStg = stg * 0.5, outDur = 0.35, w = 700, fam = F.sans, style = '', color = COL.ink, align = 'left', ease = E.outExpo } = o;
  const L = layout(str, size, w, fam, style);
  if (align === 'center') x -= L.total / 2;
  ctx.save();
  ctx.beginPath(); ctx.rect(x - 60, y - size * 1.05, L.total + 120, size * 1.4); ctx.clip();
  ctx.fillStyle = color; font(w, size, fam, style);
  for (let i = 0; i < str.length; i++) {
    let dy = (1 - ease(prog(t, t0 + i * stg, t0 + i * stg + dur))) * size * 1.25;
    if (tOut !== null) dy -= E.inExpo(prog(t, tOut + i * outStg, tOut + i * outStg + outDur)) * size * 1.3;
    ctx.fillText(str[i], x + L.xs[i], y + dy);
  }
  ctx.restore();
  return { x, L };
}
function badge(cx, cy, r, str, rot, color, size = 22) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(rot);
  font(500, size, F.mono); ctx.fillStyle = color; ctx.textAlign = 'center';
  const chars = [...str], step = TAU / chars.length;
  chars.forEach((ch, i) => {
    ctx.save(); ctx.rotate(i * step); ctx.fillText(ch, 0, -r); ctx.restore();
  });
  ctx.restore();
}
function dotGrid(color, alpha, t = 0, gap = 60) {
  ctx.save(); ctx.fillStyle = color;
  for (let y = gap / 2; y < H; y += gap) for (let x = gap / 2; x < W; x += gap) {
    const d = Math.hypot(x - W / 2, y - H / 2);
    ctx.globalAlpha = alpha * (0.5 + 0.5 * Math.sin(d * 0.012 - t * 3));
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  ctx.restore();
}
// a ball that squashes (sy<1) or stretches (sy>1) with its bottom anchored
function ball(x, bottom, r, sx, sy, color, rot = 0) {
  ctx.save();
  ctx.translate(x, bottom - r * sy); ctx.rotate(rot); ctx.scale(sx, sy);
  circle(0, 0, r); ctx.fillStyle = color; ctx.fill();
  ctx.restore();
}

// =====================================================================
// SCENE 1 · 0–2.1s · a ball bounces, anticipates, then swallows the screen
// =====================================================================
function s1(t) {
  bg(COL.ink);
  dotGrid(COL.cream, 0.10 * prog(t, 0.1, 0.6), t);
  const x = W / 2, floor = 1100, R = 46;
  let b = -200, sx = 1, sy = 1;
  if (t < 0.25) b = -200;
  else if (t < 0.7) { const k = E.inQuad(prog(t, 0.25, 0.7)); b = lerp(-100, floor, k); sy = 1 + 0.35 * k; }
  else if (t < 0.8) { const q = Math.sin(Math.PI * prog(t, 0.7, 0.8)); b = floor; sy = 1 - 0.42 * q; }
  else if (t < 1.05) { const k = E.outQuad(prog(t, 0.8, 1.05)); b = floor - 380 * k; sy = 1 + 0.25 * (1 - k); }
  else if (t < 1.3) { const k = E.inQuad(prog(t, 1.05, 1.3)); b = floor - 380 * (1 - k); sy = 1 + 0.25 * k; }
  else if (t < 1.4) { const q = Math.sin(Math.PI * prog(t, 1.3, 1.4)); b = floor; sy = 1 - 0.28 * q; }
  else { // anticipation: crouch, then grow
    const a = E.outCubic(prog(t, 1.4, 1.62)), g = E.inExpo(prog(t, 1.6, 1.92));
    b = floor; sy = 1 - 0.38 * a * (1 - g);
    const r = lerp(R, 1400, g);
    sx = 1 / Math.max(sy, 0.2) ** 0.5;
    ball(x, lerp(floor, H / 2 + r, g), r, sx, sy, COL.coral);
    shadow(t, x, floor, R, 1 - g);
    labelS1(t);
    return;
  }
  sx = 1 / Math.sqrt(sy);
  shadow(t, x, floor, R * (0.4 + 0.6 * clamp(1 - (floor - b) / 600)), clamp(1 - (floor - b) / 700));
  ball(x, b, R, sx, sy, COL.coral);
  labelS1(t);
}
function shadow(t, x, floor, r, a) {
  ctx.save(); ctx.globalAlpha = 0.35 * a * prog(t, 0.2, 0.5);
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(x, floor + 8, r * 1.3, r * 0.22, 0, 0, TAU); ctx.fill();
  ctx.restore();
}
function labelS1(t) {
  typed('> loading resume.mov', 80, 1500, COL.cream, t, 0.35, 30, 26);
  if (t > 0.35 && Math.floor(t * 4) % 2 === 0) {
    const n = Math.floor(clamp((t - 0.35) * 30, 0, 20));
    font(500, 26, F.mono); ctx.letterSpacing = '3px';
    const w = ctx.measureText('> loading resume.mov'.slice(0, n)).width; ctx.letterSpacing = '0px';
    ctx.fillStyle = COL.coral; ctx.fillRect(80 + w + 6, 1478, 14, 28);
  }
}

// =====================================================================
// SCENE 2 · 1.8–5.4s · name card, a ball hops across the letters
// =====================================================================
const S2 = { hopStart: 2.95, hop: 0.22 };
function s2(t) {
  bg(COL.cream);
  const lift = -220 * E.inCubic(prog(t, 4.9, 5.35));
  ctx.save(); ctx.translate(0, lift);

  typed('01 — HELLO, I AM', 80, 400, COL.ink, t, 2.05, 45);

  // CLAUDE
  const name = 'CLAUDE', size = fitSize(name, 920, 700, F.sans), base = 700;
  const L = layout(name, size, 700, F.sans);
  const capH = size * 0.71;
  ctx.save();
  ctx.beginPath(); ctx.rect(0, base - size * 1.1, W, size * 1.35); ctx.clip();
  font(700, size, F.sans); ctx.fillStyle = COL.ink;
  for (let i = 0; i < name.length; i++) {
    const k = E.outExpo(prog(t, 2.15 + i * 0.06, 2.75 + i * 0.06));
    const hit = S2.hopStart + i * S2.hop;
    const sq = Math.sin(Math.PI * prog(t, hit, hit + 0.16)) * 0.13;
    ctx.save();
    ctx.translate(80 + L.xs[i] + L.ws[i] / 2, base + (1 - k) * size * 1.25);
    ctx.scale(1 + sq * 0.5, 1 - sq);
    ctx.fillText(name[i], -L.ws[i] / 2, 0);
    ctx.restore();
  }
  ctx.restore();

  // Motion Designer
  const md = 'Motion Designer', mdSize = fitSize(md, 900, 400, F.serif, 'italic', 150), mdBase = 900;
  const mdL = layout(md, mdSize, 400, F.serif, 'italic');
  ctx.save();
  ctx.beginPath(); ctx.rect(0, mdBase - mdSize, W, mdSize * 1.35); ctx.clip();
  font(400, mdSize, F.serif, 'italic');
  for (let i = 0; i < md.length; i++) {
    const k = E.outExpo(prog(t, 2.5 + i * 0.025, 3.1 + i * 0.025));
    ctx.fillStyle = i >= 7 ? COL.coral : COL.ink;
    ctx.fillText(md[i], 80 + mdL.xs[i], mdBase + (1 - k) * mdSize * 1.3);
  }
  ctx.restore();
  const ulY = mdBase + 40, ulEnd = 80 + mdL.total + 56;
  const ul = E.outCubic(prog(t, 2.9, 3.4));
  ctx.fillStyle = COL.ink; ctx.fillRect(80, ulY, (ulEnd - 80) * ul, 6);

  // the hopping ball
  const R = 22;
  const tops = [...name].map((_, i) => [80 + L.xs[i] + L.ws[i] / 2, base - capH]);
  tops.push([ulEnd - R, ulY]);
  let bx = null, bb, bsy = 1;
  if (t >= 2.75 && t < S2.hopStart) {
    const k = E.inQuad(prog(t, 2.75, S2.hopStart));
    bx = tops[0][0]; bb = lerp(-40, tops[0][1], k); bsy = 1 + 0.3 * k;
  } else if (t >= S2.hopStart) {
    const n = Math.floor((t - S2.hopStart) / S2.hop);
    if (n >= name.length) { bx = tops[6][0]; bb = tops[6][1]; bsy = 1 - 0.35 * Math.sin(Math.PI * prog(t, S2.hopStart + 6 * S2.hop, S2.hopStart + 6 * S2.hop + 0.14)); }
    else {
      const u = (t - S2.hopStart - n * S2.hop) / S2.hop;
      const [x0, y0] = tops[n], [x1, y1] = tops[n + 1];
      const hgt = n === 5 ? 200 : 95;
      bx = lerp(x0, x1, u);
      bb = lerp(y0, y1, u) - hgt * 4 * u * (1 - u);
      bsy = u < 0.12 ? 1 - 0.35 * Math.sin(Math.PI * (0.5 + u / 0.24)) : 1 + 0.18 * Math.abs(1 - 2 * u);
    }
  }
  if (bx !== null) ball(bx, bb, R, 1 / Math.sqrt(bsy), bsy, COL.coral);

  // skills paragraph
  const lines = ['Kinetic type · Logo reveals', 'Explainers · UI motion', 'Data viz · Social content'];
  lines.forEach((s, i) => {
    const k = E.outCubic(prog(t, 3.25 + i * 0.1, 3.75 + i * 0.1));
    ctx.save(); ctx.globalAlpha = k; ctx.translate(0, (1 - k) * 30);
    label(s, 80, 1100 + i * 50, COL.ink, 28, 1, 'left', 1);
    ctx.restore();
  });

  // rotating open-for-work badge
  const bk = E.outBack(prog(t, 3.5, 3.95));
  if (bk > 0) {
    ctx.save(); ctx.translate(860, 1400); ctx.scale(bk, bk);
    circle(0, 0, 150); ctx.fillStyle = COL.ink; ctx.fill();
    badge(0, 0, 118, 'OPEN FOR WORK • OPEN FOR WORK • ', t * 0.9, COL.cream, 22);
    arrow(0, 0, 44, t);
    ctx.restore();
  }
  ctx.restore();
}
function arrow(x, y, s, t) {
  ctx.save(); ctx.translate(x, y + Math.sin(t * 6) * 6);
  ctx.strokeStyle = COL.coral; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(0, s); ctx.moveTo(-s * 0.6, s * 0.4); ctx.lineTo(0, s); ctx.lineTo(s * 0.6, s * 0.4);
  ctx.stroke(); ctx.restore();
}

// =====================================================================
// SCENE 3 · 4.9–10.9s · skills grid, four live demos
// =====================================================================
const TILE = { w: 440, h: 460, xs: [80, 560], ys: [560, 1060] };
function s3(t) {
  bg(COL.ink);
  typed('02 — SKILLS', 80, 330, COL.cream, t, 5.2, 40);
  rise('What I do', 80, 470, 120, { w: 400, fam: F.serif, style: 'italic', color: COL.cream }, t, 5.25, 0.03, 0.6, 10.25);
  const demos = [demoEasing, demoMorph, demoParticles, demoType];
  const names = ['01  EASING', '02  SHAPE MORPH', '03  PARTICLES', '04  KINETIC TYPE'];
  const tags = ['inOutCubic', '4 shapes', '260 pts', 'per-letter'];
  demos.forEach((fn, i) => {
    const kin = E.outBack(prog(t, 5.4 + i * 0.12, 5.95 + i * 0.12));
    const kout = E.inBack(prog(t, 10.2 + i * 0.07, 10.6 + i * 0.07));
    const s = kin * (1 - kout);
    if (s <= 0.001) return;
    const x = TILE.xs[i % 2], y = TILE.ys[i >> 1];
    ctx.save();
    ctx.translate(x + TILE.w / 2, y + TILE.h / 2); ctx.scale(s, s); ctx.rotate((1 - kin) * 0.12 * (i % 2 ? 1 : -1));
    ctx.translate(-TILE.w / 2, -TILE.h / 2);
    rrect(0, 0, TILE.w, TILE.h, 28); ctx.fillStyle = COL.ink2; ctx.fill();
    ctx.save(); rrect(0, 0, TILE.w, TILE.h, 28); ctx.clip();
    fn(t - 5.4, TILE.w, TILE.h);
    ctx.restore();
    ctx.strokeStyle = COL.line; ctx.lineWidth = 2; rrect(1, 1, TILE.w - 2, TILE.h - 2, 27); ctx.stroke();
    label(names[i], 30, TILE.h - 32, COL.cream, 20, 0.9, 'left', 2);
    label(tags[i], TILE.w - 30, 48, COL.mute, 18, 1, 'right', 1);
    ctx.restore();
  });
}
function demoEasing(lt, w) {
  const gx = 70, gy = 90, gw = 300, gh = 220;
  ctx.strokeStyle = COL.line; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx, gy + gh); ctx.lineTo(gx + gw, gy + gh); ctx.stroke();
  const u = (lt % 1.6) / 1.6, k = clamp(u * 1.3);
  // curve
  ctx.strokeStyle = COL.cream; ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 60; i++) { const a = i / 60; ctx.lineTo(gx + a * gw, gy + gh - E.inOutCubic(a) * gh); }
  ctx.stroke();
  // bezier handles
  ctx.strokeStyle = COL.coral; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(gx, gy + gh); ctx.lineTo(gx + gw * 0.65, gy + gh); ctx.moveTo(gx + gw, gy); ctx.lineTo(gx + gw * 0.35, gy); ctx.stroke();
  ctx.fillStyle = COL.coral;
  [[gx + gw * 0.65, gy + gh], [gx + gw * 0.35, gy]].forEach(([x, y]) => { circle(x, y, 7); ctx.fill(); });
  // playhead dot on curve
  const px = gx + k * gw, py = gy + gh - E.inOutCubic(k) * gh;
  ctx.strokeStyle = 'rgba(255,90,44,0.5)'; ctx.setLineDash([6, 8]);
  ctx.beginPath(); ctx.moveTo(px, gy + gh); ctx.lineTo(px, py); ctx.lineTo(gx, py); ctx.stroke(); ctx.setLineDash([]);
  circle(px, py, 11); ctx.fillStyle = COL.coral; ctx.fill();
  // eased ball with onion-skin trail
  for (let j = 6; j >= 0; j--) {
    const kk = clamp(k - j * 0.035);
    circle(gx + E.inOutCubic(kk) * gw, 370, 20); ctx.fillStyle = j === 0 ? COL.coral : `rgba(242,237,226,${0.12 - j * 0.015})`; ctx.fill();
  }
}
const MORPH_N = 200;
function polyPts(verts) {
  const segs = verts.map((v, i) => { const n = verts[(i + 1) % verts.length]; return [v, n, Math.hypot(n[0] - v[0], n[1] - v[1])]; });
  const per = segs.reduce((s, x) => s + x[2], 0), pts = [];
  let si = 0, acc = 0;
  for (let i = 0; i < MORPH_N; i++) {
    const d = (i / MORPH_N) * per;
    while (acc + segs[si][2] < d) { acc += segs[si][2]; si++; }
    const [a, b, l] = segs[si], f = (d - acc) / l;
    pts.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f)]);
  }
  return pts;
}
const ngon = (n, r, inner = null) => {
  const v = [], m = inner ? n * 2 : n;
  for (let i = 0; i < m; i++) { const a = -Math.PI / 2 + (i / m) * TAU, rr = inner && i % 2 ? inner : r; v.push([Math.cos(a) * rr, Math.sin(a) * rr]); }
  return v;
};
const SHAPES = [
  Array.from({ length: MORPH_N }, (_, i) => { const a = -Math.PI / 2 + (i / MORPH_N) * TAU; return [Math.cos(a) * 110, Math.sin(a) * 110]; }),
  polyPts([[0, -125], [125, -125], [125, 125], [-125, 125], [-125, -125]]),
  polyPts(ngon(3, 150).map(([x, y]) => [x, y + 25])),
  polyPts(ngon(5, 150, 62)),
];
function demoMorph(lt, w, h) {
  const seg = 0.9, n = SHAPES.length, i = Math.floor(lt / seg) % n, u = (lt % seg) / seg;
  const k = E.inOutCubic(prog(u, 0.45, 1)), A = SHAPES[i], B = SHAPES[(i + 1) % n];
  ctx.save(); ctx.translate(w / 2, 205); ctx.rotate(lt * 0.8);
  ctx.beginPath();
  for (let j = 0; j < MORPH_N; j++) ctx.lineTo(lerp(A[j][0], B[j][0], k), lerp(A[j][1], B[j][1], k));
  ctx.closePath(); ctx.fillStyle = COL.coral; ctx.fill();
  ctx.fillStyle = COL.cream;
  for (let j = 0; j < MORPH_N; j += 20) { circle(lerp(A[j][0], B[j][0], k), lerp(A[j][1], B[j][1], k), 4); ctx.fill(); }
  ctx.restore();
}
const PARTS = (() => { const r = rng(7); return Array.from({ length: 260 }, () => ({ r: 20 + Math.pow(r(), 0.7) * 170, a: r() * TAU, s: 0.6 + r() * 0.8, c: r() })); })();
function demoParticles(lt, w) {
  const cx = w / 2, cy = 205;
  ctx.lineCap = 'round';
  PARTS.forEach(p => {
    const om = (2.6 * p.s) / (0.3 + p.r / 90);
    const pos = tt => { const a = p.a + om * tt, rr = p.r * (1 + 0.12 * Math.sin(tt * 2 + p.a * 3)); return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.9]; };
    const [x0, y0] = pos(lt - 0.06), [x1, y1] = pos(lt);
    ctx.strokeStyle = p.c < 0.12 ? COL.coral : p.c < 0.35 ? COL.blue : COL.cream;
    ctx.lineWidth = p.c < 0.12 ? 5 : 3;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  });
}
const WORDS = ['MOVE', 'FLOW', 'SNAP', 'POP!', 'EASE', 'LOOP'];
function demoType(lt, w) {
  const seg = 0.8, idx = Math.floor(lt / seg), u = lt - idx * seg;
  const cur = WORDS[idx % WORDS.length], prev = WORDS[(idx + WORDS.length - 1) % WORDS.length];
  const size = 120, base = 250;
  font(700, size, F.sans);
  const L = layout(cur, size, 700, F.sans), Lp = layout(prev, size, 700, F.sans);
  ctx.save(); ctx.beginPath(); ctx.rect(0, base - size, w, size * 1.2); ctx.clip();
  ctx.fillStyle = COL.cream; font(700, size, F.sans);
  for (let i = 0; i < 4; i++) {
    const kin = idx === 0 && lt < 0 ? 0 : E.outExpo(prog(u, i * 0.04, 0.35 + i * 0.04));
    const kout = E.inExpo(prog(u, i * 0.03, 0.2 + i * 0.03));
    if (idx > 0 && prev[i]) ctx.fillText(prev[i], (w - Lp.total) / 2 + Lp.xs[i], base - kout * size * 1.2 + (kout >= 1 ? 999 : 0));
    ctx.fillText(cur[i], (w - L.total) / 2 + L.xs[i], base + (1 - kin) * size * 1.2);
  }
  ctx.restore();
  const bw = L.total * E.outExpo(prog(u, 0.15, 0.55));
  ctx.fillStyle = COL.coral; ctx.fillRect((w - L.total) / 2, base + 30, bw, 10);
}

// =====================================================================
// SCENE 4 · 10.9–15.2s · by the numbers
// =====================================================================
function s4(t) {
  bg(COL.ink);
  typed('03 — BY THE NUMBERS', 80, 330, COL.cream, t, 10.9, 45);
  const rows = [
    { y: 640, t0: 11.0, cap: 'frames in this video' },
    { y: 1000, t0: 11.4, cap: 'keyframes set by hand' },
    { y: 1360, t0: 11.8, cap: 'one function renders every frame' },
  ];
  rows.forEach((r, i) => {
    const k = E.outExpo(prog(t, r.t0, r.t0 + 0.7));
    ctx.fillStyle = COL.line; ctx.fillRect(80, r.y - 230, 920 * k, 2);
    ctx.save(); ctx.beginPath(); ctx.rect(0, r.y - 225, W, 320); ctx.clip();
    ctx.translate(0, (1 - k) * 220);
    if (i === 0) {
      const n = Math.round(1800 * E.outExpo(prog(t, r.t0, r.t0 + 1.2)));
      font(700, 210, F.sans); ctx.fillStyle = COL.cream; ctx.fillText(n.toLocaleString('en-US'), 70, r.y);
    } else if (i === 1) {
      const n = Math.round(240 * (1 - E.outExpo(prog(t, r.t0, r.t0 + 1.2))));
      font(700, 210, F.sans); ctx.fillStyle = COL.coral; ctx.fillText(String(n), 70, r.y);
    } else {
      const full = 'draw(t)', n = Math.floor(clamp((t - r.t0 - 0.1) * 14, 0, full.length));
      let s = full.slice(0, n);
      const live = t > 12.9;
      font(700, 124, F.mono);
      if (live) {
        ctx.fillStyle = COL.cream; ctx.fillText('draw(', 80, r.y);
        const x1 = 80 + ctx.measureText('draw(').width, v = t.toFixed(2);
        ctx.fillStyle = COL.coral; ctx.fillText(v, x1, r.y);
        ctx.fillStyle = COL.cream; ctx.fillText(')', x1 + ctx.measureText(v).width, r.y);
      } else {
        ctx.fillStyle = COL.cream; ctx.fillText(s, 80, r.y);
        if (Math.floor(t * 4) % 2 === 0) { const cw = ctx.measureText(s).width; ctx.fillStyle = COL.coral; ctx.fillRect(84 + cw, r.y - 92, 14, 104); }
      }
    }
    label(r.cap, 80, r.y + 70, COL.mute, 26, 1, 'left', 1);
    ctx.restore();
  });
}

// =====================================================================
// SCENE 5 · 14.7–19.1s · experience as an animation timeline
// =====================================================================
const TRACKS = [
  ['Logo reveals', 80, 600, COL.ink],
  ['Explainer videos', 240, 940, COL.coral],
  ['UI micro-interactions', 120, 820, COL.blue],
  ['Data visualization', 380, 1000, COL.ink],
  ['Title sequences', 80, 560, COL.coral],
  ['Social content', 300, 900, COL.blue],
];
const phX = t => lerp(80, 1000, E.inOutSine(prog(t, 15.6, 18.45)));
function s5(t) {
  bg(COL.cream);
  typed('04 — EXPERIENCE', 80, 330, COL.ink, t, 14.95, 45);
  rise("Things I've animated", 80, 460, fitSize("Things I've animated", 920, 400, F.serif, 'italic', 110),
    { w: 400, fam: F.serif, style: 'italic', color: COL.ink }, t, 15.0, 0.02, 0.6);
  // ruler
  const rk = E.outExpo(prog(t, 15.05, 15.6));
  ctx.save(); ctx.beginPath(); ctx.rect(0, 520, 80 + 920 * rk + 10, 80); ctx.clip();
  ctx.fillStyle = COL.ink;
  for (let x = 80, i = 0; x <= 1000; x += 23, i++) {
    const big = i % 8 === 0;
    ctx.globalAlpha = big ? 0.9 : 0.35; ctx.fillRect(x, big ? 560 : 575, 2, big ? 30 : 15);
    if (big) label(`${i / 8 * 5}s`, x + 8, 556, COL.ink, 18, 0.8, 'left', 0);
  }
  ctx.restore();
  const px = phX(t);
  TRACKS.forEach(([name, a, b, col], i) => {
    const y = 630 + i * 140, k = E.outExpo(prog(t, 15.15 + i * 0.08, 15.85 + i * 0.08));
    ctx.fillStyle = 'rgba(13,13,17,0.06)'; ctx.fillRect(80, y, 920, 104);
    const bw = (b - a) * k;
    if (bw > 1) {
      const active = px >= a && px <= b && t > 15.6;
      rrect(a, y, bw, 104, 14); ctx.fillStyle = col; ctx.fill();
      if (active) { ctx.lineWidth = 5; ctx.strokeStyle = COL.coral; rrect(a - 5, y - 5, bw + 10, 114, 18); ctx.stroke(); }
      ctx.save(); rrect(a, y, bw, 104, 14); ctx.clip();
      font(500, 32, F.sans); ctx.fillStyle = COL.cream; ctx.fillText(name, a + 26, y + 64);
      ctx.restore();
      [a, a + bw].forEach((dx, j) => {
        const passed = px > dx && t > 15.6;
        const pk = passed ? E.outBack(prog(t, tAt(dx), tAt(dx) + 0.25)) : 0;
        ctx.save(); ctx.translate(dx, y + 52); ctx.rotate(Math.PI / 4); const s = 11 + pk * 5;
        ctx.fillStyle = passed ? COL.coral : COL.cream; ctx.strokeStyle = COL.ink; ctx.lineWidth = 3;
        ctx.fillRect(-s, -s, s * 2, s * 2); ctx.strokeRect(-s, -s, s * 2, s * 2); ctx.restore();
      });
    }
  });
  // playhead
  const pa = prog(t, 15.4, 15.6);
  if (pa > 0) {
    ctx.save(); ctx.globalAlpha = pa;
    ctx.fillStyle = COL.coral; ctx.fillRect(px - 3, 540, 6, 1000);
    ctx.beginPath(); ctx.moveTo(px - 22, 505); ctx.lineTo(px + 22, 505); ctx.lineTo(px + 22, 530); ctx.lineTo(px, 548); ctx.lineTo(px - 22, 530); ctx.fill();
    const secs = ((px - 80) / 920 * 30).toFixed(1);
    rrect(px - 60, 1550, 120, 44, 10); ctx.fill();
    label(secs + 's', px, 1581, COL.cream, 22, 1, 'center', 0);
    ctx.restore();
  }
  // diagonal wipe edge (entering)
  if (t < 15.15) diagBand(t);
}
function tAt(x) { // inverse of phX, by bisection
  let lo = 15.6, hi = 18.45;
  for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (phX(m) < x) lo = m; else hi = m; }
  return lo;
}
const diagD = t => lerp(0, W + 0.6 * H + 260, E.inOutCubic(prog(t, 14.7, 15.15)));
function diagPath(d) {
  ctx.beginPath(); ctx.moveTo(-10, -10); ctx.lineTo(d - 0.6 * H, -10); ctx.lineTo(d, H + 10); ctx.lineTo(-10, H + 10); ctx.closePath();
}
function diagBand(t) {
  const d = diagD(t);
  ctx.beginPath(); ctx.moveTo(d - 0.6 * H - 140, -10); ctx.lineTo(d - 0.6 * H, -10); ctx.lineTo(d, H + 10); ctx.lineTo(d - 140, H + 10); ctx.closePath();
  ctx.fillStyle = COL.coral; ctx.fill();
}

// =====================================================================
// SCENE 6 · 18.6–24.0s · animation principles, one per second
// =====================================================================
const PRIN = ['Anticipation', 'Arcs', 'Squash & stretch', 'Follow-through', 'Timing'];
const S6_END = [920, 1150];
function s6(t) {
  bg(COL.coral);
  typed('05 — PRINCIPLES', 80, 330, COL.ink, t, 18.85, 45);
  const j = clamp(Math.floor(t - 19), 0, 4), u = t - 19 - j;
  // counter
  label(`${j + 1}/5`, 1000, 330, COL.ink, 24, 1, 'right', 2);
  // big word: previous leaves, current rises
  for (let w = Math.max(0, j - 1); w <= j; w++) {
    const tin = 19 + w - (w === 0 ? 0.25 : 0.05);
    const sz = fitSize(PRIN[w], 920, 400, F.serif, 'italic', 150);
    rise(PRIN[w], 80, 520, sz, { w: 400, fam: F.serif, style: 'italic', color: COL.ink, outStg: 0.006, outDur: 0.22 }, t, tin, 0.02, 0.5, w < 4 ? 19 + w + 0.72 : null);
  }
  const floor = 1350, R = 50;
  ctx.fillStyle = COL.ink;
  if (j !== 4) ctx.fillRect(140, floor, 800, 4);
  if (j === 0) { // anticipation
    const c = E.outCubic(prog(u, 0, 0.45)), l = prog(u, 0.45, 0.85), land = Math.sin(Math.PI * prog(u, 0.85, 0.98));
    let x = lerp(300, 250, c), b = floor, sy = 1 - 0.4 * c;
    if (l > 0) { const k = E.outCubic(l); x = lerp(250, 800, l); b = floor - 480 * 4 * l * (1 - l); sy = l < 1 ? 1 + 0.35 * (1 - k) : 1; }
    if (u >= 0.85) { x = 800; b = floor; sy = 1 - 0.3 * land; }
    ball(x, b, R, 1 / Math.sqrt(sy), sy, COL.ink, l > 0 && l < 1 ? -0.4 * (1 - l) : 0);
  } else if (j === 1) { // arcs
    const k = E.inOutSine(clamp(u / 0.85));
    const at = kk => { const a = Math.PI * (1 - kk); return [540 + Math.cos(a) * 360, floor - R - Math.sin(a) * 380]; };
    ctx.fillStyle = 'rgba(13,13,17,0.35)';
    for (let i = 0; i <= 16; i++) { const kk = i / 16; if (kk > k) break; const [x, y] = at(E.inOutSine(kk)); circle(x, y, 6); ctx.fill(); }
    const [x, y] = at(k); circle(x, y, R); ctx.fillStyle = COL.ink; ctx.fill();
  } else if (j === 2) { // squash & stretch
    const s = Math.abs(Math.sin(u * TAU * 1.5)), hgt = 460 * (1 - 0.35 * u) * s;
    const v = Math.abs(Math.cos(u * TAU * 1.5));
    const sy = hgt < 30 ? 1 - 0.45 * (1 - hgt / 30) : 1 + 0.3 * v;
    ball(540, floor - hgt, R, 1 / Math.sqrt(sy), sy, COL.ink);
  } else if (j === 3) { // follow-through
    const lead = lerp(220, 820, E.outExpo(prog(u, 0.05, 0.45)));
    const pts = [[lead, floor - 200]];
    for (let i = 1; i <= 4; i++) {
      const s = spring(u - 0.05 - i * 0.05, 0.22 + i * 0.02, 16 - i);
      pts.push([lerp(220 - i * 90, 820 - i * 90, s), floor - 200 + Math.sin(u * 10 - i) * 6 * i]);
    }
    ctx.strokeStyle = COL.ink; ctx.lineWidth = 5;
    ctx.beginPath(); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.stroke();
    pts.forEach(([x, y], i) => { circle(x, y, i === 0 ? R : 34 - i * 5); ctx.fillStyle = COL.ink; ctx.fill(); });
  } else { // timing: spacing chart, then the ball becomes the next scene
    const y = S6_END[1], x0 = 160, x1 = S6_END[0];
    for (let i = 0; i <= 10; i++) {
      const a = E.outBack(prog(u, i * 0.03, i * 0.03 + 0.2));
      const x = lerp(x0, x1, E.inOutCubic(i / 10));
      ctx.fillStyle = 'rgba(13,13,17,0.3)'; ctx.fillRect(x - 2, y + 90, 4, 40 * a);
      circle(x, y, 14 * a); ctx.fill();
    }
    label('ease in', x0, y + 180, COL.ink, 20, prog(u, 0.2, 0.4), 'left', 2);
    label('ease out', x1, y + 180, COL.ink, 20, prog(u, 0.2, 0.4), 'right', 2);
    const k = E.inOutCubic(prog(u, 0.1, 0.6));
    const grow = 1 + 0.4 * E.outBack(prog(u, 0.6, 0.72));
    circle(lerp(x0, x1, k), y, R * grow); ctx.fillStyle = COL.ink; ctx.fill();
  }
}

// =====================================================================
// SCENE 7 · 23.65–27.2s · particles assemble into a message
// =====================================================================
let PTS = null;
function buildParticles() {
  const oc = document.createElement('canvas'); oc.width = W; oc.height = H;
  const o = oc.getContext('2d');
  const lines = ["LET'S MAKE", 'THINGS', 'MOVE.'];
  let y = 560; const meta = [];
  lines.forEach(s => {
    o.font = `700 100px ${F.sans}`;
    const size = Math.min(300, (900 / o.measureText(s).width) * 100);
    o.font = `700 ${size}px ${F.sans}`;
    y += size * 0.72; meta.push([s, size, y, o.measureText(s).width]); y += 46;
  });
  const off = (1440 - y) / 2;
  const bands = [];
  meta.forEach(([s, size, base, w], i) => {
    o.font = `700 ${size}px ${F.sans}`; o.fillStyle = '#fff'; o.fillText(s, (W - w) / 2, base + off);
    bands.push(base + off + size * 0.05);
  });
  const img = o.getImageData(0, 0, W, H).data, r = rng(42), pts = [], step = 7;
  for (let yy = 0; yy < H; yy += step) for (let xx = 0; xx < W; xx += step) {
    if (img[(yy * W + xx) * 4 + 3] < 128) continue;
    const a = r() * TAU, d = 700 + r() * 900;
    pts.push({
      tx: xx, ty: yy, sx: W / 2 + Math.cos(a) * d, sy: 960 + Math.sin(a) * d,
      dl: r() * 0.35 + (xx / W) * 0.25, rr: r(), rr2: r(), coral: yy > bands[1],
    });
  }
  PTS = pts;
}
function s7(t) {
  bg(COL.ink);
  typed('06 — ONE MORE THING', 80, 330, COL.cream, t, 24.0, 45);
  for (const p of PTS) {
    const k = E.outExpo(prog(t, 24.0 + p.dl, 25.2 + p.dl));
    const rot = (1 - k) * (1 - k) * 2.2;
    let dx = (p.sx - p.tx) * (1 - k), dy = (p.sy - p.ty) * (1 - k);
    const c = Math.cos(rot), s = Math.sin(rot);
    let x = p.tx + dx * c - dy * s, y = p.ty + dx * s + dy * c;
    x += Math.sin(t * 5 + p.rr * 40) * 1.6 * k; y += Math.cos(t * 4 + p.rr2 * 40) * 1.6 * k;
    const bw = E.inCubic(prog(t, 26.25 + (p.tx / W) * 0.25 + p.rr * 0.1, 26.8 + (p.tx / W) * 0.25 + p.rr * 0.1));
    x += bw * (700 + p.rr * 900); y += bw * (-260 + p.rr2 * 520);
    ctx.globalAlpha = (0.35 + 0.65 * k) * (1 - bw);
    ctx.fillStyle = p.coral ? COL.coral : COL.cream;
    const sz = 5.5 - bw * 3;
    ctx.fillRect(x - sz / 2, y - sz / 2, sz, sz);
  }
  ctx.globalAlpha = 1;
  label(`${PTS.length.toLocaleString('en-US')} particles · 0 keyframes`, 80, 1560, COL.mute, 22, prog(t, 25.3, 25.7) * (1 - prog(t, 26.2, 26.4)), 'left', 2);
}

// =====================================================================
// SCENE 8 · 26.75–30s · end card, iris out
// =====================================================================
function s8(t) {
  bg(COL.cream);
  typed('07 — HIRE ME', 80, 330, COL.ink, t, 27.0, 45);
  const nSize = 250;
  rise('Claude', W / 2, 860, nSize, { w: 700, color: COL.ink, align: 'center' }, t, 27.05, 0.05, 0.6);
  rise('Motion Designer', W / 2, 1000, 110, { w: 400, fam: F.serif, style: 'italic', color: COL.coral, align: 'center' }, t, 27.3, 0.02, 0.6);
  const k = E.outExpo(prog(t, 27.6, 28.2));
  ctx.fillStyle = COL.ink; ctx.fillRect(W / 2 - 300 * k, 1070, 600 * k, 3);
  label('AVAILABLE NOW  ·  JUST ASK', W / 2, 1140, COL.ink, 28, prog(t, 27.8, 28.2), 'center', 5);
  // badge with idle-bouncing ball
  const bk = E.outBack(prog(t, 27.9, 28.35));
  const cx = W / 2, cy = 1380;
  if (bk > 0) {
    ctx.save(); ctx.translate(cx, cy); ctx.scale(bk, bk);
    circle(0, 0, 150); ctx.fillStyle = COL.ink; ctx.fill();
    badge(0, 0, 118, "LET'S MAKE THINGS MOVE • ", -t * 0.9, COL.cream, 22);
    const u = ((t - 27.9) % 0.5) / 0.5, hgt = 60 * 4 * u * (1 - u);
    const sy = u < 0.1 || u > 0.9 ? 0.75 : 1 + 0.1 * Math.abs(1 - 2 * u);
    ball(0, 40 - hgt, 26, 1 / Math.sqrt(sy), sy, COL.coral);
    ctx.restore();
  }
  // iris out to black, leaving the ball last
  const ir = prog(t, 29.15, 29.85);
  if (ir > 0) {
    const r = lerp(1500, 0, E.inOutExpo(ir));
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.arc(cx, cy, r, 0, TAU, true);
    ctx.fillStyle = COL.ink; ctx.fill('evenodd');
  }
}

// =====================================================================
// HUD overlay · file name, timecode, crop marks, progress
// =====================================================================
const HUD_INK = [[1.95, 5.1], [14.9, 18.8], [18.8, 23.85], [26.9, 29.6]];
function hud(t) {
  const onLight = HUD_INK.some(([a, b]) => t >= a && t < b);
  const c = onLight ? COL.ink : COL.cream, a = prog(t, 0.15, 0.5) * (1 - prog(t, 29.7, 29.95));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  label('CLAUDE_RESUME_v01.mov', 60, 180, c, 20, 0.75, 'left', 2);
  const s = Math.floor(t), ff = Math.floor((t % 1) * 30);
  label(`00:00:${String(s).padStart(2, '0')}:${String(ff).padStart(2, '0')}`, 1020, 180, c, 20, 0.75, 'right', 2);
  if (Math.floor(t * 2) % 2 === 0) { circle(1020 - 238, 173, 7); ctx.fillStyle = COL.coral; ctx.fill(); }
  ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.globalAlpha = a * 0.6;
  const m = 40, l = 44;
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, dx, dy]) => {
    ctx.beginPath(); ctx.moveTo(x, y + l * dy); ctx.lineTo(x, y); ctx.lineTo(x + l * dx, y); ctx.stroke();
  });
  ctx.globalAlpha = a * 0.25; ctx.fillStyle = c; ctx.fillRect(60, 1868, 960, 3);
  ctx.globalAlpha = a; ctx.fillStyle = COL.coral; ctx.fillRect(60, 1868, 960 * (t / DUR), 3);
  ctx.restore();
}

// =====================================================================
// timeline of scenes and transitions
// =====================================================================
const SCENES = [
  { f: s1, a: 0, b: 2.12 },
  { f: s2, a: 1.8, b: 5.35, enter: t => { const k = E.inOutCubic(prog(t, 1.8, 2.1)); if (k >= 1) return false; circle(W / 2, 1100, k * 1300); return true; } },
  { f: s3, a: 4.9, b: 10.9, enter: t => {
      if (t >= 5.35) return false; ctx.beginPath();
      for (let i = 0; i < 4; i++) { const h = H * E.inOutCubic(prog(t, 4.9 + i * 0.05, 5.25 + i * 0.05)); ctx.rect(i * 270, H - h, 271, h); }
      return true; } },
  { f: s4, a: 10.9, b: 15.16 },
  { f: s5, a: 14.7, b: 19.0, enter: t => { if (t >= 15.15) return false; diagPath(diagD(t)); return true; } },
  { f: s6, a: 18.6, b: 24.06, enter: t => {
      const k = E.inOutExpo(prog(t, 18.6, 19.0)); if (k >= 1) return false;
      const w = lerp(6, 2200, k); ctx.beginPath(); ctx.rect(phX(18.6) - w / 2, 0, w, H); return true; } },
  { f: s7, a: 23.65, b: 27.15, enter: t => {
      const k = E.inExpo(prog(t, 23.65, 24.05)); if (k >= 1) return false;
      circle(S6_END[0], S6_END[1], lerp(50 * 1.4, 2300, k)); return true; } },
  { f: s8, a: 26.7, b: 30.01, enter: t => {
      if (t >= 27.15) return false; ctx.beginPath();
      for (let i = 0; i < 16; i++) { const h = 121 * E.inOutCubic(prog(t, 26.7 + i * 0.02, 27.0 + i * 0.02)); ctx.rect(0, i * 120 + 60 - h / 2, W, h); }
      return true; } },
];
function draw(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
  bg(COL.ink);
  for (const s of SCENES) {
    if (t < s.a || t >= s.b) continue;
    ctx.save();
    if (s.enter && s.enter(t)) ctx.clip();
    s.f(t);
    ctx.restore();
  }
  hud(t);
}

// ---------- boot: render mode for capture, player mode otherwise ----------
const RENDER = new URLSearchParams(location.search).has('render');
window.ready = (async () => {
  await Promise.all([
    '700 100px "Space Grotesk"', '500 100px "Space Grotesk"', 'italic 400 100px "Instrument Serif"',
    '500 100px "JetBrains Mono"', '700 100px "JetBrains Mono"',
  ].map(f => document.fonts.load(f)));
  buildParticles();
  window.draw = draw;
  return true;
})();
if (RENDER) document.body.classList.add('render');
else window.ready.then(() => {
  const audio = document.getElementById('a');
  let start = performance.now(), playing = false;
  cv.addEventListener('click', () => {
    audio.currentTime = 0; audio.play().catch(() => {}); playing = true;
    document.getElementById('hint').style.display = 'none';
  });
  audio.addEventListener('ended', () => { audio.currentTime = 0; audio.play(); });
  const loop = now => {
    const t = playing && !audio.paused ? audio.currentTime : ((now - start) / 1000) % DUR;
    draw(Math.min(t, DUR - 1e-3));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
