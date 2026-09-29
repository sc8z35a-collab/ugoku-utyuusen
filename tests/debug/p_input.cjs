const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const o={};
{const {page,context}=await open(b,{query:'?check=1&view=cabin',viewport:{width:844,height:390},context:{hasTouch:true,isMobile:true}});
 o.touchPad=await page.evaluate(()=>{const r=document.getElementById('move-pad').getBoundingClientRect();return {w:r.width,disp:getComputedStyle(document.getElementById('move-pad')).display,coarse:matchMedia('(pointer: coarse)').matches,any:matchMedia('(any-pointer: coarse)').matches}});
 await context.close();}
{const {page,context}=await open(b,{query:'?check=1&view=cabin',viewport:{width:1024,height:700},context:{hasTouch:true}});
 o.touchLaptop=await page.evaluate(()=>({disp:getComputedStyle(document.getElementById('move-pad')).display,coarse:matchMedia('(pointer: coarse)').matches,anyCoarse:matchMedia('(any-pointer: coarse)').matches}));
 await context.close();}
{const {page,context}=await open(b,{query:'?check=1&view=cabin'});
 o.x=await page.evaluate(async()=>{const g=__g,res={};const c=document.getElementById('space-canvas');
  g.state.seated=false;
  // guide open -> keyup lost?
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW',bubbles:true}));
  document.getElementById('help-toggle').click();res.pausedAfterGuide=g.paused;
  // Esc to close dialog via close()
  document.getElementById('guide-dialog').close();res.pausedAfterClose=g.paused;res.keyWAfter=g.keys.KeyW;
  // press H while guide open: keydown returns early since paused -> fine. Press Escape while external: 
  g.toggleExternal(true);res.extBefore=g.external;
  // Escape in external also closes fullscreen? just check external toggles
  document.dispatchEvent(new KeyboardEvent('keydown',{code:'Escape',bubbles:true}));res.extAfterEsc=g.external;
  // Q while external: seat() -> toggleExternal(false)
  g.toggleExternal(true);document.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyQ',bubbles:true}));res.qInExternal={ext:g.external,seated:g.state.seated};
  // keys while typing? none. Space prevented but unused
  // Mouse wheel / right click default
  const ev=new MouseEvent('contextmenu',{bubbles:true,cancelable:true});c.dispatchEvent(ev);res.contextMenuBlocked=ev.defaultPrevented;
  // pointerup on canvas while dragging but outside canvas bounding -> uses innerWidth, canvas full-screen fine.
  // pointer drag: use() called on quick tap even if pointerdown began on dialog? skip
  // E key while seated & looking at shower -> use
  return res;});
 await context.close();}
console.log(JSON.stringify(o,null,1));await b.close();})().catch(e=>{console.error(e);process.exit(1)});
