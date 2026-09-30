const { chromium } = require(process.env.PWPATH);
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('file://' + process.cwd() + '/overlay.html');
  await p.evaluate(() => document.fonts.ready);
  const ids = process.argv.slice(2);
  for (const id of ids) {
    await p.evaluate(id => window.show(id), id);
    await p.waitForTimeout(60);
    await p.screenshot({ path: `ov/${id}.png`, omitBackground: true });
  }
  console.log('fonts ok:', await p.evaluate(() => document.fonts.check("700 20px InterL")));
  await b.close();
})();
