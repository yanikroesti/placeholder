'use strict';
// Abstimmung 27.9.2026 — results, voice-first (female narrator). Documentary / reveal.
// Every visual beat is keyed to a spoken word (words.json: whisper word timestamps of the voiceover).
// Safe zone for TikTok UI: content inside x 60–920, captions around y 1330, nothing important below y 1480.

const W = 1080, H = 1920;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const COL = { red: '#DA291C', white: '#F7F5F2', ink: '#0B0B0C', ink2: '#161618', grey: '#8B8B8E', dim: '#3A3A3E' };
const FONT = '"Inter Tight"';
const TAU = Math.PI * 2;
const OFFSET = 0.4;          // voice starts 0.4s into the video
let DUR = 43.18, WORDS = [];

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inOutSine: x => -(Math.cos(Math.PI * x) - 1) / 2,
  outExpo: x => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inExpo: x => (x === 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outBack: x => { const c1 = 1.7, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
};
function rng(seed) { return () => { seed = (seed + 0x6D2B79F5) | 0; let r = Math.imul(seed ^ (seed >>> 15), 1 | seed); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }

// word lookup: start time of the n-th occurrence of a word (1-based), in video time
function at(word, n = 1) {
  let c = 0;
  for (const w of WORDS) if (w[2] === word && ++c === n) return w[0];
  throw new Error('word not found: ' + word + ' #' + n);
}
function endOf(word, n = 1) { let c = 0; for (const w of WORDS) if (w[2] === word && ++c === n) return w[1]; throw new Error(word); }

// ---------- drawing helpers ----------
function font(w, size) { ctx.font = `${w} ${size}px ${FONT}`; }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function cross(x, y, s, color) { const w = s * 0.3; ctx.fillStyle = color; ctx.fillRect(x - s / 2, y - w / 2, s, w); ctx.fillRect(x - w / 2, y - s / 2, w, s); }
function text(s, x, y, size, color, w = 800, align = 'center', ls = 0, alpha = 1) {
  ctx.save(); font(w, size); ctx.letterSpacing = ls + 'px'; ctx.textAlign = align; ctx.globalAlpha *= alpha; ctx.fillStyle = color; ctx.fillText(s, x, y); ctx.restore();
}
function slam(s, x, y, size, t, t0, color, w = 900, from = 1.8, ls = 0) {
  const k = E.outExpo(prog(t, t0, t0 + 0.35)); if (k <= 0) return;
  ctx.save(); ctx.translate(x, y - size * 0.35); const sc = lerp(from, 1, k); ctx.scale(sc, sc);
  ctx.globalAlpha *= clamp(k * 3); text(s, 0, size * 0.35, size, color, w, 'center', ls); ctx.restore();
}
// stroke that draws itself along a path given as points
function drawPath(pts, k, color, lw, close = false) {
  if (k <= 0) return;
  const segs = []; let total = 0;
  const P = close ? [...pts, pts[0]] : pts;
  for (let i = 1; i < P.length; i++) { const l = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); segs.push(l); total += l; }
  let left = total * clamp(k);
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
  for (let i = 1; i < P.length && left > 0; i++) {
    const f = Math.min(1, left / segs[i - 1]);
    ctx.lineTo(lerp(P[i - 1][0], P[i][0], f), lerp(P[i - 1][1], P[i][1], f)); left -= segs[i - 1];
  }
  ctx.stroke(); ctx.restore();
}
function glow(x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
function shake(t, hits) {
  let x = 0, y = 0;
  for (const [t0, amp] of hits) if (t > t0) { const d = t - t0, e = amp * Math.exp(-d * 11); x += e * Math.sin(d * 77); y += e * Math.cos(d * 61); }
  return [x, y];
}

// ---------- shared props ----------
function urn(cx, cy, s, t, glowA) {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s);
  glow(0, -130, 260, 'rgba(218,41,28,0.9)', glowA);
  ctx.fillStyle = COL.ink2; ctx.strokeStyle = COL.white; ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(-190, -120); ctx.lineTo(190, -120); ctx.lineTo(160, 170); ctx.lineTo(-160, 170); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = COL.white; ctx.fillRect(-210, -150, 420, 36);
  ctx.fillStyle = glowA > 0.05 ? COL.red : COL.ink; ctx.fillRect(-90, -140, 180, 16);
  cross(0, 40, 90, COL.red);
  ctx.restore();
}
function ballot(x, y, s, rot, label) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  rrect(-90, -120, 180, 240, 10); ctx.fillStyle = COL.white; ctx.fill();
  if (label) text(label, 0, 40, 140, COL.red, 900);
  else { cross(0, -30, 70, COL.red); ctx.fillStyle = '#C9C6C0'; for (let i = 0; i < 3; i++) ctx.fillRect(-60, 40 + i * 26, 120 - i * 30, 8); }
  ctx.restore();
}
// balance scale: tilt < 0 means left pan (JA-Seite) is lower
function scale(t, cx, cy, tilt, active, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy);
  ctx.fillStyle = COL.white; ctx.fillRect(-6, 0, 12, 360); ctx.fillRect(-110, 350, 220, 16);
  circle(0, 0, 18); ctx.fill();
  const L = 330, ang = tilt * Math.PI / 180;   // tilt < 0: left end goes down
  const ends = [[-L * Math.cos(ang), -L * Math.sin(ang)], [L * Math.cos(ang), L * Math.sin(ang)]];
  ctx.save(); ctx.rotate(ang); ctx.fillRect(-L, -6, L * 2, 12); ctx.restore();
  const labels = [['JA-SEITE', 'Initiativkomitee'], ['NEIN-SEITE', 'Bundesrat & Parlament']];
  ends.forEach(([ex, ey], i) => {
    ctx.strokeStyle = COL.white; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex - 90, ey + 200); ctx.moveTo(ex, ey); ctx.lineTo(ex + 90, ey + 200); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex - 120, ey + 200); ctx.quadraticCurveTo(ex, ey + 270, ex + 120, ey + 200); ctx.closePath();
    const on = active === i;
    ctx.fillStyle = on ? COL.red : COL.ink2; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = on ? COL.red : COL.white; ctx.stroke();
    text(labels[i][0], ex, ey + 330, 34, on ? COL.white : COL.grey, 900, 'center', 3);
    text(labels[i][1], ex, ey + 372, 26, on ? COL.white : COL.grey, 600, 'center', 0);
  });
  ctx.restore();
}
// parliament hemicycle: 194 seats sorted left→right; Ja red, Nein white, Enth. grey
const SEATS = (() => {
  const rows = 8, pts = [];
  const radii = Array.from({ length: rows }, (_, i) => 170 + i * 36);
  const tot = radii.reduce((s, r) => s + r, 0);
  let n = 0; const counts = radii.map((r, i) => { const c = i === rows - 1 ? 194 - n : Math.round(194 * r / tot); n += c; return c; });
  radii.forEach((r, i) => { for (let j = 0; j < counts[i]; j++) { const a = Math.PI - (j / (counts[i] - 1)) * Math.PI; pts.push([Math.cos(a) * r, -Math.sin(a) * r, a]); } });
  return pts.sort((p, q) => q[2] - p[2]);
})();
function hemicycle(t, cx, cy, t0, ja, nein, enth, fall) {
  SEATS.forEach(([x, y], i) => {
    const k = E.outBack(prog(t, t0 + i * 0.004, t0 + i * 0.004 + 0.3)); if (k <= 0) return;
    const c = i < ja ? COL.red : i < ja + nein ? COL.white : COL.grey;
    let fy = 0; if (fall > 0) { const d = clamp(fall * 1.6 - (i % 23) * 0.02); fy = d * d * 1600; }
    circle(cx + x, cy + y + fy, 12 * k); ctx.fillStyle = c; ctx.fill();
  });
}

