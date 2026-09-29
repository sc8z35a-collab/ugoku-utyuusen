const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const cases={
 logsNull:{version:1,damages:[],position:[0,0,0],logs:null},
 damageMissingFields:{version:1,damages:[{id:'a',pos:[3.79,1,2],severity:2}],position:[0,0,0]},
 playerShort:{version:1,damages:[],position:[0,0,0],player:[1]},
 positionShort:{version:1,damages:[],position:[1]},
};
for(const [name,data] of Object.entries(cases)){
 const ctx=await b.newContext();const page=await ctx.newPage();const errs=[];page.on('pageerror',e=>errs.push(e.message));
 await page.addInitScript(d=>{if(!sessionStorage.x){localStorage.setItem('b29-quiet-odyssey-v1',d);sessionStorage.x=1;}},JSON.stringify(data));
 await page.goto('http://localhost:3000/index.html');await page.waitForTimeout(6000);
 const r=await page.evaluate(()=>({cam:B29.camera.position.toArray().map(v=>+(+v).toFixed(2)),ship:B29.ship.position.toArray(),oxyText:null}));
 // advance a few seconds of real frames
 await page.waitForTimeout(2000);
 const r2=await page.evaluate(()=>({cam:B29.camera.position.toArray().map(v=>String(v)),ship:B29.ship.position.toArray().map(String)}));
 console.log(name,JSON.stringify({errs,r,r2}));await ctx.close();}
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
