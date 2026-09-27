"""Voiceover build: synthesizes each script segment with Piper (Thorsten, German),
then computes a time map (knots) so the animation re-times to the voice.

Each segment covers one scene of the original 25s timeline (old_start).
Anchors say: "when this phrase is spoken, the animation should be at old time X".
Output: knots.json  [[new_time, old_time], ...], voice.wav (48 kHz mono)."""
import json, subprocess, sys, wave
import numpy as np
from scipy.signal import resample_poly

PIPER_MODEL = sys.argv[1]
SR = 48000
SEGMENTS = [  # old_start, text, anchors [(phrase, old_time)], tail
    (0.0,   'Die Schweiz stimmt ab!', [('Die', 0.5), ('stimmt', 1.0)], 0.55),
    (2.45,  'Zwei Vorlagen, kurz erklärt.', [('Zwei', 2.5), ('kurz', 3.35)], 0),
    (3.75,  'Eins: Neutralitäts-Initiative.', [('Eins', 4.0)], 0),
    (5.35,  'Neutralität in die Verfassung, immerwährend und bewaffnet. Keine Militärbündnisse. '
            'Sanktionen nur via Uno-Sicherheitsrat.',
            [('Neutralität', 5.67), ('immerwährend', 6.27), ('Keine', 6.87), ('Sanktionen', 7.47)], 0),
    (7.95,  'Ja-Seite: Mit Sanktionen wird die Schweiz zur Kriegspartei. '
            'Nein-Seite: Das schränkt die Aussenpolitik unnötig ein.', [('Ja-Seite', 8.25), ('Nein-Seite', 9.05)], 0),
    (10.45, 'Bundesrat und Parlament: Nein.', [('Bundesrat', 10.45 + 0.3), ('Nein', 10.7)], 0),
    (12.2,  'Zwei: Ernährungs-Initiative.', [('Zwei', 12.45)], 0),
    (13.85, 'Heute produziert die Schweiz rund fünfundvierzig Prozent ihres Essens selbst. '
            'Ziel: siebzig Prozent.', [('fünfundvierzig', 14.25), ('Ziel', 15.05)], 0),
    (16.45, 'Ja-Seite: In einer Krise soll sich die Schweiz selbst ernähren können. '
            'Nein-Seite: zu teuer, der Staat müsste massiv eingreifen.', [('Ja-Seite', 16.75), ('Nein-Seite', 17.55)], 0),
    (18.95, 'Bundesrat und Parlament: Nein. Einstimmig.', [('Bundesrat', 18.95 + 0.3), ('Nein', 19.2), ('Einstimmig', 20.0)], 0),
    (20.7,  'Und? Wie hat die Schweiz entschieden? Resultate im nächsten Video. Was hättest du gestimmt?',
            [('Und', 21.1), ('Resultate', 22.3), ('Was', 23.0)], 0.65),
]
OLD_END = 25.0
TAU, LEAD, GAP = 0.3, 0.15, 0.25


def synth(text, i):
    out = f'seg{i:02d}.wav'
    subprocess.run([sys.executable, '-m', 'piper', '-m', PIPER_MODEL, '-f', out, '--length-scale', '0.8',
                    '--sentence-silence', '0.08'], input=text.encode(), check=True, capture_output=True)
    with wave.open(out) as w:
        sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), '<i2') / 32768
    x = resample_poly(x, SR, sr)
    env = np.abs(x) > 0.01
    idx = np.where(env)[0]
    x = x[max(0, idx[0] - 480): idx[-1] + 2400]  # trim silence, keep 10ms head / 50ms tail
    return x


clips = [synth(s[1], i) for i, s in enumerate(SEGMENTS)]
knots, voice_parts, t_new = [], [], 0.0
for i, ((old, text, anchors, tail), clip) in enumerate(zip(SEGMENTS, clips)):
    old_next = SEGMENTS[i + 1][0] if i + 1 < len(SEGMENTS) else OLD_END
    d = len(clip) / SR
    lead = 0.35 if i == 0 else LEAD
    length = max(old_next - old, lead + d + GAP)
    seg = [(t_new, old)]
    if i: seg.append((t_new + TAU, old + TAU))
    for phrase, ot in anchors:
        frac = text.index(phrase) / len(text)
        nt = t_new + lead + d * frac - 0.06
        pn, po = seg[-1]
        nt = max(nt, pn + (ot - po))  # never play the animation faster than designed
        seg.append((nt, ot))
    length = max(length, seg[-1][0] - t_new + (old_next - seg[-1][1]))
    if tail:
        seg.append((t_new + length - tail, old_next - tail))
    knots += seg
    voice_parts.append((t_new + lead, clip))
    print(f'{i:2d}  old {old:5.2f}-{old_next:5.2f}  new {t_new:5.2f}-{t_new + length:5.2f}  voice {d:4.2f}s  | {text[:50]}')
    t_new += length
knots.append((t_new, OLD_END))
# drop duplicates / non-increasing knots
clean = []
for n, o in knots:
    if clean and (n <= clean[-1][0] + 1e-6 or o < clean[-1][1]): continue
    clean.append((round(n, 4), round(o, 4)))
voice = np.zeros(int(t_new * SR) + SR)
for t, clip in voice_parts:
    i = int(t * SR); voice[i:i + len(clip)] += clip
voice = voice[: int(t_new * SR)]
voice /= np.abs(voice).max() / 0.95
json.dump({'duration': round(t_new, 4), 'knots': clean}, open('knots.json', 'w'))
with wave.open('voice.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((voice * 32767).astype('<i2').tobytes())
print(f'total {t_new:.2f}s, {len(clean)} knots')
