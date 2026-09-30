# iPhone 68 — concept launch film (60 s)

A fan-made, Apple-keynote-style launch film for an invented phone, **iPhone 68**. Not affiliated with or endorsed by Apple. Every feature and number in it is made up.

## What is here

| File | What it is |
|---|---|
| `iphone68_ai.mp4` | **AI-video version**, 1080p30, music only |
| `iphone68_ai_voiceover.mp4` | Same film with an AI voice-over (music ducks under the voice) |
| `film.html` | **Code version**, music only. Self-contained: open it in a browser and press play |
| `film_vo.html` | Code version with the voice-over |
| `src/` | Everything needed to rebuild the above |
| `ai_clips.md` | Prompts, job IDs and credit cost of every generated clip |

Live copies of the code versions:
- music only: https://claude.ai/artifact/QTt3XJFoeYo9RfwWWA7feA
- with voice-over: https://claude.ai/artifact/SfWau6JPMBcfdN1BH159qn

## Storyboard (same timeline in every version)

| Time | Beat | Voice-over |
|---|---|---|
| 0:00 | A thin line of light widens | |
| 0:04 | "Glass. Metal. Light." on a macro of the titanium edge | |
| 0:10 | Reveal: **iPhone 68** | "Meet iPhone 68." |
| 0:19 | Display: edge to edge, 1.2 mm borders, 3,000 nits | "A display that disappears. So only what you love remains." |
| 0:28 | Camera: three 48 MP lenses | "A camera that sees what you felt." |
| 0:36 | Intelligence: private, on device | "Intelligence that begins before you ask." |
| 0:44 | Battery: 48 hours | "Power that outlasts your day. And tomorrow." |
| 0:50 | Three finishes: Natural, Deep Blue, Silver | |
| 0:56 | End card: "Simply, more." | "iPhone 68. Simply, more." |

## How the two kinds of version are made

**Code version (`film.html`).** One HTML file. The 3D phone is real CSS 3D, the particle orb and battery ring are drawn in code, and the score is synthesised with the Web Audio API (rendered once offline, then played back). Two generated stills (`src/assets/edge.jpg`, `cam.jpg`) are blended in. The voice-over lines (`src/assets/vo*.mp3`) are embedded only in `film_vo.html`.

**AI-video version (`iphone68_ai*.mp4`).** Nine clips generated with Kling 3.0 Pro (image-to-video from generated stills where possible), crossfaded by `src/assemble.py`. Text is rendered from `src/overlay.html` as transparent PNGs and faded on top. The audio is the same synthesised score, exported to WAV by `src/wav.js`.

## Rebuild

```bash
# code versions (from this folder)
python3 src/build.py film.html            # music only
python3 src/build.py film_vo.html --vo    # with voice-over

# AI-video versions need the raw clips, which are not committed (about 100 MB).
# Download them by job ID from ai_clips.md into src/clips/ (c0.mp4 ... c8.mp4, with
# the orb as c5b.mp4 and the battery as c6b.mp4, see the CLIPS list in assemble.py), then:
cd src
#   1. node ovshots.js glass metal light name d_eye d_h1 d_sub d_s1 d_s2 c_eye c_h1 c_sub \
#        i_eye i_h1 i_sub b_eye b_h1 b_sub b_stat f_h end end2 end3     (text PNGs into ov/)
#   2. cp ../film.html ../film_vo.html . && node wav.js    (audio_vo.wav, audio_novo.wav)
#   3. FFMPEG=/path/to/ffmpeg python3 assemble.py           (writes the two MP4s in src/)
# Needs an ffmpeg with libx264 and the xfade/overlay filters, plus Playwright for steps 1-2
# (set PWPATH to the playwright package path and create the ov/ folder first).
```

## Notes

- The first frame of `film.html` is a poster from 0:14. Add `#t30` to the URL to start at a given second.
- Fonts: Inter (SIL Open Font License) for the on-screen text in the MP4s.
