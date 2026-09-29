const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1&view=cabin'});
const r=await page.evaluate(()=>{const g=__g,r={};g.state.speed=0;g.state.damages=[];g.state.oxygen=5;g.state.suit=false;g.state.layer='cabin';g.state.safe=false;g.player.set(0,1.62,5);g.state.seated=false;
 const el=document.getElementById('ai-text');
 // run until aiTime <1 (clears prior message) then cross a 20s boundary
 for(let i=0;i<400;i++)g.simulate(.05);
 g.state.age=79.9;let seen=0;for(let i=0;i<60;i++){g.simulate(.05);if(el.textContent.startsWith('酸素が危険域'))seen++;}r.cleanWarn=seen>0;r.aiTimeAfter=+g.aiTime.toFixed(1);
 // now a long message active (rest=8s? use chat 16s)
 for(let i=0;i<400;i++)g.simulate(.05);
 g.state.age=99.5;const mon=B29.monitors.find(m=>m.id==='main');mon.page='life';g.drawScreens();mon.zones.find(z=>z.x===38&&z.y===422).action();
 let w=false;for(let i=0;i<40;i++){g.simulate(.05);if(el.textContent.startsWith('酸素が危険域'))w=true;}r.warnWhileChat=w;
 return r;});
console.log(JSON.stringify(r));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