// ---------- icons for the neutrality list ----------
function iconInfinity(k) { const pts = []; for (let i = 0; i <= 120; i++) { const a = (i / 120) * TAU; const d = 1 + Math.sin(a) ** 2; pts.push([150 * Math.cos(a) / d, 150 * Math.sin(a) * Math.cos(a) / d]); } drawPath(pts, k, COL.red, 26); }
function iconShield(k) {
  const pts = [[0, -150], [120, -110], [115, 20], [0, 150], [-115, 20], [-120, -110]];
  drawPath(pts, k, COL.white, 16, true); if (k > 0.6) cross(0, -10, 110 * E.outBack(prog(k, 0.6, 1)), COL.red);
}
function iconChain(k, t, t0) {
  const br = E.outExpo(prog(t, t0 + 0.45, t0 + 0.9));
  [[-110, 0], [0, 0], [110, 0]].forEach(([x], i) => {
    ctx.save(); ctx.translate(x + (i === 1 ? 0 : (i === 0 ? -1 : 1) * br * 60), (i === 1 ? -br * 40 : 0));
    ctx.strokeStyle = i === 1 ? COL.red : COL.white; ctx.lineWidth = 16; ctx.globalAlpha = clamp(k * 2);
    ctx.beginPath(); ctx.ellipse(0, 0, 70, 44, 0, 0, TAU); ctx.stroke(); ctx.restore();
  });
  if (br > 0) drawPath([[-150, 90], [150, -90]], br, COL.red, 14);
}
function iconGate(k, t, t0) {
  ctx.save(); ctx.globalAlpha = clamp(k * 2);
  ctx.strokeStyle = COL.white; ctx.lineWidth = 14;
  rrect(-120, -40, 240, 170, 20); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -40, 80, Math.PI, 0); ctx.stroke();
  const open = E.outBack(prog(t, t0 + 0.9, t0 + 1.3));
  text('UNO', 0, 75, 70, open > 0.5 ? COL.red : COL.white, 900);
  ctx.restore();
}

