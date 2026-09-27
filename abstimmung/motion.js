'use strict';
// Abstimmung 27.9.2026 — TikTok explainer, 1080x1920, 25s. Everything is draw(t).
// Safe zone for TikTok UI: text stays inside x 60–900 below y 800, and above y 1480.

const W = 1080, H = 1920, DUR = 25;
const cv = document.getElementById('c');
const ctx = cv.getContext('2d');

const COL = { red: '#DA291C', white: '#FFFFFF', ink: '#111111', grey: '#9A9A9A', light: '#EDEDED', mid: '#C9C9C9' };
const FONT = '"Inter Tight"';
const TAU = Math.PI * 2;

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const E = {
  inQuad: x => x * x,
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inOutCubic: x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  inExpo: x => (x === 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outExpo: x => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  inOutExpo: x => (x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2),
  outBack: x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  inBack: x => { const c1 = 1.70158, c3 = c1 + 1; return c3 * x * x * x - c1 * x * x; },
};

// ---------- drawing helpers ----------
function font(w, size) { ctx.font = `${w} ${size}px ${FONT}`; }
function bg(c) { ctx.fillStyle = c; ctx.fillRect(0, 0, W, H); }
function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0, r), 0, TAU); }
function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function swissCross(x, y, s, color) { // proportions of the flag cross: arm length = 7/6 of arm width
  const w = s * 0.3;
  ctx.fillStyle = color;
  ctx.fillRect(x - s / 2, y - w / 2, s, w);
  ctx.fillRect(x - w / 2, y - s / 2, w, s);
}
function flagIcon(x, y, s) { rrect(x, y, s, s, s * 0.12); ctx.fillStyle = COL.red; ctx.fill(); swissCross(x + s / 2, y + s / 2, s * 0.62, COL.white); }
function label(s, x, y, color, size = 30, w = 700, align = 'left', ls = 3, alpha = 1) {
  ctx.save(); font(w, size); ctx.letterSpacing = ls + 'px'; ctx.textAlign = align;
  ctx.fillStyle = color; ctx.globalAlpha *= alpha; ctx.fillText(s, x, y); ctx.restore();
}
function fitSize(str, maxW, w, cap = 400) { font(w, 100); return Math.min(cap, (maxW / ctx.measureText(str).width) * 100); }
function wrap(str, maxW, w, size) {
  font(w, size);
  const words = str.split(' '), lines = [];
  let cur = '';
  for (const wd of words) {
    const test = cur ? cur + ' ' + wd : wd;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = wd; } else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}
