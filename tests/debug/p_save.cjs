const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:''});const o={};
// create a severity3 damage, then persist & reload
await page.evaluate(()=>{const g=__g;g.state.speed=0;g.collide({severity:3},new THREE.Vector3(3.8,1.2,5));g.state.damages[0].sealed=true;g.state.damages[0].sealLife=500;g.state.safe=true;B29.safeDoor.position.x=0;g.save();});
o.before=await page.evaluate(()=>({n:__g.state.damages.length,sealLife:__g.state.damages[0].sealLife,hullVis:B29.damageVisuals.length}));
await page.reload();await page.waitForFunction(()=>window.__g&&document.body.classList.contains('playing'),null,{timeout:60000});
o.after=await page.evaluate(()=>{const g=__g;const d=g.state.damages[0];return {n:g.state.damages.length,sealLife:d.sealLife,sealed:d.sealed,hullVis:B29.damageVisuals.length,faces:B29.hull.map(m=>m.geometry.index.count).reduce((a,b)=>a+b)}});
// Infinity sealLife serialization
await page.evaluate(()=>{const g=__g;g.collide({severity:1},new THREE.Vector3(-3.8,1,2));g.act('kit');g.act('damage',{userData:{damage:g.state.damages[0].id}});g.save();});
o.inf=await page.evaluate(()=>({mem:__g.state.damages[0].sealLife,stored:JSON.parse(localStorage.getItem('b29-quiet-odyssey-v1')).damages[0].sealLife}));
await page.reload();await page.waitForFunction(()=>window.__g&&document.body.classList.contains('playing'),null,{timeout:60000});
o.infAfter=await page.evaluate(()=>{const d=__g.state.damages[0];return {sealLife:d.sealLife,fixed:d.fixed,sealed:d.sealed}});
// hasKit persisted & state after reload for shower / tap / cabinet / coffee visuals
o.persist=await page.evaluate(()=>({hasKit:__g.state.hasKit,suit:__g.state.suit}));
// save with suit + eva then reload
await page.evaluate(()=>{const g=__g;g.state.seated=false;g.player.set(0,1.62,13.6);g.state.safe=false;g.act('suit');g.act('airlock');g.player.set(0,8,30);g.save();});
await page.reload();await page.waitForFunction(()=>window.__g&&document.body.classList.contains('playing'),null,{timeout:60000});
await page.evaluate(()=>__step(3));
o.evaReload=await page.evaluate(()=>({layer:__g.state.layer,eva:document.body.classList.contains('eva'),visor:!document.getElementById('visor').classList.contains('hidden'),cam:B29.camera.position.toArray().map(v=>+v.toFixed(2))}));
// corrupted save
await page.evaluate(()=>localStorage.setItem('b29-quiet-odyssey-v1',JSON.stringify({version:1,damages:[{id:'a',pos:[3.79,1,2],severity:2}],position:[0,0,0],logs:null})));
await page.reload();await page.waitForTimeout(4000);
o.corrupt=await page.evaluate(()=>({playing:document.body.classList.contains('playing'),hasG:!!window.__g}));o.errs=page.logs.filter(l=>l.startsWith('PAGE')).slice(-2);
console.log(JSON.stringify(o,null,1));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