// ---------- captions (karaoke) ----------
let CHUNKS = [];
function buildChunks() {
  CHUNKS = []; let cur = [];
  const flush = () => { if (cur.length) CHUNKS.push(cur); cur = []; };
  font(900, 72);
  WORDS.forEach((w, i) => {
    const test = [...cur, w].map(x => x[2]).join(' ');
    if (cur.length && (ctx.measureText(test).width + 30 * cur.length > 760 || cur.length >= 3)) flush();
    cur.push(w);
    if (/[.?:!]$/.test(w[2])) flush();
  });
  flush();
}
function captions(t) {
  const i = CHUNKS.findIndex((c, j) => t >= c[0][0] - 0.08 && (j + 1 >= CHUNKS.length ? t < c[c.length - 1][1] + 0.6 : t < Math.min(CHUNKS[j + 1][0][0] - 0.08, c[c.length - 1][1] + 0.6)));
  if (i < 0) return;
  const c = CHUNKS[i], size = 72, y = 1340, cx = 510;
  font(900, size);
  const ws = c.map(w => ctx.measureText(w[2]).width), gap = 30;
  const total = ws.reduce((a, b) => a + b, 0) + gap * (c.length - 1);
  let x = cx - total / 2;
  const kin = E.outBack(prog(t, c[0][0] - 0.08, c[0][0] + 0.12));
  c.forEach((w, j) => {
    const active = t >= w[0] - 0.03 && t < w[1] + 0.05, said = t >= w[0] - 0.03;
    const pop = active ? 1 + 0.07 * Math.exp(-(t - w[0]) * 10) : 1;
    ctx.save(); ctx.translate(x + ws[j] / 2, y - size * 0.35); ctx.scale(pop * kin, pop * kin);
    ctx.textAlign = 'center'; font(900, size);
    ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineJoin = 'round'; ctx.strokeText(w[2], 0, size * 0.35);
    ctx.fillStyle = active ? COL.red : said ? COL.white : 'rgba(247,245,242,0.45)'; ctx.fillText(w[2], 0, size * 0.35);
    ctx.restore();
    x += ws[j] + gap;
  });
}