// text that slams in: starts large, snaps to size
function slam(str, x, y, size, t, t0, color, w = 900, align = 'left', from = 1.7) {
  const k = E.outExpo(prog(t, t0, t0 + 0.32));
  if (k <= 0) return;
  font(w, size);
  const tw = ctx.measureText(str).width, ax = align === 'center' ? x : x + tw / 2;
  ctx.save(); ctx.translate(ax, y - size * 0.35); ctx.scale(lerp(from, 1, k), lerp(from, 1, k));
  ctx.globalAlpha = clamp(k * 3); ctx.fillStyle = color; ctx.textAlign = 'center';
  ctx.fillText(str, 0, size * 0.35); ctx.restore();
}
// letters rise out of a mask line
function rise(str, x, y, size, t, t0, color, w = 900, stg = 0.03, dur = 0.5) {
  font(w, size);
  ctx.save(); ctx.beginPath(); ctx.rect(0, y - size * 1.0, W, size * 1.25); ctx.clip();
  ctx.fillStyle = color;
  for (let i = 0; i < str.length; i++) {
    const k = E.outExpo(prog(t, t0 + i * stg, t0 + i * stg + dur));
    ctx.fillText(str[i], x + ctx.measureText(str.slice(0, i)).width, y + (1 - k) * size * 1.2);
  }
  ctx.restore();
}
// caption-style: words pop in one after another
function wordPop(lines, x, y, size, lh, t, t0, color, w = 800, per = 0.075, hi = null) {
  font(w, size);
  let n = 0;
  lines.forEach((line, li) => {
    let cx = x;
    for (const wd of line.split(' ')) {
      const k = E.outBack(prog(t, t0 + n * per, t0 + n * per + 0.22));
      const ww = ctx.measureText(wd).width;
      if (k > 0) {
        ctx.save(); ctx.translate(cx + ww / 2, y + li * lh - size * 0.35); ctx.scale(k, k);
        ctx.globalAlpha = clamp(k * 2);
        ctx.fillStyle = hi && hi.includes(wd.replace(/[«».,]/g, '')) ? hi.color : color;
        ctx.textAlign = 'center'; ctx.fillText(wd, 0, size * 0.35); ctx.restore();
      }
      cx += ww + ctx.measureText(' ').width; n++;
    }
  });
}
function burst(x, y, t, t0, color, r0 = 60, r1 = 260) {
  const k = prog(t, t0, t0 + 0.45);
  if (k <= 0 || k >= 1) return;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 14 * (1 - k); ctx.globalAlpha = 1 - k;
  circle(x, y, lerp(r0, r1, E.outCubic(k))); ctx.stroke(); ctx.restore();
}
function crossGrid(t, color) { // drifting pattern of little crosses
  const g = 135, off = (t * 40) % g;
  ctx.save(); ctx.globalAlpha = 1;
  for (let y = -g; y < H + g; y += g) for (let x = -g; x < W + g; x += g) swissCross(x + off, y + off * 0.5, 22, color);
  ctx.restore();
}
function pill(str, x, y, t, t0, fg, bgc, size = 38) {
  const k = E.outBack(prog(t, t0, t0 + 0.4));
  if (k <= 0) return;
  font(700, size); const tw = ctx.measureText(str).width, h = size * 1.9;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  rrect(0, -h / 2, tw + size * 1.4, h, h / 2); ctx.fillStyle = bgc; ctx.fill();
  ctx.fillStyle = fg; ctx.fillText(str, size * 0.7, size * 0.36); ctx.restore();
}

// =====================================================================
// 0–2.5 · HOOK: cross pops, "Die Schweiz stimmt ab.", cross swallows screen
// =====================================================================
function sHook(t) {
  bg(COL.red);
  const kIn = E.outBack(prog(t, 0, 0.45));
  const pulse = t > 0.5 ? 1 + 0.06 * Math.exp(-(t % 0.5) * 12) : 1;
  const grow = E.inExpo(prog(t, 2.0, 2.45));
  const s = lerp(360 * kIn * pulse, 9000, grow);
  ctx.save(); ctx.translate(540, 700); ctx.rotate((1 - E.outExpo(prog(t, 0, 0.6))) * -Math.PI / 2);
  swissCross(0, 0, s, COL.white); ctx.restore();
  const out = E.inBack(prog(t, 1.9, 2.2));
  ctx.save(); ctx.translate(0, out * 700); ctx.globalAlpha = 1 - out;
  const sz = fitSize('Die Schweiz', 820, 900, 170);
  slam('Die Schweiz', 60, 1110, sz, t, 0.5, COL.white);
  slam('stimmt ab.', 60, 1110 + sz * 1.0, sz, t, 1.0, COL.white);
  pill('Sonntag, 27.9.2026', 60, 1110 + sz * 1.55, t, 1.5, COL.red, COL.white, 40);
  ctx.restore();
}

