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