// ---------- atmosphere: grain + vignette ----------
const GRAIN = [];
function buildGrain() {
  for (let v = 0; v < 6; v++) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), img = g.createImageData(256, 256), r = rng(v + 11);
    for (let i = 0; i < img.data.length; i += 4) { const n = r() * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = n; img.data[i + 3] = 255; }
    g.putImageData(img, 0, 0); GRAIN.push(ctx.createPattern(c, 'repeat'));
  }
}
function atmosphere(t) {
  ctx.save(); ctx.globalAlpha = 0.045; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = GRAIN[Math.floor(t * 24) % GRAIN.length]; ctx.fillRect(0, 0, W, H); ctx.restore();
  const g = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.45, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.65)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function progressBar(t) {
  const a = prog(t, 0.3, 0.8) * (1 - prog(t, DUR - 0.8, DUR - 0.4));
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(247,245,242,0.2)'; ctx.fillRect(60, 250, 960, 4);
  ctx.fillStyle = COL.red; ctx.fillRect(60, 250, 960 * clamp(t / DUR), 4);
  ctx.restore();
}

// =====================================================================
// the film · results
// =====================================================================
const CANTONS = ['ZH', 'BE', 'LU', 'UR', 'SZ', 'OW', 'NW', 'GL', 'ZG', 'FR', 'SO', 'BS', 'BL', 'SH', 'AR', 'AI', 'SG', 'GR', 'AG', 'TG', 'TI', 'VD', 'VS', 'NE', 'GE', 'JU'];
// order in which the tiles flip (a deterministic shuffle, so it feels like results coming in)
const FLIP = (() => { const r = rng(26), idx = CANTONS.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; } const o = []; idx.forEach((c, k) => { o[c] = k; }); return o; })();

function cantonGrid(t, t0, dur, a) {
  if (a <= 0) return;
  const cols = 6, s = 112, g = 14, x0 = 540 - (cols * s + (cols - 1) * g) / 2, y0 = 440;
  ctx.save(); ctx.globalAlpha *= a;
  CANTONS.forEach((c, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = x0 + col * (s + g) + (row === 4 ? (s + g) * 2 : 0), y = y0 + row * (s + g);
    const ft = t0 + (FLIP[i] / 25) * dur, k = prog(t, ft, ft + 0.22);
    const sx = Math.abs(Math.cos(k * Math.PI));        // card flip
    const done = k > 0.5;
    ctx.save(); ctx.translate(x + s / 2, y + s / 2); ctx.scale(sx, 1);
    rrect(-s / 2, -s / 2, s, s, 14);
    ctx.fillStyle = done ? COL.white : COL.ink2; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = done ? COL.white : COL.dim; ctx.stroke();
    text(c, 0, done ? -2 : 14, 40, done ? COL.ink : COL.grey, 900, 'center', 2);
    if (done) text('NEIN', 0, 38, 22, COL.ink, 800, 'center', 3);
    ctx.restore();
  });
  const n = CANTONS.filter((_, i) => t >= t0 + (FLIP[i] / 25) * dur + 0.11).length;
  text(`${n} / 26 Kantone: Nein`, 540, y0 + 5 * (s + g) + 30, 38, COL.white, 800, 'center', 0, prog(t, t0, t0 + 0.2));
  text('0 Kantone: Ja', 540, y0 + 5 * (s + g) + 80, 34, COL.red, 800, 'center', 0, prog(t, t0 + dur, t0 + dur + 0.3));
  ctx.restore();
}

