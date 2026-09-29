const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1&view=cabin'});
const r=await page.evaluate(()=>{const g=__g,T=THREE,r={};g.state.speed=0;g.state.hasKit=false;g.act('kit');g.hud();r.kitHidden=!B29.repairKit.visible;
 // EVA movement into solar panel
 g.state.seated=false;g.state.layer='cabin';g.player.set(1.4,1.62,13.3);g.act('suit');g.act('airlock');
 g.player.set(8.5,1.5,9);g.yaw=Math.PI/2;g.pitch=0;g.keys.KeyW=true;for(let i=0;i<60;i++)g.movePlayer(.05);g.keys.KeyW=false;r.evaStopsAtPanel=g.player.x>7.85;
 g.act('suit');r.cantUndressInEVA=g.state.suit;
 return r;});
console.log(JSON.stringify(r));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
