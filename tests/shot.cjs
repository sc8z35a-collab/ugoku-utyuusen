'use strict';
// Quick screenshot helper: node tests/shot.cjs "<query>" out.png [waitMs] [evalJS]
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || __dirname + '/../.browsers';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || __dirname + '/../.tools/node_modules/playwright');
(async () => {
  const [query = '', out = 'artifacts/shot.png', wait = '6000', js = ''] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 915, height: 412 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  page.on('console', m => { if (['error', 'warning'].includes(m.type()) || /CHECK|PASS|FAIL/.test(m.text())) console.log(m.type() + ': ' + m.text().slice(0, 300)); });
  page.on('pageerror', e => console.log('PAGEERROR ' + e.message));
  await page.goto('http://localhost:3000/index.html' + query, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(+wait);
  if (js) { console.log('EVAL', JSON.stringify(await page.evaluate(js))); await page.waitForTimeout(1500); }
  await page.screenshot({ path: out });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
