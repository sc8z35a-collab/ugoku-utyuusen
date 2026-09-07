'use strict';
/* Everything visible in space is geometry; canvas textures are drawn locally. */
window.B29 = (() => {
  const W = { interactables: [], colliders: [], hull: [], monitors: [], loose: [], lamps: [], damageVisuals: [], damageCracks: [] };
  const T = window.THREE;
  if (!T) { document.getElementById('loading-error').classList.remove('hidden'); document.getElementById('loading-error').textContent = '3Dエンジンを読み込めませんでした。インターネット接続を確認して再読み込みしてください。'; return null; }
  let seed = 2941;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  W.random = random;
  const scene = W.scene = new T.Scene();
  scene.background = new T.Color(0x03070e);
  const renderer = W.renderer = new T.WebGLRenderer({canvas: document.getElementById('space-canvas'), antialias: true, powerPreference: 'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
  renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.13;
  const camera = W.camera = new T.PerspectiveCamera(65, innerWidth / innerHeight, .055, 18000);
  const ship = W.ship = new T.Group(); scene.add(ship); ship.add(camera);
  camera.position.set(0,1.65,-1.15); camera.rotation.order = 'YXZ'; camera.rotation.x = .075;
  const mat = (color, metalness=.25, roughness=.65) => new T.MeshStandardMaterial({color,metalness,roughness});
  const M = W.materials = {
    hull:mat(0x737f80,.6,.67), panel:mat(0x566365,.5,.62), lightPanel:mat(0x8b9390,.35,.7),
    dark:mat(0x19252b,.7,.5), black:mat(0x10191d,.3,.85), floor:mat(0x343e40,.6,.8),
    pipe:mat(0x879591,.75,.35), copper:mat(0x897153,.7,.42), fabric:mat(0x5b6963,.05,.99),
    cream:mat(0xc3c1a9,.15,.6), orange:mat(0xc48c54,.45,.55), red:mat(0xab4f3c,.3,.7),
    glow:new T.MeshBasicMaterial({color:0xc9dfba}), amber:new T.MeshBasicMaterial({color:0xe8bc77}),
    cyan:new T.MeshBasicMaterial({color:0x8bbcc4}), glass:new T.MeshPhysicalMaterial({color:0x92b9c8,metalness:.15,roughness:.11,transparent:true,opacity:.065,side:T.DoubleSide,depthWrite:false})
  };
  function box(w,h,d,x,y,z,material=M.panel,parent=ship){const a=new T.Mesh(new T.BoxGeometry(w,h,d),material);a.position.set(x,y,z);parent.add(a);return a;}
  function cyl(r1,r2,length,x,y,z,material=M.pipe,parent=ship,n=12){const a=new T.Mesh(new T.CylinderGeometry(r1,r2,length,n),material);a.position.set(x,y,z);parent.add(a);return a;}
  function tube(points,r=.04,material=M.pipe,parent=ship){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const mesh=new T.Mesh(new T.TubeGeometry(curve,Math.max(12,points.length*6),r,7,false),material);parent.add(mesh);return mesh;}
  function beam(a,b,r,material=M.dark,parent=ship){const start=new T.Vector3(...a),end=new T.Vector3(...b);const mesh=new T.Mesh(new T.CylinderGeometry(r,r,start.distanceTo(end),8),material);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());parent.add(mesh);return mesh;}
  function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return tex;}
  function label(text,w,h,x,y,z,color='#bccbbb',parent=ship){const tex=texture(512,128,(c)=>{c.fillStyle=color;c.font='500 53px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,65,495)});const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.DoubleSide,depthWrite:false}));m.position.set(x,y,z);parent.add(m);return m;}
  W.box=box;W.cyl=cyl;W.tube=tube;W.beam=beam;W.label=label;
  function interactive(mesh,id,name,action){mesh.userData={...mesh.userData,interaction:id,name,action};W.interactables.push(mesh);return mesh;}
  W.interactive=interactive;
  function collider(x,z,w,d){W.colliders.push({x,z,w,d});}
  // Soft bounced cabin illumination, with a cold orbital sun.
  scene.add(new T.HemisphereLight(0xabc8db,0x283137,2.05));
  const sun=new T.DirectionalLight(0xffefd1,2.8);sun.position.set(-500,700,-800);scene.add(sun);
  const cabinLight=new T.PointLight(0xc5dfd5,28,17,1.4);cabinLight.position.set(0,3.4,-2);ship.add(cabinLight);
  for(const z of [3,8,12]){const l=new T.PointLight(z===8?0xe8c8a1:0xb9d8d7,14,9,1.5);l.position.set(0,3,z);ship.add(l);W.lamps.push(l);}
  // Procedural stellar sphere.
  const positions=[],colors=[];
  for(let i=0;i<4600;i++){const a=random()*Math.PI*2,b=Math.acos(2*random()-1),r=7000+random()*4000;positions.push(r*Math.sin(b)*Math.cos(a),r*Math.cos(b),r*Math.sin(b)*Math.sin(a));const c=new T.Color().setHSL(.52+random()*.17,.1+random()*.25,.45+random()*.5);colors.push(c.r,c.g,c.b);}
  const starGeo=new T.BufferGeometry();starGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));starGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
  scene.add(new T.Points(starGeo,new T.PointsMaterial({size:3.7,sizeAttenuation:true,vertexColors:true,transparent:true,opacity:.85,depthWrite:false})));
  function hash(x,y){let n=Math.sin(x*127.1+y*311.7)*43758.5453123;return n-Math.floor(n);}
  function noise(x,y){const a=Math.floor(x),b=Math.floor(y);let u=x-a,v=y-b;u=u*u*(3-2*u);v=v*v*(3-2*v);return (hash(a,b)*(1-u)+hash(a+1,b)*u)*(1-v)+(hash(a,b+1)*(1-u)+hash(a+1,b+1)*u)*v;}
  function fbm(x,y){return noise(x,y)*.52+noise(x*2,y*2)*.26+noise(x*4,y*4)*.13+noise(x*8,y*8)*.065;}
  const continents=[[[.05,.29],[.10,.16],[.22,.18],[.30,.30],[.25,.39],[.20,.42],[.17,.52],[.10,.40]],[[.21,.47],[.29,.51],[.32,.61],[.27,.79],[.23,.88],[.20,.69]],[[.44,.20],[.51,.18],[.55,.27],[.58,.38],[.51,.40],[.45,.34]],[[.46,.36],[.57,.36],[.60,.47],[.54,.70],[.50,.76],[.43,.52]],[[.55,.18],[.73,.10],[.89,.22],[.90,.33],[.79,.40],[.73,.53],[.64,.40],[.59,.45]],[[.76,.62],[.87,.60],[.91,.74],[.80,.77]]];
  function inside(x,y,p){let c=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if(((p[i][1]>y)!==(p[j][1]>y))&&(x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0]))c=!c;}return c;}
  const earthTexture=texture(1024,512,(ctx,w,h)=>{const img=ctx.createImageData(w,h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const u=x/w,v=y/h,n=fbm(u*65,v*50);const xx=u+(noise(u*80,v*80)-.5)*.018,yy=v+(noise(u*75+2,v*75)-.5)*.018;const land=continents.some(p=>inside(xx,yy,p));let r=12+n*12,g=38+n*22,b=63+n*30;if(land){const desert=Math.max(0,1-Math.abs(v-.43)*10)*noise(u*16,v*16);r=38+n*48+desert*58;g=58+n*49+desert*30;b=44+n*32;}const cloud=fbm(u*32+Math.sin(v*28)*1.6,v*54);let cc=Math.max(0,(cloud-.51)*4.8);cc=Math.min(.92,cc);if(v<.06||v>.94)cc=Math.max(cc,.85);const idx=(y*w+x)*4;img.data[idx]=r*(1-cc)+220*cc;img.data[idx+1]=g*(1-cc)+232*cc;img.data[idx+2]=b*(1-cc)+228*cc;img.data[idx+3]=255;}ctx.putImageData(img,0,0);});
  const earth = W.earth = new T.Mesh(new T.SphereGeometry(470,88,64),new T.MeshStandardMaterial({map:earthTexture,roughness:1,metalness:0}));
  earth.position.set(435,205,-1170);earth.rotation.set(.08,-1.72,-.27);scene.add(earth);
  const atmosphere=new T.Mesh(new T.SphereGeometry(478,72,48),new T.ShaderMaterial({vertexShader:'varying vec3 vN; varying vec3 vV; void main(){vec4 mv=modelViewMatrix*vec4(position,1.0);vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);gl_Position=projectionMatrix*mv;}',fragmentShader:'varying vec3 vN;varying vec3 vV;void main(){float f=pow(1.0-abs(dot(normalize(vN),normalize(vV))),3.7);gl_FragColor=vec4(0.26,0.57,0.79,f*0.64);}',transparent:true,side:T.FrontSide,depthWrite:false,blending:T.AdditiveBlending}));atmosphere.position.copy(earth.position);scene.add(atmosphere);
  const moon=new T.Mesh(new T.SphereGeometry(34,32,24),mat(0x989e9b,.1,1));moon.position.set(-800,340,-2300);scene.add(moon);
  // Exterior hull is a tessellated ellipse, divided into physically deformable plates.
  const hullMat=M.hull.clone();hullMat.side=T.DoubleSide;
  for(let zi=0;zi<9;zi++)for(let ai=0;ai<12;ai++){
    const z0=-4+zi*2,z1=z0+1.98,a0=ai/12*Math.PI*2+.007,a1=(ai+1)/12*Math.PI*2-.007;
    const verts=[],uvs=[],idx=[];const n=7;
    for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){const a=a0+(a1-a0)*i/n,z=z0+(z1-z0)*j/n;verts.push(Math.sin(a)*3.8,1+Math.cos(a)*3.5,z);uvs.push(i/n,j/n);}
    for(let j=0;j<n;j++)for(let i=0;i<n;i++){const a=j*(n+1)+i;idx.push(a,a+1,a+n+1,a+1,a+n+2,a+n+1);}
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.setIndex(idx);geo.computeVertexNormals();
    const m=new T.Mesh(geo,hullMat);m.userData.original=new Float32Array(verts);m.userData.originalIndex=idx.slice();m.userData.plate={zi,ai};ship.add(m);W.hull.push(m);
  }
  // Rounded endcap and exterior equipment.
  const rearGeo=new T.SphereGeometry(1,32,18,0,Math.PI*2,.31,Math.PI/2-.31);rearGeo.rotateX(Math.PI/2);const rear=new T.Mesh(rearGeo,hullMat);rear.scale.set(3.8,3.5,1.5);rear.position.set(0,1,14);ship.add(rear);
  for(const x of [-2.2,2.2]){const engine=cyl(.66,.89,2.8,x,-.6,15.2,M.dark);engine.rotation.x=Math.PI/2;const ring=cyl(.67,.67,.16,x,-.6,16.62,M.pipe);ring.rotation.x=Math.PI/2;const exhaust=cyl(.48,.56,.04,x,-.6,16.72,new T.MeshBasicMaterial({color:0x8dc8d5}));exhaust.rotation.x=Math.PI/2;}
  for(const side of [-1,1]){
    beam([side*3.5,1.5,9],[side*7,1.5,9],.12,M.pipe);
    const panel=box(3.5,.07,6,side*6,1.5,9,mat(0x1c3342,.65,.37));
    for(let j=0;j<7;j++)box(3.5,.015,.025,side*6,1.546,6.1+j*.92,M.pipe);
    for(let j=0;j<5;j++)box(.025,.015,6,side*(4.3+j*.86),1.546,9,M.pipe);
    const lettering=label('B – 2 9',3,.7,side*3.82,1.35,5,'#d1d7c4');lettering.rotation.y=side*Math.PI/2;
    for(let z=0;z<13;z+=2.8)beam([side*3.85,1.55,z],[side*3.85,1.55,z+1.1],.035,M.orange);
  }
  const antenna=cyl(.035,.05,2.7,.5,5.2,9,M.pipe);const dish=new T.Mesh(new T.SphereGeometry(.65,20,12,0,Math.PI*2,0,.8),M.lightPanel);dish.rotation.z=.5;dish.position.set(.5,6.6,9);ship.add(dish);
  // Cockpit: broad real transparent windows, chamfered struts, low dashboard.
  const frontShape=new T.Shape();frontShape.moveTo(-3.75,0);frontShape.lineTo(3.75,0);frontShape.lineTo(3.15,3.7);frontShape.lineTo(1.9,4.2);frontShape.lineTo(-1.9,4.2);frontShape.lineTo(-3.15,3.7);frontShape.closePath();
  const frontGlass=new T.Mesh(new T.ShapeGeometry(frontShape),M.glass);frontGlass.position.z=-7.1;ship.add(frontGlass);
  beam([-3.75,0,-7.1],[-3.15,3.7,-7.1],.15);beam([3.75,0,-7.1],[3.15,3.7,-7.1],.15);
  beam([-3.15,3.7,-7.1],[-1.9,4.2,-7.1],.16);beam([3.15,3.7,-7.1],[1.9,4.2,-7.1],.16);
  beam([-1.9,4.2,-7.1],[1.9,4.2,-7.1],.18);beam([-3.75,.45,-7.1],[3.75,.45,-7.1],.17);
  // Windshield dividers deliberately leave an expansive view of the planet.
  for(const x of [-1.3,1.3])beam([x,.5,-7.1],[x*.85,4.2,-7.1],.055,M.panel);
  for(const side of [-1,1]){
    beam([side*3.75,0,-7.1],[side*3.75,0,-4],.18);
    beam([side*3.15,3.7,-7.1],[side*3.45,3.2,-4],.18);
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute([side*3.75,0,-7.1,side*3.8,0,-4,side*3.45,3.2,-4,side*3.75,0,-7.1,side*3.45,3.2,-4,side*3.15,3.7,-7.1],3));geo.computeVertexNormals();ship.add(new T.Mesh(geo,M.glass));
    beam([side*3.15,3.7,-7.1],[side*2.5,3.8,-1],.13);
    box(.09,.065,4.6,side*2.48,3.79,-3.2,M.glow);
    const sideConsole=box(1.15,.65,3.6,side*2.65,.63,-4.1,M.dark);collider(side*2.65,-4.1,1.15,3.6);
    const top=box(1.13,.08,3.56,side*2.65,.99,-4.1,M.panel);
    for(let i=0;i<5;i++){box(.045,.016,.45,side*2.6+i*.07,1.04,-2.9,M.black);const key=box(.12,.07,.16,side*2.7,1.06,-3.5-i*.27,i%2?M.orange:M.lightPanel);}
    beam([side*2.02,1.2,-5.5],[side*2.02,1.2,-2.6],.035,M.pipe);
  }
  // Floor plates with hatches, grooves, and amber path guidance.
  for(let z=-6.5;z<14;z+=1){for(const x of [-2.45,0,2.45]){if(Math.abs(z-4.5)<.1&&x===0)continue;box(x===0?2.28:2.5,.12,.975,x,-.08,z,M.floor);}
    if(z>-1&&z<12)for(const x of [-1.12,1.12])box(.025,.012,.45,x,.002,z,M.amber);
  }
  box(7.2,.12,16,0,-2.44,5,M.dark);
  for(let z=-2;z<14;z+=.28)box(1.35,.025,.055,0,-2.355,z,M.pipe);
  // Ring ribs echo a salvaged submarine / compact spacecraft.
  for(const z of [-3.4,.3,3.6,7,10.4,13.5]){
    const points=[];for(let k=0;k<=28;k++){const a=-1.42+k/28*2.84;points.push([Math.sin(a)*3.63,1.05+Math.cos(a)*3.24,z]);}tube(points,.105,M.dark);
    for(const side of [-1,1]){box(.12,.11,.52,side*2.7,3.04,z,M.lightPanel);box(.11,.02,.38,side*2.7,2.978,z,M.glow);}
    label(z<0?'01 / FLIGHT DECK':z<7?'02 / HABITAT':z<12?'03 / QUIET QUARTERS':'04 / AIRLOCK',2.4,.22,0,3.7,z-.12,'#a4b1a8');
  }
  // A central monitor sits in the physical dashboard, never in a HUD modal.
  function monitor(x,y,z,ry=0,rx=0,size=1.65,id='main'){
    const group=new T.Group();group.position.set(x,y,z);group.rotation.set(rx,ry,0);ship.add(group);
    box(size+.18,size*.65+.17,.18,0,0,-.09,M.dark,group);
    const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=640;const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;
    const screen=new T.Mesh(new T.PlaneGeometry(size,size*.625),new T.MeshBasicMaterial({map:tex}));screen.position.z=.014;group.add(screen);
    interactive(screen,'monitor','船内モニター',null);screen.userData.monitor=id;
    box(.2,.018,.02,-size*.4,-size*.34,.01,M.glow,group);
    const data={screen,canvas,tex,page:'home',zones:[],id};W.monitors.push(data);return data;
  }
  W.monitor=monitor;
  box(3.75,.44,.92,0,.32,-4.8,M.dark);box(3.9,.09,1.04,0,.58,-4.8,M.panel);collider(0,-4.8,3.9,1.04);
  monitor(0,.94,-4.53,0,-.28,2.22,'main');
  const aux=monitor(-1.76,.93,-4.33,.28,-.2,.94,'aux');
  // Flight stick and tactile switches.
  const stick=cyl(.055,.085,.36,.95,.79,-3.85,M.black);stick.rotation.z=-.14;
  const grip=box(.17,.13,.12,.92,.98,-3.85,M.dark);interactive(grip,'helm','操縦席に座る','seat');
  for(let i=0;i<6;i++){box(.09,.04,.12,1.15+i*.13,.651,-4.7,i<2?M.orange:M.lightPanel);box(.035,.017,.035,1.17+i*.13,.685,-4.5,M.glow);}
  // Narrow pilot chair, visible when walking and from the exterior camera.
  const chair=new T.Group();chair.position.set(0,0,-.65);ship.add(chair);W.chair=chair;
  cyl(.14,.32,.42,0,.23,0,M.dark,chair);box(.88,.19,.83,0,.52,0,M.fabric,chair);const back=box(.86,.94,.17,0,1.02,.36,M.fabric,chair);back.rotation.x=.09;box(.52,.27,.15,0,1.61,.43,M.dark,chair);
  for(const x of [-.52,.52]){beam([x,.3,.2],[x,.87,.2],.04,M.pipe,chair);box(.15,.12,.74,x,.92,0,M.dark,chair);}interactive(back,'chair','操縦席 / 座る','seat');
  // Cabin alcoves: offset walls, storage and curved archways rather than a rectangular house.
  for(const z of [.75,6.1,10.75])for(const side of [-1,1]){box(1.7,2.5,.14,side*2.65,1.23,z,M.panel);beam([side*1.85,.02,z],[side*1.85,2.9,z],.07,M.dark);}
  // lounge left: low couch, shelves, coffee maker, personal objects.
  box(.85,.42,3.7,-2.95,.3,3.3,M.dark);box(.82,.16,3.5,-2.92,.61,3.3,M.fabric);box(.15,.83,3.65,-3.31,1.01,3.3,M.fabric);collider(-2.95,3.3,.85,3.7);
  for(const z of [1.7,4.9])box(.86,.5,.2,-2.91,.9,z,M.panel);
  const table=cyl(.65,.65,.09,-1.85,.75,3.55,M.lightPanel);cyl(.07,.2,.7,-1.85,.37,3.55,M.dark);collider(-1.85,3.55,1.1,1.1);
  box(.86,.7,.7,-2.65,.38,1.48,M.dark);const maker=box(.52,.65,.39,-2.65,1.05,1.48,M.black);box(.32,.06,.17,-2.65,1.35,1.71,M.pipe);box(.065,.035,.02,-2.48,1.22,1.682,M.glow);interactive(maker,'coffee','コーヒーを淹れる','coffee');
  const cup=cyl(.11,.085,.19,-2.65,.84,1.72,M.cream);const coffee=cyl(.087,.087,.01,-2.65,.94,1.72,mat(0x37271e,.1,.6));
  const handle=new T.Mesh(new T.TorusGeometry(.075,.021,7,14),M.cream);handle.position.set(-2.53,.86,1.72);ship.add(handle);
  label('COFFEE / TAKE IT SLOW',.75,.16,-2.65,1.65,1.7,'#d3c9ad');
  monitor(-3.04,1.93,3.4,Math.PI/2,0,1.47,'living');
  for(let y=1.5;y<2.8;y+=.6){box(.54,.065,1.5,-3.22,y,5.1,M.panel);for(let i=0;i<6;i++){const book=box(.22,.25+random()*.13,.06,-3.18,y+.16,4.54+i*.15,[M.cream,M.fabric,M.orange,M.dark][i%4]);book.rotation.x=(random()-.5)*.1;}}
  const photo=label('HOME · 2041',.52,.18,-3.09,2.68,4.9,'#d1ccac');photo.rotation.y=Math.PI/2;
  // right-side bathroom: enclosure glass, shower pipes, secondary monitor.
  box(1.18,.07,2.5,2.7,.02,3.5,M.lightPanel);collider(3.17,3.5,.25,2.5);
  const showerGlass=box(.035,2.2,2.2,1.95,1.14,4.3,new T.MeshPhysicalMaterial({color:0x90b0b0,transparent:true,opacity:.16,roughness:.5,side:T.DoubleSide,depthWrite:false}));
  tube([[3.2,.3,3],[3.2,2.4,3],[3.15,2.7,3],[2.7,2.7,3]],.04,M.pipe);
  const shower=cyl(.2,.17,.055,2.7,2.66,3,M.pipe);interactive(shower,'shower','シャワー / 水循環を切り替え','shower');
  const valve=cyl(.14,.14,.06,3.07,1.05,3,M.orange);valve.rotation.z=Math.PI/2;interactive(valve,'shower','シャワーを使う','shower');
  monitor(3.03,1.83,4.8,-Math.PI/2,0,1.3,'bath');
  label('RECYCLED WATER / 98%',1.1,.16,2.7,2.15,1,'#b4cec8');
  const drops=[];for(let i=0;i<90;i++)drops.push(2.7+(random()-.5)*.3,random()*2.5,3+(random()-.5)*.3);
  const dg=new T.BufferGeometry();dg.setAttribute('position',new T.Float32BufferAttribute(drops,3));W.showerDrops=new T.Points(dg,new T.PointsMaterial({color:0xbedbe2,size:.022,transparent:true,opacity:.7}));W.showerDrops.visible=false;ship.add(W.showerDrops);
  // Central floor maintenance access and ladder.
  const hatch=box(2.26,.13,.98,0,-.02,4.5,M.dark);W.hatch=hatch;interactive(hatch,'hatch','配管層へ降りる / 床下ハッチ','hatch');
  const hatchText=label('↓ SERVICE / BELOW',1.55,.28,0,.057,4.5,'#d8bd83');hatchText.rotation.x=-Math.PI/2;
  for(const x of [-.45,.45])beam([x,-2.3,5.05],[x,.4,5.05],.035,M.orange);
  for(let y=-2.1;y<.4;y+=.35)beam([-.45,y,5.05],[.45,y,5.05],.03,M.pipe);
  const ladderTarget=box(1.15,.16,.22,0,-1.6,5.07,M.orange);interactive(ladderTarget,'ladder','居住層へ上がる','hatch');
  // Rich pipe network underneath: multiple routes, joints, manifolds and physical service nodes.
  W.pipeNodes=[];
  for(let side of [-1,1])for(let i=0;i<5;i++){
    const x=side*(.9+i*.45),y=-.57-i*.22;
    tube([[x,y,-3],[x,y,1.8],[x+side*.14,y-.15,2.2],[x+side*.14,y-.15,6.6],[x,y,7.1],[x,y,13]],i===0?.085:.045,i%2?M.copper:M.pipe);
    for(let z=0;z<13;z+=2.8){const joint=cyl(.11,.11,.14,x,y,z,i%2?M.copper:M.dark);joint.rotation.x=Math.PI/2;}
  }
  for(let z=0;z<13;z+=2){tube([[-3,-1.45,z],[-2,-1.45,z],[-1.6,-1.7,z+.3],[1.6,-1.7,z+.3],[2,-1.25,z+.6],[3,-1.25,z+.6]],.045,M.copper);}
  for(let i=0;i<6;i++){
    const side=i%2?1:-1,z=.8+i*1.9;
    const node=box(.32,.4,.5,side*1.35,-1.15,z,M.dark);box(.04,.08,.3,side*1.17,-1.15,z,M.glow);
    const v=new T.Mesh(new T.TorusGeometry(.15,.025,7,16),M.orange);v.rotation.y=Math.PI/2;v.position.set(side*1.12,-1.15,z);ship.add(v);
    interactive(node,'pipe-'+i,'配管 '+String(i+1).padStart(2,'0')+' / 点検・修理','pipe');node.userData.node=i;W.pipeNodes.push(node);
    const pl=label('LINE 0'+(i+1),.54,.13,side*1.1,-.81,z,'#d2b683');pl.rotation.y=side<0?Math.PI/2:-Math.PI/2;
  }
  for(let z=-1;z<13;z+=2.5){box(.55,.025,.09,0,-.37,z,M.amber);const l=new T.PointLight(0xe4b67b,2,4,1.5);l.position.set(0,-1.1,z);ship.add(l);}
  // Engineering: cluttered servers, repair supplies, a quiet sleeping niche.
  for(let i=0;i<2;i++){
    box(.7,2.3,.8,3.1,1.18,7.05+i*1.05,M.black);collider(3.1,7.05+i*1.05,.7,.8);
    for(let j=0;j<8;j++){box(.03,.18,.66,2.735,.25+j*.25,7.05+i*1.05,M.panel);box(.016,.035,.12,2.712,.25+j*.25,6.82+i*1.05,j===3?M.amber:M.glow);for(let k=0;k<4;k++)box(.014,.015,.3,2.711,.21+j*.25+k*.024,7.13+i*1.05,M.black);}
  }
  const rackLabel=label('ASPHALT / SERVER 01',1.5,.18,2.72,2.55,7.55);rackLabel.rotation.y=-Math.PI/2;
  tube([[3.14,2.5,7],[3.1,2.8,7.3],[2.8,2.8,8.9],[2.9,1.2,9.2]],.025,M.black);
  box(.82,.4,3.1,-2.92,.23,8.5,M.dark);box(.79,.17,2.9,-2.9,.5,8.5,M.fabric);box(.64,.12,.45,-2.9,.63,7.3,M.cream);box(.78,.07,1.5,-2.91,.62,9.1,mat(0x827c65,.05,1));collider(-2.92,8.5,.82,3.1);
  const sleepTarget=box(.03,.18,.28,-2.44,.72,8.7,M.glow);interactive(sleepTarget,'rest','寝台で少し休む','rest');
  const kit=box(.55,.27,.42,1.99,.3,9.35,M.orange);box(.57,.03,.44,1.99,.45,9.35,M.dark);const kl=label('+ REPAIR',.45,.1,1.99,.32,9.568,'#efdfb8');interactive(kit,'repair-kit','修理キットを持つ','kit');
  for(let i=0;i<9;i++){
    const x=(i%2?1:-1)*(2+random()*.65),z=6.6+random()*3.8;
    const item=box(.17+random()*.23,.18+random()*.15,.18+random()*.2,x,.2,z,i%3?M.cream:M.dark);item.rotation.y=random()*2;W.loose.push({mesh:item,velocity:new T.Vector3(),baseY:item.position.y});
  }
  // Rear safe compartment with a physical closable bulkhead and EVA suit.
  const door=box(2.1,2.65,.16,1.95,1.325,11.9,M.panel);W.safeDoor=door;
  const doorButton=box(.15,.28,.09,-1.25,1.4,11.74,M.dark);box(.08,.055,.01,-1.25,1.46,11.685,M.glow);interactive(doorButton,'safe-door','避難室の隔壁を開閉','safe');
  const innerButton=box(.15,.28,.09,-1.25,1.4,12.08,M.dark);interactive(innerButton,'safe-door','避難室の隔壁を開閉','safe');
  for(const side of [-1,1])box(2.25,3.1,.17,side*2.2,1.55,11.9,M.dark);
  label('SAFE HAVEN / AIRLOCK',2,.22,0,2.94,11.78,'#c3d8ba');
  const suitGroup=new T.Group();suitGroup.position.set(2.45,0,12.75);ship.add(suitGroup);W.suitGroup=suitGroup;
  const torso=box(.56,.64,.36,0,1.18,0,M.cream,suitGroup);const helmet=new T.Mesh(new T.SphereGeometry(.28,20,16),M.cream);helmet.position.set(0,1.76,0);suitGroup.add(helmet);const visor=new T.Mesh(new T.SphereGeometry(.235,20,12,0,Math.PI),mat(0x182e38,.8,.2));visor.position.set(0,1.78,.12);suitGroup.add(visor);
  for(const x of [-.18,.18]){cyl(.13,.1,.7,x,.53,0,M.cream,suitGroup);box(.22,.17,.35,x,.14,.08,M.dark,suitGroup);const arm=cyl(.11,.13,.63,x*2.2,1.1,0,M.cream,suitGroup);arm.rotation.z=x>0?.12:-.12;}box(.31,.35,.13,0,1.24,.24,M.dark,suitGroup);interactive(torso,'suit','宇宙服を着る / 脱ぐ','suit');interactive(helmet,'suit','宇宙服を着る / 脱ぐ','suit');
  // Airlock on the aft end, same door usable from outside.
  const airlock=cyl(1.02,1.02,.2,0,1.25,15.48,M.dark);airlock.rotation.x=Math.PI/2;interactive(airlock,'airlock','エアロック / 船外へ・船内へ','airlock');
  const portal=new T.Mesh(new T.TorusGeometry(.84,.075,10,40),M.orange);portal.position.set(0,1.25,15.61);ship.add(portal);const text=label('EVA / SUIT REQUIRED',1.5,.2,0,1.27,15.35,'#d8bb8e');text.rotation.y=Math.PI;
  const externalDoor=box(.4,.4,.03,0,1.25,15.65,M.orange);interactive(externalDoor,'airlock','B-29 エアロック / 帰船','airlock');
  monitor(-2.6,1.8,13,Math.PI/2,0,1.1,'safe');
  // Beacon station with real frame, solar arrays and drifting telecom nodes.
  const station=W.station=new T.Group();station.position.set(-135,36,-215);scene.add(station);
  const hub=cyl(3,3,12,0,0,0,M.lightPanel,station,16);hub.rotation.z=Math.PI/2;
  for(const x of [-11,11]){beam([0,0,0],[x,0,0],.23,M.pipe,station);box(6,.09,15,x,0,0,mat(0x244858,.6,.5),station);for(let z=-7;z<8;z+=2)box(6,.12,.06,x,.04,z,M.pipe,station);}
  const beacon=new T.Mesh(new T.SphereGeometry(.17,8,8),M.glow);beacon.position.set(0,3,0);station.add(beacon);
  for(let i=0;i<7;i++){const g=new T.Group();g.position.set((random()-.5)*850,(random()-.5)*280,-230-random()*600);scene.add(g);cyl(.5,.5,2,0,0,0,M.lightPanel,g);box(5,.04,1.7,0,0,0,mat(0x234455,.6,.6),g);}
  // Small drifting rocks in the far distance (not a skybox).
  W.distantRocks=[];
  for(let i=0;i<28;i++){const rock=new T.Mesh(new T.IcosahedronGeometry(.25+random()*2.2,0),mat(0x6b7070,.05,1));rock.position.set((random()-.5)*220,(random()-.5)*100,-30-random()*300);rock.rotation.set(random()*3,random()*3,random()*3);scene.add(rock);W.distantRocks.push(rock);}
  // Geometry damage modifies the actual hull vertices and removes facets for breaches.
  W.deformHull=function(damage){
    const p=new T.Vector3(...damage.pos),radius=damage.severity===1?.55:damage.severity===2?1.05:1.5,depth=damage.severity===1?.16:damage.severity===2?.48:.85;
    const inward=new T.Vector3(-p.x,-(p.y-1),0).normalize();
    for(const mesh of W.hull){const arr=mesh.geometry.attributes.position;let changed=false;
      for(let i=0;i<arr.count;i++){const v=new T.Vector3().fromBufferAttribute(arr,i),dist=v.distanceTo(p);if(dist<radius){const f=Math.pow(1-dist/radius,2)*depth;v.addScaledVector(inward,f);v.y+=Math.sin(i*12.8)*f*.25;arr.setXYZ(i,v.x,v.y,v.z);changed=true;}}
      if(changed){if(damage.severity===3){const old=Array.from(mesh.geometry.index.array),next=[];for(let i=0;i<old.length;i+=3){const c=new T.Vector3();for(let j=0;j<3;j++){const vi=old[i+j]*3,orig=mesh.userData.original;c.add(new T.Vector3(orig[vi],orig[vi+1],orig[vi+2]));}c.multiplyScalar(1/3);if(c.distanceTo(p)>.38)next.push(old[i],old[i+1],old[i+2]);}mesh.geometry.setIndex(next);}arr.needsUpdate=true;mesh.geometry.computeVertexNormals();}
    }
    const group=new T.Group();group.position.copy(p).addScaledVector(inward,depth*.75);group.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),inward);ship.add(group);
    const scar=new T.Mesh(new T.CircleGeometry(radius*.47,9),new T.MeshBasicMaterial({color:0x10171b,side:T.DoubleSide}));scar.position.z=.04;group.add(scar);
    for(let i=0;i<9;i++){const a=i/9*Math.PI*2,rr=radius*(.4+random()*.2);beam([Math.cos(a)*.12,Math.sin(a)*.12,.08],[Math.cos(a)*rr,Math.sin(a)*rr,.04],.012,M.black,group);}
    const hot=new T.Mesh(new T.TorusGeometry(radius*.25,.025,6,11),new T.MeshBasicMaterial({color:0xd68a61}));hot.position.z=.06;group.add(hot);
    const target=new T.Mesh(new T.SphereGeometry(.28,12,8),new T.MeshBasicMaterial({color:0xe18b67,transparent:true,opacity:.13,depthWrite:false}));target.position.copy(p).addScaledVector(inward,depth+.12);ship.add(target);interactive(target,'damage-'+damage.id,'船体損傷 / 点検・応急修理','damage');target.userData.damage=damage.id;
    const leakPos=[];for(let i=0;i<38;i++)leakPos.push((random()-.5)*.3,(random()-.5)*.3,random()*2);
    const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(leakPos,3));const leak=new T.Points(geo,new T.PointsMaterial({color:0xc7e2e1,size:.026,transparent:true,opacity:.65,depthWrite:false}));group.add(leak);
    const outerTarget=new T.Mesh(new T.SphereGeometry(.32,12,8),target.material);outerTarget.position.copy(p).addScaledVector(inward,-.12);ship.add(outerTarget);interactive(outerTarget,'damage-'+damage.id,'外板損傷 / 点検・応急封止','damage');outerTarget.userData.damage=damage.id;
    W.damageVisuals.push({id:damage.id,group,target,outerTarget,hot,leak,scar});
    // An impact near the front also fractures the actual windshield plane.
    if(p.z<0){const side=p.x>0?1:-1;for(let i=0;i<7;i++){const pts=[[side*2.2,1.8,-7.055]];for(let j=1;j<4;j++)pts.push([side*2.2+Math.cos(i*.87)*j*.23+(random()-.5)*.1,1.8+Math.sin(i*.87)*j*.26,-7.055]);W.damageCracks.push(tube(pts,.006,new T.MeshBasicMaterial({color:0xaec5ca,transparent:true,opacity:.45})));}}
  };
  W.restoreHull=function(){
    for(const mesh of W.hull){mesh.geometry.attributes.position.array.set(mesh.userData.original);mesh.geometry.attributes.position.needsUpdate=true;mesh.geometry.setIndex(mesh.userData.originalIndex.slice());mesh.geometry.computeVertexNormals();}
    for(const v of W.damageVisuals){for(const obj of [v.group,v.target,v.outerTarget]){ship.remove(obj);obj.traverse(o=>{if(o.geometry)o.geometry.dispose();});}}
    W.damageCracks.forEach(o=>{ship.remove(o);o.geometry.dispose();});W.damageCracks=[];W.damageVisuals=[];
    W.interactables=W.interactables.filter(o=>!o.userData.damage);
  };
  // First-person objects are real 3D meshes attached to the camera.
  const gloves=W.gloves=new T.Group();camera.add(gloves);gloves.visible=false;
  for(const side of [-1,1]){const sleeve=cyl(.055,.07,.29,side*.31,-.34,-.35,M.cream,gloves);sleeve.rotation.x=1.3;const glove=new T.Mesh(new T.SphereGeometry(.072,12,8),M.cream);glove.scale.set(.75,.7,1.15);glove.position.set(side*.3,-.3,-.51);gloves.add(glove);const cuff=cyl(.061,.061,.035,side*.31,-.315,-.44,M.orange,gloves);cuff.rotation.x=1.3;}
  const coffeeGroup=W.coffeeGroup=new T.Group();coffeeGroup.position.set(.29,-.28,-.51);coffeeGroup.rotation.z=-.08;camera.add(coffeeGroup);coffeeGroup.visible=false;
  const mug=new T.Mesh(new T.CylinderGeometry(.091,.078,.16,24,1,true),M.cream);coffeeGroup.add(mug);cyl(.078,.078,.01,0,-.075,0,M.cream,coffeeGroup);cyl(.084,.084,.007,0,.065,0,mat(0x37261b,.1,.65),coffeeGroup);const rim=new T.Mesh(new T.TorusGeometry(.088,.006,8,24),M.cream);rim.rotation.x=Math.PI/2;rim.position.y=.08;coffeeGroup.add(rim);const mugHandle=new T.Mesh(new T.TorusGeometry(.055,.013,8,20),M.cream);mugHandle.position.set(.11,-.006,0);coffeeGroup.add(mugHandle);label('B–29',.1,.04,0,0,.082,'#334d42',coffeeGroup);
  // Batch fixed interior geometry by material, preserving dynamic and interactive meshes.
  // This reduces hundreds of mobile draw calls without replacing the ship with an image.
  ship.updateMatrixWorld(true);
  const excluded=new Set([...W.hull,...W.interactables,...W.loose.map(o=>o.mesh),W.safeDoor]);
  const batches=new Map();const fixed=[];
  ship.traverse(o=>{if(!o.isMesh||excluded.has(o)||!o.geometry.attributes.normal||Array.isArray(o.material)||o.material.transparent)return;for(let p=o.parent;p&&p!==ship;p=p.parent)if(p===camera||p===W.chair||p===W.suitGroup)return;fixed.push(o);});
  for(const o of fixed){let b=batches.get(o.material.uuid);if(!b){b={material:o.material,geos:[],sources:[]};batches.set(o.material.uuid,b);}const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);b.geos.push(g);b.sources.push(o);}
  for(const b of batches.values()){
    if(b.geos.length<2){b.geos.forEach(g=>g.dispose());continue;}
    const total=b.geos.reduce((n,g)=>n+g.attributes.position.count,0),positions=new Float32Array(total*3),normals=new Float32Array(total*3),uvs=new Float32Array(total*2);let offset=0;
    for(const g of b.geos){positions.set(g.attributes.position.array,offset*3);normals.set(g.attributes.normal.array,offset*3);if(g.attributes.uv)uvs.set(g.attributes.uv.array,offset*2);offset+=g.attributes.position.count;g.dispose();}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('normal',new T.BufferAttribute(normals,3));g.setAttribute('uv',new T.BufferAttribute(uvs,2));g.computeBoundingSphere();ship.add(new T.Mesh(g,b.material));for(const o of b.sources){o.removeFromParent();o.geometry.dispose();}
  }
  W.resize=()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();};
  window.addEventListener('resize',W.resize);
  return W;
})();