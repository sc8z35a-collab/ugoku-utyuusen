const {open,launch,view}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1&view=cabin'});
const info=await page.evaluate(()=>{const g=__g;g.state.seated=true;g.player.set(0,1.65,-1.15);g.updateMode();const out={};
 // passing earth: straight path at default heading
 B29.ship.position.set(0,0,-1170);B29.scene.updateMatrixWorld(true);out.distEarthSurface=B29.ship.position.distanceTo(B29.earth.position)-470;return out;});
console.log(JSON.stringify(info));
await view(page,'space_near_earth',[0,1.65,-1.15],[0,1.9,-7]);
await view(page,'space_near_earth_right',[0,1.65,-1.15],[5,1.9,-3]);
await page.evaluate(()=>{B29.ship.position.set(0,0,-9000);});
await view(page,'space_9km',[0,1.65,-1.15],[0,1.9,-7]);
await page.evaluate(()=>{B29.ship.position.set(0,0,-20000);});
await view(page,'space_20km',[0,1.65,-1.15],[0,1.9,-7]);
await page.evaluate(()=>{B29.ship.position.set(0,0,0);});
await view(page,'space_origin',[0,1.65,-1.15],[0,1.9,-7]);
console.log(await page.evaluate(()=>{const g=__g;B29.ship.position.set(0,0,-40000);return 'network at 40km: '+g.network()}));
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
