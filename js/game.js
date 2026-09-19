'use strict';
(() => {
  const W=window.B29;if(!W)return;
  const T=THREE,$=id=>document.getElementById(id),V=()=>new T.Vector3();
  const STORAGE='b29-quiet-odyssey-v1';
  const diagnostic=new URLSearchParams(location.search).get('check')==='1';
  const fresh=()=>({version:1,age:0,position:[0,0,0],heading:0,pitch:0,speed:.2,oxygen:100,suitAir:3600,damages:[],kits:12,hasKit:false,suit:false,safe:false,coffee:0,returnTime:null,logs:[{time:0,text:'2041年6月1日。カイト、21歳。B-29で地球を出発。'}],player:[0,1.65,-1.15],yaw:0,look:.075,layer:'cabin',seated:true,impactCountdown:300});
  let state=fresh(),saved=false,storageAvailable=true;
  try{const raw=diagnostic?null:localStorage.getItem(STORAGE);if(raw){const v=JSON.parse(raw);if(v.version===1&&Array.isArray(v.damages)&&Array.isArray(v.position)){state={...state,...v};saved=true;}}}catch(e){storageAvailable=false;}
  let playing=false,paused=false,external=false,shower=false,resting=false,coffeeTime=0,shake=0,aiTime=0,elapsed=0,nextChat=80,saveTick=0,screenTick=0,hudTick=0;
  const player=new T.Vector3(...state.player);let yaw=state.yaw,pitch=state.look;
  const keys={},move={x:0,y:0},vertical={up:false,down:false};
  W.ship.position.fromArray(state.position);W.ship.rotation.set(state.pitch,state.heading,0,'YXZ');
  W.camera.position.set(0,1.65,-1.15);W.camera.rotation.set(.075,0,0,'YXZ');
  W.safeDoor.position.x=state.safe?0:1.95;
  state.damages.forEach(d=>W.deformHull(d));
  const impactors=[],ray=new T.Raycaster();
  // The physics model runs in ship-relative coordinates for the walkable interior,
  // while the complete vessel and colliding meteoroids move in the world scene.
  function say(text,duration=13){$('ai-text').textContent=text;aiTime=duration;$('asphalt-message').style.opacity='1';}
  function log(text){state.logs.unshift({time:state.age,text});state.logs=state.logs.slice(0,50);}
  function save(){if(!playing||diagnostic){saveTick=0;return;}state.player=player.toArray();state.yaw=yaw;state.look=pitch;state.position=W.ship.position.toArray();try{localStorage.setItem(STORAGE,JSON.stringify(state));$('save-label').textContent='航海を保存しました';}catch(e){storageAvailable=false;$('save-label').textContent='保存できません / ストレージを確認';}saveTick=0;}
  const formatTime=n=>`${String(Math.floor(n/3600)).padStart(2,'0')}:${String(Math.floor(n/60)%60).padStart(2,'0')}`;
  const suitTime=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(Math.floor(n)%60).padStart(2,'0')}`;
  const hullIntegrity=()=>Math.max(0,100-state.damages.reduce((a,d)=>a+(d.fixed?0:d.severity*5),0));
  const pipeFaults=()=>state.damages.filter(d=>!d.pipeFixed);
  const serverFault=()=>state.damages.some(d=>d.severity>=2&&!d.fixed&&!d.serverPatched);
  const day=()=>Math.floor(state.age/86400)+1;
  function network(){return W.ship.position.distanceTo(W.earth.position)<38000;}
  function insideSafe(){return state.layer==='cabin'&&player.z>12&&state.safe;}
  // Canvas is a texture on an actual 3D monitor; all hit regions live in its UV space.
  function drawMonitor(m){
    const c=m.canvas.getContext('2d'),w=1024,h=640;m.zones=[];
    c.fillStyle='#101d23';c.fillRect(0,0,w,h);
    for(let y=0;y<h;y+=4){c.fillStyle='#7ba3a003';c.fillRect(0,y,w,1);}
    const txt=(t,x,y,size=22,color='#b6c7c4',font='monospace')=>{c.fillStyle=color;c.font=`${size}px ${font}`;c.textAlign='left';c.fillText(t,x,y);};
    const line=(x,y,ww)=>{c.fillStyle='#b0c9bc25';c.fillRect(x,y,ww,1);};
    function button(text,x,y,ww,hh,action,active=false){c.fillStyle=active?'#b9cfa1':'#26383c';c.fillRect(x,y,ww,hh);c.strokeStyle=active?'#b9cfa1':'#54736d';c.strokeRect(x+.5,y+.5,ww-1,hh-1);txt(text,x+18,y+hh/2+8,22,active?'#18251e':'#d0dacb','sans-serif');m.zones.push({x,y,w:ww,h:hh,action});}
    txt('B–29',34,48,34,'#d6decb');txt('/  ASPHALT OS 2.4',157,46,19,'#819fa0');txt(network()?'● 5G CONNECTED':'○ OFFLINE',730,45,17,network()?'#b9cfa1':'#d9a47a');line(32,72,960);
    const tabs=[['航行','home'],['船体・空気','systems'],['暮らし','life'],['航海記録','log']];tabs.forEach((t,i)=>button(t[0],32+i*242,88,232,46,()=>{m.page=t[1];drawScreens();},m.page===t[1]));
    const broken=serverFault()&&m.id==='aux';
    if(broken){txt('LOCAL SERVER / SIGNAL LOST',55,248,32,'#e1a184');txt('中央モニターで予備サーバーへ切替可能',55,310,26,'#a8bbb9','sans-serif');}
    else if(m.page==='home'){
      txt('FLIGHT CONTROL',38,182,18,'#8ba3a5');txt('行き先は、まだ決めなくていい。',38,226,28,'#d4dfd0','sans-serif');
      txt(state.speed.toFixed(1),46,327,77,'#bbd1ab');txt('m/s  相対漂流速度',240,322,20);txt('DAY '+String(day()).padStart(2,'0'),725,205,31,'#d4dfd0');txt(formatTime(state.age%86400),748,242,23);
      button('− 減速',38,358,215,58,()=>{state.speed=Math.max(0,state.speed-.2);say('推力を絞りました。ゆっくりで、いいんです。',6);});
      button('+ 加速',263,358,215,58,()=>{state.speed=Math.min(4,state.speed+.2);say('微速推進。船も、慌てるのは得意ではありません。',6);});
      button('← 左へ',514,284,213,56,()=>{state.heading+=.06;say('左舷へ緩やかに転針します。',5);});button('右へ →',737,284,247,56,()=>{state.heading-=.06;say('右舷へ緩やかに転針します。',5);});
      button('↑ 上へ',514,350,213,56,()=>{state.pitch=Math.min(.65,state.pitch+.035);});button('↓ 下へ',737,350,247,56,()=>{state.pitch=Math.max(-.65,state.pitch-.035);});
      button('船外カメラ ↗',38,436,440,58,()=>toggleExternal());button('推力停止 / 漂流',514,436,470,58,()=>{state.speed=0;say('相対推力を停止。窓の向こうは、動き続けています。',8);});
      button(state.returnTime!==null?'帰還中 / 残り '+Math.ceil(state.returnTime/86400)+' 日':'基地へ帰還設定 / 所要10日',38,513,946,51,()=>{if(state.returnTime===null){state.returnTime=864000;log('基地帰還航路を設定。所要10日。');say('帰還航路を確保しました。到着まで10日。損傷は、いまここで対処する必要があります。');}else{state.returnTime=null;say('帰還航路を解除。自由航行へ戻ります。');}});
    }else if(m.page==='systems'){
      txt('VESSEL HEALTH',38,181,18,'#8ba3a5');txt('O₂  '+state.oxygen.toFixed(1)+'%',38,231,36,state.oxygen<50?'#eda17d':'#c1d6af');txt('HULL  '+hullIntegrity()+'%',355,231,36);txt('KIT  '+state.kits,760,231,31,'#d3c29e');
      txt('原子炉  ONLINE / 残り '+Math.max(0,10-state.age/31536000).toFixed(2)+'年',38,274,20);txt('配管 '+(pipeFaults().length?'異常 '+pipeFaults().length+' 系統':'正常')+'  /  サーバー '+(serverFault()?'障害':'正常'),38,309,23,pipeFaults().length?'#e6ad85':'#a2bcb4','sans-serif');
      const d=state.damages.find(d=>!d.fixed||!d.pipeFixed);
      txt(d?'未修復 '+state.damages.filter(d=>!d.fixed).length+'箇所 · 最新位置 '+(d.pos[0]<0?'左舷':'右舷')+' / Z '+d.pos[2].toFixed(1)+'m':'船体に損傷はありません。',38,351,21,d?'#dda182':'#b4c6bc','sans-serif');
      if(d)txt('配管層 LINE 0'+(d.node+1)+' / '+(d.sealed?'封止中':'漏気あり')+' · '+(d.severity===1?'軽傷':d.severity===2?'中規模・基地修理':'大規模・基地修理'),38,385,21,'#a5b8b7','sans-serif');
      button('予備サーバーへ切替',38,410,460,54,()=>{state.damages.forEach(d=>d.serverPatched=true);say('独立予備系統に切り替えました。破損した機材は、そのまま残っています。');log('予備サーバーへ切替。');});
      button(state.safe?'避難室の隔壁を開く':'避難室の隔壁を閉じる',514,410,470,54,()=>act('safe'));
      button('試験衝突 / 3D小惑星',38,480,460,54,()=>{if(impactors.length){say('すでに接近中の岩塊があります。');return;}spawnImpact(true);});
      button('応急処置システム',514,480,470,54,()=>{let n=0;state.damages.forEach(d=>{if(!d.fixed&&!d.autoUsed){d.sealed=true;d.sealLife=180;d.autoUsed=true;n++;}});say(n?'緊急封止剤を放出。約3分の猶予です。現場へ行き、修理キットで補強してください。':'利用できる未使用封止カートリッジがありません。現場での作業が必要です。');log('応急処置システムを操作。');});
    }else if(m.page==='life'){
      txt('HABITAT / SLOW LIVING',38,185,18,'#8ba3a5');txt('ひとり。けれど、ひとりではない。',38,238,29,'#d0ddc9','sans-serif');
      txt('淹れたコーヒー  '+state.coffee+' 杯',38,298,23,'#b6c7c4','sans-serif');txt('水循環 '+(pipeFaults().length?'要点検':'98%')+'  /  修理キット '+(state.hasKit?'携行中':'後部エンジニア区画'),38,341,22,'#b6c7c4','sans-serif');
      txt(state.suit?'宇宙服装着中 / 残り酸素 '+suitTime(state.suitAir):'宇宙服は後部エアロックにあります。',38,382,22,'#c1cda8','sans-serif');
      button('アスファルト、話して',38,422,460,60,()=>chat());button('照明 / 夜間モード',514,422,470,60,()=>{W.lamps.forEach(l=>l.intensity=l.intensity>5?3:14);say('船内照明を調整しました。好きな明るさで、お過ごしください。');});
      button('静かに休む / そのまま眺める',38,502,946,52,()=>{resting=!resting;say(resting?'ここにいます。何かあれば、起こします。':'おかえりなさい、カイト。',8);});
    }else{
      txt('CAPTAIN’S LOG / KAITO, 21',38,181,18,'#8ba3a5');txt('2041.05.10 / 中古宇宙船 B-29 を購入。',38,230,24,'#c8d5be','sans-serif');txt('全財産を投じた、小学生のころからの夢。',38,269,22,'#9eb5b0','sans-serif');txt('2041.06.01 / ひとりで乗り組み、地球を出発。',38,310,22,'#9eb5b0','sans-serif');line(38,334,946);
      state.logs.slice(0,4).forEach((l,i)=>{txt('D'+String(Math.floor(l.time/86400)+1).padStart(2,'0')+' '+formatTime(l.time%86400),38,374+i*48,18,'#c6cfa7');let text=l.text;if(text.length>34)text=text.slice(0,33)+'…';txt(text,187,374+i*48,21,'#b6c7c4','sans-serif');});
    }
    line(32,585,960);txt('B–29  /  SMALL NUCLEAR REACTOR · 10 YEARS',34,616,15,'#6e8d8e');txt(state.safe?'BULKHEAD SEALED':'ALL ROOMS LINKED',742,616,15,'#b5c79f');m.tex.needsUpdate=true;
  }
  function drawScreens(){W.monitors.forEach(drawMonitor);}
  drawScreens();
  const messages=[
    '月の軌道までは5Gが届きます。こんなところまで人間の声が追いかけてくるなんて、不思議ですね。',
    'カイト。目的地の入力欄は、空白のままで構いません。',
    '2041年5月10日。あなたがこの船を買った日を、私は覚えています。ずいぶん嬉しそうでした。',
    '小学生のころに描いた宇宙船と、似ていますか？ ……少しだけ、年季が入っていますけれど。',
    '原子炉は正常です。次の給電より先に、コーヒー豆の心配をしましょう。',
    'この静かな振動は、冷却ポンプです。B-29の寝息だと思ってください。',
    'あの青い星に、私たちの知っているほとんどのものがあるんですね。',
    '後部の棚が少し散らかっています。秘密基地には、そのくらいが似合うのでしょう。'
  ];let chatIndex=0;
  function chat(){say(state.damages.some(d=>!d.fixed)&&Math.random()<.4?'船の傷は残ります。でも、旅まで終わりにする必要はありません。空気のことだけは、忘れないでください。':messages[chatIndex++%messages.length],16);}
  // Web Audio is entirely client-side and starts only after a deliberate user action.
  let audio=null,sound=false;
  function toggleSound(){try{if(!audio){const ctx=new(window.AudioContext||window.webkitAudioContext)(),gain=ctx.createGain();gain.gain.value=0;gain.connect(ctx.destination);const oscillators=[];for(const f of [43,86,131]){const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=f;g.gain.value=f===43?.2:.035;o.connect(g);g.connect(gain);o.start();oscillators.push(o);}audio={ctx,gain,oscillators};}audio.ctx.resume();sound=!sound;audio.gain.gain.setTargetAtTime(sound?.3:0,audio.ctx.currentTime,.4);$('sound-toggle').innerHTML='♪ <span>'+(sound?'ON':'OFF')+'</span>';}catch(e){say('このブラウザーでは環境音を再生できません。');}}
  function impactSound(){if(!audio||!sound)return;const c=audio.ctx,b=c.createBuffer(1,c.sampleRate*.45,c.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/a.length,4);const s=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=300;g.gain.value=.38;s.buffer=b;s.connect(f);f.connect(g);g.connect(c.destination);s.start();}
  function seat(){if(external){toggleExternal(false);return;}if(state.layer!=='cabin'){say('操縦席は居住層の前方です。');return;}if(state.seated){state.seated=false;player.set(0,1.62,.1);say('ごゆっくり。後方は居住区、床のハッチの下は配管層です。',10);}else if(player.distanceTo(new T.Vector3(0,1.62,-.65))<3){state.seated=true;player.set(0,1.65,-1.15);yaw=0;pitch=.075;say('操縦を引き継ぎます。正面のモニターに触れてください。',8);}else{say('操縦席に近づいてください。ここから船内を歩いて戻れます。',7);}updateMode();}
  function updateMode(){document.body.classList.toggle('eva',state.layer==='eva');$('seat-button').textContent=state.seated?'立つ':'座る';$('visor').classList.toggle('hidden',!state.suit);$('external-exit').classList.toggle('hidden',!external);W.chair.visible=!state.seated||external;W.gloves.visible=state.suit&&!external;W.coffeeGroup.visible=coffeeTime>0&&!external;}
  function toggleExternal(force){external=force===undefined?!external:force;if(external){externalYaw=.55;externalPitch=.28;say('船外カメラです。ドラッグで機体を見回せます。傷も、この船の一部です。',10);}updateMode();}
  let externalYaw=.55,externalPitch=.28;
  function act(action,object){
    if(action==='seat'){seat();return;}
    if(action==='coffee'){if(state.suit){say('ヘルメットを着けたままでは飲めません。安全な部屋で宇宙服を脱いでから、どうぞ。');return;}if(pipeFaults().length){say('給水配管に異常があります。床下の点検をお願いします。');return;}state.coffee++;coffeeTime=35;W.coffeeGroup.visible=!external;say('コーヒーが入りました。地球を見ながら、どうぞ。熱いので、気をつけて。');log('コーヒーを淹れた。'+state.coffee+'杯目。');}
    if(action==='shower'){if(pipeFaults().length){say('配管が損傷しています。いまは水を循環できません。');return;}shower=!shower;W.showerDrops.visible=shower;say(shower?'温水を循環します。使用した水の98%は、また戻ってきます。':'シャワーを停止しました。',9);}
    if(action==='hatch'){if(state.suit){say('宇宙服では床下の狭い通路に入れません。エアロックで脱いでください。');return;}state.seated=false;if(state.layer==='pipes'){state.layer='cabin';player.set(0,1.62,5.4);say('居住層です。空が見えるところへ戻りました。',7);}else{state.layer='pipes';player.set(0,-1.3,4.4);pitch=0;yaw=0;say('配管層に入りました。左右の LINE 01〜06 が点検箇所です。異常系統はモニターでも確認できます。',13);}updateMode();}
    if(action==='kit'){if(!state.hasKit){state.hasKit=true;say('修理キットを携行しました。残り'+state.kits+'回分。損傷箇所へ近づいて、直接使ってください。');log('修理キットを携行。');}else say('修理キットは携行中です。残り'+state.kits+'回分。基地以外では補充できません。');}
    if(action==='suit'){if(state.suit&&state.oxygen<30&&!insideSafe()){say('空気が足りません。宇宙服は脱がないでください。');return;}state.suit=!state.suit;if(state.suit)say('宇宙服の気密を確認。酸素残量 '+suitTime(state.suitAir)+'。後方エアロックから船外へ出られます。');else say('宇宙服をラックへ戻しました。おかえりなさい。');updateMode();}
    if(action==='airlock'){
      if(state.layer==='eva'){state.layer='cabin';player.set(0,1.62,13.15);yaw=0;pitch=0;say('内扉を開放。船内へ戻りました。');log('船外活動を終了。');}
      else {if(!state.suit){say('宇宙服を着用してください。右側の白いスーツです。外は、空気のない場所です。');return;}if(state.suitAir<60){say('宇宙服の酸素が足りません。安全な船内で補充してからにしましょう。');return;}state.seated=false;state.layer='eva';player.set(0,1.65,17.6);yaw=0;pitch=0;say('船外活動を開始。上下操作で自由飛行できます。帰船口はエンジンの間、オレンジのリングです。',16);log('宇宙服を着用して船外活動へ。');}
      updateMode();
    }
    if(action==='safe'){if(!state.safe&&Math.abs(player.z-11.9)<.42){say('隔壁の軌道を空けてください。少し前か後ろへ移動してください。');return;}state.safe=!state.safe;W.safeDoor.position.x=state.safe?0:1.95;say(state.safe?'後部避難室を密閉しました。ここは独立酸素供給。船内が真空でも、この部屋で過ごせます。':'避難室の隔壁を開放。居住区と空気を共有します。');log('避難室の隔壁を'+(state.safe?'閉鎖。':'開放。'));}
    if(action==='rest'){resting=!resting;say(resting?'少し休みましょう。時計は、いつもどおり進んでいます。':'起きましたか。私は、ここにいます。');}
    if(action==='damage'){
      const d=state.damages.find(d=>d.id===object.userData.damage);if(!d)return;
      if(d.fixed){say('ここは修復済みです。外板の小さな傷跡は残っています。');return;}
      if(!state.hasKit){say('損傷規模：'+['','小','中','大'][d.severity]+'。修理キットは後部右舷、橙色のケースです。');return;}
      if(state.kits<=0){say('修理資材を使い切りました。隔壁と応急処置システムで、空気を守ってください。');return;}
      if(d.sealed&&d.sealLife>400){say('封止は安定しています。配管の修復は床下 LINE 0'+(d.node+1)+'で行ってください。');return;}
      state.kits--;d.sealed=true;d.sealLife=d.severity===1?Infinity:900;if(d.severity===1)d.fixed=true;
      say(d.severity===1?'小規模損傷を修復しました。外板の痕跡は残りますが、ここから空気は漏れません。':'破口を応急封止しました。約15分で封止が劣化します。構造の歪みは基地以外では直せません。',13);log('船体'+(d.pos[0]<0?'左舷':'右舷')+' Z'+d.pos[2].toFixed(1)+'m を'+(d.fixed?'修復。':'応急封止。'));save();
    }
    if(action==='pipe'){
      const node=object.userData.node,ds=state.damages.filter(d=>d.node===node&&!d.pipeFixed);
      if(!ds.length){say('LINE 0'+(node+1)+'、圧力正常。異常はありません。',6);return;}
      if(!state.hasKit||state.kits<=0){say('LINE 0'+(node+1)+'、圧力低下。携行修理キットと資材が必要です。');return;}
      ds.forEach(d=>d.pipeFixed=true);state.kits--;say('LINE 0'+(node+1)+'をバイパス接続しました。配管は復旧。船体の破口は別途封止が必要です。');log('配管 LINE 0'+(node+1)+'を現地で修復。');save();
    }
    drawScreens();
  }
  // Touching a monitor uses mesh intersection UVs, not invisible screen-wide controls.
  function getHit(nx=0,ny=0){
    ray.setFromCamera(new T.Vector2(nx,ny),W.camera);
    const hit=ray.intersectObjects(W.interactables,false).find(h=>h.distance<(state.layer==='eva'?3.5:state.seated?5:2.65));
    if(!hit)return null;
    // Reject interactions through a hull or a solid bulkhead / piece of furniture.
    const obstacles=ray.intersectObjects(W.ship.children,true);
    for(const o of obstacles){if(o.distance>=hit.distance-.05)break;if(o.object===W.camera||!o.object.visible)continue;let visible=true;for(let p=o.object.parent;p;p=p.parent)if(!p.visible)visible=false;if(!visible)continue;const mat=o.object.material;if(!mat||mat.transparent||o.object.type==='Points'||o.object.userData.interaction)continue;return null;}
    return hit;
  }
  function use(nx=0,ny=0){if(!playing||paused||external)return;const hit=getHit(nx,ny);if(!hit)return;if(hit.object.userData.interaction==='monitor'){const m=W.monitors.find(m=>m.screen===hit.object);if(!hit.uv)return;const x=hit.uv.x*1024,y=(1-hit.uv.y)*640,z=m.zones.find(a=>x>=a.x&&x<=a.x+a.w&&y>=a.y&&y<=a.y+a.h);if(z)z.action();drawScreens();}else act(hit.object.userData.action,hit.object);}
  // Real moving impactors collide against the ship's ellipsoidal hull envelope.
  function spawnImpact(test=false){
    const side=Math.random()<.5?-1:1,z=test?(-.8+Math.random()*2):(-2+Math.random()*13),y=.9+Math.random()*.25;
    const severity=test?2:Math.random()<.6?1:Math.random()<.78?2:3;
    const targetLocal=new T.Vector3(side*3.8,y,z),target=W.ship.localToWorld(targetLocal.clone());
    const dir=new T.Vector3(side*(25+Math.random()*10),6+Math.random()*5,-15+Math.random()*20).applyQuaternion(W.ship.quaternion);
    const rock=new T.Mesh(new T.IcosahedronGeometry(severity===1?.19:severity===2?.44:.75,1),new T.MeshStandardMaterial({color:0x7e8179,roughness:1,flatShading:true}));
    const a=rock.geometry.attributes.position;for(let i=0;i<a.count;i++){const f=.78+Math.random()*.42;a.setXYZ(i,a.getX(i)*f,a.getY(i)*f,a.getZ(i)*f);}rock.geometry.computeVertexNormals();
    rock.position.copy(target).add(dir);W.scene.add(rock);
    const duration=test?8:10;const flightVelocity=new T.Vector3(0,0,-state.speed).applyQuaternion(W.ship.quaternion);
    impactors.push({mesh:rock,velocity:dir.clone().multiplyScalar(-1/duration).add(flightVelocity),severity,time:0,test});
    say(test?'試験用の岩塊が接近中。約8秒後に外板へ到達します。船外カメラからも確認できます。':'近傍に漂流岩塊。接近を検知しました。念のため、身を低く。',12);
  }
  function collide(imp,local){
    const side=local.x<0?-1:1;local.x=side*3.79;local.y=Math.min(1.6,Math.max(.5,local.y));local.z=Math.min(13,Math.max(-3.6,local.z));
    const d={id:Date.now().toString(36)+Math.random().toString(36).slice(2,5),pos:local.toArray(),severity:imp.severity,node:Math.max(0,Math.min(5,Math.round((local.z-.8)/1.9))),fixed:false,sealed:false,sealLife:0,pipeFixed:false,serverPatched:false,autoUsed:false,age:0};
    state.damages.unshift(d);W.deformHull(d);shake=.18*imp.severity;
    W.loose.forEach(o=>o.velocity.set(-side*(.3+Math.random())*imp.severity,.3*imp.severity,(Math.random()-.5)*imp.severity));
    impactSound();log((d.severity===1?'小規模':d.severity===2?'中規模':'大規模')+'衝突。'+(side<0?'左舷':'右舷')+' Z'+local.z.toFixed(1)+'m。');
    say('衝突。'+(side<0?'左舷':'右舷')+'、Z '+local.z.toFixed(1)+'mに'+['','小規模','中規模','大規模'][d.severity]+'損傷。漏気を検知。配管 LINE 0'+(d.node+1)+'も点検が必要です。',19);
    resting=false;drawScreens();save();
  }
  function updateImpactors(dt){
    for(let i=impactors.length-1;i>=0;i--){const p=impactors[i];p.time+=dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.rotation.x+=dt*.3;p.mesh.rotation.y+=dt*.24;
      const lp=W.ship.worldToLocal(p.mesh.position.clone());
      const envelope=lp.x*lp.x/(3.8*3.8)+(lp.y-1)*(lp.y-1)/(3.5*3.5);
      if(envelope<=1.045&&lp.z>=-4&&lp.z<=14){collide(p,lp);W.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();impactors.splice(i,1);}else if(p.time>45){W.scene.remove(p.mesh);p.mesh.geometry.dispose();p.mesh.material.dispose();impactors.splice(i,1);}
    }
  }
  function canWalk(x,z){
    if(state.layer==='pipes')return Math.abs(x)<.66&&z>-.8&&z<12.7;
    if(Math.abs(x)>3.24||z< -6.15||z>14.1)return false;
    if(Math.abs(z-11.9)<.27&&state.safe)return false;
    for(const wallZ of [.75,6.1,10.75])if(Math.abs(z-wallZ)<.27&&Math.abs(x)>1.6)return false;
    if(Math.abs(z-11.9)<.3&&Math.abs(x)>.83)return false;
    if(x>1.77&&x<2.12&&z>3.1&&z<5.5)return false;
    return !W.colliders.some(o=>Math.abs(x-o.x)<o.w/2+.21&&Math.abs(z-o.z)<o.d/2+.21);
  }
  function insideShip(p){const e=p.x*p.x/(4.1*4.1)+(p.y-1)*(p.y-1)/(3.8*3.8);return e<1&&p.z>-7.3&&p.z<15.2;}
  function movePlayer(dt){
    if(state.seated||external)return;
    let x=move.x+(keys.KeyD?1:0)-(keys.KeyA?1:0),z=move.y+(keys.KeyS?1:0)-(keys.KeyW?1:0),n=Math.hypot(x,z);if(n>1){x/=n;z/=n;}
    const speed=(state.layer==='eva'?1.8:state.layer==='pipes'?.72:1.23)*(state.oxygen<12&&!state.suit&&!insideSafe()?.28:1);
    const vec=new T.Vector3(x,0,z);if(state.layer==='eva'){vec.applyEuler(new T.Euler(pitch,yaw,0,'YXZ'));vec.y+=(keys.KeyR||vertical.up?1:0)-(keys.KeyF||vertical.down?1:0);vec.clampLength(0,1);const next=player.clone().addScaledVector(vec,dt*speed);if(!insideShip(next))player.copy(next);}
    else {vec.applyAxisAngle(new T.Vector3(0,1,0),yaw).multiplyScalar(dt*speed);if(canWalk(player.x+vec.x,player.z))player.x+=vec.x;if(canWalk(player.x,player.z+vec.z))player.z+=vec.z;player.y=state.layer==='pipes'?-1.3:1.62;}
  }
  // Keyboard, multi-touch view dragging, true joystick and direct scene interaction.
  document.addEventListener('keydown',e=>{if(!playing||paused)return;if(['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','KeyR','KeyF','Space'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.repeat)return;if(e.code==='KeyE')use();if(e.code==='KeyQ')seat();if(e.code==='KeyH')showGuide();if(e.code==='Escape'&&external)toggleExternal(false);});
  document.addEventListener('keyup',e=>keys[e.code]=false);
  window.addEventListener('blur',()=>{Object.keys(keys).forEach(k=>keys[k]=false);move.x=move.y=0;vertical.up=vertical.down=false;save();});
  let drag=null;
  $('space-canvas').addEventListener('pointerdown',e=>{if(!playing||paused)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,sx:e.clientX,sy:e.clientY,distance:0};e.currentTarget.setPointerCapture(e.pointerId);});
  $('space-canvas').addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId||paused)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.distance+=Math.abs(dx)+Math.abs(dy);if(external){externalYaw-=dx*.005;externalPitch=Math.max(-.7,Math.min(1.3,externalPitch+dy*.004));}else{yaw-=dx*.0035;pitch=Math.max(-1.35,Math.min(1.35,pitch-dy*.0035));}drag.x=e.clientX;drag.y=e.clientY;});
  $('space-canvas').addEventListener('pointerup',e=>{if(!drag||drag.id!==e.pointerId)return;if(drag.distance<9)use(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);drag=null;});
  $('space-canvas').addEventListener('pointercancel',()=>drag=null);
  let padId=null,padCenter={x:0,y:0};
  function padMove(e){if(e.pointerId!==padId)return;let x=e.clientX-padCenter.x,y=e.clientY-padCenter.y;const n=Math.hypot(x,y),max=33;if(n>max){x=x/n*max;y=y/n*max;}move.x=x/max;move.y=y/max;$('pad-dot').style.transform=`translate(${x}px,${y}px)`;}
  $('move-pad').addEventListener('pointerdown',e=>{e.preventDefault();padId=e.pointerId;const r=e.currentTarget.getBoundingClientRect();padCenter={x:r.left+r.width/2,y:r.top+r.height/2};e.currentTarget.setPointerCapture(e.pointerId);padMove(e);});
  $('move-pad').addEventListener('pointermove',padMove);
  function padEnd(){padId=null;move.x=move.y=0;$('pad-dot').style.transform='';}
  $('move-pad').addEventListener('pointerup',padEnd);$('move-pad').addEventListener('pointercancel',padEnd);
  for(const [id,dir] of [['rise-button','up'],['descend-button','down']]){$(id).addEventListener('pointerdown',e=>{vertical[dir]=true;e.currentTarget.setPointerCapture(e.pointerId);});for(const evt of ['pointerup','pointercancel'])$(id).addEventListener(evt,()=>vertical[dir]=false);}
  $('use-button').addEventListener('click',()=>use());$('seat-button').addEventListener('click',seat);$('external-exit').addEventListener('click',()=>toggleExternal(false));$('sound-toggle').addEventListener('click',toggleSound);
  function showGuide(){paused=true;padEnd();Object.keys(keys).forEach(k=>keys[k]=false);$('guide-dialog').showModal();}
  $('help-toggle').addEventListener('click',showGuide);$('welcome-guide').addEventListener('click',showGuide);$('guide-dialog').addEventListener('close',()=>{paused=false;last=performance.now();});
  $('fullscreen-button').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen();if(screen.orientation&&screen.orientation.lock)await screen.orientation.lock('landscape').catch(()=>{});}catch(e){$('fullscreen-button').textContent='端末のブラウザーメニューから全画面にできます';}});
  $('rotate-dismiss').addEventListener('click',()=>$('rotate-notice').style.display='none');
  $('start-label').textContent=saved?'航海をつづける':'B–29 に乗り込む';$('start-button').disabled=false;$('reset-button').hidden=!saved;
  $('reset-button').addEventListener('click',()=>{if(confirm('このブラウザーに保存された航海・損傷・記録を消去しますか？')){try{localStorage.removeItem(STORAGE);}catch(e){}location.reload();}});
  function start(){playing=true;$('welcome').classList.add('hidden');$('game-hud').classList.remove('hidden');document.body.classList.add('playing');W.camera.position.copy(player);updateMode();say(saved?'おかえりなさい、カイト。B-29は、あなたを待っていました。':'おはよう、カイト。2041年6月1日。地球出発。……さて、どこへ行きましょう。決めなくても、大丈夫です。',19);if(!storageAvailable)$('save-label').textContent='保存機能を利用できません';log(saved?'航海を再開。':'初めて操縦席に座った。');}
  $('start-button').addEventListener('click',start);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)save();last=performance.now();});window.addEventListener('pagehide',save);
  function simulate(dt){
    state.age+=dt;state.impactCountdown-=dt;
    if(state.impactCountdown<=0){if(state.damages.length<60)spawnImpact();state.impactCountdown=240+Math.random()*420;}
    // Autopilot changes course gradually; the whole 3D ship moves with it.
    W.ship.rotation.y+=(state.heading-W.ship.rotation.y)*Math.min(dt*.12,1);W.ship.rotation.x+=(state.pitch-W.ship.rotation.x)*Math.min(dt*.12,1);
    W.ship.position.add(new T.Vector3(0,0,-state.speed*dt).applyQuaternion(W.ship.quaternion));
    if(state.returnTime!==null){state.returnTime=Math.max(0,state.returnTime-dt);if(state.returnTime===0){state.returnTime=null;state.oxygen=100;state.kits=12;W.restoreHull();state.damages=[];say('10日間の帰路を終え、基地に到着しました。外板を交換し、配管・サーバーと修理資材を回復。航海の記録は残ります。',20);log('基地到着。船体機能を回復。');}}
    let leak=0;state.damages.forEach(d=>{if(d.fixed)return;d.age+=dt;if(d.sealed){d.sealLife-=dt;if(d.sealLife<=0){d.sealed=false;say('応急封止の劣化を検知。再封止、または避難室の使用をお願いします。',14);}}leak+=d.severity*(d.sealed?.0015:.032)*(1+Math.min(d.age/3600,.8));});
    state.oxygen=Math.max(0,Math.min(100,state.oxygen+dt*(leak?-.01-leak:.065)));
    if(state.suit){if(state.layer==='eva'||state.oxygen<30&&!insideSafe())state.suitAir=Math.max(0,state.suitAir-dt);else state.suitAir=Math.min(3600,state.suitAir+dt*4);}
    const danger=state.layer!=='eva'&&!insideSafe()&&state.oxygen<12&&(!state.suit||state.suitAir<=0)||state.layer==='eva'&&state.suitAir<=0;
    document.body.classList.toggle('hypoxia',danger);if(danger&&Math.floor(state.age)%20===0&&aiTime<1)say('酸素が危険域です。後部避難室で隔壁を閉じてください。動くなら宇宙服が必要です。',15);
    updateImpactors(dt);movePlayer(dt);
    if(shower){const a=W.showerDrops.geometry.attributes.position;for(let i=0;i<a.count;i++){let y=a.getY(i)-dt*2.5;if(y<.12)y=2.6;a.setY(i,y);}a.needsUpdate=true;if(pipeFaults().length){shower=false;W.showerDrops.visible=false;}}
    for(const o of W.loose){if(o.velocity.lengthSq()<.00001)continue;o.velocity.y-=dt*2;const np=o.mesh.position.clone().addScaledVector(o.velocity,dt);if(np.y<o.baseY){np.y=o.baseY;o.velocity.y=Math.abs(o.velocity.y)*.25;o.velocity.x*=Math.exp(-dt*2);o.velocity.z*=Math.exp(-dt*2);}if(Math.abs(np.x)>3.25){np.x=Math.sign(np.x)*3.25;o.velocity.x*=-.3;}if(np.z<6.3||np.z>10.3)o.velocity.z*=-.3;o.mesh.position.copy(np);o.mesh.rotation.y+=o.velocity.x*dt;}
    for(const v of W.damageVisuals){const d=state.damages.find(d=>d.id===v.id);v.hot.material.color.set(d.fixed?0x8eaf9d:d.sealed?0xc7b879:0xd78a67);v.target.material.opacity=d.fixed?.04:.12+Math.sin(elapsed*3)*.04;v.leak.visible=!d.fixed&&!d.sealed;v.scar.material.color.set(d.sealed?0x7b8477:0x10171b);if(v.leak.visible){const a=v.leak.geometry.attributes.position;for(let i=0;i<a.count;i++){a.setZ(i,(a.getZ(i)+dt*.75)%2);}a.needsUpdate=true;}}
    W.pipeNodes.forEach((n,i)=>{n.material=pipeFaults().some(d=>d.node===i)?W.materials.red:W.materials.dark;});
    if(coffeeTime>0){coffeeTime-=dt;W.coffeeGroup.visible=coffeeTime>0&&!external;W.coffeeGroup.rotation.z=-.08+Math.sin(elapsed*.7)*.014;}
    aiTime-=dt;if(aiTime<0)$('asphalt-message').style.opacity='.0';nextChat-=dt;if(nextChat<=0){if(aiTime<=0&&!resting)chat();nextChat=100+Math.random()*80;}
    saveTick+=dt;if(saveTick>12)save();
  }
  function hud(){
    const loc=external?'船外カメラ':state.layer==='eva'?'船外活動':state.layer==='pipes'?'配管層 / メンテナンス':player.z<.75?'コックピット':player.z>12?'避難室 / エアロック':player.z>6.1?'生活・エンジニア区画':player.x<-1.3?'リビング':player.x>1.7?'浴室':'中央通路';
    $('location-label').textContent=loc;$('mode-label').textContent=external?'EXTERNAL / CAM 01':state.layer==='eva'?'EVA / FREE FLIGHT':state.layer==='pipes'?'SERVICE / −01':'CABIN / 01';
    const o=insideSafe()?100:state.oxygen;$('oxygen-value').innerHTML=o.toFixed(0)+'<small>%</small>';$('oxygen-value').classList.toggle('danger',o<40);$('hull-value').innerHTML=hullIntegrity()+'<small>%</small>';$('hull-value').classList.toggle('danger',hullIntegrity()<75);$('speed-value').innerHTML=state.speed.toFixed(1)+'<small>m/s</small>';
    $('network-label').textContent=network()?'地球圏 / 5G 接続中':'月軌道圏外 / 通信なし';$('journey-time').textContent='DAY '+String(day()).padStart(2,'0')+' · '+formatTime(state.age%86400);$('suit-air').textContent='O₂ '+suitTime(state.suitAir);$('suit-air').classList.toggle('danger',state.suitAir<300);
    const date=new Date(Date.UTC(2041,5,1)+state.age*1000);$('date-label').textContent=date.toISOString().slice(0,10).replaceAll('-','.');
    const hit=external?null:getHit();$('interaction-hint').textContent=hit?hit.object.userData.name+(hit.object.userData.interaction==='monitor'?' / 直接タップ':' / E・使う'):state.layer==='eva'?'帰船口まで '+player.distanceTo(new T.Vector3(0,1.25,15.65)).toFixed(1)+'m':'';
    if(saveTick>4&&storageAvailable)$('save-label').textContent='自動保存 / この端末';
  }
  let last=performance.now();
  function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;elapsed+=dt;
    if(!paused&&!document.hidden){if(playing)simulate(dt);W.earth.rotation.y+=dt*.000015;for(const rock of W.distantRocks)rock.rotation.y+=dt*.018;
      if(playing){if(external){W.camera.position.set(Math.sin(externalYaw)*25,6+Math.sin(externalPitch)*19,5+Math.cos(externalYaw)*25);const target=W.ship.localToWorld(new T.Vector3(0,1,4));W.camera.lookAt(target);}else{W.camera.position.copy(player);W.camera.rotation.set(pitch,yaw,0,'YXZ');if(shake>.002){W.camera.position.x+=(Math.random()-.5)*shake;W.camera.position.y+=(Math.random()-.5)*shake;W.camera.rotation.z=(Math.random()-.5)*shake*.12;shake*=Math.exp(-dt*2.2);}if(resting)W.camera.rotation.z=Math.sin(elapsed*.2)*.004;}
      }else {W.camera.position.set(0,1.65,-1.15);W.camera.rotation.set(.075+Math.sin(elapsed*.12)*.002,Math.sin(elapsed*.08)*.003,0,'YXZ');}
    }
    W.renderer.render(W.scene,W.camera);
    screenTick+=dt;if(screenTick>.75){screenTick=0;drawScreens();}
    hudTick+=dt;if(playing&&hudTick>.16){hudTick=0;hud();}
  }
  requestAnimationFrame(frame);
  // Deterministic, opt-in browser smoke checks. Not part of a normal saved voyage.
  if(diagnostic){
    const assertions=[];const check=(n,v)=>{assertions.push({name:n,pass:!!v});console.log((v?'PASS ':'FAIL ')+n);};
    check('3D hull has 108 deformable plates',W.hull.length===108);check('Physical monitors have touch regions',W.monitors.every(m=>m.zones.length>=4));check('Cabin collision blocks hull',!canWalk(5,2));check('Central passage walkable',canWalk(0,3));check('Airlock and suit are interactive',W.interactables.some(m=>m.userData.action==='suit')&&W.interactables.some(m=>m.userData.action==='airlock'));check('Pipe nodes are physical and unique',W.pipeNodes.length===6);check('Scene renders without GL errors',W.renderer.getContext().getError()===0);
    const testMode=new URLSearchParams(location.search).get('view');
    if(testMode==='test'){
      start();W.renderer.render(W.scene,W.camera);
      const main=W.monitors.find(m=>m.id==='main');
      const screenPoint=(x,y)=>main.screen.localToWorld(new T.Vector3((x/1024-.5)*2.22,(.5-y/640)*2.22*.625,0)).project(W.camera);
      const p=screenPoint(370,387),before=state.speed;const monitorHit=getHit(p.x,p.y);check('Raycast reaches physical dashboard',monitorHit&&monitorHit.object===main.screen);use(p.x,p.y);check('Direct screen UV touch changes thrust',state.speed>before);
      state.speed=.2;const initialPos=W.ship.position.clone();simulate(.5);check('Complete vessel translates in 3D',W.ship.position.distanceTo(initialPos)>.09);
      seat();check('Standing leaves pilot chair',!state.seated);keys.KeyS=true;const oldZ=player.z;movePlayer(.5);keys.KeyS=false;check('First-person walk moves player',player.z>oldZ);
      player.set(0,1.62,5.4);W.camera.position.copy(player);W.camera.lookAt(W.ship.localToWorld(new T.Vector3(0,0,4.5)));W.renderer.render(W.scene,W.camera);check('Actual floor hatch is ray-interactive',getHit()?.object.userData.action==='hatch');
      act('hatch');check('Hatch descends into actual pipe layer',state.layer==='pipes'&&player.y<0);W.camera.position.copy(player);W.camera.lookAt(W.ship.localToWorld(new T.Vector3(0,-1.6,5.07)));W.renderer.render(W.scene,W.camera);check('Ladder reachable from maintenance layer',getHit()?.object.userData.action==='hatch');act('hatch');
      player.set(0,1.62,13.6);act('airlock');check('Airlock prevents unsuited exit',state.layer==='cabin');act('suit');act('airlock');check('Wearing suit allows physical EVA',state.layer==='eva'&&state.suit);
      W.camera.position.copy(player);W.camera.lookAt(W.ship.localToWorld(new T.Vector3(0,1.25,15.65)));W.renderer.render(W.scene,W.camera);check('Exterior return door is unobstructed',getHit()?.object.userData.action==='airlock');act('airlock');check('Airlock returns player to cabin',state.layer==='cabin');
      W.camera.position.copy(player);W.camera.lookAt(W.ship.localToWorld(new T.Vector3(0,1.25,15.48)));W.renderer.render(W.scene,W.camera);check('Interior airlock door is unobstructed',getHit()?.object.userData.action==='airlock');
      act('safe');check('Sealed rear compartment independently safe',insideSafe());check('Closed bulkhead blocks walking',!canWalk(0,11.9));act('safe');act('suit');
      act('coffee');check('Coffee makes a persistent journal entry',state.coffee===1&&state.logs.some(l=>l.text.includes('コーヒー')));act('shower');check('Shower activates visible 3D water',W.showerDrops.visible);act('shower');
      // Close-range rays must still reach usable objects after decorative detailing.
      function checkReach(name,pos,target,action){player.fromArray(pos);W.camera.position.copy(player);W.camera.lookAt(W.ship.localToWorld(new T.Vector3(...target)));W.scene.updateMatrixWorld(true);check(name,getHit()?.object.userData.action===action);}
      checkReach('Detailed coffee station stays reachable',[-1.65,1.5,2.2],[-2.65,1.1,1.6],'coffee');
      checkReach('Lounge monitor mount does not block screen',[-1.3,1.62,3.3],[-3.04,1.93,3.4],null);
      checkReach('Bathroom monitor stays reachable',[2.55,1.62,4],[3.03,1.83,4.8],null);
      checkReach('Shower mixer stays reachable',[2.5,1.62,2.8],[3.07,1.05,3],'shower');
      checkReach('Repair kit remains unobstructed',[1.25,1.62,9.2],[1.99,.3,9.35],'kit');
      checkReach('Detailed EVA suit stays reachable',[1.4,1.62,13.3],[2.45,1.3,12.75],'suit');
      checkReach('Berth control stays reachable',[-1.7,1.62,8.7],[-2.44,.72,8.7],'rest');
      state.layer='pipes';for(let i=0;i<W.pipeNodes.length;i++){const node=W.pipeNodes[i];checkReach('Pipe valve '+(i+1)+' stays reachable',[0,-1.3,node.position.z],node.position.toArray(),'pipe');}state.layer='cabin';
      check('Detail atlas stays within one texture',W.detailStats.atlasTiles>20&&W.detailStats.atlasTiles<=64);
      check('Procedural reflections and shadows enabled',W.scene.environment&&W.renderer.shadowMap.enabled);
      check('Central passage remains clear after detailing',[2,4,6,8,10].every(z=>canWalk(0,z)));
      spawnImpact(true);for(let i=0;i<195;i++)simulate(.05);check('Moving asteroid physically collides',state.damages.length===1&&impactors.length===0);check('Impact leaks cabin oxygen',state.oxygen<100);check('Impact alters actual hull vertices',W.hull.some(m=>m.geometry.attributes.position.array.some((v,i)=>Math.abs(v-m.userData.original[i])>.001)));
      if(state.damages.length){const d=state.damages[0];act('kit');act('damage',{userData:{damage:d.id}});check('Medium damage can only be sealed, not removed',d.sealed&&!d.fixed&&state.kits===11);act('pipe',W.pipeNodes[d.node]);check('On-site pipe repair restores circuit',d.pipeFixed&&state.kits===10);d.sealLife=.01;simulate(.05);check('Temporary repair deteriorates with time',!d.sealed);const roundTrip=JSON.parse(JSON.stringify(state));check('Damage and repair inventory serialize',roundTrip.damages.length===1&&roundTrip.kits===10);}
      W.restoreHull();state=fresh();W.ship.position.set(0,0,0);W.ship.rotation.set(0,0,0);player.set(0,1.65,-1.15);yaw=0;pitch=.075;W.safeDoor.position.x=1.95;coffeeTime=0;$('coffee-cup').classList.add('hidden');updateMode();drawScreens();
    }
    if(testMode){start();if(testMode==='cabin'){state.seated=false;player.set(0,1.62,1.6);yaw=Math.PI;pitch=-.06;}if(testMode==='pipes'){state.layer='pipes';state.seated=false;player.set(0,-1.3,4.4);yaw=0;pitch=0;}if(testMode==='external'){toggleExternal(true);}if(testMode==='damage'){toggleExternal(true);spawnImpact(true);for(let i=0;i<200;i++)simulate(.05);externalYaw=state.damages[0]?.pos[0]>0?1.05:-1.05;externalPitch=.08;}updateMode();}
    W.diagnostics=assertions;
    console.log('B29 CHECKS '+assertions.filter(a=>a.pass).length+'/'+assertions.length);
  }
})();