// =====================================================================
// 2.45–4.05 · OVERVIEW: 2 Vorlagen
// =====================================================================
function sOverview(t) {
  bg(COL.white); crossGrid(t, COL.light);
  slam('2', 40, 1060, 700, t, 2.5, COL.red, 900, 'left', 2.2);
  burst(230, 800, t, 2.5, COL.red, 100, 420);
  slam('Vorlagen', 500, 690, 110, t, 2.75, COL.ink, 900);
  [['Neutralität', 2.95], ['Ernährung', 3.15]].forEach(([s, t0], i) => {
    const k = E.outExpo(prog(t, t0, t0 + 0.35));
    if (k <= 0) return;
    ctx.save(); ctx.translate((1 - k) * 200, 0); ctx.globalAlpha = k;
    flagIcon(500, 770 + i * 110, 60);
    label(s, 580, 820 + i * 110, COL.ink, 58, 800, 'left', 0);
    ctx.restore();
  });
  slam('Kurz erklärt.', 60, 1260, 96, t, 3.35, COL.ink, 900);
  const u = E.outExpo(prog(t, 3.45, 3.8));
  ctx.fillStyle = COL.red; ctx.fillRect(60, 1290, 560 * u, 14);
}

// =====================================================================
// chapter title (red): "01 Neutralitäts- Initiative"
// =====================================================================
function sChapter(t, t0, num, l1, l2, who) {
  bg(COL.red);
  crossGrid(t, 'rgba(255,255,255,0.08)');
  const k = E.outExpo(prog(t, t0, t0 + 0.4));
  ctx.save(); ctx.globalAlpha = k; font(900, 300); ctx.lineWidth = 6; ctx.strokeStyle = COL.white;
  ctx.strokeText(num, 60 - (1 - k) * 120, 640); ctx.restore();
  const sz = fitSize(l1, 840, 900, 170);
  rise(l1, 60, 880, sz, t, t0 + 0.12, COL.white, 900, 0.025);
  rise(l2, 60, 880 + sz * 1.02, sz, t, t0 + 0.24, COL.white, 900, 0.025);
  label('lanciert von', 60, 880 + sz * 1.02 + 110, 'rgba(255,255,255,0.8)', 30, 600, 'left', 2, prog(t, t0 + 0.5, t0 + 0.7));
  pill(who, 60, 880 + sz * 1.02 + 180, t, t0 + 0.55, COL.red, COL.white, 40);
}

// =====================================================================
// "Was will sie?" numbered list, older items fade to grey
// =====================================================================
function sList(t, t0, items) {
  bg(COL.white); crossGrid(t, COL.light);
  slam('WAS WILL SIE?', 60, 420, 64, t, t0, COL.red, 900);
  items.forEach((s, i) => {
    const ti = t0 + 0.12 + i * 0.6, k = E.outExpo(prog(t, ti, ti + 0.4));
    if (k <= 0) return;
    const y = 560 + i * 210, old = i < items.length - 1 ? prog(t, ti + 0.6, ti + 0.8) : 0;
    const sq = E.outBack(prog(t, ti, ti + 0.35));
    ctx.save(); ctx.translate(60 + 45, y + 45); ctx.scale(sq, sq); ctx.rotate((1 - sq) * 1.2);
    rrect(-45, -45, 90, 90, 12); ctx.fillStyle = old ? COL.ink : COL.red; ctx.fill();
    label(String(i + 1), 0, 20, COL.white, 56, 900, 'center', 0);
    ctx.restore();
    ctx.save(); ctx.translate((1 - k) * 160, 0); ctx.globalAlpha = k;
    const lines = wrap(s, 700, 800, 58);
    ctx.fillStyle = old ? `rgb(${lerp(17, 150, old)},${lerp(17, 150, old)},${lerp(17, 150, old)})` : COL.ink;
    font(800, 58); lines.forEach((ln, j) => ctx.fillText(ln, 190, y + 42 + j * 66));
    ctx.restore();
  });
}

