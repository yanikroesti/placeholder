"""Score for the results cut (music + sound design; the voice is mixed in on Higgsfield).
Documentary reveal: low drone, drum roll before every number, deep hits on the numbers,
stamp hits on "Abgelehnt", flip ticks for the cantons, heartbeat on turnout, distant cowbell.
Every event is keyed to a spoken word from words.json. Music ducks under the voice."""
import json, sys, wave
import numpy as np
from scipy.signal import lfilter
SRC = open('../video/soundtrack.py').read().split('# ---------- EVENT TIMES')[0]
SRC = SRC.replace('SR, DUR, BPM = 48000, 30.0, 120', 'SR, DUR, BPM = 48000, 43.18, 120')
exec(SRC)  # shared synth toolkit

OFFSET = 0.4
d = json.load(open('words.json'))
WORDS = [[s + OFFSET, e + OFFSET, w] for s, e, w in d['words']]
assert abs(round(d['duration'] + OFFSET + 1.0, 2) - DUR) < 0.05
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
    t = ts(0.35); f = 40 + 40*np.exp(-t*30); return np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*12)
def heartbeat(t0, g=0.9): add(thump(), t0, g); add(thump(), t0 + 0.22, g*0.65)
def boom(t0, g=0.9):
    t = ts(2.5); f = 35 + 60*np.exp(-t*8); s = np.sin(2*np.pi*np.cumsum(f)/SR) * np.exp(-t*2.2)
    s += lp(rng.standard_normal(len(t)), 900) * np.exp(-t*5) * 0.4; add(np.tanh(s*1.4), t0, g, verb=0.25)
def roll(t0, t1, g=0.3):   # snare roll that crescendos into the reveal
    tt = t0; i = 0
    while tt < t1:
        k = (tt - t0) / max(0.01, t1 - t0)
        n = bp(rng.standard_normal(int(0.05*SR)), 1500, 7000) * np.exp(-ts(0.05)*60)
        add(n, tt, g * (0.25 + 0.75*k), pan=0.2*np.sin(i), raw=False); tt += 0.045; i += 1
def sweep(f0, f1, d):
    t = ts(d); f = f0*(f1/f0)**(t/d); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.pi*t/d)**0.5

# add() in the shared toolkit accepts raw=; keep times literal
_add = add
def add(sig, t, gain=1.0, pan=0.0, verb=0.0, raw=True): _add(sig, t, gain, pan, verb)

t = np.arange(N)/SR
bed = np.zeros(N)
for fr, g in ((55, 0.5), (82.41, 0.3), (110, 0.22), (164.8, 0.08)):
    bed += g * np.sin(2*np.pi*fr*t + 0.3*np.sin(2*np.pi*0.07*t))
bed = lp(bed + 0.05*lp(rng.standard_normal(N), 300), 700)
bed_env = np.interp(t, [0, 1.2, at('Resultat.'), at('Resultat.') + 0.5, at('Und', 1), at('Und', 2), DUR - 1.2, DUR],
                       [0, 0.6, 0.8, 0.5, 0.7, 1.0, 0.8, 0])
bed *= bed_env * 0.26
L += bed; R += np.roll(bed, 240)

# hook
add(cowbell(1.2), 0.05, 0.35, pan=-0.4, verb=0.9)
add(kick(True), at('zu.') + 0.1, 0.7); add(clap(), at('zu.') + 0.1, 0.35, verb=0.4)          # lock
for i in range(24): add(tick(), at('Stimmen') + i*0.07, 0.18, pan=np.sin(i))                  # counting
add(riser(0.8), at('Resultat.') - 0.8, 0.6)
boom(at('Resultat.'), 0.9)

for n, (ja, nein, num_ja, num_nein) in enumerate((('Ja:', 'Nein:', '29.8', '70.2'), ('Ja:', 'Nein:', '27.5', '72.5')), 1):
    title = at('Erstens:') if n == 1 else at('Zweitens:')
    add(riser(0.6), title - 0.6, 0.45); boom(title, 0.6)
    for i, m in enumerate((57, 60, 64)): add(tone(NOTE(m), 1.5, 'pluck', 1.5), title + 0.2 + i*0.18, 0.1, verb=0.6)
    roll(at(ja, n), at(num_ja), 0.28); boom(at(num_ja), 0.7)
    roll(at(nein, n) + 0.1, at(num_nein), 0.32); boom(at(num_nein), 0.9)
    k0 = at('Kein') if n == 1 else at('kein')
    k1 = at('Ja.') if n == 1 else at('Kanton.')
    for i in range(26): add(tick(), k0 + (i/25)*(k1 - k0 + 0.2), 0.35, pan=-0.6 + i*0.05)       # canton flips
    a = at('Abgelehnt.', n)
    add(kick(True), a, 0.9); add(clap(), a, 0.55, verb=0.5); boom(a, 0.6)

# turnout
for k in range(3): heartbeat(at('Stimmbeteiligung?') + 0.2 + k*0.55, 0.7)
add(sweep(300, 800, 0.9), at('47'), 0.12)
for i in range(47): add(pop(700 + i*8, 0.04), at('47') + i*0.012, 0.08, pan=-0.5 + i/47)
add(tone(NOTE(57), 1.8, 'pluck', 1.2), at('Mehr'), 0.1, verb=0.7)

# outro
boom(at('Und', 2), 0.7)
for i, m in enumerate((57, 64, 69, 72)): add(tone(NOTE(m), 2.0, 'pluck', 1.0), at('dabei?') + i*0.2, 0.1, verb=0.7)
add(cowbell(1.5), DUR - 0.9, 0.4, pan=0.3, verb=0.9)

def reverb(x):
    out = np.zeros_like(x)
    for dd, g in ((1557, .84), (1617, .83), (1491, .85), (1422, .84), (1277, .82), (1356, .83)):
        a = np.zeros(dd + 1); a[0] = 1; a[dd] = -g; out += lfilter([1], a, x)
    for dd in (225, 556):
        b = np.zeros(dd + 1); b[0] = -0.5; b[dd] = 1; a = np.zeros(dd + 1); a[0] = 1; a[dd] = -0.5; out = lfilter(b, a, out)
    return lp(out, 5000) * 0.14
rv = reverb(VERB); L += rv; R += np.roll(rv, 331)
speech = np.zeros(N)
for s, e, w in WORDS: speech[int(s*SR):int(e*SR)] = 1
speech = np.clip(lp(speech, 4) * 1.2, 0, 1)
mix = np.stack([L, R], 1) * (1 - 0.5*speech)[:, None]
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix /= np.abs(mix).max() / 0.5
fade = int(0.05*SR); mix[:fade] *= np.linspace(0, 1, fade)[:, None]
with wave.open('score.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix*32767).astype('<i2').tobytes())
print('score.wav', N/SR, 's')
