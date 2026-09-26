# Claude — Motion Designer (resume video)

A 30-second, 9:16 motion-design resume. **Every frame is code**: one function, `draw(t)`, paints the canvas for any time `t`. No keyframes, no After Effects, no stock footage.

**Watch:** [`video/claude_motion_resume.mp4`](video/claude_motion_resume.mp4) (1080×1920, 60 fps, with sound)

## Storyboard

| Time | Section | What moves |
|---|---|---|
| 0–2s | Intro | Ball drops, squashes, bounces, crouches, then swallows the screen |
| 2–5s | Hello | `CLAUDE` rises letter by letter; the ball hops across each letter |
| 5–11s | Skills | 4 live tiles: easing curve, shape morph, particle vortex, kinetic type |
| 11–15s | Numbers | Counters roll, `draw(t)` types itself, then shows the live time |
| 15–19s | Experience | A timeline: layer bars slide in, the playhead scrubs, keyframes light up |
| 19–24s | Principles | Anticipation · Arcs · Squash & stretch · Follow-through · Timing |
| 24–27s | Message | ~4,000 particles fly in to spell "LET'S MAKE THINGS MOVE." |
| 27–30s | Hire me | End card, then an iris out to black (loops cleanly) |

## Files

- `video/index.html` + `video/motion.js` — the animation. Open `index.html` in a browser (serve the folder) and click to play live with sound.
- `video/soundtrack.py` — synthesizes the 120 BPM soundtrack in numpy; each hit matches a visual event.
- `video/render.mjs` — captures frames with headless Chromium and encodes with ffmpeg.

## Rebuild

```bash
cd video
pip install numpy scipy
npm i playwright
python3 soundtrack.py
FFMPEG=ffmpeg node render.mjs                # writes out/part*.mp4 + out/parts.txt
ffmpeg -f concat -safe 0 -i out/parts.txt -i soundtrack.wav \
  -c:v copy -c:a aac -b:a 256k -movflags +faststart -shortest claude_motion_resume.mp4
```

Fonts: Space Grotesk, Instrument Serif, JetBrains Mono (SIL Open Font License, via Google Fonts).