// =====================================================================
// PRO vs CONTRA split
// =====================================================================
function sDebate(t, t0, pro, contra, hiPro, hiContra) {
  const mid = 960;
  ctx.fillStyle = COL.red; ctx.fillRect(0, 0, W, mid);
  ctx.fillStyle = COL.ink; ctx.fillRect(0, mid, W, H - mid);
  label('JA-SEITE · INITIATIVKOMITEE', 60, 420, 'rgba(255,255,255,0.85)', 30, 700, 'left', 3, prog(t, t0 + 0.2, t0 + 0.4));
  wordPop(wrap(pro, 820, 800, 66), 60, 530, 66, 80, t, t0 + 0.3, COL.white, 800, 0.075, hiPro);
  label('NEIN-SEITE · BUNDESRAT & PARLAMENT', 60, 1090, 'rgba(255,255,255,0.7)', 30, 700, 'left', 3, prog(t, t0 + 1.0, t0 + 1.2));
  wordPop(wrap(contra, 820, 800, 66), 60, 1200, 66, 80, t, t0 + 1.1, COL.white, 800, 0.075, hiContra);
  // VS badge
  const k = E.outBack(prog(t, t0 + 0.25, t0 + 0.6));
  if (k > 0) {
    ctx.save(); ctx.translate(540, mid); ctx.scale(k, k); ctx.rotate(Math.sin(t * 5) * 0.08);
    circle(0, 0, 70); ctx.fillStyle = COL.white; ctx.fill();
    label('VS', 0, 20, COL.ink, 54, 900, 'center', 0);
    ctx.restore();
  }
}

// =====================================================================
// Recommendation + parliament votes as stacked bars
// =====================================================================
function sParliament(t, t0, nr, sr, stamp) {
  bg(COL.white); crossGrid(t, COL.light);
  label('EMPFEHLUNG VON', 60, 390, COL.red, 32, 800, 'left', 3, prog(t, t0, t0 + 0.2));
  label('BUNDESRAT & PARLAMENT', 60, 436, COL.red, 32, 800, 'left', 3, prog(t, t0 + 0.05, t0 + 0.25));
  slam('NEIN', 50, 700, 280, t, t0 + 0.25, COL.ink, 900, 'left', 2.0);
  if (stamp) {
    const k = E.outExpo(prog(t, t0 + 1.05, t0 + 1.3));
    if (k > 0) {
      ctx.save(); ctx.translate(700, 780); ctx.rotate(-0.12); ctx.scale(lerp(2.5, 1, k), lerp(2.5, 1, k)); ctx.globalAlpha = clamp(k * 2);
      font(900, 50); const tw = ctx.measureText(stamp).width;
      ctx.strokeStyle = COL.red; ctx.lineWidth = 7; rrect(-tw / 2 - 24, -48, tw + 48, 90, 10); ctx.stroke();
      ctx.fillStyle = COL.red; ctx.textAlign = 'center'; ctx.fillText(stamp, 0, 18);
      ctx.restore();
    }
  }
  [['Nationalrat', nr, 880, t0 + 0.55], ['Ständerat', sr, 1130, t0 + 0.8]].forEach(([name, [ja, nein, enth], y, tb]) => {
    const total = ja + nein + enth, k = E.outExpo(prog(t, tb, tb + 0.6));
    label(name, 60, y, COL.ink, 40, 800, 'left', 0, prog(t, tb - 0.1, tb + 0.1));
    const bx = 60, bw = 840, by = y + 25, bh = 64;
    rrect(bx, by, bw, bh, 10); ctx.fillStyle = COL.light; ctx.fill();
    ctx.save(); rrect(bx, by, bw, bh, 10); ctx.clip();
    let x = bx;
    [[ja, COL.red], [nein, COL.ink], [enth, COL.mid]].forEach(([v, c]) => {
      const w = (v / total) * bw * k; ctx.fillStyle = c; ctx.fillRect(x, by, w, bh); x += w;
    });
    ctx.restore();
    const n = v => Math.round(v * k);
    const parts = [['Ja', n(ja), COL.red], ['Nein', n(nein), COL.ink]];
    if (enth) parts.push(['Enth.', n(enth), COL.grey]);
    let lx = 60;
    parts.forEach(([s, v, c]) => {
      const txt = `${s} ${v}`; rrect(lx, by + bh + 22, 22, 22, 4); ctx.fillStyle = c; ctx.fill();
      label(txt, lx + 34, by + bh + 42, COL.ink, 30, 700, 'left', 0, prog(t, tb, tb + 0.2));
      font(700, 30); lx += 34 + ctx.measureText(txt).width + 40;
    });
  });
}

