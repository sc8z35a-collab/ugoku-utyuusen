const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1&view=cabin'});
const r=await page.evaluate(()=>{const g=__g,T=THREE,r={};g.state.speed=0;
 // A: memory leak - restoreHull doesn't dispose materials / remove from interactables targets? count scene objects before/after 20 cycles
 const count=()=>{let n=0;B29.ship.traverse(()=>n++);return n};const c0=count();
 for(let k=0;k<20;k++){g.collide({severity:2},new T.Vector3(3.8,1,5));B29.restoreHull();g.state.damages=[];}
 r.objectsLeaked=count()-c0;r.interactablesDamage=B29.interactables.filter(o=>o.userData.damage).length;
 // B: severity3 deform twice same spot -> geometry faces removed persists after restore? checked ok
 // C: shower toggled on, then walking away: shower continues forever & state not saved; after pipe fault stops
 // D: hatch while seated from cockpit? act('hatch') sets seated false and teleports
 g.state.seated=true;g.act('hatch');r.hatchFromSeat={layer:g.state.layer,seated:g.state.seated,chairVis:B29.chair.visible};g.act('hatch');
 // E: EVA exit teleports into airlock position z=13.15 while safe door closed? player inside safe with door; fine.
 // F: airlock enter from EVA with safe door closed -> player at z=13.15, inside safe room: ok
 // G: move speed with diagonal on pad normalized; keyboard+pad sum capped ok
 // H: 'rest' resting flag never used for time acceleration -> resting only camera sway
 g.resting=false;g.act('rest');const age0=g.state.age;g.simulate(1);r.restTimeScale=+(g.state.age-age0).toFixed(2);
 return r;});
console.log(JSON.stringify(r));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
