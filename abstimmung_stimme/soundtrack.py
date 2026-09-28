"""Score for the voice-first cut (music + sound design only; the voice is mixed in later).
Documentary / suspense: low drone, heartbeat, ticking clock, deep hits, a distant cowbell.
Every event is keyed to a spoken word from words.json. Music ducks under the voice."""
import json, sys, wave
import numpy as np
sys.path.insert(0, '../video')
SRC = open('../video/soundtrack.py').read().split('# ---------- EVENT TIMES')[0]
SRC = SRC.replace('SR, DUR, BPM = 48000, 30.0, 120', 'SR, DUR, BPM = 48000, 50.8, 120')
exec(SRC)  # shared synth toolkit: kick, clap, hat, tone, pop, boing, tick, whoosh, riser, impact, add, bp, hp, lp, ts, NOTE

OFFSET = 0.4
d = json.load(open('words.json'))
WORDS = [[s + OFFSET, e + OFFSET, w] for s, e, w in d['words']]
DURV = round(d['duration'] + OFFSET + 1.0, 2)
assert abs(DURV - DUR) < 0.05, DURV
def at(word, n=1):
    c = 0
    for s, e, w in WORDS:
        if w == word:
            c += 1
            if c == n: return s
    raise KeyError(word)

def cowbell(d=0.6):
    t = ts(d); s = np.sign(np.sin(2*np.pi*540*t)) + np.sign(np.sin(2*np.pi*800*t))
    return bp(s, 500, 2500) * (0.6*np.exp(-t*30) + 0.4*np.exp(-t*6)) * 0.5
def thump():
    t = ts(0.35); f = 40 + 40*np.exp(-t*30)
    return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*12)
def heartbeat(t0):
    add(thump(), t0, 0.9); add(thump(), t0 + 0.22, 0.6)
def boom(t0, g=0.9):
    s = np.zeros(int(2.5*SR)); t = ts(2.5)
    f = 35 + 60*np.exp(-t*8); s += np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*2.2)
    s += lp(rng.standard_normal(len(t)), 900) * np.exp(-t*5) * 0.4
    add(np.tanh(s*1.4), t0, g, verb=0.25)
def sweep(f0, f1, d):
    t = ts(d); f = f0*(f1/f0)**(t/d); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.pi*t/d)**0.5

# drone bed: A minor, swells per section
t = np.arange(N)/SR
bed = np.zeros(N)
for fr, g in ((55, 0.5), (82.41, 0.3), (110, 0.22), (164.8, 0.08)):
    bed += g * np.sin(2*np.pi*fr*t + 0.3*np.sin(2*np.pi*0.07*t))
bed = lp(bed + 0.05*lp(rng.standard_normal(N), 300), 700)
bed_env = np.interp(t, [0, 1.5, at('Erstens:'), at('Zweitens:') - 0.5, at('Zweitens:'), at('Und', 1), at('Und', 1) + 2, DUR - 1.2, DUR],
                   [0, 0.6, 0.7, 0.9, 0.55, 1.0, 1.15, 0.9, 0])
bed *= bed_env * 0.28
L += bed; R += np.roll(bed, 240)

# hook
add(cowbell(1.2), 0.05, 0.35, pan=-0.4, verb=0.9)
boom(at('27.'), 0.8)
add(whoosh(0.5, 200, 2000), at('Die') - 0.3, 0.25)
add(whoosh(0.35, 800, 4000), at('entscheidet.') - 0.1, 0.25)
boom(at('entscheidet.') + 0.35, 0.9)
for i in range(2): add(pop(600 + 200*i), at('zwei') + i*0.12, 0.3, pan=(-0.4, 0.4)[i])
add(riser(0.9), at('Erstens:') - 0.9, 0.7)

# 01 neutrality
boom(at('Neutralität.'), 0.8)
for i, m in enumerate((57, 60, 64)): add(tone(NOTE(m), 1.5, 'pluck', 1.5), at('Neutralität.') + i*0.18, 0.12, verb=0.6)
for i in range(12): add(tick(), at('Eine') + i*0.12, 0.12, pan=0.3)   # pen writing
add(kick(True), at('schreiben.'), 0.8); add(clap(), at('schreiben.'), 0.4, verb=0.4)
tt = at('Immerwährend.')
while tt < at('Die', 2) - 0.2:   # clock
    add(tick(), tt, 0.35, pan=-0.2); tt += 0.5
