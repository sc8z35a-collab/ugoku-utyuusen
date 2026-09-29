const {open,launch}=require('./harness.cjs');
(async()=>{const b=await launch();const {page}=await open(b,{query:''});
page.on('dialog',d=>d.accept());
await page.evaluate(()=>{__g.state.coffee=7;__g.state.age=99999;__g.save();});
console.log('savedBefore',await page.evaluate(()=>JSON.parse(localStorage.getItem('b29-quiet-odyssey-v1')).coffee));
await page.evaluate(()=>document.getElementById('help-toggle').click());
await Promise.all([page.waitForEvent('load',{timeout:60000}).catch(()=>{}),page.click('#reset-button')]);
await page.waitForFunction(()=>window.__g&&document.body.classList.contains('playing'),null,{timeout:60000});
console.log('afterReset',await page.evaluate(()=>JSON.stringify({coffee:__g.state.coffee,age:Math.round(__g.state.age),stored:!!localStorage.getItem('b29-quiet-odyssey-v1'),logs:__g.state.logs.map(l=>l.text).slice(0,3)})));
for(let i=0;i<3;i++){await page.evaluate(()=>__g.save());await page.reload({timeout:60000});await page.waitForFunction(()=>window.__g&&document.body.classList.contains('playing'),null,{timeout:60000});}
console.log('logsAfter3Reloads',await page.evaluate(()=>JSON.stringify(__g.state.logs.slice(0,6).map(l=>l.text))));
await b.close();})().catch(e=>{console.error(e);process.exit(1)});
