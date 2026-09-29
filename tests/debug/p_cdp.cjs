const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:'?check=1',viewport:{width:844,height:390},context:{hasTouch:true,isMobile:true},hook:false});
const s=await page.context().newCDPSession(page);await s.send('Page.captureScreenshot',{format:'png'});await s.send('Page.captureScreenshot',{format:'png'});
console.log('coarse after persistent session shots:',await page.evaluate(()=>matchMedia('(pointer: coarse)').matches));await b.close();})();
