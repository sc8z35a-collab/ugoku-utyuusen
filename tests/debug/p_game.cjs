const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1&view=cabin'});
const r=await page.evaluate(()=>{const g=__g,o={},T=THREE;const S=()=>g.state;
 const reset=()=>{g.state.damages=[];g.state.oxygen=100;g.state.suit=false;g.state.suitAir=3600;g.state.layer='cabin';g.state.safe=false;g.state.seated=false;g.state.kits=12;g.state.hasKit=false;};
 // A: suit visible on rack while worn
 reset();g.player.set(1.4,1.62,13.3);g.act('suit');g.updateMode();o.suitRackVisibleWhileWorn=B29.suitGroup.visible;
 // B: suit air in cabin when oxygen fine -> recharges; in EVA drains; EVA with 3600s -> 60 min
 g.act('airlock');o.evaLayer=S().layer;
 // C: EVA - can player fly into the engine/solar panels/antenna? insideShip only ellipse
 const pts={solar:[6,1.5,9],engine:[2.2,-.6,15.2],antenna:[.5,5.2,9],dish:[.5,6.6,9],plume:[2.2,-.6,18.2],rear:[0,1,15]};o.evaInside={};for(const [k,p] of Object.entries(pts))o.evaInside[k]=!(function(p){const e=p.x*p.x/(4.1*4.1)+(p.y-1)*(p.y-1)/(3.8*3.8);return e<1&&p.z>-7.3&&p.z<15.2;})(new T.Vector3(...p));
 // D: EVA with suitAir->0: what happens? any death / consequence
 g.state.suitAir=1;for(let i=0;i<100;i++)g.simulate(.05);o.evaAir0={air:S().suitAir,layer:S().layer,hyp:document.body.classList.contains('hypoxia')};
 // airlock return with no air: allowed? yes. EVA while ship moves: player relative ship -> fine
 // E: take off suit in EVA?
 g.state.suitAir=3600;g.act('suit');o.removeSuitInEVA={suit:S().suit,layer:S().layer};
 reset();
 // F: airlock exit at distance: airlock reach from cabin interior point
 // G: kit: hasKit never consumed; kits 0 -> still say hasKit
 // H: pipe repair uses kit even if hasKit false? covered. pipe repair with kits>0 but damage filter by node
 // I: oxygen 0 consequences
 reset();g.state.oxygen=0;for(let i=0;i<60;i++)g.simulate(.05);o.oxy0={hyp:document.body.classList.contains('hypoxia'),speedFactorNote:'movement only'};
 // J: safe room with damage located inside safe room (z>12)?  collide clamps z to 13; safe z>12 -> leak still global
 reset();g.state.safe=true;g.player.set(0,1.62,13);g.collide({severity:3},new T.Vector3(3.8,1,12.8));g.state.oxygen=5;o.safeWithBreachInside=g.insideSafe();
 // K: hypoxia message every 20s condition uses Math.floor(age)%20===0 - with dt .05 appears 20 frames
 // L: returnTime completion doesn't clear hasKit / suit etc. restores kits=12 but W.restoreHull doesn't restore safeDoor etc.
 reset();g.collide({severity:2},new T.Vector3(3.8,1,5));g.state.returnTime=.01;g.simulate(.05);o.afterReturn={pipeNodesRed:B29.pipeNodes.filter(n=>n.material===B29.materials.red).length,cracks:B29.damageCracks.length};
 // M: impact hull front windshield crack when damage p.z<0 - windshield at z=-7.1 but damage z clamp -3.6..13 : crack drawn at fixed position 2.2,1.8 irrespective
 reset();g.collide({severity:1},new T.Vector3(-3.8,1,-3));o.crackCount=B29.damageCracks.length;o.crackSide=B29.damageCracks[0]&&B29.damageCracks[0].geometry.boundingSphere;
 // N: after 60 damages no more impacts
 // O: Shower while standing in shower: can walk in shower? bathroom collider
 o.walkShowerGlass=g.canWalk(1.95,4.3);o.walkBathWall=g.canWalk(3.2,3.5);
 // P: tap interaction distance from aisle; cabinet
 return o;});
console.log(JSON.stringify(r,null,1));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
