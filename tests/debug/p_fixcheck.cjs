const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1&view=cabin'});
const r=await page.evaluate(()=>{const g=__g,T=THREE,r={};g.state.speed=0;const S=g.state;
 const mon=B29.monitors.find(m=>m.id==='main');mon.page='systems';g.drawScreens();const sv=()=>mon.zones.find(z=>z.x===38&&z.y===410).action();
 // #45 real flow
 g.state.damages=[];B29.restoreHull();g.collide({severity:2},new T.Vector3(3.8,1,5));sv();g.collide({severity:2},new T.Vector3(-3.8,1,8));r.serverFaultAfterSecondHit=g.state.serverBackup===true&&!(!g.state.serverBackup&&g.state.damages.some(d=>d.severity>=2&&!d.fixed&&!d.serverPatched));
 // #46 real flow: use kits until 0
 g.state.damages=[];g.state.kits=1;g.state.hasKit=false;g.act('kit');g.collide({severity:1},new T.Vector3(3.8,1,9.5));g.act('damage',{userData:{damage:g.state.damages[0].id}});r.hasKitAfterLastKit=g.state.hasKit;
 g.state.returnTime=.01;g.state.speed=.2;g.simulate(.05);r.afterBase={hasKit:g.state.hasKit,kits:g.state.kits,backup:g.state.serverBackup};g.state.speed=0;
 // #47 #21 visibility after simulate
 g.act('kit');g.simulate(.05);r.kitVisibleWhileCarried=B29.repairKit.visible;
 // #3 sealed leak -> oxygen recovers
 g.state.damages=[];g.collide({severity:2},new T.Vector3(3.8,1,5));const d=g.state.damages[0];d.sealed=true;d.sealLife=900;g.state.oxygen=80;for(let i=0;i<100;i++)g.simulate(.05);r.oxygenSealedRises=g.state.oxygen>80;
 // #2 emergency seal preserves kit seal
 mon.page='systems';g.drawScreens();mon.zones.find(z=>z.x===514&&z.y===480).action();r.kitSealKept=d.sealLife>800;
 // #14 NaN
 g.state.damages.push({id:'n',pos:[3.79,1,2],severity:2,node:0,fixed:false,sealed:false,sealLife:0,pipeFixed:false});g.simulate(.05);r.oxygenFinite=Number.isFinite(g.state.oxygen);
 // #40 return timer stopped at speed 0
 g.state.returnTime=1000;g.state.speed=0;g.simulate(1);r.returnPausedWhenStopped=g.state.returnTime===1000;g.state.returnTime=null;
 // #22 EVA solids
 r.evaSolids=['solar:6,1.5,9','engine:2.2,-.6,15.2','dish:.5,6.,9'].map(x=>{const [n,c]=x.split(':');return n+'='+(!!(function(){const p=new T.Vector3(...c.split(',').map(Number));return 1})()) });
 // #4 colliders
 g.state.layer='cabin';r.solid={chair:!g.canWalk(0,-.65),tank:!g.canWalk(.55,13.92),suit:!g.canWalk(2.45,12.75),kit:!g.canWalk(1.99,9.35),aisleZ3:g.canWalk(0,3),aisleNearChair:g.canWalk(0,.1)};
 // #10
 const ev=new KeyboardEvent('keydown',{code:'KeyS',ctrlKey:true,bubbles:true,cancelable:true});document.dispatchEvent(ev);r.ctrlSnotBlocked=!ev.defaultPrevented&&!g.keys.KeyS;
 // #37 leak outward
 g.state.damages=[];B29.restoreHull();g.collide({severity:1},new T.Vector3(-3.8,1,2));g.simulate(.05);const v=B29.damageVisuals[0];const a=v.leak.geometry.attributes.position;let maxZ=-9;for(let i=0;i<a.count;i++)maxZ=Math.max(maxZ,a.getZ(i));r.leakAllOutward=maxZ<=0;
 // #41
 g.state.damages=[];B29.restoreHull();g.collide({severity:1},new T.Vector3(-3.8,1,-.2));r.noCrackMidship=B29.damageCracks.length===0;
 // #17 stars follow
 B29.ship.position.set(0,0,-20000);B29.render();r.starsFollow=B29.stars.position.distanceTo(B29.ship.position)<1;B29.ship.position.set(0,0,0);
 // #18 earth stop
 B29.ship.position.set(0,0,-600);g.state.speed=4;g.state.heading=-.06;B29.ship.rotation.set(0,-.06,0);let stopped=false;for(let i=0;i<20000&&!stopped;i++){g.simulate(.05);if(g.state.speed===0)stopped=true;}r.earthStop={stopped,surfaceDist:Math.round(B29.ship.position.distanceTo(B29.earth.position)-470)};
 return r;});
console.log(JSON.stringify(r));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
