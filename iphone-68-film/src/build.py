import base64, json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(here, 'film.src.html'), encoding='utf-8').read()
assets = {}
adir = os.path.join(here, 'assets')
img = {}
for key in ('edge', 'cam', 'fin'):
    for ext in ('jpg', 'webp', 'png'):
        p = os.path.join(adir, f'{key}.{ext}')
        if os.path.exists(p):
            mime = {'jpg': 'jpeg'}.get(ext, ext)
            img[key] = f'data:image/{mime};base64,' + base64.b64encode(open(p, 'rb').read()).decode()
            break
if img:
    assets['img'] = img
vo_times = [10.6, 19.8, 28.6, 36.4, 44.4, 55.8]
vo = []
want_vo = '--vo' in sys.argv
for i, t in enumerate(vo_times if want_vo else []):
    p = os.path.join(adir, f'vo{i}.mp3')
    if os.path.exists(p):
        vo.append({'t': t, 'b64': base64.b64encode(open(p, 'rb').read()).decode()})
if vo:
    assets['vo'] = vo
tag = '<script>window.__ASSETS__=' + json.dumps(assets, separators=(',', ':')) + ';</script>' if assets else ''
out = src.replace('<!--__ASSETS__-->', tag)
if want_vo:
    out = out.replace('<title>iPhone 68 Film</title>', '<title>iPhone 68 Film Narrated</title>')
args = [a for a in sys.argv[1:] if not a.startswith('--')]
outp = args[0] if args else os.path.join(here, 'film.html')
open(outp, 'w', encoding='utf-8').write(out)
print('built', outp, len(out), 'bytes; img:', list(img), 'vo:', len(vo))
