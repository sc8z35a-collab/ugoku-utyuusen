const {open,launch,shot}=require('./harness.cjs');
(async()=>{const b=await launch();const res={};
for(const [name,w,h,touch] of [['desk',1280,800,false],['land',844,390,true],['port',390,844,true],['narrow',700,500,false]]){
 const {page,context}=await open(b,{query:'?check=1&view=cabin',viewport:{width:w,height:h},context:touch?{hasTouch:true,isMobile:true}:{}});
 await page.evaluate(()=>{__g.state.seated=false;});
 const r=await page.evaluate(()=>{const g=__g;const q=s=>document.querySelector(s);const bb=s=>{const r=q(s).getBoundingClientRect();return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)]};
  const o={coarse:matchMedia('(pointer: coarse)').matches,padDisplay:getComputedStyle(q('#move-pad')).display};
  g.act('rest');// triggers say()
  o.msg=bb('#asphalt-message');o.msgMax=getComputedStyle(q('#asphalt-message')).maxWidth;o.pad=bb('#move-pad');o.actions=bb('.touch-actions');o.topbar=bb('.topbar');return o;});
 await page.evaluate(()=>__step(2));await shot(page,'ui_'+name);
 res[name]=r;await context.close();}
console.log(JSON.stringify(res));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
