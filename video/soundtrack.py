"""Synthesizes the 30s soundtrack. 120 BPM, A minor. Every hit is timed to the
visual events in motion.js (see the EVENT TIMES section)."""
import wave
import numpy as np
from scipy.signal import lfilter, butter

SR, DUR, BPM = 48000, 30.0, 120
BEAT = 60 / BPM
N = int(SR * DUR)
rng = np.random.default_rng(3)
L = np.zeros(N); R = np.zeros(N); VERB = np.zeros(N)


def env(n, a=0.002, d=0.2, curve=6.0):
    t = np.arange(n) / SR
    e = np.exp(-t / d * (curve / 6))
    at = int(a * SR)
    if at: e[:at] *= np.linspace(0, 1, at)
    return e


def add(sig, t, gain=1.0, pan=0.0, verb=0.0):
    i = int(t * SR)
    if i >= N: return
    sig = sig[: N - i] * gain
    L[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 - pan))
    R[i:i + len(sig)] += sig * np.sqrt(0.5 * (1 + pan))
    if verb: VERB[i:i + len(sig)] += sig * verb


def bp(x, lo, hi, order=2):
    b, a = butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band')
    return lfilter(b, a, x)


def hp(x, f):
    b, a = butter(2, f / (SR / 2), 'high'); return lfilter(b, a, x)


def lp(x, f):
    b, a = butter(2, f / (SR / 2), 'low'); return lfilter(b, a, x)


def ts(d): return np.arange(int(d * SR)) / SR


# ---------- instruments ----------
def kick(big=False):
    t = ts(0.6 if big else 0.4)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * (5 if big else 8))
    s += 0.3 * np.exp(-t * 300) * rng.standard_normal(len(t))
    return np.tanh(s * 1.6)


def clap():
    t = ts(0.3); n = rng.standard_normal(len(t))
    e = np.exp(-t * 22)
    for k in (0.0, 0.011, 0.022): e += (t >= k) * np.exp(-np.maximum(t - k, 0) * 120) * 0.6
    return bp(n, 900, 3500) * e * 0.9


def hat(open_=False):
    t = ts(0.25 if open_ else 0.06)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * (14 if open_ else 70))


def tone(freq, d, wave_='sine', decay=3.0, a=0.005):
    t = ts(d)
    ph = 2 * np.pi * freq * t
    if wave_ == 'saw':
        s = sum(np.sin(ph * k) / k for k in range(1, 9))
    elif wave_ == 'pluck':
        s = np.sin(ph) + 0.4 * np.sin(2 * ph) * np.exp(-t * 8) + 0.2 * np.sin(3 * ph) * np.exp(-t * 14)
    else:
        s = np.sin(ph)
    return s * env(len(t), a, 1 / decay)


def pop(freq=900, d=0.08):
    t = ts(d); f = freq * (1 + 1.5 * np.exp(-t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 45)


def boing(freq=320):
    t = ts(0.35); f = freq * (0.55 + 0.45 * np.exp(-t * 9)) * (1 + 0.04 * np.sin(t * 90))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def tick(): return bp(rng.standard_normal(int(0.02 * SR)), 2500, 6000) * np.exp(-ts(0.02) * 250)


def whoosh(d=0.5, lo=300, hi=3000):
    t = ts(d); n = rng.standard_normal(len(t))
    x = t / d; e = np.sin(np.pi * x) ** 2
    out = np.zeros_like(n); seg = 2400
    for i in range(0, len(n), seg):
        c = lo + (hi - lo) * np.sin(np.pi * min(1, i / len(n)))
        out[i:i + seg] = bp(n[i:i + seg + 200], c * 0.7, min(c * 1.4, 20000))[: len(n[i:i + seg])]
    return out * e


def riser(d=0.6):
    t = ts(d); x = t / d
    n = hp(rng.standard_normal(len(t)), 2000) * x ** 2 * 0.5
    f = 200 * 2 ** (x * 3)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * x ** 2 * 0.35
    return n + s


def impact():
    s = np.zeros(int(1.2 * SR)); k = kick(True); s[: len(k)] += k
    t = ts(1.2); s += hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 3.5) * 0.35
    return s


# ---------- harmony ----------
NOTE = lambda m: 440 * 2 ** ((m - 69) / 12)
CHORDS = [(45, [57, 60, 64]), (41, [53, 57, 60]), (48, [60, 64, 67]), (43, [55, 59, 62])]  # Am F C G

# ---------- EVENT TIMES (match motion.js) ----------
# intro: ball impacts, anticipation, swallow
add(boing(330), 0.70, 0.6); add(boing(390), 1.30, 0.45)
add(riser(0.5), 1.42, 0.8)
add(impact(), 1.92, 0.9, verb=0.3)

groove_on = lambda t: (2.0 <= t < 23.4) or (27.0 <= t < 29.2)
for b in range(int(DUR / BEAT)):
    t = b * BEAT
    if groove_on(t):
        add(kick(), t, 0.85)
        if b % 2 == 1: add(clap(), t, 0.42, pan=0.05, verb=0.35)
        add(hat(), t + BEAT / 2, 0.22, pan=0.35)
        if t >= 10.9: add(hat(), t + BEAT / 4, 0.09, pan=-0.35); add(hat(), t + 3 * BEAT / 4, 0.09, pan=-0.35)
        if b % 8 == 7: add(hat(True), t + BEAT / 2, 0.14, pan=0.3)
    elif 24.0 <= t < 26.3 and b % 2 == 0:
        add(kick(), t, 0.6)

