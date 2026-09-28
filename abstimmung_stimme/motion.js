'use strict';
// Abstimmung 27.9.2026 — voice-first cut. Documentary / suspense.
// Every visual beat is keyed to a spoken word (words.json: whisper word timestamps of the voiceover).
// Safe zone for TikTok UI: content inside x 60–920, captions around y 1330, nothing important below y 1480.

const W = 1080, H = 1920;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');
const COL = { red: '#DA291C', white: '#F7F5F2', ink: '#0B0B0C', ink2: '#161618', grey: '#8B8B8E', dim: '#3A3A3E' };
const FONT = '"Inter Tight"';
const TAU = Math.PI * 2;
const OFFSET = 0.4;          // voice starts 0.4s into the video
let DUR = 50.8, WORDS = [];

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
// the film
// =====================================================================
function hero(t) {
  const T = at; // alias for readability
  // ---------------- A · Hook: date, urn, two questions ----------------
  if (t < T('Erstens:') + 0.1) {
    const aOut = prog(t, T('klingen.') + 0.1, T('Erstens:'));
    ctx.save(); ctx.globalAlpha = 1 - aOut;
    const push = 1 + 0.05 * prog(t, 0, T('Erstens:'));
    ctx.translate(540, 900); ctx.scale(push, push); ctx.translate(-540, -900);
    // date
    const up = E.inOutCubic(prog(t, T('Die') - 0.2, T('Die') + 0.4));
    ctx.save(); ctx.globalAlpha *= 1 - prog(t, T('zwei'), T('zwei') + 0.3); ctx.translate(0, -up * 260); const ds = lerp(1, 0.55, up);
    ctx.translate(540, 760); ctx.scale(ds, ds); ctx.translate(-540, -760);
    slam('27.', 540, 760, 360, t, T('27.'), COL.white, 900, 1.6);
    const lk = E.outExpo(prog(t, T('September.'), T('September.') + 0.5));
    ctx.fillStyle = COL.red; ctx.fillRect(540 - 260 * lk, 820, 520 * lk, 8);
    text('SEPTEMBER 2026', 540, 900, 52, COL.white, 800, 'center', 14, lk);
    ctx.restore();
    // urn + ballot drop
    const uk = E.outCubic(prog(t, T('Die') - 0.1, T('Die') + 0.45));
    if (uk > 0) {
      const land = T('entscheidet.') + 0.35;
      const glowA = 0.8 * prog(t, land, land + 0.1) * Math.exp(-Math.max(0, t - land) * 1.2) + 0.25 * prog(t, land, land + 0.3);
      ctx.save(); ctx.globalAlpha *= uk; ctx.translate(0, (1 - uk) * 120);
      const bk = prog(t, T('entscheidet.') - 0.1, land);
      if (bk > 0 && bk < 1) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, 900 - 130 + 10); ctx.clip();
        ballot(540, lerp(420, 900 - 60, E.inCubic(bk)), 0.8, (1 - bk) * 0.3); ctx.restore();
      }
      urn(540, 900 + 130 - 130, 1, t, glowA);
      ctx.restore();
    }
    // two questions fly out of the urn
    const q = T('zwei');
    [-1, 1].forEach((side, i) => {
      const k = E.outBack(prog(t, q + i * 0.12, q + 0.55 + i * 0.12)); if (k <= 0) return;
      const big = E.inCubic(prog(t, T('grösser'), T('klingen.') + 0.3));
      const x = 540 + side * lerp(0, 220, k) + side * big * 60, y = lerp(800, 560, k) - big * 40;
      ballot(x, y, lerp(0.3, 1, k) * (1 + big * 0.9), side * 0.12 * (1 - big), String(i + 1));
    });
    ctx.restore();
  }
  // ---------------- B · Neutralität ----------------
  const b0 = T('Erstens:'), b1 = T('Zweitens:');
  if (t >= b0 - 0.2 && t < b1 + 0.2) {
    const out = prog(t, b1 - 0.5, b1);
    ctx.save(); ctx.globalAlpha = 1 - out;
    // title
    const tOut = prog(t, T('Eine') - 0.2, T('Eine') + 0.3);
    if (tOut < 1) {
      ctx.save(); ctx.globalAlpha *= 1 - tOut; ctx.translate(0, -tOut * 200);
      text('01', 540, 700, 60, COL.red, 900, 'center', 6, prog(t, b0, b0 + 0.3));
      const k = E.outExpo(prog(t, T('Neutralität.') - 0.05, T('Neutralität.') + 0.8));
      text('NEUTRALITÄT', 540, 880, 118, COL.white, 900, 'center', lerp(40, 4, k), k);
      ctx.restore();
    }
    // constitution page
    const p0 = T('Eine'), p1 = T('Immerwährend.');
    const pk = E.outCubic(prog(t, p0 - 0.1, p0 + 0.4)), pOut = E.inOutCubic(prog(t, p1 - 0.2, p1 + 0.25));
    if (pk > 0 && pOut < 1) {
      ctx.save(); ctx.globalAlpha *= pk * (1 - pOut);
      ctx.translate(540, 880 + (1 - pk) * 80 - pOut * 150); ctx.rotate(-0.04 + pOut * 0.2); ctx.scale(1 - pOut * 0.4, 1 - pOut * 0.4);
      rrect(-260, -340, 520, 680, 10); ctx.fillStyle = COL.white; ctx.fill();
      const hk = prog(t, T('Verfassung') - 0.1, T('Verfassung') + 0.2);
      text('BUNDESVERFASSUNG', 0, -260, 34, COL.ink, 900, 'center', 4, hk);
      ctx.fillStyle = '#BDB9B2';
      for (let i = 0; i < 12; i++) { const lw = prog(t, p0 + i * 0.12, p0 + i * 0.12 + 0.3); ctx.fillRect(-200, -200 + i * 40, (i % 4 === 3 ? 240 : 400) * lw, 10); }
      const sk = E.outExpo(prog(t, T('schreiben.'), T('schreiben.') + 0.25));
      if (sk > 0) {
        ctx.save(); ctx.translate(0, 120); ctx.rotate(-0.12); const ss = lerp(2.2, 1, sk); ctx.scale(ss, ss); ctx.globalAlpha *= clamp(sk * 2);
        ctx.strokeStyle = COL.red; ctx.lineWidth = 8; rrect(-230, -60, 460, 110, 12); ctx.stroke();
        text('NEUTRALITÄT', 0, 18, 64, COL.red, 900, 'center', 4); ctx.restore();
      }
      ctx.restore();
    }
    // four icons: each lands big, then docks into a row
    const icons = [[T('Immerwährend.'), 'IMMERWÄHREND', iconInfinity], [T('Bewaffnet.'), 'BEWAFFNET', iconShield],
      [T('Keine'), 'KEINE BÜNDNISSE', iconChain], [T('Sanktionen', 1), 'SANKTIONEN NUR VIA UNO', iconGate]];
    const rowOut = prog(t, T('Die', 2) - 0.3, T('Die', 2) + 0.2);
    icons.forEach(([t0, lab, fn], i) => {
      const k = prog(t, t0 - 0.05, t0 + 0.6); if (k <= 0 || rowOut >= 1) return;
      const next = i < 3 ? icons[i + 1][0] : T('Die', 2) - 0.3;
      const dock = E.inOutCubic(prog(t, next - 0.15, next + 0.3));
      const x = lerp(540, 165 + i * 250, dock), y = lerp(880, 520, dock), s = lerp(1, 0.42, dock);
      ctx.save(); ctx.globalAlpha *= 1 - rowOut; ctx.translate(x, y); ctx.scale(s, s);
      fn(E.outCubic(k), t, t0);
      ctx.restore();
      ctx.save(); ctx.globalAlpha *= (1 - rowOut) * clamp(k * 2);
      text(lab, x, y + lerp(260, 125, dock), lerp(44, 24, dock), dock > 0.5 ? COL.grey : COL.white, 900, 'center', lerp(4, 1, dock));
      ctx.restore();
    });
    // balance scale: pro, contra, back to level
    const s0 = T('Die', 2), sPro = T('Befürworter', 1), sCon = T('Bundesrat', 1), sEnd = T('Ihre');
    const sa = prog(t, s0 - 0.1, s0 + 0.3) * (1 - prog(t, sEnd - 0.1, sEnd + 0.3));
    let tilt = 0;
    tilt = -12 * E.inOutSine(prog(t, sPro, sPro + 0.8)) + 24 * E.inOutSine(prog(t, sCon, sCon + 0.8)) - 12 * E.inOutSine(prog(t, sEnd - 0.7, sEnd));
    const active = t >= sCon && t < sEnd - 0.3 ? 1 : t >= sPro && t < sCon ? 0 : -1;
    scale(t, 540, 560, tilt, active, sa);
    // recommendation: hemicycle + NEIN
    const h0 = T('Ihre');
    if (t >= h0) {
      const fall = prog(t, b1 - 0.6, b1);
      hemicycle(t, 540, 1000, h0, 65, 124, 5, fall);
      ctx.save(); ctx.globalAlpha *= prog(t, h0 + 0.3, h0 + 0.6) * (1 - fall);
      text('NATIONALRAT', 540, 1060, 30, COL.grey, 800, 'center', 6);
      text('65 Ja · 124 Nein · 5 Enth.', 540, 1105, 34, COL.white, 700);
      text('Ständerat: 10 Ja · 29 Nein · 5 Enth.', 540, 1150, 28, COL.grey, 600);
      ctx.restore();
      text('EMPFEHLUNG', 540, 340, 36, COL.red, 900, 'center', 10, prog(t, T('Empfehlung:'), T('Empfehlung:') + 0.3) * (1 - fall));
      ctx.save(); ctx.globalAlpha *= 1 - fall; slam('NEIN', 540, 560, 230, t, T('Nein.', 1), COL.white, 900, 2.0, 8); ctx.restore();
    }
    ctx.restore();
  }
  // ---------------- C · Ernährung ----------------
  const c0 = T('Zweitens:'), c1 = T('Und', 1);
  if (t >= c0 - 0.2 && t < c1 + 0.3) {
    const out = prog(t, c1 - 0.3, c1 + 0.2);
    ctx.save(); ctx.globalAlpha = 1 - out;
    const tOut = prog(t, T('Heute') - 0.3, T('Heute'));
    const tUp = E.inOutCubic(prog(t, T('Wer') - 0.1, T('Wer') + 0.4));
    ctx.save(); ctx.globalAlpha *= 1 - tOut; ctx.translate(0, -tUp * 330);
    text('02', 540, 700, 60, COL.red, 900, 'center', 6, prog(t, c0, c0 + 0.3));
    const k = E.outExpo(prog(t, c0 + 0.1, c0 + 0.9));
    text('ERNÄHRUNG', 540, 880, 130, COL.white, 900, 'center', lerp(40, 4, k), k);
    ctx.restore();
    // plate → pie
    const pk = E.outBack(prog(t, T('ernährt'), T('ernährt') + 0.5));
    const squeeze = Math.sin(Math.PI * prog(t, T('eng'), T('eng') + 0.35)) * 0.08;
    const cx = 540, cy = 900, R = 250 * pk * (1 - squeeze);
    const scA = prog(t, T('Die', 3) - 0.3, T('Die', 3) + 0.2);
    if (pk > 0 && scA < 1) {
      ctx.save(); ctx.globalAlpha *= 1 - scA;
      glow(cx, cy, 420, 'rgba(218,41,28,0.8)', 0.5 * Math.sin(Math.PI * prog(t, T('eng'), T('eng') + 0.8)));
      circle(cx, cy, R); ctx.fillStyle = COL.ink2; ctx.fill(); ctx.lineWidth = 8; ctx.strokeStyle = COL.white; ctx.stroke();
      circle(cx, cy, R * 0.78); ctx.lineWidth = 3; ctx.strokeStyle = COL.dim; ctx.stroke();
      const v1 = 45 * E.outExpo(prog(t, T('45'), T('45') + 0.8)), v2 = 25 * E.outExpo(prog(t, T('70.'), T('70.') + 0.8));
      const a0 = -Math.PI / 2;
      if (v1 > 0) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 0.74, a0, a0 + TAU * v1 / 100); ctx.closePath(); ctx.fillStyle = COL.white; ctx.fill(); }
      if (v2 > 0) { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R * 0.74, a0 + TAU * 0.45, a0 + TAU * (45 + v2) / 100); ctx.closePath(); ctx.fillStyle = COL.red; ctx.fill(); }
      // ten years ring
      const y0 = T('zehn');
      for (let i = 0; i < 10; i++) {
        const lk = prog(t, y0 + i * 0.06, y0 + i * 0.06 + 0.15); if (lk <= 0) continue;
        const a = a0 + (i / 10) * TAU; ctx.save(); ctx.translate(cx + Math.cos(a) * (R + 50), cy + Math.sin(a) * (R + 50)); ctx.rotate(a);
        ctx.globalAlpha *= lk; ctx.fillStyle = COL.red; ctx.fillRect(-16, -6, 32, 12); ctx.restore();
      }
      // big number
      if (v1 > 0) {
        const v = Math.round(v1 + v2);
        ctx.save(); ctx.globalAlpha *= clamp(v1 / 10);
        text(`${v}%`, cx, cy - R - 110, 130, v2 > 0.5 ? COL.red : COL.white, 900);
        text(v2 > 0.5 ? 'ZIEL DER INITIATIVE' : 'HEUTE AUS DER SCHWEIZ (NETTO)', cx, cy - R - 65, 28, COL.grey, 800, 'center', 4);
        ctx.restore();
      }
      ctx.restore();
    }
    // balance scale
    const s0 = T('Die', 3), sPro = T('Befürworter', 2), sCon = T('Bundesrat', 2), sEnd = T('Im');
    const sa = prog(t, s0 - 0.1, s0 + 0.3) * (1 - prog(t, sEnd - 0.1, sEnd + 0.3));
    const tilt = -12 * E.inOutSine(prog(t, sPro, sPro + 0.8)) + 24 * E.inOutSine(prog(t, sCon, sCon + 0.8)) - 12 * E.inOutSine(prog(t, sEnd - 0.7, sEnd));
    const active = t >= sCon && t < sEnd - 0.3 ? 1 : t >= sPro && t < sCon ? 0 : -1;
    scale(t, 540, 560, tilt, active, sa);
    // parliament: unanimous
    const h0 = T('Im');
    if (t >= h0) {
      hemicycle(t, 540, 1000, h0, 0, 194, 0, 0);
      ctx.save(); ctx.globalAlpha *= prog(t, h0 + 0.3, h0 + 0.6);
      text('NATIONALRAT', 540, 1060, 30, COL.grey, 800, 'center', 6);
      text('0 Ja · 194 Nein', 540, 1105, 34, COL.white, 700);
      text('Ständerat: 0 Ja · 44 Nein', 540, 1150, 28, COL.grey, 600);
      ctx.restore();
      const ek = E.outExpo(prog(t, T('Einstimmig'), T('Einstimmig') + 0.3));
      if (ek > 0) {
        ctx.save(); ctx.translate(540, 340); ctx.rotate(-0.08); const s = lerp(2.4, 1, ek); ctx.scale(s, s); ctx.globalAlpha *= clamp(ek * 2);
        ctx.strokeStyle = COL.red; ctx.lineWidth = 7; rrect(-230, -50, 460, 92, 10); ctx.stroke();
        text('EINSTIMMIG', 0, 18, 58, COL.red, 900, 'center', 6); ctx.restore();
      }
      slam('NEIN', 540, 560, 230, t, T('Nein.', 2), COL.white, 900, 2.0, 8);
    }
    ctx.restore();
  }
  // ---------------- D · Outro: suspense, cliffhanger, question ----------------
  const d0 = T('Und', 1);
  if (t >= d0 - 0.1) {
    const uk = E.outCubic(prog(t, d0, d0 + 0.6));
    const beat = t - d0, pulse = Math.pow(Math.max(0, Math.sin(beat * Math.PI * 1.6)), 8);
    const fade = prog(t, T('Und', 2) - 0.2, T('Und', 2) + 0.3);
    ctx.save(); ctx.globalAlpha = uk * (1 - fade * 0.85);
    ctx.translate(0, fade * -120);
    urn(540, 960, 1 + 0.04 * pulse, t, 0.35 + 0.5 * pulse + 0.3 * prog(t, T('Wie', 1), T('entschieden?')));
    // question mark rising out of the slot
    const qk = E.outBack(prog(t, T('entschieden?') - 0.2, T('entschieden?') + 0.4)) * (1 - prog(t, T('siehst') - 0.3, T('siehst')));
    if (qk > 0) { ctx.save(); ctx.translate(540, 700 - qk * 60); ctx.scale(qk, qk); text('?', 0, 80, 260, COL.red, 900); ctx.restore(); }
    ctx.restore();
    // results card
    const rk = E.outBack(prog(t, T('siehst') - 0.15, T('siehst') + 0.35));
    if (rk > 0) {
      const rOut = prog(t, T('Und', 2) - 0.2, T('Und', 2) + 0.2);
      ctx.save(); ctx.globalAlpha *= clamp(rk * 2) * (1 - rOut); ctx.translate(540, 520 + (1 - rk) * 200);
      rrect(-380, -100, 760, 200, 24); ctx.fillStyle = COL.white; ctx.fill();
      text('RESULTATE', -330, -10, 70, COL.red, 900, 'left', 3);
      text('im nächsten Video', -330, 60, 46, COL.ink, 800, 'left');
      ctx.strokeStyle = COL.red; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const ax = 290 + Math.sin(t * 8) * 10; ctx.beginPath(); ctx.moveTo(ax - 40, 0); ctx.lineTo(ax + 30, 0); ctx.moveTo(ax, -30); ctx.lineTo(ax + 30, 0); ctx.lineTo(ax, 30); ctx.stroke();
      ctx.restore();
    }
    // "Und du?"
    slam('UND DU?', 540, 700, 170, t, T('Und', 2), COL.white, 900, 2.0, 4);
    const bk = E.outBack(prog(t, T('hättest') - 0.1, T('hättest') + 0.35));
    if (bk > 0) {
      const fin = prog(t, DUR - 0.9, DUR - 0.4);
      ctx.save(); ctx.globalAlpha *= 1 - fin;
      [['JA', -190, 0], ['NEIN', 190, 1]].forEach(([s, dx, i]) => {
        const p = 1 + 0.06 * Math.pow(Math.max(0, Math.sin((t * 2.2 + i * 0.5) * Math.PI)), 6);
        ctx.save(); ctx.translate(540 + dx, 900); ctx.scale(bk * p, bk * p);
        rrect(-160, -80, 320, 160, 80); ctx.lineWidth = 8; ctx.strokeStyle = COL.white; ctx.stroke();
        text(s, 0, 30, 84, COL.white, 900, 'center', 4); ctx.restore();
      });
      text('Schreib es in die Kommentare', 540, 1080, 38, COL.white, 700, 'center', 0, prog(t, T('gestimmt?'), T('gestimmt?') + 0.3));
      text('Quellen: admin.ch · SRF · swissinfo.ch', 540, 1140, 24, COL.grey, 600, 'center', 1, prog(t, T('gestimmt?') + 0.2, T('gestimmt?') + 0.5));
      ctx.restore();
    }
  }
}

const HITS = () => [[at('27.'), 18], [at('entscheidet.') + 0.35, 22], [at('schreiben.'), 14], [at('Nein.', 1), 26], [at('Einstimmig'), 14], [at('Nein.', 2), 26], [at('Und', 2), 18]];
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
