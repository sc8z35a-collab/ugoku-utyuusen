const {launch}=require('./harness.cjs');
(async()=>{const b=await launch();const out={};
for(const mode of ['nocdn','nowebgl']){const ctx=await b.newContext();const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));
 if(mode==='nocdn')await page.route('**/three.min.js',r=>r.abort());
 if(mode==='nowebgl')await page.addInitScript(()=>{const o=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){if(/webgl/.test(t))return null;return o.call(this,t,...a);};});
 await page.goto('http://localhost:3000/index.html');await page.waitForTimeout(5000);
 out[mode]={errs:errs.map(e=>e.slice(0,90)),errorBox:await page.evaluate(()=>{const e=document.getElementById('loading-error');return {hidden:e.classList.contains('hidden'),text:e.textContent.slice(0,40)}}),hudVisible:await page.evaluate(()=>getComputedStyle(document.getElementById('game-hud')).display)};
 await ctx.close();}
console.log(JSON.stringify(out,null,1));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