# bass (sidechained by position in the beat) + pad
for bar in range(15):
    t0 = bar * 2 * BEAT * 2  # 2s per bar
    root, chord = CHORDS[bar % 4]
    if 2.0 <= t0 < 23.4 or 26.0 <= t0 < 29.2:
        for e in range(8):
            t = t0 + e * BEAT / 2 + BEAT / 4 * (e % 2 == 0)
            add(tone(NOTE(root), 0.22, 'saw', 9, 0.004), t, 0.13)
            add(tone(NOTE(root - 12), 0.24, 'sine', 7), t, 0.28)
    if t0 >= 2.0:
        for m in chord:
            p = lp(tone(NOTE(m), 2.1, 'saw', 0.5, 0.25), 1400)
            add(p, t0, 0.035 if t0 < 24 else 0.05, pan=(m % 3 - 1) * 0.4, verb=0.5)

# arpeggio plucks under the skills grid and the principles
for sec_a, sec_b in ((5.4, 10.2), (19.0, 23.4)):
    t = sec_a; i = 0
    while t < sec_b:
        root, chord = CHORDS[int(t // 2) % 4]
        m = (chord + [chord[0] + 12])[[0, 1, 2, 3, 2, 1][i % 6]] + 12
        add(tone(NOTE(m), 0.3, 'pluck', 9), t, 0.09, pan=0.5 * np.sin(i), verb=0.3)
        t += BEAT / 4; i += 1

# name card: letter pops, ball hops, badge
for i in range(6): add(pop(700 + i * 90), 2.15 + i * 0.06 + 0.05, 0.25, pan=-0.5 + i * 0.2)
for i in range(7): add(boing(520 + 40 * i), 2.95 + i * 0.22, 0.22, pan=-0.6 + i * 0.2)
add(pop(1300), 3.55, 0.3, verb=0.3)

# transitions
for t, d in ((4.85, 0.55), (10.15, 0.6), (14.6, 0.6), (18.5, 0.55), (26.2, 0.7), (29.1, 0.75)):
    add(whoosh(d), t, 0.35, verb=0.2)

# skills tiles pop in, then out
for i in range(4): add(pop(600 + i * 150), 5.45 + i * 0.12, 0.3, pan=(-0.5, 0.5)[i % 2])
for i in range(4): add(pop(1100 - i * 120, 0.05), 10.3 + i * 0.07, 0.2)

# numbers: counter ticks (outExpo), typing
for row, t0 in ((0, 11.0), (1, 11.4)):
    for k in range(18):
        x = k / 18; t = t0 + (-np.log2(1 - x * 0.999) / 10) * 1.2
        add(tick(), t, 0.25, pan=-0.3 + 0.6 * row)
for i in range(7): add(tick(), 11.9 + i / 14, 0.5, pan=0.2)
add(pop(1500), 12.9, 0.3, verb=0.4)

# timeline: bars pop, keyframes tick as the playhead passes them
for i in range(6): add(pop(500 + i * 80, 0.06), 15.2 + i * 0.08, 0.22)
for t in (15.8, 16.2, 16.55, 16.9, 17.2, 17.55, 17.8, 18.1, 18.35):
    add(pop(1600, 0.04), t, 0.18, pan=0.3, verb=0.3)

# principles word changes
for i in range(5): add(whoosh(0.3, 800, 5000), 18.9 + i, 0.18)
add(boing(260), 19.85, 0.35); add(boing(420), 21.0, 0.2); add(boing(400), 21.33, 0.2); add(boing(380), 21.66, 0.2)

# particles: riser, impact, shimmer, blow-away
add(riser(0.65), 23.35, 0.9)
add(impact(), 23.98, 1.0, verb=0.5)
for i in range(40):
    t = 24.1 + i * 0.03
    add(tone(NOTE(76 + [0, 3, 7, 12][i % 4]), 0.25, 'sine', 12), t, 0.03, pan=np.sin(i * 1.7), verb=0.6)

# end card
add(impact(), 26.98, 0.8, verb=0.3)
for i in range(6): add(pop(800 + i * 70), 27.1 + i * 0.05, 0.2)
add(pop(1200), 28.0, 0.3, verb=0.4)
add(impact(), 29.8, 0.6, verb=0.6)
add(tone(NOTE(69), 1.2, 'pluck', 1.2), 29.8, 0.12, verb=0.8)

# ---------- reverb (Schroeder) ----------
def reverb(x):
    out = np.zeros_like(x)
    for d, g in ((1557, .84), (1617, .83), (1491, .85), (1422, .84), (1277, .82), (1356, .83)):
        a = np.zeros(d + 1); a[0] = 1; a[d] = -g
        out += lfilter([1], a, x)
    for d in (225, 556):
        b = np.zeros(d + 1); b[0] = -0.5; b[d] = 1
        a = np.zeros(d + 1); a[0] = 1; a[d] = -0.5
        out = lfilter(b, a, out)
    return lp(out, 6000) * 0.12

rv = reverb(VERB)
L += rv; R += np.roll(rv, 331)

mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.3) / np.tanh(1.3)
mix /= np.abs(mix).max() / 0.89
fade = int(0.05 * SR); mix[:fade] *= np.linspace(0, 1, fade)[:, None]; mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

with wave.open('soundtrack.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote soundtrack.wav', mix.shape[0] / SR, 's')