// Ja/Nein result bar with counting numbers; ja fills from the left in red, nein from the right in white
function resultBar(t, tJa, ja, tNein, nein, a, nJa, nNein) {
  if (a <= 0) return;
  const x0 = 80, w = 920, y = 860, h = 120;
  ctx.save(); ctx.globalAlpha *= a;
  rrect(x0, y, w, h, 16); ctx.fillStyle = COL.ink2; ctx.fill();
  const kj = E.outExpo(prog(t, nJa - 0.05, nJa + 0.6)), kn = E.outExpo(prog(t, nNein - 0.05, nNein + 0.6));
  // suspense shimmer on the empty bar before each number lands
  const sh = (t > tJa - 0.4 && kj < 0.05) || (t > tNein - 0.4 && kn < 0.05);
  if (sh) { const p = ((t * 1.6) % 1); ctx.save(); rrect(x0, y, w, h, 16); ctx.clip(); const gx = x0 - 200 + p * (w + 400);
    const gr = ctx.createLinearGradient(gx - 120, 0, gx + 120, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr; ctx.fillRect(x0, y, w, h); ctx.restore(); }
  ctx.save(); rrect(x0, y, w, h, 16); ctx.clip();
  ctx.fillStyle = COL.red; ctx.fillRect(x0, y, w * ja / 100 * kj, h);
  ctx.fillStyle = COL.white; ctx.fillRect(x0 + w - w * nein / 100 * kn, y, w * nein / 100 * kn, h);
  ctx.restore();
  // 50% line
  ctx.save(); ctx.setLineDash([10, 10]); ctx.strokeStyle = COL.grey; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(540, y - 30); ctx.lineTo(540, y + h + 30); ctx.stroke(); ctx.restore();
  text('50 %', 540, y + h + 70, 26, COL.grey, 700, 'center', 2);
  // labels + numbers
  text('JA', x0, y - 170, 44, COL.red, 900, 'left', 6, prog(t, tJa - 0.1, tJa + 0.2));
  text('NEIN', x0 + w, y - 170, 44, COL.white, 900, 'right', 6, prog(t, tNein - 0.1, tNein + 0.2));
  if (kj > 0) text(`${(ja * kj).toFixed(1)}%`, x0, y - 40, 110, COL.red, 900, 'left', 0);
  if (kn > 0) text(`${(nein * kn).toFixed(1)}%`, x0 + w, y - 40, 110, COL.white, 900, 'right', 0);
  ctx.restore();
}

function stamp(t, t0, label, y) {
  const k = E.outExpo(prog(t, t0, t0 + 0.28)); if (k <= 0) return;
  ctx.save(); ctx.translate(540, y); ctx.rotate(-0.1); const s = lerp(2.6, 1, k); ctx.scale(s, s); ctx.globalAlpha *= clamp(k * 2);
  ctx.fillStyle = 'rgba(11,11,12,0.75)'; rrect(-330, -80, 660, 150, 14); ctx.fill();
  ctx.strokeStyle = COL.red; ctx.lineWidth = 10; rrect(-330, -80, 660, 150, 14); ctx.stroke();
  text(label, 0, 30, 104, COL.red, 900, 'center', 8); ctx.restore();
}

function person(x, y, s, color) {
  ctx.fillStyle = color;
  circle(x, y - s * 0.32, s * 0.2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x, y + s * 0.18, s * 0.3, s * 0.26, 0, Math.PI, 0); ctx.fill();
}

function sectionTitle(t, t0, tOut, num, name, icon) {
  const a = prog(t, t0, t0 + 0.3) * (1 - prog(t, tOut - 0.2, tOut + 0.2)); if (a <= 0) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(0, -prog(t, tOut - 0.2, tOut + 0.2) * 150);
  text(num, 540, 560, 60, COL.red, 900, 'center', 6);
  const k = E.outExpo(prog(t, t0 + 0.1, t0 + 0.9));
  text(name, 540, 900, name.length > 10 ? 118 : 130, COL.white, 900, 'center', lerp(40, 4, k), k);
  ctx.save(); ctx.translate(540, 1080); ctx.scale(0.5, 0.5); icon(k); ctx.restore();
  ctx.restore();
}
function iconInfinity(k) { const pts = []; for (let i = 0; i <= 120; i++) { const a = (i / 120) * TAU; const d = 1 + Math.sin(a) ** 2; pts.push([150 * Math.cos(a) / d, 150 * Math.sin(a) * Math.cos(a) / d]); } drawPath(pts, k, COL.red, 26); }
function iconPlate(k) {
  const pts = []; for (let i = 0; i <= 80; i++) { const a = -Math.PI / 2 + (i / 80) * TAU; pts.push([Math.cos(a) * 150, Math.sin(a) * 150]); }
  drawPath(pts, k, COL.white, 18); if (k > 0.5) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, 110, -Math.PI / 2, -Math.PI / 2 + TAU * 0.45 * E.outCubic(prog(k, 0.5, 1))); ctx.closePath(); ctx.fillStyle = COL.red; ctx.fill(); }
}

