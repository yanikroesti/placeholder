#!/usr/bin/env python3
"""Assemble the AI-video cut of the iPhone 68 film.

Clips (Kling 3.0 Pro, image-to-video where a still existed) are crossfaded on a
fixed timeline, transparent text PNGs from overlay.html are faded on top, and
the video is encoded once. Audio is muxed separately (see the bottom).
"""
import os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
FF = os.environ.get('FFMPEG') or os.path.join(HERE, 'pylib/imageio_ffmpeg/binaries/ffmpeg-linux-x86_64-v7.0.2')
XF = 0.5      # crossfade seconds
TOTAL = 61.0

# (file, source duration, start of this scene on the final timeline)
CLIPS = [
    ('clips/c0.mp4', 5.04, 0.0),    # light filament
    ('clips/c1.mp4', 6.04, 4.5),    # metal edge
    ('clips/c2.mp4', 9.04, 10.5),   # hero reveal
    ('clips/c3.mp4', 9.04, 19.5),   # display
    ('clips/c4.mp4', 8.04, 28.5),   # camera
    ('clips/c5b.mp4', 8.04, 36.5),  # intelligence orb
    ('clips/c6b.mp4', 6.04, 44.5),  # battery
    ('clips/c7.mp4', 6.04, 50.5),   # three finishes
    ('clips/c8.mp4', 5.04, 56.0),   # finale
]

# (png id, start, end)
TEXT = [
    ('glass', 4.0, 5.9), ('metal', 5.6, 7.5), ('light', 7.2, 9.4),
    ('name', 10.9, 19.4),
    ('d_eye', 20.0, 27.8), ('d_h1', 20.2, 27.8), ('d_sub', 21.6, 27.8), ('d_s1', 23.4, 27.8), ('d_s2', 24.0, 27.8),
    ('c_eye', 29.0, 35.8), ('c_h1', 29.2, 35.8), ('c_sub', 31.0, 35.8),
    ('i_eye', 36.8, 43.8), ('i_h1', 37.0, 43.8), ('i_sub', 39.0, 43.8),
    ('b_eye', 44.8, 49.8), ('b_h1', 45.0, 49.8), ('b_stat', 45.4, 49.8), ('b_sub', 47.6, 49.8),
    ('f_h', 51.0, 55.8),
    ('end', 57.0, 61.0), ('end2', 57.8, 61.0), ('end3', 58.4, 61.0),
]

def build():
    inputs, filt = [], []
    n = len(CLIPS)
    for i, (f, dur, s) in enumerate(CLIPS):
        inputs += ['-i', os.path.join(HERE, f)]
        nxt = CLIPS[i + 1][2] if i + 1 < n else TOTAL - 0.0
        need = (nxt - s) + (XF if i + 1 < n else 0.0)
        if i > 0:
            need += 0.0
        if i == n - 1:
            need = TOTAL - (s - XF)
        slow = max(1.0, need / dur)
        chain = f'setpts={slow:.5f}*PTS,fps=30,scale=1920:1080:flags=lanczos,setsar=1,format=yuv420p'
        if i == n - 1:
            chain += ',tpad=stop_mode=clone:stop_duration=2'
        chain += f',trim=duration={need:.3f},setpts=PTS-STARTPTS,fps=30'
        if i == 0:
            chain += ',fade=t=in:st=0:d=0.6'
        if i == n - 1:
            chain += ',fade=t=out:st=0.8:d=0.9'
        filt.append(f'[{i}:v]{chain}[v{i}]')
    prev = '[v0]'
    for i in range(1, n):
        off = CLIPS[i][2] - XF
        out = f'[x{i}]'
        filt.append(f'{prev}[v{i}]xfade=transition=fade:duration={XF}:offset={off:.3f}{out}')
        prev = out
    base = n
    for j, (tid, a, b) in enumerate(TEXT):
        d = b - a
        inputs += ['-loop', '1', '-framerate', '30', '-t', f'{d:.3f}', '-i', os.path.join(HERE, 'ov', f'{tid}.png')]
        k = base + j
        filt.append(f'[{k}:v]format=rgba,fade=t=in:st=0:d=0.8:alpha=1,fade=t=out:st={d-0.6:.3f}:d=0.6:alpha=1,setpts=PTS+{a}/TB[t{j}]')
        out = f'[o{j}]'
        filt.append(f"{prev}[t{j}]overlay=eof_action=pass:format=auto:enable='between(t,{a},{b})'{out}")
        prev = out
    filt.append(f'{prev}fade=t=out:st={TOTAL-0.6:.2f}:d=0.6,format=yuv420p[vout]')
    return inputs, ';\n'.join(filt)

def main():
    inputs, graph = build()
    script = os.path.join(HERE, 'graph.txt')
    open(script, 'w').write(graph)
    vid = os.path.join(HERE, 'ai_video_only.mp4')
    cmd = [FF, '-hide_banner', '-y', '-loglevel', 'error', '-stats'] + inputs + [
        '-filter_complex_script', script, '-map', '[vout]', '-an', '-t', str(TOTAL),
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-maxrate', '7M', '-bufsize', '14M',
        '-pix_fmt', 'yuv420p', '-r', '30', '-movflags', '+faststart', vid]
    print('encoding video...', flush=True)
    subprocess.run(cmd, check=True)
    for name, wav in (('iphone68_ai_voiceover.mp4', 'audio_vo.wav'), ('iphone68_ai.mp4', 'audio_novo.wav')):
        out = os.path.join(HERE, name)
        subprocess.run([FF, '-hide_banner', '-y', '-loglevel', 'error', '-i', vid, '-i', os.path.join(HERE, wav),
                        '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                        '-t', str(TOTAL), '-movflags', '+faststart', out], check=True)
        print(name, os.path.getsize(out))

if __name__ == '__main__':
    main()
