const {launch}=require('./harness.cjs');
(async()=>{const b=await launch();const ctx=await b.newContext();const page=await ctx.newPage();
await page.addInitScript(()=>{if(!sessionStorage.x){localStorage.setItem('b29-quiet-odyssey-v1',JSON.stringify({version:1,damages:[{id:'a',pos:[3.79,1,2],severity:2}],position:[0,0,0]}));sessionStorage.x=1;}});
await page.goto('http://localhost:3000/index.html');await page.waitForTimeout(5000);
console.log(await page.evaluate(()=>{const m=B29.monitors.find(m=>m.id==='main');m.page='systems';return 'stored O2='+JSON.parse(localStorage.getItem('b29-quiet-odyssey-v1')||'{}').oxygen}));
await page.evaluate(()=>dispatchEvent(new Event('pagehide')));
console.log(await page.evaluate(()=>'after save O2='+JSON.parse(localStorage.getItem('b29-quiet-odyssey-v1')).oxygen));
await b.close();})();