function hero(t) {
  const T = at;
  // ---------------- A · Hook: urn closes, ballots counted, "Resultat" ----------------
  const aEnd = T('Erstens:');
  if (t < aEnd + 0.2) {
    const out = prog(t, aEnd - 0.3, aEnd + 0.1);
    ctx.save(); ctx.globalAlpha = 1 - out;
    const push = 1 + 0.06 * prog(t, 0, aEnd); ctx.translate(540, 900); ctx.scale(push, push); ctx.translate(-540, -900);
    const lock = E.outBack(prog(t, T('zu.') - 0.05, T('zu.') + 0.3));
    const tRes = T('Resultat.');
    const glowA = 0.25 + 0.9 * prog(t, tRes, tRes + 0.1) * Math.exp(-Math.max(0, t - tRes) * 1.5);
    urn(540, 1000, 1, t, glowA);
    // slot closes: a bar slides over the red slot, then a lock drops on
    ctx.save(); ctx.translate(540, 1000);
    ctx.fillStyle = COL.white; ctx.fillRect(-90, -141, 180 * lock, 18);
    if (lock > 0) { ctx.save(); ctx.translate(0, -175 - (1 - lock) * 120); ctx.globalAlpha *= clamp(lock * 2);
      ctx.strokeStyle = COL.white; ctx.lineWidth = 10; ctx.beginPath(); ctx.arc(0, -22, 26, Math.PI, 0); ctx.stroke();
      rrect(-38, -24, 76, 56, 8); ctx.fillStyle = COL.red; ctx.fill(); ctx.restore(); }
    ctx.restore();
    // counting: ballots stream up out of the urn into a tally
    const c0 = T('Stimmen'), c1 = T('ausgezählt.') + 0.6;
    const r = rng(5);
    for (let i = 0; i < 28; i++) {
      const st = c0 + i * 0.07 + r() * 0.05, k = prog(t, st, st + 0.8);
      if (k <= 0 || k >= 1) continue;
      const x = 540 + (r() - 0.5) * 60 + Math.sin(k * 3 + i) * 320 * k, y = lerp(880, 720, E.outCubic(k));
      ctx.save(); ctx.globalAlpha *= 1 - k; ballot(x, y, 0.35, (r() - 0.5) * 2 * k, null); ctx.restore();
    }
    const pc = E.inOutCubic(prog(t, c0, c1));
    if (t > c0) {
      ctx.save(); ctx.globalAlpha *= prog(t, c0, c0 + 0.3) * (1 - prog(t, tRes - 0.1, tRes + 0.2));
      text('AUSZÄHLUNG', 540, 500, 30, COL.grey, 800, 'center', 8);
      text(`${Math.round(pc * 100)}%`, 540, 610, 110, pc >= 1 ? COL.red : COL.white, 900, 'center', 2);
      rrect(290, 640, 500, 10, 5); ctx.fillStyle = COL.ink2; ctx.fill();
      rrect(290, 640, 500 * pc, 10, 5); ctx.fillStyle = COL.red; ctx.fill();
      ctx.restore();
    }
    // "Resultat" title
    const rk = E.outExpo(prog(t, tRes, tRes + 0.5));
    if (rk > 0) {
      ctx.save(); ctx.globalAlpha *= rk;
      ctx.fillStyle = COL.ink; ctx.globalAlpha *= 0.85; ctx.fillRect(0, 440, W, 250); ctx.globalAlpha /= 0.85;
      text('RESULTAT', 540, 590, 150, COL.white, 900, 'center', lerp(40, 10, rk));
      text('ABSTIMMUNG · 27.9.2026', 540, 660, 32, COL.red, 800, 'center', 6);
      ctx.restore();
    }
    ctx.restore();
  }
  // ---------------- B · Neutralität ----------------
  const b0 = T('Erstens:'), bEnd = T('Zweitens:');
  if (t >= b0 - 0.2 && t < bEnd + 0.2) {
    const out = prog(t, bEnd - 0.4, bEnd); ctx.save(); ctx.globalAlpha = 1 - out;
    sectionTitle(t, b0, T('Ja:', 1), '01', 'NEUTRALITÄT', iconInfinity);
    const barA = prog(t, T('Ja:', 1) - 0.2, T('Ja:', 1) + 0.1) * (1 - prog(t, T('Kein', 1) - 0.2, T('Kein', 1) + 0.2));
    resultBar(t, T('Ja:', 1), 29.8, T('Nein:', 1), 70.2, barA, T('29.8'), T('70.2'));
    const gA = prog(t, T('Kein', 1) - 0.1, T('Kein', 1) + 0.2);
    cantonGrid(t, T('einziger', 1), T('Ja.', 1) - T('einziger', 1) + 0.2, gA);
    stamp(t, T('Abgelehnt.', 1), 'ABGELEHNT', 760);
    ctx.restore();
  }
  // ---------------- C · Ernährung ----------------
  const c0 = T('Zweitens:'), cEnd = T('Und', 1);
  if (t >= c0 - 0.2 && t < cEnd + 0.2) {
    const out = prog(t, cEnd - 0.4, cEnd); ctx.save(); ctx.globalAlpha = 1 - out;
    sectionTitle(t, c0, T('Ja:', 2), '02', 'ERNÄHRUNG', iconPlate);
    const barA = prog(t, T('Ja:', 2) - 0.2, T('Ja:', 2) + 0.1) * (1 - prog(t, T('Auch') - 0.2, T('Auch') + 0.2));
    resultBar(t, T('Ja:', 2), 27.5, T('Nein:', 2), 72.5, barA, T('27.5'), T('72.5'));
    const gA = prog(t, T('Auch') - 0.1, T('Auch') + 0.2);
    cantonGrid(t, T('kein'), T('Kanton.') - T('kein') + 0.2, gA);
    stamp(t, T('Abgelehnt.', 2), 'ABGELEHNT', 760);
    ctx.restore();
  }
  // ---------------- D · Stimmbeteiligung: 100 people, 47 light up ----------------
  const d0 = T('Und', 1), dEnd = T('Und', 2);
  if (t >= d0 - 0.2 && t < dEnd + 0.2) {
    const out = prog(t, dEnd - 0.3, dEnd + 0.1); ctx.save(); ctx.globalAlpha = 1 - out;
    text('STIMMBETEILIGUNG', 540, 360, 52, COL.white, 900, 'center', 8, prog(t, T('Stimmbeteiligung?'), T('Stimmbeteiligung?') + 0.3));
    const t47 = T('47'), tHalf = T('Mehr');
    const s = 76, x0 = 540 - 4.5 * s, y0 = 440;
    let lit = 0;
    for (let i = 0; i < 100; i++) {
      const col = i % 10, row = Math.floor(i / 10);
      const ak = E.outBack(prog(t, d0 + 0.3 + i * 0.012, d0 + 0.6 + i * 0.012)); if (ak <= 0) continue;
      const on = t >= t47 + i * 0.012 && i < 47; if (on) lit++;
      const nonVoter = i >= 47 && t >= tHalf;
      const pulse = nonVoter ? 0.5 + 0.5 * Math.sin((t - tHalf) * 6 - i * 0.2) : 0;
      ctx.save(); ctx.translate(x0 + col * s, y0 + row * s + 20); ctx.scale(ak, ak);
      person(0, 0, 64, on ? COL.red : nonVoter ? `rgba(139,139,142,${0.35 + 0.4 * pulse})` : COL.dim);
      ctx.restore();
    }
    const kh = prog(t, tHalf, tHalf + 0.4);
    text('47 % haben abgestimmt', 540, 1230, 48, COL.red, 900, 'center', 0, prog(t, t47, t47 + 0.3) * (1 - kh));
    text('53 % haben nicht abgestimmt', 540, 1230, 48, COL.grey, 900, 'center', 2, kh);
    ctx.restore();
  }
  // ---------------- E · Outro ----------------
  const e0 = T('Und', 2);
  if (t >= e0 - 0.1) {
    slam('UND DU?', 540, 700, 170, t, e0, COL.white, 900, 2.0, 4);
    text('WARST DU DABEI?', 540, 820, 56, COL.red, 900, 'center', 6, prog(t, T('Warst'), T('Warst') + 0.3));
    const bk = E.outBack(prog(t, T('dabei?') - 0.1, T('dabei?') + 0.35));
    if (bk > 0) {
      const fin = prog(t, DUR - 0.9, DUR - 0.4);
      ctx.save(); ctx.globalAlpha *= 1 - fin;
      [['ICH WAR DABEI', 0], ['DIESMAL NICHT', 1]].forEach(([s, i]) => {
        const p = 1 + 0.05 * Math.pow(Math.max(0, Math.sin((t * 2.2 + i * 0.5) * Math.PI)), 6);
        ctx.save(); ctx.translate(540, 960 + i * 150); ctx.scale(bk * p, bk * p);
        rrect(-300, -60, 600, 120, 60); ctx.lineWidth = 7; ctx.strokeStyle = COL.white; ctx.stroke();
        text(s, 0, 20, 52, COL.white, 900, 'center', 4); ctx.restore();
      });
      text('Quellen: BFS via SRF · swissinfo.ch', 540, 1200, 24, COL.grey, 600, 'center', 1, prog(t, T('Kommentare.'), T('Kommentare.') + 0.3));
      ctx.restore();
    }
  }
}

