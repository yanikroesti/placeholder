// Renders index.html frame by frame to MP4.
//   node render.mjs                      -> out/abstimmung_27_9_2026.mp4
//   node render.mjs --stills 0.9,3.6,8   -> out/still_<t>.png (quick checks)
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DIR = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(DIR, 'out');
const FPS = 60, DUR = Number(process.env.DUR || 43.18), FRAMES = Math.round(FPS * DUR);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const args = process.argv.slice(2);
const stills = args.includes('--stills') ? args[args.indexOf('--stills') + 1].split(',').map(Number) : null;
const WORKERS = Number(process.env.WORKERS || Math.min(6, os.cpus().length));
fs.mkdirSync(OUT, { recursive: true });

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(DIR, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(DIR) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/index.html?render${process.env.QUERY || ''}`;

const browser = await chromium.launch({ args: ['--force-color-profile=srgb'] });
async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  await page.goto(url);
  await page.evaluate(() => window.ready);
  return page;
}
const shot = async (page, t) => {
  await page.evaluate(tt => window.draw(tt), t);
  return page.locator('canvas').screenshot({ type: 'png' });
};

if (stills) {
  const page = await openPage();
  for (const t of stills) fs.writeFileSync(path.join(OUT, `still_${t.toFixed(2)}.png`), await shot(page, t));
} else {
  const per = Math.ceil(FRAMES / WORKERS);
  const parts = await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    const a = w * per, b = Math.min(FRAMES, a + per), file = path.join(OUT, `part${w}.mp4`);
    const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709',
      '-color_trc', 'bt709', '-colorspace', 'bt709', file], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((ok, bad) => ff.on('close', c => (c ? bad(new Error('ffmpeg ' + c)) : ok())));
    const page = await openPage();
    for (let f = a; f < b; f++) {
      const buf = await shot(page, f / FPS);
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (w === 0 && f % 60 === 0) console.log(`worker0 ${f - a}/${b - a}`);
    }
    ff.stdin.end(); await done;
    return file;
  }));
  fs.writeFileSync(path.join(OUT, 'parts.txt'), parts.map(p => `file '${p}'`).join('\n'));
  console.log('rendered', FRAMES, 'frames');
}
await browser.close();
server.close();
