const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1&view=cabin'});
await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.reject(new Error('x'));document.getElementById('help-toggle').click();});
await page.keyboard.press('g');await page.waitForTimeout(300);
const r=await page.evaluate(()=>{const ev=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});document.getElementById('space-canvas').dispatchEvent(ev);return {gWhilePausedOpensHelp:document.getElementById('fullscreen-help').open,contextBlocked:ev.defaultPrevented};});
console.log(JSON.stringify(r));await b.close();})();
