const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1&view=cabin'});
const r=await page.evaluate(()=>{const T=THREE,S=B29.ship;S.updateMatrixWorld(true);const inv=new T.Matrix4().copy(S.matrixWorld).invert();
 // sample the batched + remaining meshes: count vertices outside hull ellipse in z∈[-3.9,13.9] (excluding the hull itself & exterior equipment layer >3.85)
 const out=[];const v=new T.Vector3();const hull=new Set(B29.hull);
 S.traverse(o=>{if(!o.isMesh||hull.has(o))return;const p=o.geometry.attributes.position;if(!p)return;const m=new T.Matrix4().multiplyMatrices(inv,o.matrixWorld);let bad=0,maxE=0,ex=null;
  for(let i=0;i<p.count;i+=1){v.fromBufferAttribute(p,i).applyMatrix4(m);if(v.z<-3.9||v.z>13.9)continue;const e=Math.sqrt(v.x*v.x/(3.8*3.8)+(v.y-1)*(v.y-1)/(3.5*3.5));if(e>1.03&&e<1.25){bad++;if(e>maxE){maxE=e;ex=v.toArray().map(n=>+n.toFixed(2));}}}
  if(bad)out.push({mat:o.material.color?.getHexString(),verts:p.count,bad,maxE:+maxE.toFixed(2),ex});});
 // specific: bottom slab
 const slabHalf=3.6,y=-2.44;const hullX=3.8*Math.sqrt(1-((y-1)/3.5)**2);
 return {slabHalf,hullXAtSlab:+hullX.toFixed(2),poke:out.sort((a,b)=>b.bad-a.bad).slice(0,12)};});
console.log(JSON.stringify(r,null,1));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