// =====================================================================
// Selbstversorgung gauge: 45% today -> 70% goal
// =====================================================================
function sGauge(t, t0) {
  bg(COL.white); crossGrid(t, COL.light);
  slam('WAS WILL SIE?', 60, 420, 64, t, t0, COL.red, 900);
  const cx = 480, cy = 900, r = 290, lw = 64;
  const a0 = Math.PI, arc = v => a0 + (v / 100) * Math.PI;
  const kIn = E.outExpo(prog(t, t0 + 0.05, t0 + 0.4));
  ctx.lineCap = 'butt'; ctx.lineWidth = lw;
  ctx.strokeStyle = COL.light; ctx.beginPath(); ctx.arc(cx, cy, r, a0, a0 + Math.PI * kIn); ctx.stroke();
  const v1 = 45 * E.outExpo(prog(t, t0 + 0.2, t0 + 0.8)), v2 = 25 * E.outExpo(prog(t, t0 + 1.0, t0 + 1.6));
  if (v1 > 0) { ctx.strokeStyle = COL.ink; ctx.beginPath(); ctx.arc(cx, cy, r, a0, arc(v1)); ctx.stroke(); }
  if (v2 > 0) { ctx.strokeStyle = COL.red; ctx.beginPath(); ctx.arc(cx, cy, r, arc(45), arc(45 + v2)); ctx.stroke(); }
  // ticks for 45 and 70
  [[45, t0 + 0.7, 'heute'], [70, t0 + 1.5, 'Ziel']].forEach(([v, tt, s], i) => {
    const k = E.outBack(prog(t, tt, tt + 0.3)); if (k <= 0) return;
    const a = arc(v), x = cx + Math.cos(a) * (r + lw / 2 + 40), y = cy + Math.sin(a) * (r + lw / 2 + 40);
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    label(s, 0, 10, i ? COL.red : COL.ink, 30, 800, 'center', 1); ctx.restore();
  });
  const v = Math.round(v1 + v2);
  font(900, 170); ctx.fillStyle = v2 > 0.5 ? COL.red : COL.ink; ctx.textAlign = 'center';
  ctx.fillText(`${v}%`, cx, cy - 20); ctx.textAlign = 'left';
  label('Selbstversorgung (netto)', cx, cy + 60, COL.ink, 34, 700, 'center', 0, kIn);
  pill('Ziel in 10 Jahren', 280, cy + 150, t, t0 + 1.55, COL.white, COL.red, 36);
  [['Mehr pflanzliche Lebensmittel', t0 + 1.85], ['Sauberes Trinkwasser', t0 + 2.15]].forEach(([s, tt], i) => {
    const k = E.outExpo(prog(t, tt, tt + 0.35)); if (k <= 0) return;
    ctx.save(); ctx.translate((1 - k) * 160, 0); ctx.globalAlpha = k;
    flagIcon(60, 1200 + i * 110, 60); label(s, 145, 1245 + i * 110, COL.ink, 50, 800, 'left', 0);
    ctx.restore();
  });
}