for w in ('Immerwährend.', 'Bewaffnet.', 'Keine', 'Sanktionen'):
    add(tone(NOTE(69), 0.8, 'pluck', 3), at(w), 0.12, verb=0.5); add(whoosh(0.3, 600, 3000), at(w) - 0.15, 0.15)
add(whoosh(0.5, 300, 2500), at('Die', 2) - 0.2, 0.25)
add(sweep(200, 140, 0.9), at('Befürworter', 1), 0.1); add(sweep(140, 200, 0.9), at('Bundesrat', 1), 0.1)
for i in range(40): add(tick(), at('Ihre') + i*0.02, 0.2, pan=-0.6 + i*0.03)   # seats filling
boom(at('Nein.', 1), 1.0)

# 02 food
add(riser(0.8), at('Zweitens:') - 0.8, 0.6)
boom(at('Zweitens:'), 0.7)
for i, m in enumerate((57, 60, 64)): add(tone(NOTE(m), 1.5, 'pluck', 1.5), at('Zweitens:') + i*0.18, 0.12, verb=0.6)
for k in range(3): heartbeat(at('eng') - 0.6 + k*0.9)
add(sweep(300, 600, 0.8), at('45'), 0.12); add(sweep(600, 900, 0.8), at('70.'), 0.14)
for i in range(10): add(pop(900 + i*60, 0.05), at('zehn') + i*0.06, 0.18)
add(whoosh(0.5, 300, 2500), at('Die', 3) - 0.2, 0.25)
add(sweep(200, 140, 0.9), at('Befürworter', 2), 0.1); add(sweep(140, 200, 0.9), at('Bundesrat', 2), 0.1)
for i in range(40): add(tick(), at('Im') + i*0.02, 0.2, pan=-0.6 + i*0.03)
add(kick(True), at('Einstimmig'), 0.8); add(clap(), at('Einstimmig'), 0.45, verb=0.4)
boom(at('Nein.', 2), 1.0)

# outro: heartbeat under the question, cliffhanger, final cowbell
add(riser(0.6), at('Und', 1) - 0.6, 0.5)
tt = at('Und', 1)
while tt < at('Und', 2) - 0.3:
    heartbeat(tt); tt += 1.0
add(pop(1200), at('siehst') - 0.1, 0.3, verb=0.4)
boom(at('Und', 2), 0.8)
for i, m in enumerate((57, 64, 69, 72)): add(tone(NOTE(m), 2.0, 'pluck', 1.0), at('hättest') + i*0.2, 0.1, verb=0.7)
add(cowbell(1.5), DUR - 0.9, 0.4, pan=0.3, verb=0.9)

# ---------- reverb + duck under the voice ----------
def reverb(x):
    out = np.zeros_like(x)
    for dd, g in ((1557, .84), (1617, .83), (1491, .85), (1422, .84), (1277, .82), (1356, .83)):
        a = np.zeros(dd + 1); a[0] = 1; a[dd] = -g; out += lfilter([1], a, x)
    for dd in (225, 556):
        b = np.zeros(dd + 1); b[0] = -0.5; b[dd] = 1; a = np.zeros(dd + 1); a[0] = 1; a[dd] = -0.5; out = lfilter(b, a, out)
    return lp(out, 5000) * 0.14
from scipy.signal import lfilter
rv = reverb(VERB); L += rv; R += np.roll(rv, 331)
speech = np.zeros(N)
for s, e, w in WORDS: speech[int(s*SR):int(e*SR)] = 1
speech = np.clip(lp(speech, 4) * 1.2, 0, 1)
mix = np.stack([L, R], 1) * (1 - 0.5*speech)[:, None]
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix /= np.abs(mix).max() / 0.5      # headroom: the voice sits on top in the final mix
fade = int(0.05*SR); mix[:fade] *= np.linspace(0, 1, fade)[:, None]
with wave.open('score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('score.wav', N/SR, 's')
