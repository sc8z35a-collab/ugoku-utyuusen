'use strict';
// Debug harness (investigation only). Serves the real game but injects a hook that exposes
// closure internals via window.__g. Source files are never modified.
// Usage: PLAYWRIGHT_MODULE=/abs/node_modules/playwright node tests/debug/<probe>.cjs
process.env.PLAYWRIGHT_BROWSERS_PATH = process.env.PLAYWRIGHT_BROWSERS_PATH || '/home/user/webapp/.browsers';
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/home/user/webapp/.tools/node_modules/playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const BASE = process.env.BASE_URL || 'http://localhost:3000/';
const HOOK = `window.__g={get state(){return state},set state(v){state=v},player,keys,move,vertical,impactors,act,simulate,use,getHit,canWalk,movePlayer,seat,save,spawnImpact,collide,hud,drawScreens,insideSafe,toggleExternal,updateMode,pipeFaults,hullIntegrity,network,
get yaw(){return yaw},set yaw(v){yaw=v},get pitch(){return pitch},set pitch(v){pitch=v},get external(){return external},get resting(){return resting},set resting(v){resting=v},get paused(){return paused},get shower(){return shower},get playing(){return playing},get coffeeTime(){return coffeeTime},get aiTime(){return aiTime}};`;
function deterministicFrames() {
  const callbacks = []; let now;
  window.requestAnimationFrame = cb => callbacks.push(cb);
  window.__step = (frames = 1, ms = 50) => { now = Math.max(now || 0, performance.now()); for (let i = 0; i < frames; i++) { now += ms; callbacks.splice(0).forEach(cb => cb(now)); } };
}
async function open(browser, { query = '?check=1&view=cabin', viewport = { width: 1280, height: 800 }, hook = true, context: ctxOpts = {}, init, raf = true } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, ...ctxOpts });
  const page = await context.newPage();
  page.logs = [];
  page.on('console', m => page.logs.push(m.type() + ': ' + m.text()));
  page.on('pageerror', e => page.logs.push('PAGEERROR: ' + e.message));
  if (raf) await page.addInitScript(deterministicFrames);
  if (init) await page.addInitScript(init);
  if (hook) await page.route('**/js/game.js', route => {
    let src = fs.readFileSync(ROOT + '/js/game.js', 'utf8');
    src = src.replace('  requestAnimationFrame(frame);\n', '  ' + HOOK + '\n  requestAnimationFrame(frame);\n');
    if (!src.includes('window.__g=')) throw new Error('hook injection failed');
    route.fulfill({ contentType: 'application/javascript', body: src });
  });
  await page.goto(new URL('index.html' + query, BASE).href, { waitUntil: 'domcontentloaded', timeout: 180000 });
  await page.waitForFunction(() => window.B29 && document.body.classList.contains('playing'), null, { timeout: 180000, polling: 200 });
  return { page, context };
}
async function shot(page, file) {
  const s = await page.context().newCDPSession(page);
  const img = await s.send('Page.captureScreenshot', { format: 'png' });
  fs.mkdirSync(ROOT + '/artifacts/probe', { recursive: true });
  fs.writeFileSync(ROOT + '/artifacts/probe/' + file + '.png', Buffer.from(img.data, 'base64'));
  await s.detach();
}
// Positions/targets are ship-local.
async function view(page, name, pos, target, prep, keepHud = false) {
  await page.evaluate(({ pos, target, prep, keepHud }) => {
    if (!keepHud) { document.querySelector('#game-hud').style.display = 'none'; document.querySelector('.topbar').style.display = 'none'; }
    if (prep) (0, eval)(prep);
    B29.camera.position.set(...pos); B29.camera.lookAt(B29.ship.localToWorld(new THREE.Vector3(...target)));
    B29.scene.updateMatrixWorld(true); B29.render();
  }, { pos, target, prep, keepHud });
  await shot(page, name);
}
async function launch() { return chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] }); }
module.exports = { open, shot, view, launch, ROOT };
