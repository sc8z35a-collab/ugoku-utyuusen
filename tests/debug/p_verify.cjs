const {open,launch,view}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1&view=cabin'});const o={};
// #42 H closes guide?
await page.evaluate(()=>document.getElementById('help-toggle').click());
await page.keyboard.press('h');await page.waitForTimeout(200);
o.h_guideStillOpen=await page.evaluate(()=>document.getElementById('guide-dialog').open);
await page.keyboard.press('Escape');await page.waitForTimeout(200);
o.r=await page.evaluate(()=>{const g=__g,T=THREE,r={};g.state.speed=0;
 const mon=B29.monitors.find(m=>m.id==='main');mon.page='systems';g.drawScreens();
 const n0=g.state.logs.length;const z=mon.zones.find(z=>z.x===38&&z.y===410);z.action();z.action();r.serverLogsAdded=g.state.logs.length-n0;
 // #45
 g.state.damages=[];B29.restoreHull();g.collide({severity:2},new T.Vector3(3.8,1,5));z.action();const a=g.state.damages.some(d=>d.severity>=2&&!d.fixed&&!d.serverPatched);g.collide({severity:2},new T.Vector3(-3.8,1,8));r.serverFaultAgain=g.state.damages.some(d=>d.severity>=2&&!d.fixed&&!d.serverPatched)&&!a;
 // #46
 g.state.hasKit=true;g.state.kits=0;r.hasKitAt0=g.state.hasKit;g.state.returnTime=.01;g.simulate(.05);r.hasKitAfterBase=g.state.hasKit;
 // #47
 const kit=B29.interactables.find(m=>m.userData.action==='kit');g.state.hasKit=false;g.act('kit');r.kitMeshVisibleAfterPickup=kit.visible;
 // #49 60 fixed damages -> no spawn
 g.state.damages=[];for(let i=0;i<60;i++)g.state.damages.push({id:'f'+i,pos:[3.79,1,2],severity:1,node:0,fixed:true,sealed:true,sealLife:null,pipeFixed:true,age:0});
 g.state.impactCountdown=.01;g.simulate(.05);r.impactsSpawnedWith60Fixed=g.impactors.length;
 // #48: 20 consecutive frames condition
 g.state.damages=[];g.state.oxygen=5;g.state.suit=false;g.state.layer='cabin';g.player.set(0,1.62,5);g.state.age=39.99;let says=0;const el=document.getElementById('ai-text');let last=el.textContent;
 for(let i=0;i<40;i++){g.simulate(.05);if(el.textContent!==last){says++;last=el.textContent;}}r.hypoxiaWarnSeen=says;
 // with a long message active warning skipped
 g.state.age=59.5;g.act('rest');g.act('rest');let warned=false;for(let i=0;i<30;i++){g.simulate(.05);if(el.textContent.startsWith('酸素が危険域'))warned=true;}r.warnWhileOtherMsg=warned;
 return r;});
console.log(JSON.stringify(o,null,1));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
