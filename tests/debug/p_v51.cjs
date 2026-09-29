const {open,launch,view}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1&view=cabin'});
const r=await page.evaluate(()=>{const g=__g;g.state.seated=true;g.player.set(0,1.65,-1.15);g.updateMode();return {chairVisibleWhileSeated:B29.chair.visible};});
await view(page,'seat_lookback',[0,1.65,-1.15],[0,1.2,3]);
await view(page,'seat_lookdown',[0,1.65,-1.15],[0,0,-1.0]);
console.log(JSON.stringify(r));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
