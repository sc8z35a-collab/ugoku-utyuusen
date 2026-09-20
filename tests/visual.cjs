'use strict';
// Run against local preview or production: BASE_URL=https://... node tests/visual.cjs
// Install Playwright locally, or set PLAYWRIGHT_MODULE to its absolute module path.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const quick = process.env.QUICK_CHECK === '1';
const base = process.env.BASE_URL || 'http://localhost:3000/';
const output = path.resolve(__dirname, '..', process.env.OUTPUT_DIR || 'artifacts');
fs.mkdirSync(output, { recursive: true });
const views = [
  ['cockpit', [0, 1.65, -1.15], [0, 1.9, -7]],
  ['controls', [-.2, 1.55, -2.75], [0, .86, -4.7]],
  ['switches', [-1.7, 1.8, -3.7], [-2.65, 1, -4.55]],
  ['ceiling', [0, 1.62, 2], [0, 4.2, 4]],
  ['cabin', [0, 1.62, 1.6], [0, 1.5, 10]],
  ['reverse', [0, 1.62, 9], [0, 1.5, 1]],
  ['lounge', [-.7, 1.65, 3.7], [-3, 1.2, 3]],
  ['coffee', [-1.65, 1.5, 1.98], [-2.65, 1.1, 1.5]],
  ['table', [-.75, 1.55, 4.3], [-1.85, .8, 3.55]],
  ['galley', [1.45,1.7,2.1], [3.05,1.15,1.55]],
  ['hydroponics', [1.55,1.8,-1.2], [3.1,1.3,-.65]],
  ['workbench', [1.6,1.6,9.2], [3.05,1.1,9.8]],
  ['aft-lockers', [-1.6,1.65,13.1], [-3.05,1.35,13.75]],
  ['garden', [-2.12, 1.9, 2.82], [-3.1, 1.85, 2.2]],
  ['books', [-1.9, 1.85, 5.15], [-3.12, 2, 5.1]],
  ['bath', [.7, 1.65, 3], [3, 1.4, 3.7]],
  ['drain', [2.65, 1.52, 2.7], [2.65, .05, 3.65]],
  ['berth', [-1.3, 1.62, 9.4], [-2.9, .9, 8.2]],
  ['servers', [1.2, 1.65, 7], [3, 1.3, 7.7]],
  ['tools', [1.5, 1.5, 9.5], [3.2, 1.4, 9.66]],
  ['airlock', [0, 1.62, 12.5], [0, 1.45, 15.4]],
  ['suit', [1.2, 1.62, 14], [2.45, 1.25, 12.75]],
  ['pipes', [0, -1.3, 4.4], [0, -1.2, 0]],
  ['pipe-close', [0, -1.15, 3], [-1.1, -.9, .8]],
  ['exterior', [21, 13, 27], [0, 1, 4]],
  ['engines', [5, 1, 22], [0, .1, 15.5]],
  ['solar', [10, 8, 14], [6, 1.5, 9]],
  ['nose', [12, 8, -18], [0, 1.5, -2]]
];
const errors = [], report = { base, checks: [], screenshots: [], devices: [] };
function watch(page) {
  page.on('pageerror', error => { errors.push(error.message); console.error('PAGE ERROR', error.message); });
  page.on('console', message => {
    if (message.type() === 'error') { errors.push(message.text()); console.error('CONSOLE ERROR', message.text()); }
  });
}
function deterministicFrames() {
  const callbacks = []; let now;
  window.requestAnimationFrame = callback => callbacks.push(callback);
  window.__step = (frames = 1) => {
    now = Math.max(now || 0, performance.now());
    for (let i = 0; i < frames; i++) { now += 50; callbacks.splice(0).forEach(callback => callback(now)); }
  };
}
async function capture(page, name) {
  if (quick) return;
  // Capture directly without waiting for the application's manually stepped RAF.
  const session = await page.context().newCDPSession(page);
  const image = await session.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(output, `${name}.png`), Buffer.from(image.data, 'base64'));
  await session.detach();
  report.screenshots.push(name);
  console.log(`CAPTURE ${name}`);
}
(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    watch(page); await page.addInitScript(deterministicFrames);
    await page.goto(new URL('?check=1&view=test', base).href, { waitUntil: 'domcontentloaded', timeout: 180000 });
    await page.waitForFunction(() => window.B29?.diagnostics?.length >= 47, null, { timeout: 180000, polling: 1000 });
    report.checks = await page.evaluate(() => {
      const checks=[...B29.diagnostics];
      if(B29.render){
        B29.scene.updateMatrixWorld(true);
        const visible=B29.monitors.every(m=>{
          const center=m.screen.getWorldPosition(new THREE.Vector3());
          const normal=new THREE.Vector3(0,0,1).applyQuaternion(m.screen.getWorldQuaternion(new THREE.Quaternion()));
          const ray=new THREE.Raycaster(center.clone().addScaledVector(normal, .25),normal.negate(),0,.3);
          ray.camera=B29.camera;
          const solid=ray.intersectObjects(B29.ship.children,true).find(hit=>{
            for(let p=hit.object;p;p=p.parent)if(!p.visible)return false;
            return hit.object.isMesh&&!hit.object.material.transparent;
          });
          return solid?.object===m.screen;
        });
        checks.push({name:'All six screen faces are visibly in front of their bezels',pass:visible});
      }
      return checks;
    });
    console.log(`CHECKS ${report.checks.filter(check => check.pass).length}/${report.checks.length}`);
    console.log('FAILED CHECKS', JSON.stringify(report.checks.filter(check => !check.pass)));
    await page.evaluate(() => {
      document.querySelector('#game-hud').style.display = 'none';
      document.querySelector('.topbar').style.display = 'none';
    });
    for (const [name, position, target] of (quick ? [] : views)) {
      await page.evaluate(({ position, target }) => {
        B29.camera.position.set(...position); B29.camera.lookAt(new THREE.Vector3(...target));
        B29.chair.visible = true; B29.scene.updateMatrixWorld(true);
        if (B29.render) B29.render(); else B29.renderer.render(B29.scene, B29.camera);
      }, { position, target });
      await capture(page, name);
      assert.equal(await page.evaluate(() => B29.renderer.getContext().getError()), 0, `${name}: WebGL error`);
    }
    if (!quick && await page.evaluate(() => !!B29.testActions)) {
      const mechanismViews = [
        ['sink-running', [1.9,1.6,1.5], [3.05,1.05,1.3], 'tap'],
        ['storage-open', [1.55,1.2,1.5], [2.9,.6,1.3], 'cabinet'],
        ['workbench-lamp-off', [1.6,1.6,9.2], [3.05,1.1,9.8], 'task-light'],
        ['brewing', [-2,1.55,2.25], [-2.65,1.1,1.65], 'coffee'],
        ['hatch-open', [0,1.62,3.4], [0,-.3,4.6], 'hatch'],
        ['bulkhead-closed', [0,1.62,10.1], [0,1.35,11.9], 'safe'],
        ['shower-running', [2.25,1.65,2.4], [2.7,1.4,3], 'shower'],
        ['engine-thrust', [4,1,23], [-.5,-.6,17], 'thrust']
      ];
      for (const [name, position, target, action] of mechanismViews) {
        await page.evaluate(({ position, target, action }) => {
          if (action === 'thrust') B29.testActions.state().speed=2;
          else B29.testActions.act(action);
          const s=B29.testActions.state();
          B29.updateMechanisms(action==='coffee'?.1:2,12,{safe:s.safe,layer:s.layer,speed:s.speed,faults:[]});
          B29.coffeeGroup.visible=false;
          B29.camera.position.set(...position);B29.camera.lookAt(new THREE.Vector3(...target));B29.scene.updateMatrixWorld(true);B29.render();
        }, { position, target, action });
        await capture(page, name);
      }
    }
    await page.close();
    for (const [device, width, height, touch] of [['desktop', 1440, 900, false], ['phone-landscape', 844, 390, true], ['phone-portrait', 390, 844, true]]) {
      const context = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, deviceScaleFactor: 1 });
      const p = await context.newPage(); watch(p); await p.addInitScript(deterministicFrames);
      await p.goto(new URL('?check=1', base).href, { waitUntil: 'domcontentloaded', timeout: 180000 });
      await p.waitForFunction(() => window.B29 && document.body.classList.contains('playing'), null, {polling:100,timeout:180000});
      await p.evaluate(() => window.__step(4));
      assert.equal(await p.locator('#welcome, #start-button, #rotate-notice, .keyboard-hint, .top-status, .brand').count(), 0);
      assert.equal(await p.locator('#ai-text').textContent(), '', 'No unsolicited startup text');
      for (const id of ['fullscreen-button', 'help-toggle', 'sound-toggle', 'seat-button']) {
        const button=p.locator('#'+id), bounds=await button.boundingBox();
        assert.ok(bounds && bounds.width>=44 && bounds.height>=44, `${id}: touch-sized control`);
        assert.equal((await button.textContent()).trim(), '', `${id}: icon only`);
        assert.ok(await button.getAttribute('aria-label'), `${id}: accessible name`);
      }
      await capture(p, `${device}-playing`);
      await p.locator('#fullscreen-button').click();
      await p.waitForFunction(() => !!document.fullscreenElement, null, {polling:100,timeout:180000});
      assert.equal(await p.locator('#fullscreen-button').getAttribute('aria-pressed'), 'true');
      await p.locator('#fullscreen-button').click();
      await p.waitForFunction(() => !document.fullscreenElement, null, {polling:100,timeout:180000});
      await p.keyboard.press('g');await p.waitForFunction(() => !!document.fullscreenElement, null, {polling:100,timeout:180000});
      // Browser exits (including Esc) must update the icon without another button click.
      await p.evaluate(() => document.exitFullscreen());
      await p.waitForFunction(() => document.querySelector('#fullscreen-button').getAttribute('aria-pressed')==='false', null, {polling:100,timeout:180000});
      const aspect=await p.evaluate(() => ({actual:B29.camera.aspect,expected:innerWidth/innerHeight}));
      assert.equal(aspect.actual,aspect.expected,'Renderer resizes after fullscreen');
      await p.evaluate(() => { document.documentElement.requestFullscreen=()=>Promise.reject(new Error('Blocked by browser')); });
      await p.locator('#fullscreen-button').click();
      assert.equal(await p.locator('#fullscreen-help').isVisible(),true,'Blocked fullscreen has useful fallback');
      await p.locator('#fullscreen-help .dialog-close').click();
      await p.evaluate(() => { delete document.documentElement.requestFullscreen; });
      assert.equal(await p.locator('#game-hud').isVisible(), true);
      await p.locator('#seat-button').click(); await p.evaluate(() => window.__step());
      assert.equal(await p.evaluate(() => B29.chair.visible), true, 'Stand action');
      const before = await p.evaluate(() => B29.camera.position.z);
      if (touch) {
        const bounds = await p.locator('#move-pad').boundingBox();
        assert.ok(bounds, 'Touch movement pad visible');
        const input = await context.newCDPSession(p);
        const x = bounds.x + bounds.width / 2, y = bounds.y + bounds.height / 2;
        await input.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 7 }] });
        await input.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + 28, id: 7 }] });
        await p.evaluate(() => window.__step(8));
        await input.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await input.detach();
      } else {
        await p.keyboard.down('s'); await p.evaluate(() => window.__step(8)); await p.keyboard.up('s');
      }
      assert.ok(await p.evaluate(() => B29.camera.position.z) > before, 'Movement input advances player');
      const yaw = await p.evaluate(() => B29.camera.rotation.y);
      await p.mouse.move(width * .55, height * .48); await p.mouse.down(); await p.mouse.move(width * .65, height * .48); await p.mouse.up(); await p.evaluate(() => window.__step());
      assert.notEqual(await p.evaluate(() => B29.camera.rotation.y), yaw, 'Drag changes camera orientation');
      await p.locator('#help-toggle').click(); assert.equal(await p.locator('#guide-dialog').isVisible(), true);
      await capture(p, `${device}-guide`); await p.locator('#guide-dialog .dialog-close').click();
      assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow');
      console.log('PASS device '+device);
      report.devices.push({ device, width, height, movement: true, look: true, guide: true, instantStart: true, fullscreen: true, fullscreenFallback: true });
      await context.close();
    }
    // Real startup/save round trip, outside diagnostic mode (which intentionally never saves).
    const savedPage=await browser.newPage({viewport:{width:1024,height:700}});watch(savedPage);
    await savedPage.addInitScript(deterministicFrames);
    await savedPage.goto(base,{waitUntil:'domcontentloaded',timeout:180000});
    await savedPage.waitForFunction(()=>document.body.classList.contains('playing'), null, {polling:100,timeout:180000});
    await savedPage.locator('#seat-button').click();await savedPage.keyboard.down('s');
    await savedPage.evaluate(()=>window.__step(10));await savedPage.keyboard.up('s');
    await savedPage.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
    const saved=await savedPage.evaluate(()=>JSON.parse(localStorage.getItem('b29-quiet-odyssey-v1')));
    assert.equal(saved.seated,false);assert.ok(saved.player[2]>.1);
    await savedPage.reload({waitUntil:'domcontentloaded',timeout:180000});
    await savedPage.waitForFunction(()=>document.body.classList.contains('playing'), null, {polling:100,timeout:180000});
    assert.deepEqual(await savedPage.evaluate(()=>B29.camera.position.toArray()),saved.player,'Saved position restored without start screen');
    assert.equal(await savedPage.locator('#ai-text').textContent(),'','No unsolicited resume message');
    await savedPage.close();
    assert.deepEqual(report.checks.filter(check => !check.pass), [], 'Physical regression failure');
    assert.deepEqual(errors, [], 'Browser errors');
    console.log(`PASS ${report.checks.length} physics checks, ${report.screenshots.length} screenshots, ${report.devices.length} device layouts`);
  } finally {
    report.errors = errors; fs.writeFileSync(path.join(output, 'visual-report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>B–29 / Visual review</title><style>body{background:#0d1b22;color:#d1dcca;font:15px system-ui;margin:32px}h1{font-weight:400}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}figure{margin:0}img{width:100%;border-radius:8px}figcaption{padding:10px 0;color:#aac5be}a{color:inherit}</style><h1>B–29 / 実画面プレビュー</h1><p>${report.checks.filter(c=>c.pass).length}/${report.checks.length} checks · ${report.screenshots.length} views</p><main>${report.screenshots.map(name=>`<figure><a href="${name}.png"><img loading="lazy" src="${name}.png" alt="${name}"></a><figcaption>${name}</figcaption></figure>`).join('')}</main></html>`);
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
