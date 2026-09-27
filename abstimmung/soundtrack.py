"""Soundtrack for the Abstimmung video: 25s, 120 BPM, C major, with an 808-style cowbell.
Every hit is timed to the visual events in motion.js (see the EVENT TIMES section)."""
import json, os, sys, wave
import numpy as np
from scipy.signal import lfilter, butter

SR, DUR, BPM = 48000, 25.0, 120
# `python3 soundtrack.py vo` builds the voiceover mix: sound effects follow the re-timed
# animation (vo/knots.json), the groove stays on a steady grid, music ducks under the voice.
VO = len(sys.argv) > 1 and sys.argv[1] == 'vo'
if VO:
    _k = json.load(open('vo/knots.json'))
    DUR = _k['duration']
    _new, _old = np.array(_k['knots']).T
    M = lambda t: float(np.interp(t, _old, _new))
else:
    M = lambda t: t
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


def add(sig, t, gain=1.0, pan=0.0, verb=0.0, raw=False):
    i = int((t if raw else M(t)) * SR)
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
CHORDS = [(48, [60, 64, 67]), (43, [55, 59, 62]), (45, [57, 60, 64]), (41, [53, 57, 60])]  # C G Am F


def cowbell(d=0.35):
    t = ts(d)
    s = np.sign(np.sin(2 * np.pi * 540 * t)) + np.sign(np.sin(2 * np.pi * 800 * t))
    return bp(s, 500, 2500) * (0.6 * np.exp(-t * 30) + 0.4 * np.exp(-t * 8)) * 0.5


def stab(chord, d=0.25):
    return sum(lp(tone(NOTE(m + 12), d, 'saw', 7, 0.003), 3000) for m in chord) / 3


def sweep(f0, f1, d):
    t = ts(d); f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) ** 0.5


# ---------- EVENT TIMES (match motion.js) ----------
# hook: cowbell riff, slams, cross swallows the screen
for i, t in enumerate((0.0, 0.25, 0.75, 1.0, 1.25, 1.75)):
    add(cowbell(), t, 0.55 if i % 3 == 0 else 0.35, pan=0.2)
for t in (0.0, 0.5, 1.0):
    add(kick(True), t, 0.8); add(stab(CHORDS[0][1]), t, 0.35, verb=0.3)
add(pop(1200), 1.5, 0.3)
add(riser(0.5), 2.0, 0.8)
add(impact(), 2.47, 1.0, verb=0.3)

G0, G1 = M(2.5), M(24.4)
GROOVE = lambda t: G0 <= t < G1
for b in range(int(DUR / BEAT)):
    t = b * BEAT
    if not GROOVE(t): continue
    add(kick(), t, 0.85, raw=True)
    if b % 2 == 0: add(clap(), t, 0.4, pan=0.05, verb=0.3, raw=True)
    add(hat(), t + BEAT / 2, 0.22, pan=0.35, raw=True)
    add(hat(), t + BEAT / 4, 0.09, pan=-0.35, raw=True); add(hat(), t + 3 * BEAT / 4, 0.09, pan=-0.35, raw=True)
    if b % 4 == 3: add(cowbell(0.2), t + 3 * BEAT / 4, 0.18, pan=-0.3, raw=True)

for bar in range(40):
    t0 = G0 + bar * 2.0
    if t0 >= G1: break
    root, chord = CHORDS[bar % 4]
    for e in range(8):
        t = t0 + e * BEAT / 2
        if e % 2 == 1 or e in (0, 6):
            add(tone(NOTE(root), 0.2, 'saw', 9, 0.004), t, 0.12, raw=True)
            add(tone(NOTE(root - 12), 0.22, 'sine', 7), t, 0.28, raw=True)
    for m in chord:
        add(lp(tone(NOTE(m), 2.1, 'saw', 0.5, 0.25), 1400), t0, 0.03, pan=(m % 3 - 1) * 0.4, verb=0.5, raw=True)

# overview
for i, t in enumerate((2.75, 2.95, 3.15, 3.35)): add(pop(700 + i * 120), t, 0.3, pan=-0.3 + 0.2 * i)

# chapter transitions and titles
for t in (3.72, 12.17, 20.67): add(riser(0.3), t, 0.6)
for t in (4.0, 12.45): add(impact(), t, 0.7, verb=0.3); add(stab(CHORDS[1][1], 0.4), t, 0.3, verb=0.4)
for t in (4.55, 13.0): add(pop(1300), t, 0.25)

# lists / gauge
for t in (5.35, 13.85): add(whoosh(0.35, 600, 4000), t, 0.3)
for i in range(4): add(pop(650 + i * 110), 5.67 + i * 0.6, 0.32, pan=0.3)
add(sweep(300, 700, 0.6), 14.25, 0.12); add(sweep(700, 1000, 0.6), 15.05, 0.14)
for t in (15.6, 15.9, 16.2): add(pop(1100), t, 0.25)

# debates: split whoosh, VS hit, a soft tick per word
for t0, n1, n2 in ((7.95, 8, 8), (16.45, 10, 9)):
    add(whoosh(0.4, 400, 3000), t0 - 0.05, 0.35)
    add(stab(CHORDS[2][1]), t0 + 0.25, 0.3, verb=0.3)
    for i in range(n1): add(tick(), t0 + 0.3 + i * 0.075, 0.25, pan=-0.3)
    for i in range(n2): add(tick(), t0 + 1.1 + i * 0.075, 0.25, pan=0.3)

# parliament: slats, NEIN slam, bars counting, stamp
for t0, stamp in ((10.45, False), (18.95, True)):
    add(whoosh(0.35, 500, 5000), t0, 0.3)
    add(impact(), t0 + 0.25, 0.75, verb=0.3)
    for i in range(10): add(tick(), t0 + 0.55 + (-np.log2(1 - i / 10 * 0.999) / 10) * 0.6, 0.3)
    for i in range(10): add(tick(), t0 + 0.8 + (-np.log2(1 - i / 10 * 0.999) / 10) * 0.6, 0.3, pan=0.2)
    if stamp: add(kick(True), t0 + 1.05, 0.7); add(clap(), t0 + 1.05, 0.5, verb=0.4)

# outro
add(impact(), 21.1, 0.9, verb=0.4); add(cowbell(), 21.1, 0.6)
add(pop(1000), 22.3, 0.35, verb=0.3)
for i in range(4): add(tick(), 23.0 + i * 0.08, 0.3)
add(whoosh(0.4), 24.35, 0.3)
add(cowbell(0.6), 24.75, 0.6, verb=0.5)
add(tone(NOTE(72), 1.0, 'pluck', 2), 24.75, 0.1, verb=0.6)

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
if VO:
    with wave.open('vo/voice.wav') as w:
        v = np.frombuffer(w.readframes(w.getnframes()), '<i2') / 32768
    v = np.pad(v, (0, max(0, N - len(v))))[:N]
    v = hp(v, 90)
    env = lp(np.abs(v), 6)                      # smooth voice envelope for ducking
    env = np.clip(env / (env.max() + 1e-9) * 3, 0, 1)
    mix *= (1 - 0.6 * env)[:, None] * 0.55
    mix += np.stack([v, v], 1) * 0.9
    mix = np.tanh(mix * 1.2) / np.tanh(1.2)
    mix /= np.abs(mix).max() / 0.89
fade = int(0.05 * SR); mix[:fade] *= np.linspace(0, 1, fade)[:, None]; mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

with wave.open('soundtrack_vo.wav' if VO else 'soundtrack.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', 'soundtrack_vo.wav' if VO else 'soundtrack.wav', mix.shape[0] / SR, 's')