const HITS = () => [[at('zu.'), 16], [at('Resultat.'), 20], [at('70.2'), 14], [at('Abgelehnt.', 1), 26], [at('72.5'), 14], [at('Abgelehnt.', 2), 26], [at('47'), 16], [at('Und', 2), 18]];

let HITLIST = [];
function draw(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
  ctx.fillStyle = COL.ink; ctx.fillRect(0, 0, W, H);
  const [sx, sy] = shake(t, HITLIST);
  ctx.save(); ctx.translate(sx, sy); hero(t); ctx.restore();
  atmosphere(t);
  progressBar(t);
  captions(t);
  // loop: fade to black at the very end
  const f = prog(t, DUR - 0.45, DUR);
  if (f > 0) { ctx.fillStyle = `rgba(11,11,12,${f})`; ctx.fillRect(0, 0, W, H); }
}

// ---------- boot ----------
const RENDER = new URLSearchParams(location.search).has('render');
window.ready = (async () => {
  await Promise.all(['600 100px "Inter Tight"', '700 100px "Inter Tight"', '800 100px "Inter Tight"', '900 100px "Inter Tight"'].map(f => document.fonts.load(f)));
  const d = await (await fetch('words.json')).json();
  WORDS = d.words.map(([s, e, w]) => [s + OFFSET, e + OFFSET, w]);
  DUR = Math.round((d.duration + OFFSET + 1.0) * 100) / 100;
  window.DURATION = DUR;
  buildChunks(); buildGrain(); HITLIST = HITS();
  window.draw = draw;
  return true;
})();
if (RENDER) document.body.classList.add('render');
else window.ready.then(() => {
  const audio = document.getElementById('a');
  let start = performance.now(), playing = false;
  cv.addEventListener('click', () => { audio.currentTime = 0; audio.play().catch(() => {}); playing = true; document.getElementById('hint').style.display = 'none'; });
  const loop = now => { const t = playing && !audio.paused ? audio.currentTime : ((now - start) / 1000) % DUR; draw(Math.min(t, DUR - 1e-3)); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
});
