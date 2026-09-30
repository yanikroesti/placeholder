const fs = require('fs');
const { chromium } = require(process.env.PWPATH);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  for (const [html, out] of [['film_vo.html','audio_vo.wav'],['film.html','audio_novo.wav']]) {
    const p = await b.newPage();
    await p.goto('file://' + process.cwd() + '/' + html + '#t14');
    const b64 = await p.evaluate(async () => {
      const buf = await window.film.score();
      const n = buf.length, ch = buf.numberOfChannels, sr = buf.sampleRate;
      const L = buf.getChannelData(0), R = buf.getChannelData(1);
      const ab = new ArrayBuffer(44 + n * 4), dv = new DataView(ab);
      const w = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
      w(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt ');
      dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
      dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true);
      w(36, 'data'); dv.setUint32(40, n * 4, true);
      let o = 44;
      for (let i = 0; i < n; i++) {
        for (const c of [L, R]) { const v = Math.max(-1, Math.min(1, c[i])); dv.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
      }
      const u = new Uint8Array(ab); let s = '';
      for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
      return btoa(s);
    });
    fs.writeFileSync(out, Buffer.from(b64, 'base64'));
    console.log(out, fs.statSync(out).size);
    await p.close();
  }
  await b.close();
})();