// =====================================================================
// OUTRO: cliffhanger for results + comment prompt
// =====================================================================
function sOutro(t) {
  bg(COL.red); crossGrid(t, 'rgba(255,255,255,0.08)');
  const out = E.inBack(prog(t, 24.35, 24.75));
  ctx.save(); ctx.translate(540, 960); ctx.scale(1 - out, 1 - out); ctx.translate(-540, -960);
  slam('Und?', 60, 640, 250, t, 21.1, COL.white, 900, 'left', 2.2);
  burst(300, 560, t, 21.1, COL.white, 80, 380);
  rise('Wie hat die Schweiz', 60, 790, 76, t, 21.45, COL.white, 800, 0.015);
  rise('entschieden?', 60, 880, 76, t, 21.6, COL.white, 800, 0.015);
  const k = E.outBack(prog(t, 22.3, 22.75));
  if (k > 0) {
    ctx.save(); ctx.translate(60, 960 + (1 - k) * 300); ctx.globalAlpha = clamp(k * 2);
    rrect(0, 0, 840, 220, 26); ctx.fillStyle = COL.white; ctx.fill();
    label('RESULTATE', 44, 92, COL.red, 70, 900, 'left', 2);
    label('im nächsten Video', 44, 170, COL.ink, 54, 800, 'left', 0);
    const ax = 740 + Math.sin(t * 9) * 12;
    ctx.strokeStyle = COL.red; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(ax - 40, 110); ctx.lineTo(ax + 30, 110); ctx.moveTo(ax, 80); ctx.lineTo(ax + 30, 110); ctx.lineTo(ax, 140); ctx.stroke();
    ctx.restore();
  }
  wordPop(['Was hättest DU gestimmt?'], 60, 1300, 58, 70, t, 23.0, COL.white, 800, 0.08, { includes: w => w === 'DU', color: COL.ink });
  label('Schreib es in die Kommentare', 60, 1370, 'rgba(255,255,255,0.9)', 36, 600, 'left', 0, prog(t, 23.4, 23.6));
  label('Quellen: admin.ch · SRF · swissinfo.ch', 60, 1450, 'rgba(255,255,255,0.65)', 24, 600, 'left', 1, prog(t, 23.5, 23.7));
  ctx.restore();
}

// =====================================================================
// progress bar (story style) + timeline
// =====================================================================
const CHAPTERS = [[0, 4.0], [4.0, 12.45], [12.45, 21.0], [21.0, 25.0]];
const LIGHT = [[2.45, 4.0], [5.45, 7.95], [10.45, 12.45], [13.95, 16.45], [18.95, 20.95]];
function hud(t) {
  const onLight = LIGHT.some(([a, b]) => t >= a && t < b);
  const c = onLight ? COL.ink : COL.white;
  const a = prog(t, 0.2, 0.5) * (1 - prog(t, 24.5, 24.8));
  if (a <= 0) return;
  const gap = 12, x0 = 60, total = 960, n = CHAPTERS.length, sw = (total - gap * (n - 1)) / n, y = 250;
  ctx.save(); ctx.globalAlpha = a;
  CHAPTERS.forEach(([s, e], i) => {
    const x = x0 + i * (sw + gap);
    rrect(x, y, sw, 8, 4); ctx.fillStyle = onLight ? 'rgba(17,17,17,0.15)' : 'rgba(255,255,255,0.35)'; ctx.fill();
    const f = prog(t, s, e);
    if (f > 0) { rrect(x, y, sw * f, 8, 4); ctx.fillStyle = c; ctx.fill(); }
  });
  ctx.restore();
}
const SHAKES = [[0.05, 10], [0.5, 16], [1.0, 16], [2.5, 30], [4.0, 12], [10.7, 22], [12.45, 12], [19.2, 22], [19.95, 16], [21.1, 26]];
function shake(t) {
  let x = 0, y = 0;
  for (const [t0, amp] of SHAKES) if (t > t0) {
    const d = t - t0, e = amp * Math.exp(-d * 14);
    x += e * Math.sin(d * 83); y += e * Math.cos(d * 67);
  }
  return [x, y];
}

const riseWipe = (a, b) => t => { const k = E.inOutExpo(prog(t, a, b)); if (k >= 1) return false; ctx.beginPath(); ctx.rect(0, H * (1 - k), W, H * k); return true; };
const iris = (a, b, x, y) => t => { const k = E.inOutCubic(prog(t, a, b)); if (k >= 1) return false; circle(x, y, k * 2100); return true; };
const split = (a) => t => {
  const k1 = E.outExpo(prog(t, a, a + 0.3)), k2 = E.outExpo(prog(t, a + 0.12, a + 0.42));
  if (k2 >= 1) return false; ctx.beginPath(); ctx.rect(-W + W * k1, 0, W, 960); ctx.rect(W - W * k2, 960, W, 960); return true;
};
const slats = (a) => t => {
  if (t >= a + 0.35) return false; ctx.beginPath();
  for (let i = 0; i < 12; i++) { const h = 161 * E.inOutCubic(prog(t, a + i * 0.012, a + 0.2 + i * 0.012)); ctx.rect(0, i * 160 + 80 - h / 2, W, h); }
  return true;
};

