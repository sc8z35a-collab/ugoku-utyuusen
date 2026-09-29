const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const o={};
{const {page,context}=await open(b,{query:'?check=1&view=cabin'});
 await page.evaluate(()=>{__g.state.seated=false;document.getElementById('help-toggle').click();document.getElementById('guide-dialog').close();});
 await page.waitForTimeout(100);
 o.pausedAfterClose=await page.evaluate(()=>__g.paused);
 o.esc=await page.evaluate(()=>{const g=__g;g.toggleExternal(true);document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}));const a=g.external;g.toggleExternal(true);document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyQ',bubbles:true}));return {afterEsc:a,afterQ:g.external,seated:g.state.seated};});
 // external camera while EVA? toggleExternal from monitor only when seated; check 'use' blocked in external: yes.
 // E in external view
 await context.close();}
// bug1: replicate visual.cjs flow
{const {page,context}=await open(b,{query:'?check=1',viewport:{width:844,height:390},context:{hasTouch:true,isMobile:true}});
 const st=async l=>o[l]=await page.evaluate(()=>{const p=document.getElementById('move-pad');const r=p.getBoundingClientRect();return [getComputedStyle(p).display,r.width,innerWidth,innerHeight,document.fullscreenElement?1:0].join(',')});
 await st('pad0');
 await page.locator('#fullscreen-button').click();await page.waitForTimeout(500);await st('padFS');
 await page.locator('#fullscreen-button').click();await page.waitForTimeout(500);await st('padExit');
 await page.keyboard.press('g');await page.waitForTimeout(500);await st('padG');
 await page.evaluate(()=>document.exitFullscreen());await page.waitForTimeout(500);await st('padExit2');
 await context.close();}
console.log(JSON.stringify(o,null,1));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
