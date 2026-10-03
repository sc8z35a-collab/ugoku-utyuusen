'use strict';
// Screenshot helper (software GL friendly): rAF is stepped manually.
// node tests/shot.cjs "<query>" out.png [frames] [evalJS-before-steps] [w] [h]
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || __dirname + '/../.browsers';
const fs = require('fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || __dirname + '/../.tools/node_modules/playwright');
(async () => {
  const [query = '', out = 'artifacts/shot.png', frames = '20', js = '', w = '915', h = '412'] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('console', m => { const t = m.text(); if (['error', 'warning'].includes(m.type()) || /CHECK|FAIL|LOG:/.test(t)) console.log(m.type() + ': ' + t.slice(0, 400)); });
  page.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await page.addInitScript(() => {
    const cbs = []; let now = 0;
    window.requestAnimationFrame = cb => { cbs.push(cb); return cbs.length; };
    window.__step = (n = 1, ms = 50) => { now = Math.max(now, performance.now()); for (let i = 0; i < n; i++) { now += ms; cbs.splice(0).forEach(cb => { try { cb(now); } catch (e) { console.error('frame error ' + e.message + ' ' + e.stack); } }); } };
  });
  await page.goto('http://localhost:3000/index.html' + query, { waitUntil: 'load', timeout: 180000 });
  await page.waitForFunction(() => window.__ready || (window.B29 && document.body.classList.contains('playing')), null, { timeout: 180000, polling: 300 }).catch(() => console.log('not ready'));
  await page.evaluate(() => window.__step(2));
  if (js) console.log('EVAL', JSON.stringify(await page.evaluate(js)));
  await page.evaluate(n => window.__step(n), +frames);
  const s = await ctx.newCDPSession(page);
  const img = await s.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(out, Buffer.from(img.data, 'base64'));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