const SCENES = [
  { f: sHook, a: 0, b: 2.5 },
  { f: sOverview, a: 2.45, b: 4.05 },
  { f: t => sChapter(t, 4.0, '01', 'Neutralitäts-', 'Initiative', 'Pro Schweiz'), a: 3.75, b: 5.6, enter: riseWipe(3.75, 4.05) },
  { f: t => sList(t, 5.55, ['Neutralität in die Verfassung', '«immerwährend und bewaffnet»', 'Keine Militärbündnisse', 'Sanktionen nur mit dem UNO-Sicherheitsrat']), a: 5.35, b: 8.2, enter: iris(5.35, 5.6, 540, 900) },
  { f: t => sDebate(t, 7.95, '«Mit Sanktionen wird die Schweiz zur Kriegspartei.»', '«Die Initiative schränkt die Aussenpolitik unnötig ein.»',
      { includes: w => w === 'Kriegspartei', color: COL.ink }, { includes: w => w === 'unnötig', color: COL.red }), a: 7.95, b: 10.8, enter: split(7.95) },
  { f: t => sParliament(t, 10.45, [65, 124, 5], [10, 29, 5], null), a: 10.45, b: 12.75, enter: slats(10.45) },
  { f: t => sChapter(t, 12.45, '02', 'Ernährungs-', 'Initiative', 'Komitee um Franziska Herren'), a: 12.2, b: 14.1, enter: riseWipe(12.2, 12.5) },
  { f: t => sGauge(t, 14.05), a: 13.85, b: 16.7, enter: iris(13.85, 14.1, 540, 900) },
  { f: t => sDebate(t, 16.45, '«Die Schweiz soll sich in einer Krise selbst ernähren können.»', '«Zu teuer – und der Staat müsste massiv eingreifen.»',
      { includes: w => w === 'Krise', color: COL.ink }, { includes: w => w === 'teuer', color: COL.red }), a: 16.45, b: 19.3, enter: split(16.45) },
  { f: t => sParliament(t, 18.95, [0, 194, 0], [0, 44, 0], 'EINSTIMMIG'), a: 18.95, b: 21.25, enter: slats(18.95) },
  { f: sOutro, a: 20.7, b: 25.01, enter: riseWipe(20.7, 21.0) },
];

function draw(t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.textAlign = 'left'; ctx.letterSpacing = '0px';
  bg(COL.red);
  const [sx, sy] = shake(t);
  ctx.save(); ctx.translate(sx, sy);
  for (const s of SCENES) {
    if (t < s.a || t >= s.b) continue;
    ctx.save();
    if (s.enter && s.enter(t)) ctx.clip();
    s.f(t);
    ctx.restore();
  }
  ctx.restore();
  hud(t);
}

// ---------- boot ----------
const RENDER = new URLSearchParams(location.search).has('render');
window.ready = (async () => {
  await Promise.all(['500 100px "Inter Tight"', '600 100px "Inter Tight"', '800 100px "Inter Tight"', '900 100px "Inter Tight"'].map(f => document.fonts.load(f)));
  window.draw = draw;
  return true;
})();
if (RENDER) document.body.classList.add('render');
else window.ready.then(() => {
  const audio = document.getElementById('a');
  let start = performance.now(), playing = false;
  cv.addEventListener('click', () => { audio.currentTime = 0; audio.play().catch(() => {}); playing = true; document.getElementById('hint').style.display = 'none'; });
  audio.addEventListener('ended', () => { audio.currentTime = 0; audio.play(); });
  const loop = now => {
    const t = playing && !audio.paused ? audio.currentTime : ((now - start) / 1000) % DUR;
    draw(Math.min(t, DUR - 1e-3));
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
});
