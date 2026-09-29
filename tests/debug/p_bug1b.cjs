const {open,launch,shot}=require('./harness.cjs');
(async()=>{const b=await launch();const o=[];
const {page}=await open(b,{query:'?check=1',viewport:{width:844,height:390},context:{hasTouch:true,isMobile:true},hook:false});
const st=async l=>o.push(l+': '+await page.evaluate(()=>[innerWidth,innerHeight,getComputedStyle(document.getElementById('move-pad')).display,matchMedia('(pointer: coarse)').matches].join(','))+' bbox='+JSON.stringify(await page.locator('#move-pad').boundingBox()));
await st('before');await shot(page,'bug1');await st('afterCDPshot');
await page.locator('#seat-button').click();await st('afterClick');
console.log(o.join('\n'));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
