const {launch}=require('./harness.cjs');
(async()=>{const b=await launch();const ctx=await b.newContext();const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));
await page.addInitScript(()=>{if(!sessionStorage.x){localStorage.setItem('b29-quiet-odyssey-v1',JSON.stringify({version:1,damages:[{id:'a',pos:[3.79,1,2],severity:2}],position:[0,0,0]}));sessionStorage.x=1;}});
await page.goto('http://localhost:3000/index.html');await page.waitForTimeout(6000);
const a=await page.evaluate(()=>B29.ship.position.z);await page.waitForTimeout(3000);
const r=await page.evaluate(()=>({z:B29.ship.position.z,text:document.getElementById('ai-text').textContent,dialog:document.querySelector('dialog[open]')?.id,vis:document.visibilityState}));
console.log(JSON.stringify({a,...r,errs}));await b.close();})();
