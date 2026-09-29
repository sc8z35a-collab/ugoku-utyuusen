const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1&view=cabin'});
const r=await page.evaluate(()=>{const g=__g,T=THREE;g.state.speed=0;g.state.layer='cabin';g.state.seated=false;g.updateMode();
 const res=[];
 for(const side of [-1,1])for(let z=-3.5;z<=13;z+=0.5)for(const sev of [1,3]){
  g.state.damages=[];B29.restoreHull();
  g.collide({severity:sev},new T.Vector3(side*3.8,1.05,z));const d=g.state.damages[0];
  const vis=B29.damageVisuals[0];const tp=vis.target.getWorldPosition(new T.Vector3());
  // search walkable standing points
  let ok=false;
  for(let px=-3.2;px<=3.2&&!ok;px+=.2)for(let pz=z-2.6;pz<=z+2.6&&!ok;pz+=.2){if(!g.canWalk(px,pz))continue;
    for(const eye of [1.62]){g.player.set(px,eye,pz);B29.camera.position.copy(g.player);B29.camera.lookAt(tp);B29.scene.updateMatrixWorld(true);const h=g.getHit();if(h&&h.object.userData.action==='damage'){ok=true;}}}
  if(!ok)res.push((side<0?'P':'S')+' z'+z+' sev'+sev);
 }
 g.state.damages=[];B29.restoreHull();
 return {unreachable:res,total:2*34*2};});
console.log(JSON.stringify(r));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
