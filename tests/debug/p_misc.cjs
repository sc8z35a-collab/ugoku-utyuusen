const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1&view=cabin'});
const r=await page.evaluate(()=>{const g=__g,T=THREE,o={};const S=()=>g.state;
 // 1 test impact at max speed: does it hit?
 const hits={};for(const sp of [0,2,4]){let n=0;for(let k=0;k<10;k++){g.state.damages=[];B29.restoreHull();g.impactors.splice(0).forEach(p=>B29.scene.remove(p.mesh));g.state.speed=sp;B29.ship.rotation.set(0,0,0);B29.ship.position.set(0,0,0);g.state.heading=0;g.state.pitch=0;g.spawnImpact(true);for(let i=0;i<400&&g.impactors.length;i++)g.simulate(.05);if(g.state.damages.length)n++;}hits['speed'+sp]=n+'/10';}
 o.testImpactHits=hits;
 // 2 while turning
 {let n=0;for(let k=0;k<10;k++){g.state.damages=[];B29.restoreHull();g.impactors.splice(0).forEach(p=>B29.scene.remove(p.mesh));g.state.speed=.2;B29.ship.rotation.set(0,0,0);g.state.heading=1.5;g.spawnImpact(true);for(let i=0;i<400&&g.impactors.length;i++)g.simulate(.05);if(g.state.damages.length)n++;}o.hitsWhileTurning=n+'/10';}
 g.state.heading=0;B29.ship.rotation.set(0,0,0);
 // 3 random impact z range -2..11 but test -.8..1.2 ; random severity dist; time. collision z clamp.
 // 4 formatTime age: day display
 g.state.age=86400*3+3600*5+61;o.day=Math.floor(g.state.age/86400)+1;
 // 5 severity1 impactor radius 0.19 at speed: tunneling? envelope tolerance 1.045 with dt .05, velocity ~ 3.5m/s... fine
 // 6 reactor text: 10 - age/31536000
 // 7 returnTime button text when returnTime near 0
 // 8 multiple damages: monitor shows 'd' first unfixed but label '最新位置' uses damages.find (unshift -> newest) ok.
 // 9 aux monitor broken: zones for tabs still registered -> can click tabs on broken screen
 g.state.damages=[];B29.restoreHull();g.collide({severity:2},new T.Vector3(3.8,1,5));g.drawScreens();const aux=B29.monitors.find(m=>m.id==='aux');o.auxBrokenZones=aux.zones.length;
 // 10 serverPatched on new damages after patch: new damage breaks again OK. patch applied when no fault -> log spam
 // 11 pipe repair consumes kit while hasKit false? requires hasKit. kits count decrement for pipe even though "修理キット" meaning
 // 12 light toggle: lamps intensity >5 ? 3 : dayIntensity -> toggling from 19 ->3 ->19 ok. but cabinLight not included
 // 13 oxygen display 'toFixed(1)' fine
 // 14 impactCountdown: when damages>=60 no spawn: fine
 // 15 external camera orbit is world-space fixed not relative to ship
 B29.ship.position.set(500,0,-800);g.toggleExternal(true);window.__step(1);o.extCamDistToShip=+B29.camera.getWorldPosition(new T.Vector3()).distanceTo(B29.ship.position).toFixed(1);
 g.toggleExternal(false);B29.ship.position.set(0,0,0);
 return o;});
console.log(JSON.stringify(r,null,1));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
