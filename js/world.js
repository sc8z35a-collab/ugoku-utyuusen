'use strict';
/* Everything visible in space is geometry; canvas textures are drawn locally. */
window.B29 = (() => {
  const W = { interactables: [], colliders: [], hull: [], monitors: [], loose: [], lamps: [], damageVisuals: [], damageCracks: [], movingParts: [], gauges: [], valveWheels: [], fans: [], enginePlumes: [] };
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
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
  const compactGPU=matchMedia('(pointer: coarse)').matches;
  const camera = W.camera = new T.PerspectiveCamera(65, innerWidth / innerHeight, .055, 18000);
  const ship = W.ship = new T.Group(); scene.add(ship); ship.add(camera);
  camera.position.set(0,1.65,-1.15); camera.rotation.order = 'YXZ'; camera.rotation.x = .075;
  const mat = (color, metalness=.25, roughness=.65) => new T.MeshStandardMaterial({color,metalness,roughness});
  const M = W.materials = {
    hull:mat(0xa3aaa5,.38,.48), panel:mat(0x42575b,.45,.43), lightPanel:mat(0xb9b9a9,.23,.46),
    dark:mat(0x182a32,.48,.4), black:mat(0x101c22,.12,.73), floor:mat(0x293c40,.4,.69),
    pipe:mat(0x9caeac,.82,.26), copper:mat(0xaf7b4e,.72,.34), fabric:mat(0x6a827b,.02,.93),
    cream:mat(0xe0d9bd,.12,.38), orange:mat(0xd08b4c,.35,.42), red:mat(0xb95039,.25,.54),
    glow:new T.MeshBasicMaterial({color:0xc9dfba}), amber:new T.MeshBasicMaterial({color:0xe8bc77}),
    cyan:new T.MeshBasicMaterial({color:0x8bbcc4}), glass:new T.MeshPhysicalMaterial({color:0x92b9c8,metalness:.15,roughness:.11,transparent:true,opacity:.065,side:T.DoubleSide,depthWrite:false})
  };
  // Inset chamfers catch light at real object edges, rather than drawing outlines.
  function roundedBox(w,h,d,r){
    const g=new T.BoxGeometry(w,h,d,4,4,4),p=g.attributes.position,n=g.attributes.normal;
    const half=new T.Vector3(w/2,h/2,d/2),inner=half.clone().addScalar(-r),v=new T.Vector3(),q=new T.Vector3();
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p,i);
      for(const axis of ['x','y','z']){const t=v[axis]/half[axis];v[axis]=Math.abs(t)>.75?Math.sign(t)*half[axis]:Math.abs(t)>.25?Math.sign(t)*(half[axis]-r):0;}
      q.copy(v).clamp(inner.clone().negate(),inner);const normal=v.clone().sub(q).normalize();v.copy(q).addScaledVector(normal,r);
      p.setXYZ(i,v.x,v.y,v.z);n.setXYZ(i,normal.x,normal.y,normal.z);
    }
    return g;
  }
  function box(w,h,d,x,y,z,material=M.panel,parent=ship){const min=Math.min(w,h,d),geo=min>=.065?roundedBox(w,h,d,Math.min(.055,min*.2)):new T.BoxGeometry(w,h,d);const a=new T.Mesh(geo,material);a.position.set(x,y,z);parent.add(a);return a;}
  function cyl(r1,r2,length,x,y,z,material=M.pipe,parent=ship,n=24){const a=new T.Mesh(new T.CylinderGeometry(r1,r2,length,n),material);a.position.set(x,y,z);parent.add(a);return a;}
  function tube(points,r=.04,material=M.pipe,parent=ship){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));const mesh=new T.Mesh(new T.TubeGeometry(curve,Math.max(12,points.length*6),r,7,false),material);parent.add(mesh);return mesh;}
  function beam(a,b,r,material=M.dark,parent=ship){const start=new T.Vector3(...a),end=new T.Vector3(...b);const mesh=new T.Mesh(new T.CylinderGeometry(r,r,start.distanceTo(end),8),material);mesh.position.copy(start).add(end).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());parent.add(mesh);return mesh;}
  function texture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return tex;}
  function label(text,w,h,x,y,z,color='#bccbbb',parent=ship){const tex=texture(512,128,(c)=>{c.fillStyle=color;c.font='500 53px monospace';c.textAlign='center';c.textBaseline='middle';c.fillText(text,256,65,495)});const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:tex,transparent:true,side:T.FrontSide,depthWrite:false}));m.position.set(x,y,z);parent.add(m);return m;}
  W.box=box;W.cyl=cyl;W.tube=tube;W.beam=beam;W.label=label;
  function interactive(mesh,id,name,action){mesh.userData={...mesh.userData,interaction:id,name,action};W.interactables.push(mesh);return mesh;}
  W.interactive=interactive;
  function collider(x,z,w,d){W.colliders.push({x,z,w,d});}
  // Soft bounced cabin illumination, with a cold orbital sun.
  scene.add(new T.HemisphereLight(0xa5c5d5,0x161e25,.72));
  const sun=new T.DirectionalLight(0xffefd1,2.8),sunOffset=new T.Vector3(-35,50,-45);sun.position.copy(sunOffset);sun.target=ship;scene.add(sun);
  sun.castShadow=true;sun.shadow.mapSize.setScalar(compactGPU?1024:2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:130});sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;
  scene.onBeforeRender=()=>{sun.position.copy(ship.position).add(sunOffset);sun.updateMatrixWorld();};
  const cabinLight=new T.PointLight(0xb5d5d8,22,17,1.4);cabinLight.position.set(0,3.4,-2);ship.add(cabinLight);
  for(const z of [3,8,12]){const l=new T.PointLight(z===12?0xa9d9dc:0xffd9a7,19,9,1.5);l.position.set(0,3,z);l.userData.dayIntensity=19;ship.add(l);W.lamps.push(l);}
  const screenBounce=new T.PointLight(0x7fc9c2,2.8,4,1.6);screenBounce.position.set(0,1.4,-3.9);ship.add(screenBounce);
  const galleyLight=new T.PointLight(0xffc885,5,3.6,1.5);galleyLight.position.set(-2.65,2.15,1.9);ship.add(galleyLight);
  const readingLight=new T.SpotLight(0xffdda7,38,9,1.05,.7,1.5);readingLight.position.set(-1,3.3,2.7);readingLight.target.position.set(-2.4,.4,3.5);ship.add(readingLight,readingLight.target);readingLight.castShadow=true;readingLight.shadow.mapSize.setScalar(compactGPU?512:1024);readingLight.shadow.bias=-.0003;readingLight.shadow.normalBias=.018;
  // A small procedural reflection environment gives metal and glass a soft sheen.
  const reflections=texture(512,256,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#496779');g.addColorStop(.47,'#8c9d9e');g.addColorStop(.53,'#273940');g.addColorStop(1,'#111a20');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#efe7cd';c.fillRect(45,48,100,17);c.fillStyle='#cadfe1';c.fillRect(300,70,140,12);});
  const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromEquirectangular(reflections).texture;reflections.dispose();pmrem.dispose();
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
    const section=z<0?'01 / FLIGHT DECK':z<7?'02 / HABITAT':z<12?'03 / QUIET QUARTERS':'04 / AIRLOCK';
    label(section,2.4,.22,0,3.7,z-.12,'#a4b1a8').rotation.y=Math.PI;
    label(section,2.4,.22,0,3.7,z+.12,'#a4b1a8');
  }
  // A central monitor sits in the physical dashboard, never in a HUD modal.
  function monitor(x,y,z,ry=0,rx=0,size=1.65,id='main'){
    const group=new T.Group();group.position.set(x,y,z);group.rotation.set(rx,ry,0);ship.add(group);
    box(size+.24,size*.65+.23,.22,0,0,-.11,M.panel,group);
    box(size+.11,size*.625+.09,.04,0,0,-.025,M.black,group);
    for(const sx of [-1,1])for(const sy of [-1,1]){const screw=cyl(.017,.017,.012,sx*(size*.5+.078),sy*(size*.3125+.061),.006,M.pipe,group,8);screw.rotation.x=Math.PI/2;}
    for(let i=0;i<5;i++)box(.045,.007,.018,size*.32+i*.07,-size*.34,.018,M.black,group);
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
  const table=cyl(.65,.65,.09,-1.85,.75,3.55,M.lightPanel,ship,64);cyl(.07,.2,.7,-1.85,.37,3.55,M.dark);collider(-1.85,3.55,1.1,1.1);
  box(.86,.7,.7,-2.65,.38,1.48,M.dark);const maker=box(.52,.65,.39,-2.65,1.05,1.48,M.black);box(.32,.06,.17,-2.65,1.35,1.71,M.pipe);box(.065,.035,.02,-2.48,1.22,1.682,M.glow);interactive(maker,'coffee','コーヒーを淹れる','coffee');
  const cup=cyl(.11,.085,.19,-2.65,.84,1.72,M.cream);const coffee=cyl(.087,.087,.01,-2.65,.94,1.72,mat(0x37271e,.1,.6));
  const handle=new T.Mesh(new T.TorusGeometry(.075,.021,7,14),M.cream);handle.position.set(-2.53,.86,1.72);ship.add(handle);
  label('COFFEE / TAKE IT SLOW',.75,.16,-2.65,1.65,1.7,'#d3c9ad');
  monitor(-3.04,1.93,3.4,Math.PI/2,0,1.47,'living');
  for(let y=1.5;y<2.8;y+=.6){box(.54,.065,1.5,-3.22,y,5.1,M.panel);for(let i=0;i<6;i++){const book=box(.22,.25+random()*.13,.06,-3.18,y+.16,4.54+i*.15,[M.cream,M.fabric,M.orange,M.dark][i%4]);book.rotation.x=(random()-.5)*.1;}}
  const photo=label('HOME · 2041',.52,.18,-3.09,2.68,4.9,'#d1ccac');photo.rotation.y=Math.PI/2;
  // right-side bathroom: enclosure glass, shower pipes, secondary monitor.
  box(1.18,.07,2.5,2.7,.02,3.5,M.lightPanel);collider(3.17,3.5,.25,2.5);
  const showerGlass=box(.035,2.2,2.2,1.95,1.14,4.3,new T.MeshPhysicalMaterial({color:0x90b0b0,transparent:true,opacity:.12,roughness:.16,metalness:.15,side:T.DoubleSide,depthWrite:false}));
  tube([[3.2,.3,3],[3.2,2.4,3],[3.15,2.7,3],[2.7,2.7,3]],.04,M.pipe);
  const shower=cyl(.2,.17,.055,2.7,2.66,3,M.pipe);interactive(shower,'shower','シャワー / 水循環を切り替え','shower');
  const valve=cyl(.14,.14,.06,3.07,1.05,3,M.orange);valve.rotation.z=Math.PI/2;interactive(valve,'shower','シャワーを使う','shower');
  monitor(3.03,1.83,4.8,-Math.PI/2,0,1.3,'bath');
  label('RECYCLED WATER / 98%',1.1,.16,2.7,2.15,1,'#b4cec8');
  const drops=[];for(let i=0;i<90;i++)drops.push(2.7+(random()-.5)*.3,random()*2.5,3+(random()-.5)*.3);
  const dg=new T.BufferGeometry();dg.setAttribute('position',new T.Float32BufferAttribute(drops,3));W.showerDrops=new T.Points(dg,new T.PointsMaterial({color:0xbedbe2,size:.022,transparent:true,opacity:.7}));W.showerDrops.visible=false;ship.add(W.showerDrops);
  // Central floor maintenance access and ladder.
  const hatchPivot=new T.Group();hatchPivot.position.set(0,-.02,4.99);ship.add(hatchPivot);W.hatchPivot=hatchPivot;W.movingParts.push(hatchPivot);
  const hatch=box(2.26,.13,.98,0,0,-.49,M.dark,hatchPivot);W.hatch=hatch;interactive(hatch,'hatch','配管層へ降りる / 床下ハッチ','hatch');
  const hatchText=label('SERVICE / BELOW',1.4,.23,0,.077,-.49,'#d8bd83',hatchPivot);hatchText.rotation.set(-Math.PI/2,0,Math.PI);
  for(const x of [-.97,.97])box(.065,.015,.75,x,.073,-.49,M.orange,hatchPivot);
  for(const x of [-.6,.6]){box(.22,.025,.1,x,.074,-.17,M.pipe,hatchPivot);box(.13,.03,.035,x,.095,-.17,M.black,hatchPivot);}
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
    // The handwheel is assembled below as one animated, interactive group.
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
  const door=new T.Group();door.position.set(1.95,1.325,11.9);ship.add(door);W.safeDoor=door;W.movingParts.push(door);
  box(2.1,2.65,.16,0,0,0,M.panel,door);
  for(const side of [-1,1]){box(1.9,2.4,.04,0,0,side*.095,M.lightPanel,door);box(1.55,.055,.05,0,-.7,side*.125,M.orange,door);box(.045,2.36,.05,-.7,0,side*.125,M.dark,door);box(.045,2.36,.05,.7,0,side*.125,M.dark,door);const inscription=label('PRESSURE BULKHEAD',1.4,.13,0,.85,side*.123,'#253e43',door);inscription.rotation.y=side<0?Math.PI:0;}
  for(const z of [11.72,12.08]){box(2.4,.14,.12,0,2.73,z,M.dark);box(1.95,.015,.025,0,2.655,z,M.cyan);}
  const doorButton=box(.15,.28,.09,-1.25,1.4,11.74,M.dark);box(.08,.055,.01,-1.25,1.46,11.685,M.glow);interactive(doorButton,'safe-door','避難室の隔壁を開閉','safe');
  const innerButton=box(.15,.28,.09,-1.25,1.4,12.08,M.dark);interactive(innerButton,'safe-door','避難室の隔壁を開閉','safe');
  for(const side of [-1,1])box(2.25,3.1,.17,side*2.2,1.55,11.9,M.dark);
  label('SAFE HAVEN / AIRLOCK',2,.22,0,2.94,11.78,'#c3d8ba').rotation.y=Math.PI;
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
  // Close-range craftsmanship. All artwork is locally drawn, not downloaded imagery.
  // Reuse tiled materials and a single instrument atlas so detail stays inexpensive.
  function surface(kind){
    return texture(512,512,(c,w,h)=>{
      c.fillStyle=kind==='fabric'?'#d9ddd3':kind==='floor'?'#a7b4b0':'#dee2de';c.fillRect(0,0,w,h);
      for(let i=0;i<8500;i++){const x=hash(i,11)*w,y=hash(i,27)*h,v=hash(i,39);c.fillStyle=v>.5?'rgba(255,255,241,.065)':'rgba(16,30,32,.08)';c.fillRect(x,y,kind==='metal'?12:2,1);}
      if(kind==='fabric'){
        for(let i=0;i<w;i+=4){c.fillStyle='#25383018';c.fillRect(i,0,1,h);c.fillStyle='#fbf4d51c';c.fillRect(0,i,w,1);}
        c.strokeStyle='#394a3f60';c.lineWidth=3;c.strokeRect(15,15,482,482);c.setLineDash([4,5]);c.lineWidth=1;c.strokeStyle='#f0ead1';c.strokeRect(20,20,472,472);
      }else if(kind==='floor'){
        for(let y=12;y<h;y+=24)for(let x=12;x<w;x+=24){c.strokeStyle='#273a3666';c.lineWidth=3;c.beginPath();c.moveTo(x-4,y+4);c.lineTo(x+4,y-4);c.stroke();}
        c.strokeStyle='#14262490';c.lineWidth=6;c.strokeRect(3,3,506,506);
        for(const x of [17,495])for(const y of [17,495]){c.fillStyle='#263833';c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();}
      }else{
        c.strokeStyle='#394c4660';c.lineWidth=2;c.strokeRect(4,4,504,504);c.strokeStyle='#ffffff30';c.strokeRect(7,7,498,498);
        for(const x of [18,494])for(const y of [18,494]){c.fillStyle='#31433e';c.beginPath();c.arc(x,y,4,0,Math.PI*2);c.fill();c.fillStyle='#d6dad0';c.fillRect(x-2,y-.5,4,1);}
        for(let i=0;i<100;i++){const x=hash(i,9)*512,y=hash(i,15)>.5?8:502;c.strokeStyle='#293c392b';c.beginPath();c.moveTo(x,y);c.lineTo(x+hash(i,4)*15,y+(hash(i,3)-.5)*10);c.stroke();}
      }
    });
  }
  const metalSurface=surface('metal'),fabricSurface=surface('fabric'),floorSurface=surface('floor');
  for(const material of [M.hull,M.panel,M.lightPanel,hullMat]){material.map=metalSurface;material.bumpMap=metalSurface;material.bumpScale=.009;material.needsUpdate=true;}
  M.floor.map=floorSurface;M.floor.bumpMap=floorSurface;M.floor.bumpScale=.013;M.floor.needsUpdate=true;
  M.fabric.map=fabricSurface;M.fabric.bumpMap=fabricSurface;M.fabric.bumpScale=.018;M.fabric.needsUpdate=true;
  const insulation=mat(0xd3c6a8,.03,.91);insulation.map=fabricSurface;insulation.bumpMap=fabricSurface;insulation.bumpScale=.025;
  const leather=mat(0x985936,.05,.77);leather.map=fabricSurface;
  const rubber=mat(0x202b2b,.05,.94),brass=mat(0xc19a5e,.62,.42),sage=mat(0x496b54,.05,.91);
  const solarCell=mat(0x203c60,.65,.32);
  solarCell.map=texture(256,256,c=>{c.fillStyle='#93aacb';c.fillRect(0,0,256,256);for(let y=2;y<256;y+=32){c.fillStyle='#304b80';c.fillRect(2,y,252,29);for(let x=5;x<256;x+=9){c.fillStyle='#a5b5d35c';c.fillRect(x,y,1,29);}}});
  // Atlas tiles include real scale markings, warning strips, barcodes and serials.
  const atlasCanvas=document.createElement('canvas');atlasCanvas.width=2048;atlasCanvas.height=2048;
  const atlasContext=atlasCanvas.getContext('2d');const atlasTexture=new T.CanvasTexture(atlasCanvas);atlasTexture.colorSpace=T.SRGBColorSpace;atlasTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
  const atlasMaterial=new T.MeshBasicMaterial({map:atlasTexture});let tileCount=0;const tiles=new Map();
  function decal(title,sub,w,h,x,y,z,ry=0,rx=0,parent=ship,type='label'){
    const key=title+'|'+sub+'|'+type;let tile=tiles.get(key);
    if(tile===undefined){
      if(tileCount>=64)throw new Error('Instrument atlas capacity exceeded');
      tile=tileCount++;tiles.set(key,tile);const c=atlasContext,ox=(tile%8)*256,oy=Math.floor(tile/8)*256;c.save();c.translate(ox,oy);
      c.fillStyle=type==='note'?'#d7cba6':'#17292d';c.fillRect(0,0,256,256);
      if(type==='dial'){
        c.fillStyle='#e1ddc5';c.beginPath();c.arc(128,128,120,0,Math.PI*2);c.fill();
        c.strokeStyle='#263c39';for(let i=0;i<=40;i++){const a=.75*Math.PI+i/40*1.5*Math.PI,r=i%5===0?83:92;c.lineWidth=i%5===0?3:1;c.beginPath();c.moveTo(128+Math.cos(a)*r,128+Math.sin(a)*r);c.lineTo(128+Math.cos(a)*105,128+Math.sin(a)*105);c.stroke();}
        c.strokeStyle='#ad633f';c.lineWidth=5;c.beginPath();c.arc(128,128,110,5.1,5.55);c.stroke();c.fillStyle='#263c39';c.beginPath();c.arc(128,128,9,0,Math.PI*2);c.fill();c.textAlign='center';c.font='bold 20px monospace';c.fillText(title,128,181);c.font='15px monospace';c.fillText(sub,128,205);
      }else if(type==='photo'){
        c.fillStyle='#89a9af';c.fillRect(16,16,224,180);c.fillStyle='#e9dba8';c.beginPath();c.arc(187,56,23,0,Math.PI*2);c.fill();
        for(let i=0;i<3;i++){c.fillStyle=['#788b77','#566f65','#324f49'][i];c.beginPath();c.moveTo(16,196);for(let x=16;x<=240;x+=16)c.lineTo(x,92+i*24+Math.sin(x*.025+i)*19);c.lineTo(240,196);c.fill();}c.fillStyle='#e7dbb9';c.font='18px monospace';c.fillText(title,20,224);c.font='12px monospace';c.fillText(sub,20,243);
      }else{
        c.strokeStyle=type==='note'?'#74694c':'#75908b';c.lineWidth=2;c.strokeRect(10,10,236,236);c.fillStyle=type==='note'?'#514e3c':'#c2d2bb';c.font='bold 24px monospace';c.fillText(title,22,55,214);c.font='15px monospace';c.fillText(sub,22,86,214);
        c.fillStyle=type==='note'?'#776c50':'#678880';for(let i=0;i<4;i++)c.fillRect(22,110+i*15,125+(i%3)*24,2);
        if(type==='warning'){for(let i=0;i<12;i++){c.fillStyle=i%2?'#24312c':'#d2a765';c.fillRect(12+i*19.3,176,19.3,24);}}
        else{c.strokeStyle=type==='note'?'#9e8d65':'#78978c';c.beginPath();c.moveTo(22,173);for(let i=0;i<22;i++)c.lineTo(22+i*9,172-Math.sin(i*.6)*13);c.stroke();}
        c.fillStyle=type==='note'?'#71644c':'#abc0ad';for(let i=0;i<38;i++)if(hash(i,tile)>.3)c.fillRect(22+i*3,211,1+(i%2),18);c.font='12px monospace';c.fillText('B29 / '+String(tile+1).padStart(3,'0'),149,225);
      }
      c.restore();atlasTexture.needsUpdate=true;
    }
    const geo=new T.PlaneGeometry(w,h),uv=geo.attributes.uv;
    for(let i=0;i<uv.count;i++)uv.setXY(i,((tile%8)+(uv.getX(i)*.984+.008))/8,1-(Math.floor(tile/8)+(1-uv.getY(i))*.984+.008)/8);
    const mesh=new T.Mesh(geo,atlasMaterial);mesh.position.set(x,y,z);mesh.rotation.set(rx,ry,0);parent.add(mesh);return mesh;
  }
  function bolt(x,y,z,parent=ship){const b=cyl(.024,.024,.018,x,y,z,M.pipe,parent,6);b.rotation.x=Math.PI/2;return b;}
  function facePanel(x,y,z,w,h,ry,title,sub,type='label'){
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;ship.add(g);box(w,h,.065,0,0,0,M.dark,g);decal(title,sub,w*.88,h*.82,0,0,.034,0,0,g,type);
    for(const sx of [-1,1])for(const sy of [-1,1])bolt(sx*(w/2-.04),sy*(h/2-.04),.041,g);return g;
  }
  function gauge(x,y,z,r,ry,title,sub,parent=ship){
    const g=new T.Group();g.position.set(x,y,z);g.rotation.y=ry;parent.add(g);
    const body=cyl(r*1.1,r*1.1,.055,0,0,0,M.pipe,g,24);body.rotation.x=Math.PI/2;
    const dial=decal(title,sub,r*1.82,r*1.82,0,0,.03,0,0,g,'dial');
    // Crop the atlas into a circle: no square sticker protrudes beyond the bezel.
    const oldUV=dial.geometry.attributes.uv,u0=oldUV.getX(0),u1=oldUV.getX(1),v0=oldUV.getY(2),v1=oldUV.getY(0);dial.geometry.dispose();dial.geometry=new T.CircleGeometry(r*.95,40);const uv=dial.geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,u0+(u1-u0)*uv.getX(i),v0+(v1-v0)*uv.getY(i));
    const ring=new T.Mesh(new T.TorusGeometry(r,.017,8,40),brass);ring.position.z=.04;g.add(ring);
    const needle=new T.Group();needle.position.z=.047;g.add(needle);beam([0,-r*.15,0],[0,r*.68,0],r*.028,M.red,needle);const hub=cyl(r*.1,r*.1,.015,0,0,.006,M.dark,needle);hub.rotation.x=Math.PI/2;needle.rotation.z=-.55;W.gauges.push(needle);W.movingParts.push(needle);
    const cover=new T.Mesh(new T.CircleGeometry(r*.93,32),M.glass);cover.position.z=.065;g.add(cover);return g;
  }
  const contactTexture=texture(128,128,(c,w,h)=>{const g=c.createRadialGradient(64,64,4,64,64,64);g.addColorStop(0,'rgba(4,12,13,.54)');g.addColorStop(.65,'rgba(4,12,13,.26)');g.addColorStop(1,'rgba(4,12,13,0)');c.fillStyle=g;c.fillRect(0,0,w,h);});
  const contactMaterial=new T.MeshBasicMaterial({map:contactTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  function contact(x,z,w,d,y=.009){const m=new T.Mesh(new T.PlaneGeometry(w,d),contactMaterial);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);ship.add(m);}
  for(const [x,z,w,d] of [[-2.9,3.3,1.45,4],[-1.85,3.55,1.7,1.7],[-2.9,8.5,1.4,3.6],[3.05,7.6,1.5,2.8],[0,-.65,1.6,1.7],[0,-4.8,4.6,1.7]])contact(x,z,w,d);
  // Layered cockpit sill, rubber gaskets, locking hardware and sunshade tracks.
  beam([-3.68,.52,-7.04],[3.68,.52,-7.04],.055,rubber);
  for(const side of [-1,1]){
    beam([side*3.61,.5,-7.02],[side*3.05,3.61,-7.02],.045,rubber);
    for(let i=0;i<9;i++)bolt(side*(3.59-i*.058),.62+i*.34,-6.965);
    tube([[side*3.38,.72,-6.8],[side*3.38,.82,-5.6],[side*2.96,.83,-5.1],[side*2.96,.81,-3.2]],.025,rubber);
    box(.14,.11,2.6,side*2.9,3.73,-5.2,M.panel);for(let i=0;i<9;i++)box(.15,.023,.11,side*2.9,3.665,-6.3+i*.26,M.black);
    // Switchbank geometry sits outside the clickable flight display envelope.
    for(let row=0;row<3;row++)for(let col=0;col<5;col++){
      const x=side*2.63+(col-2)*.15,z=-5.15+row*.38;
      box(.115,.012,.27,x,1.042,z,M.black);const base=cyl(.04,.04,.025,x,1.063,z,M.pipe);beam([x,1.075,z],[x,1.145,z+.035],.012,M.cream);
      box(.04,.014,.035,x,1.06,z-.08,row===2?M.amber:M.glow);
    }
    for(let j=0;j<4;j++){const knob=cyl(.053,.053,.055,side*2.63+(j-1.5)*.18,1.077,-3.6,M.dark);box(.012,.008,.032,knob.position.x,1.109,-3.6,M.cream);}
    facePanel(side*2.68,1.02,-5.96,.7,.39,side<0?.24:-.24,side<0?'RCS / PORT':'RCS / STBD','MANUAL OVERRIDE');
    for(let i=0;i<4;i++)bolt(side*1.69,.4,-4.326-i*.005);
    gauge(side*1.69,.93,-4.4,.115,0,side<0?'CABIN':'BUS A',side<0?'101 kPa':'28.4 V');
  }
  facePanel(0,3.72,-5.35,1.32,.39,0,'B–29 / FLIGHT','INDEPENDENT VESSEL  /  2041');
  for(const side of [-1,1]){const g=facePanel(side*1.05,3.63,-5.25,.52,.36,0,'CAUTION','CHECK SEALS','warning');for(let i=0;i<3;i++)box(.055,.035,.025,-.16+i*.16,-.105,.05,i===2?M.amber:M.glow,g);}
  // Padded ceiling cassettes and restrained service conduits follow the curved hull.
  for(let z=-2;z<13;z+=1.8){
    box(1.65,.14,1.62,0,4.22,z,insulation);
    for(const side of [-1,1]){const pad=box(1.12,.12,1.6,side*1.48,3.93,z,insulation);pad.rotation.z=-side*.32;box(.07,.07,1.65,side*.87,4.12,z,M.dark);}
  }
  for(const side of [-1,1]){
    for(let i=0;i<3;i++)tube([[side*(2.35+i*.085),3.27,-2.7],[side*(2.44+i*.085),3.32,1],[side*(2.44+i*.085),3.32,10.6],[side*2.3,3.1,13.5]],.021,i===1?M.copper:rubber);
    for(let z=-2;z<13;z+=1.2){box(.38,.06,.065,side*2.5,3.32,z,M.pipe);}
    // Lower sidewall rails and individually framed access panels.
    for(let z=1.7;z<11;z+=1.8){
      box(.045,.31,1.5,side*3.49,.32,z,M.dark);box(.047,.23,1.36,side*3.46,.32,z,M.panel);
      beam([side*3.35,2.64,z-.64],[side*3.35,2.64,z+.64],.027,brass);
      for(const dz of [-.59,.59])box(.1,.12,.08,side*3.39,2.64,z+dz,M.dark);
    }
  }
  // Navigation labels face both directions, not just the departing camera.
  for(const [z,title,sub] of [[.66,'02 / HABITAT','GALLEY  /  HYGIENE'],[6.0,'03 / QUARTERS','REST  /  ENGINEERING'],[10.65,'04 / AIRLOCK','SAFE HAVEN  /  EVA']]){
    facePanel(-2.45,1.85,z-.015,1.05,.42,Math.PI,title,sub);
    facePanel(2.45,1.85,z-.015,1.05,.42,Math.PI,title,sub);
    for(const side of [-1,1]){for(let i=0;i<5;i++)box(.13,.025,.1,side*1.83,.24+i*.14,z,M.orange);}
  }
  // Visible load paths: articulated monitor mounts and triangular shelf brackets.
  for(const m of W.monitors){if(['main','aux'].includes(m.id))continue;const g=m.screen.parent;box(.25,.24,.06,0,0,-.48,M.panel,g);beam([0,0,-.18],[0,-.08,-.43],.035,M.pipe,g);}
  for(const z of [2.0,2.4,4.65,5.55])for(const y of z<3?[1.28]:[1.5,2.1,2.7]){beam([-3.56,y-.27,z],[-3.02,y-.04,z],.022,M.dark);box(.06,.34,.09,-3.53,y-.15,z,M.panel);}
  function cushion(w,h,d,x,y,z,material){
    const radius=Math.min(.07,h*.35),shape=new T.Shape();shape.moveTo(-w/2+radius,-d/2);shape.lineTo(w/2-radius,-d/2);shape.quadraticCurveTo(w/2,-d/2,w/2,-d/2+radius);shape.lineTo(w/2,d/2-radius);shape.quadraticCurveTo(w/2,d/2,w/2-radius,d/2);shape.lineTo(-w/2+radius,d/2);shape.quadraticCurveTo(-w/2,d/2,-w/2,d/2-radius);shape.lineTo(-w/2,-d/2+radius);shape.quadraticCurveTo(-w/2,-d/2,-w/2+radius,-d/2);
    const geo=new T.ExtrudeGeometry(shape,{depth:h-2*radius,bevelEnabled:true,bevelThickness:radius,bevelSize:radius,bevelSegments:3,steps:1,curveSegments:5});geo.center();geo.rotateX(-Math.PI/2);const mesh=new T.Mesh(geo,material);mesh.position.set(x,y,z);ship.add(mesh);return mesh;
  }
  // Lounge: stitched cushions, restrained luggage, reading material and a tiny garden.
  for(let i=0;i<3;i++){
    cushion(.78,.17,1.04,-2.91,.749,2.14+i*1.12,M.fabric);
    const backrest=cushion(.62,.16,1.0,-3.16,1.14,2.14+i*1.12,M.fabric);backrest.rotation.z=Math.PI/2-.1;
    for(const dz of [-.49,.49])beam([-3.24,.79,2.14+i*1.12+dz],[-2.55,.79,2.14+i*1.12+dz],.008,leather);
  }
  const pillow=cushion(.35,.26,.52,-3.02,.97,4.3,leather);pillow.rotation.z=-.3;
  for(let i=0;i<5;i++)beam([-3.18,.997,4.09+i*.09],[-2.94,1.074,4.09+i*.09],.004,insulation);
  const journal=box(.37,.035,.49,-1.86,.821,3.58,leather);journal.rotation.y=.2;
  const notes=decal('FLIGHT NOTES','KAITO / 2041',.32,.42,-1.86,.84,3.58,0,-Math.PI/2,ship,'note');notes.rotateZ(-.2);
  contact(-2.08,3.29,.29,.29,.801);contact(-1.86,3.58,.48,.6,.799);
  beam([-1.57,.823,3.46],[-1.62,.823,3.78],.009,brass);
  cyl(.13,.13,.009,-2.08,.803,3.29,M.copper);const mug2=cyl(.087,.069,.17,-2.08,.892,3.29,M.cream);cyl(.073,.073,.007,-2.08,.979,3.29,M.black);
  const mh=new T.Mesh(new T.TorusGeometry(.055,.013,6,16),M.cream);mh.position.set(-1.986,.91,3.29);ship.add(mh);
  // Coffee maker front: drip grille, bean hopper, service display and plumbing.
  cyl(.15,.13,.045,-2.65,1.4,1.46,rubber);cyl(.16,.16,.028,-2.65,1.62,1.46,M.pipe);
  for(let i=0;i<7;i++)box(.023,.01,.16,-2.81+i*.049,.765,1.72,M.pipe);
  decal('BREW / 92°C','FILTER 04 / READY',.3,.16,-2.69,1.17,1.681);
  tube([[-2.87,.74,1.4],[-2.99,.72,1.4],[-3.05,.53,1.8],[-3.05,.34,1.8]],.018,M.copper);
  facePanel(-3.16,2.3,2.04,.61,.65,Math.PI/2,'HOME','35°41 N / 139°41 E','photo');
  facePanel(-3.15,2.22,2.75,.38,.44,Math.PI/2,'REMEMBER','WATER THE BASIL','note');
  box(.44,.045,.52,-3.12,1.28,2.2,M.panel);cyl(.12,.085,.22,-3.11,1.41,2.2,leather);cyl(.11,.11,.012,-3.11,1.524,2.2,M.black);
  for(let i=0;i<9;i++){const a=i*2.4,h=.13+hash(i,92)*.22;beam([-3.11,1.52,2.2],[-3.11+Math.cos(a)*.11,1.52+h,2.2+Math.sin(a)*.11],.006,sage);const leaf=new T.Mesh(new T.SphereGeometry(.08,8,6),sage);leaf.scale.set(.5,.18,1);leaf.position.set(-3.11+Math.cos(a)*.12,1.52+h,2.2+Math.sin(a)*.12);leaf.rotation.set(.3,a,.4);ship.add(leaf);}
  for(let y=1.5;y<2.8;y+=.6)for(let i=0;i<6;i++){
    box(.008,.21,.041,-3.064,y+.16,4.54+i*.15,M.cream);for(const yy of [-.065,.065])box(.009,.012,.046,-3.058,y+.16+yy,4.54+i*.15,M.dark);
  }
  // Hygienic wall cladding, drain, mixer, towel, mirror and captured toiletries.
  box(.055,1.97,2.22,3.31,1.18,3.8,M.lightPanel);
  for(let z=2.8;z<4.9;z+=.35)box(.006,1.95,.007,3.278,1.18,z,M.panel);
  for(let y=.25;y<2.2;y+=.33)box(.006,.007,2.2,3.274,y,3.8,M.panel);
  box(.48,.014,.46,2.68,.071,3.5,M.dark);for(let i=0;i<8;i++)box(.025,.009,.42,2.475+i*.058,.082,3.5,M.pipe);
  beam([2.07,.17,3.13],[2.07,2.15,3.13],.025,M.pipe);beam([2.07,.17,5.3],[2.07,2.15,5.3],.025,M.pipe);
  beam([1.91,1.05,4.93],[1.91,1.49,4.93],.018,brass);
  facePanel(3.243,2.27,3.55,.63,.26,-Math.PI/2,'WATER LOOP','RECOVERY 98%');
  gauge(3.09,1.48,3,.105,-Math.PI/2,'H₂O','2.4 bar');
  box(.34,.03,.57,3.1,1.14,4.24,M.dark);
  for(let i=0;i<3;i++){cyl(.046,.039,.16,3.07,1.235,4.06+i*.15,i===1?M.orange:M.cream);cyl(.022,.022,.025,3.07,1.329,4.06+i*.15,M.dark);}
  beam([2.29,1.9,5.87],[3.05,1.9,5.87],.023,M.pipe);box(.46,.58,.04,2.63,1.65,5.85,insulation);
  // Berth and engineering: blanket seams, safety straps and service equipment.
  for(let i=0;i<8;i++)box(.76,.012,.017,-2.91,.663,8.45+i*.15,insulation);
  box(.052,.025,2.5,-2.68,.683,8.62,leather);box(.095,.024,.12,-2.68,.708,8.9,M.pipe);
  facePanel(-3.17,1.6,8.22,.7,.47,Math.PI/2,'PERSONAL','KAITO / CREW 01','photo');
  facePanel(-3.19,2.35,9.1,.42,.46,Math.PI/2,'CHECKLIST','AIR / WATER / HOME','note');
  box(.42,.043,.73,-3.04,1.11,7.2,M.panel);box(.04,.29,.04,-3.12,1.28,7.23,M.pipe);box(.29,.055,.16,-3.0,1.43,7.23,M.dark);box(.23,.008,.12,-3.0,1.397,7.23,M.amber);
  gauge(-3.14,2.05,7.4,.19,Math.PI/2,'24 h','SHIP TIME');
  for(let i=0;i<2;i++){
    facePanel(2.69,2.22,7.05+i*1.05,.58,.27,-Math.PI/2,'ASPHALT','COMPUTE / 0'+(i+1));
    for(let j=0;j<4;j++){const z=6.82+i*1.05+j*.13;tube([[2.68,.4,z],[2.57,.48,z],[2.56,1.14,z],[2.68,1.22,z]],.009,j%2?M.copper:rubber);}
  }
  const toolPanel=facePanel(3.24,1.65,9.66,1.15,1.26,-Math.PI/2,'FIELD REPAIR','RETURN TO RACK');
  for(let i=0;i<4;i++){beam([-.37+i*.23,-.35,.075],[-.37+i*.23,.02,.075],.019,M.pipe,toolPanel);box(.075,.19,.04,-.37+i*.23,-.28,.08,i%2?M.orange:rubber,toolPanel);}
  // Service deck: flange bolt circles, thermal jackets, labels and pressure dials.
  for(const side of [-1,1])for(let z=.6;z<13;z+=1.9){
    for(let i=0;i<3;i++){
      const x=side*(.9+i*.45),y=-.57-i*.22;
      const flange=cyl(i===0?.135:.083,i===0?.135:.083,.07,x,y,z,M.dark);flange.rotation.x=Math.PI/2;
      for(let j=0;j<6;j++){const a=j/6*Math.PI*2;const b=bolt(x+Math.cos(a)*(i===0?.108:.066),y+Math.sin(a)*(i===0?.108:.066),z+.042);b.scale.setScalar(.55);}
      const band=cyl(i===0?.09:.05,i===0?.09:.05,.12,x,y,z+.21,i===1?M.orange:M.cream);band.rotation.x=Math.PI/2;
    }
    box(.045,.09,1.42,side*1.87,-1.8,z,M.panel);
  }
  for(let i=0;i<6;i++){
    const side=i%2?1:-1,z=.8+i*1.9;
    gauge(side*1.06,-.65,z,.12,side<0?Math.PI/2:-Math.PI/2,i%2?'COOLANT':'O₂',i%2?'2.4 bar':'101 kPa');
    facePanel(side*1.065,-1.55,z,.36,.2,side<0?Math.PI/2:-Math.PI/2,'LINE 0'+(i+1),i%2?'THERMAL RETURN':'LIFE SUPPORT');
    // The visible handwheel is a usable surface, not an obstacle in front of its node.
    const hub=cyl(.045,.045,.055,side*1.115,-1.15,z,M.orange);hub.rotation.z=Math.PI/2;
    interactive(hub,'pipe-wheel-'+i,'配管 '+String(i+1).padStart(2,'0')+' / 点検・修理','pipe').userData.node=i;
    for(let k=0;k<4;k++){const a=k*Math.PI/2;const spoke=beam([side*1.115,-1.15,z],[side*1.115,-1.15+Math.cos(a)*.12,z+Math.sin(a)*.12],.012,M.orange);interactive(spoke,'pipe-wheel-'+i,'配管 '+String(i+1).padStart(2,'0')+' / 点検・修理','pipe').userData.node=i;}
  }
  // Rear compartment: tank straps, hatch dogs and glove-friendly handrails.
  for(const x of [-.55,.55]){cyl(.19,.19,1.38,x,.99,13.92,insulation);for(const y of [.5,1.42])cyl(.2,.2,.075,x,y,13.92,M.dark);cyl(.055,.055,.13,x,1.73,13.92,brass);}
  facePanel(-.55,1.01,13.705,.25,.44,Math.PI,'O₂','RESERVE / 01','warning');
  for(const side of [-1,1])beam([side*.99,.54,14.4],[side*.99,2.0,14.4],.036,M.orange);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2;box(.09,.12,.08,Math.cos(a)*.91,1.25+Math.sin(a)*.91,15.31,M.pipe);}
  // The suit is still a removable interactive group; never bake its details.
  for(const side of [-1,1]){for(const y of [.55,.66,1.03])cyl(.136,.136,.027,side*.18,y,0,M.panel,suitGroup);box(.07,.54,.028,side*.2,1.22,.2,M.orange,suitGroup);}
  box(.4,.5,.19,0,1.2,-.23,M.panel,suitGroup);decal('B–29','EVA / KAITO',.24,.18,0,1.28,.311,0,0,suitGroup);
  tube([[-.19,1.13,.27],[-.38,.97,.26],[-.38,.85,.03],[-.26,.99,-.22]],.024,brass,suitGroup);
  // Exterior surface equipment follows the hull curvature; damage plates stay separate.
  for(const side of [-1,1]){
    for(let z=-2.9;z<13;z+=2){
      const pod=box(.13,.64,1.14,side*3.78,1.52,z,M.dark);box(.045,.5,.99,side*3.866,1.52,z,M.panel);
      for(let j=0;j<7;j++)box(.05,.024,.72,side*3.898,1.31+j*.064,z,M.black);
      beam([side*3.97,2.04,z-.43],[side*3.97,2.04,z+.43],.026,brass);
      for(const dz of [-.43,.43])beam([side*3.72,2.04,z+dz],[side*3.97,2.04,z+dz],.025,M.pipe);
    }
    for(let i=0;i<3;i++){
      box(.78,.09,2.7,side*(1.06+i*.78),4.05-i*.25,9.4,M.dark);
      for(let j=0;j<14;j++)box(.72,.035,.043,side*(1.06+i*.78),4.105-i*.25,8.15+j*.19,M.pipe);
    }
    for(let j=0;j<6;j++)for(let k=0;k<4;k++)box(.78,.012,.82,side*(4.68+k*.86),1.552,6.63+j*.92,solarCell);
    beam([side*3.4,.85,7],[side*6,1.43,8.8],.07,M.dark);
    facePanel(side*3.83,1.1,3.75,1.25,.44,side*Math.PI/2,'B–29 / 2041','INDEPENDENT / NO STEP','warning');
    for(const z of [-2.6,12.5]){
      box(.48,.48,.65,side*3.62,1.08,z,M.dark);
      for(const dz of [-.15,.15]){const thruster=cyl(.12,.17,.31,side*3.97,1.08,z+dz,brass);thruster.rotation.z=Math.PI/2;const mouth=cyl(.089,.089,.012,side*4.131,1.08,z+dz,M.black);mouth.rotation.z=Math.PI/2;}
    }
  }
  for(const x of [-2.2,2.2]){
    for(const z of [14.15,14.6,15.7,16.25]){const ring=new T.Mesh(new T.TorusGeometry(.76,.045,7,32),M.pipe);ring.position.set(x,-.6,z);ship.add(ring);}
    for(let i=0;i<12;i++){const a=i/12*Math.PI*2;beam([x+Math.cos(a)*.74,-.6+Math.sin(a)*.74,14.3],[x+Math.cos(a)*.68,-.6+Math.sin(a)*.68,16.48],.023,M.panel);}
    const nozzle=new T.Mesh(new T.CylinderGeometry(.52,.72,.38,32,1,true),rubber);nozzle.rotation.x=Math.PI/2;nozzle.position.set(x,-.6,16.65);ship.add(nozzle);
    const lip=new T.Mesh(new T.TorusGeometry(.71,.035,8,32),brass);lip.position.set(x,-.6,16.84);ship.add(lip);
  }
  // Hero objects: distinct silhouettes, manufactured seams and working mechanisms.
  function ring(r,t,x,y,z,material,parent=ship){const m=new T.Mesh(new T.TorusGeometry(r,t,8,40),material);m.position.set(x,y,z);parent.add(m);return m;}
  function orb(rx,ry,rz,x,y,z,material,parent=ship){const m=new T.Mesh(new T.SphereGeometry(1,24,16),material);m.scale.set(rx,ry,rz);m.position.set(x,y,z);parent.add(m);return m;}
  function lathe(profile,x,y,z,material,parent=ship){const m=new T.Mesh(new T.LatheGeometry(profile.map(p=>new T.Vector2(...p)),40),material);m.position.set(x,y,z);parent.add(m);return m;}
  const enamel=new T.MeshPhysicalMaterial({color:0xd7d1b8,metalness:.16,roughness:.32,clearcoat:.3,clearcoatRoughness:.24});
  const upholstery=mat(0x9f603f,.02,.85);upholstery.map=fabricSurface;upholstery.bumpMap=fabricSurface;upholstery.bumpScale=.007;
  const blueSteel=mat(0x344e60,.55,.33);
  // Coffee station is a small enamel appliance, not a black cuboid.
  maker.material=blueSteel;
  for(const side of [-1,1]){
    const cheek=box(.08,.62,.42,-2.65+side*.247,1.075,1.48,enamel);interactive(cheek,'coffee','コーヒーを淹れる','coffee');
    box(.09,.027,.31,-2.65+side*.247,.754,1.51,M.black);
    for(let i=0;i<5;i++)box(.009,.013,.13,-2.65+side*.29,1.03+i*.045,1.41,M.dark);
  }
  box(.43,.08,.42,-2.65,1.35,1.48,enamel);
  const brewHead=lathe([[.06,0],[.075,.025],[.075,.06],[.11,.07],[.11,.09],[.09,.12]],-2.65,1.0,1.71,M.pipe);interactive(brewHead,'coffee','コーヒーを淹れる','coffee');
  beam([-2.64,1.025,1.72],[-2.39,1.025,1.72],.028,M.black);
  const brewButton=cyl(.035,.035,.02,-2.47,1.24,1.708,M.orange);brewButton.rotation.x=Math.PI/2;interactive(brewButton,'coffee','抽出 / コーヒーを淹れる','coffee');
  ring(.04,.009,-2.47,1.24,1.723,M.pipe);
  const hopperGlass=new T.MeshPhysicalMaterial({color:0xa0c2b9,metalness:0,roughness:.14,transparent:true,opacity:.22,depthWrite:false});
  cyl(.153,.133,.18,-2.65,1.51,1.46,hopperGlass);
  for(let i=0;i<18;i++){const a=i*2.4,rr=.1*Math.sqrt(hash(i,51));orb(.018,.012,.026,-2.65+Math.cos(a)*rr,1.53+hash(i,17)*.052,1.46+Math.sin(a)*rr,M.copper);}
  label('KETTLE / 07',.25,.042,-2.65,1.321,1.694,'#29464a');
  const brewFlow=cyl(.007,.007,.088,-2.65,.986,1.72,mat(0x472a14,.05,.34));brewFlow.visible=false;W.movingParts.push(brewFlow);W.brewFlow=brewFlow;
  const steamTexture=texture(64,64,c=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(225,239,226,.42)');g.addColorStop(.45,'rgba(225,239,226,.16)');g.addColorStop(1,'rgba(225,239,226,0)');c.fillStyle=g;c.fillRect(0,0,64,64);});
  const steam=new T.Group();ship.add(steam);W.movingParts.push(steam);W.brewSteam=steam;steam.visible=false;
  for(let i=0;i<9;i++){const s=new T.Sprite(new T.SpriteMaterial({map:steamTexture,transparent:true,depthWrite:false,opacity:.4}));s.userData.phase=i/9;steam.add(s);}
  // Pleated joystick boot makes the control visibly rooted in its console.
  for(let i=0;i<5;i++){const boot=ring(.065-i*.007,.008,.95,.66+i*.021,-3.85,M.black);boot.rotation.x=Math.PI/2;}
  // Chair shell, padded wings and visible adjustment hardware.
  box(.98,.12,.94,0,.405,.025,M.dark,chair);
  for(const x of [-.37,.37]){box(.095,.79,.13,x,1.03,.22,upholstery,chair);for(let i=0;i<5;i++)box(.021,.027,.15,x, .81+i*.12,.215,leather,chair);}
  for(let i=0;i<4;i++)box(.6,.018,.024,0,.83+i*.16,.26,M.dark,chair);
  for(const x of [-.28,.28])beam([x,.57,-.1],[x,1.53,.36],.022,M.orange,chair);
  // Large planes are subdivided by intentional cladding, rather than random clutter.
  for(const z of [2.0,4.2,7.7,9.6,12.8])for(const side of [-1,1]){
    const panel=box(.06,.63,1.55,side*3.38,2.87,z,M.lightPanel);panel.rotation.z=side*.18;
    box(.035,.035,1.28,side*3.32,2.62,z,M.black);
    for(const dz of [-.65,.65]){const rivet=cyl(.022,.022,.02,side*3.328,2.79,z+dz,M.pipe,ship,8);rivet.rotation.z=Math.PI/2;}
  }
  for(const z of [1.8,5.3,8.8,12.4])for(const side of [-1,1]){
    box(.12,.09,1.24,side*.89,4.055,z,M.dark);box(.057,.014,1.08,side*.89,4.004,z,M.amber);
    for(const dz of [-.55,.55])box(.13,.022,.055,side*.89,4.0,z+dz,M.pipe);
  }
  // Warm acoustic backrest panels give the lounge a human scale.
  for(let i=0;i<3;i++){
    const z=2.14+i*1.12;box(.075,.055,.96,-3.043,1.42,z,upholstery);
    for(const dz of [-.44,.44])beam([-3.065,.89,z+dz],[-3.065,1.36,z+dz],.006,M.cream);
  }
  // Turned table lip, stable pedestal feet and a secured leather folio.
  const tableLip=ring(.637,.015,-1.85,.794,3.55,brass);tableLip.rotation.x=Math.PI/2;
  for(let i=0;i<3;i++){const a=i*Math.PI*2/3;beam([-1.85,.08,3.55],[-1.85+Math.cos(a)*.39,.04,3.55+Math.sin(a)*.39],.025,M.dark);}
  box(.043,.006,.43,-1.82,.847,3.58,leather).rotation.y=.2;
  // Quilted bunk instead of a flat slab; a restrained suspended privacy rail.
  cushion(.73,.2,2.45,-2.89,.6,8.63,M.fabric);
  const duvet=cushion(.74,.17,1.55,-2.89,.75,9.01,upholstery);
  for(let i=0;i<9;i++){const z=8.35+i*.16;beam([-3.22,.844,z],[-2.58,.844,z],.007,leather);}
  cushion(.6,.2,.49,-2.89,.75,7.52,insulation);
  beam([-2.39,2.13,7.04],[-2.39,2.13,10.03],.023,M.pipe);
  for(let i=0;i<7;i++){const c=box(.034,1.34,.1,-2.43+Math.sin(i)*.04,1.42,9.68+i*.045,insulation);c.rotation.y=.2;}
  // Exposed server fan rotors, modeled impellers behind a safety grille.
  for(let i=0;i<2;i++){
    const z=7.05+i*1.05,g=new T.Group();g.position.set(2.696,1.72,z);g.rotation.y=-Math.PI/2;ship.add(g);
    ring(.18,.025,0,0,0,M.pipe,g);const disk=cyl(.174,.174,.027,0,0,-.013,M.black,g);disk.rotation.x=Math.PI/2;
    const rotor=new T.Group();rotor.position.z=.006;g.add(rotor);W.fans.push(rotor);W.movingParts.push(rotor);
    for(let j=0;j<7;j++){const a=j/7*Math.PI*2;const blade=box(.064,.115,.013,Math.sin(a)*.09,Math.cos(a)*.09,0,M.panel,rotor);blade.rotation.z=-a+.4;}
    orb(.039,.039,.025,0,0,.018,M.pipe,rotor);
    for(let j=-2;j<=2;j++)beam([-.145,j*.057,.043],[.145,j*.057,.043],.006,M.dark,g);
    const lamp=new T.Mesh(new T.SphereGeometry(.018,10,8),M.glow);lamp.position.set(2.676,1.44,z+.24);ship.add(lamp);
  }
  // Pressure vessels, pipe insulation and movable valve handwheels.
  for(let i=0;i<6;i++){
    const side=i%2?1:-1,z=.8+i*1.9,group=new T.Group();group.position.set(side*1.115,-1.15,z);ship.add(group);ship.updateMatrixWorld(true);
    for(const object of W.interactables.filter(o=>o.userData.interaction==='pipe-wheel-'+i))group.attach(object);
    // Rotate about local Z after orienting the wheel toward the service aisle.
    const wheel=ring(.15,.027,0,0,0,M.orange,group);wheel.rotation.y=Math.PI/2;
    interactive(wheel,'pipe-wheel-'+i,'配管 '+String(i+1).padStart(2,'0')+' / 点検・修理','pipe').userData.node=i;
    W.valveWheels.push(group);W.movingParts.push(group);group.userData.turn=0;
    const vessel=lathe([[0,-.28],[.095,-.26],[.14,-.19],[.14,.19],[.095,.26],[0,.28]],side*1.65,-1.13,z+.42,blueSteel);
    for(const y of [-1.3,-.95])cyl(.15,.15,.037,side*1.65,y,z+.42,M.pipe);
    const indicator=orb(.018,.034,.034,side*1.175,-1.02,z,M.glow);W.pipeNodes[i].userData.indicator=indicator;W.movingParts.push(indicator);
  }
  // Pressure suit: soft pressure bladders, rigid joints and helmet hardware.
  torso.geometry.dispose();torso.geometry=new T.SphereGeometry(1,28,20);torso.scale.set(.31,.39,.235);
  const neck=ring(.223,.044,0,1.51,0,M.dark,suitGroup);neck.rotation.x=Math.PI/2;
  for(const side of [-1,1]){
    orb(.16,.17,.18,side*.29,1.39,0,enamel,suitGroup);
    orb(.126,.13,.135,side*.18,.67,.016,M.dark,suitGroup);
    orb(.115,.16,.12,side*.41,.77,.01,enamel,suitGroup);
    for(let i=0;i<4;i++)cyl(.127,.127,.016,side*.18,.85+i*.04,0,M.fabric,suitGroup);
    const earpiece=cyl(.094,.094,.04,side*.262,1.77,.01,M.dark,suitGroup);earpiece.rotation.z=Math.PI/2;
    orb(.039,.026,.033,side*.17,1.94,.1,M.glow,suitGroup);
  }
  ring(.198,.015,0,1.77,.265,brass,suitGroup);
  box(.29,.09,.04,0,1.065,.257,M.orange,suitGroup);
  for(let i=0;i<3;i++)orb(.014,.014,.012,-.075+i*.07,1.13,.318,i===2?M.amber:M.glow,suitGroup);
  // Every physical part of the suit is usable; padding must not block its torso hit target.
  suitGroup.traverse(o=>{if(o.isMesh&&!o.userData.interaction)interactive(o,'suit','宇宙服を着る / 脱ぐ','suit');});
  // Machined EVA hatch with radial locking dogs.
  for(const facing of [-1,1]){
    const z=facing<0?15.365:15.625;
    ring(.77,.032,0,1.25,z,M.pipe);ring(.59,.014,0,1.25,z,M.panel);
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2;const dog=box(.16,.072,.058,Math.cos(a)*.7,1.25+Math.sin(a)*.7,z,M.orange);dog.rotation.z=a;interactive(dog,'airlock','エアロック / 船外へ・船内へ','airlock');}
  }
  // Recessed engine throats with turbine vanes and state-driven ion exhaust.
  for(const x of [-2.2,2.2]){
    ring(.52,.045,x,-.6,16.81,M.dark);ring(.41,.026,x,-.6,16.84,M.cyan);
    for(let i=0;i<16;i++){const a=i/16*Math.PI*2;beam([x+Math.cos(a)*.3,-.6+Math.sin(a)*.3,16.76],[x+Math.cos(a+.08)*.49,-.6+Math.sin(a+.08)*.49,16.86],.018,M.pipe);}
    const plumeMaterial=new T.ShaderMaterial({uniforms:{power:{value:.18},time:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform float power;uniform float time;varying vec2 vUv;void main(){float a=pow(1.0-vUv.y,2.0)*power*(.82+.18*sin(vUv.y*42.0-time*11.0));gl_FragColor=vec4(.27,.76,1.0,a);}',transparent:true,depthWrite:false,side:T.DoubleSide,blending:T.AdditiveBlending});
    const plume=new T.Mesh(new T.CylinderGeometry(.04,.4,2.8,32,1,true),plumeMaterial);plume.rotation.x=Math.PI/2;plume.position.set(x,-.6,18.2);ship.add(plume);W.enginePlumes.push(plume);
  }
  W.mechanismState={coffee:0,layer:'cabin',safe:false,speed:.2,faults:[],night:false};
  W.triggerMechanism=(action,index)=>{if(action==='coffee')W.mechanismState.coffee=5;if(action==='pipe'&&W.valveWheels[index])W.valveWheels[index].userData.turn+=Math.PI*1.5;};
  W.updateMechanisms=(dt,time,status={})=>{
    const s=Object.assign(W.mechanismState,status),blend=1-Math.exp(-dt*5);
    door.position.x+=((s.safe?0:1.95)-door.position.x)*blend;
    hatchPivot.rotation.x+=((s.layer==='pipes'?-1.38:0)-hatchPivot.rotation.x)*blend;
    W.fans.forEach((f,i)=>f.rotation.z-=dt*(s.faults.length?2:5)*(i?1:-1));
    W.valveWheels.forEach(g=>g.rotation.x+=(g.userData.turn-g.rotation.x)*blend);
    W.gauges.forEach((g,i)=>g.rotation.z=-.55+Math.sin(time*.45+i)*.035+(s.faults.length?.8:0));
    W.pipeNodes.forEach((n,i)=>n.userData.indicator.material=s.faults.includes(i)?M.red:M.glow);
    W.enginePlumes.forEach(p=>{p.material.uniforms.power.value=Math.min(.55,s.speed*.14);p.material.uniforms.time.value=time;p.visible=s.speed>.01;});
    s.coffee=Math.max(0,s.coffee-dt);brewFlow.visible=s.coffee>1;steam.visible=s.coffee>0;
    steam.children.forEach((p,i)=>{const f=(time*.31+i/9)%1;p.position.set(-2.65+Math.sin(time+i)*f*.045,.96+f*.35,1.72+Math.cos(i)*f*.035);p.scale.setScalar(.055+f*.12);p.material.opacity=(1-f)*.4;});
  };
  W.detailStats={atlasTiles:tileCount,atlasSize:2048,proceduralMaterials:8,articulatedAssemblies:W.movingParts.length};
  // Batch fixed interior geometry by material, preserving dynamic and interactive meshes.
  // This reduces hundreds of mobile draw calls without replacing the ship with an image.
  ship.updateMatrixWorld(true);
  const excluded=new Set([...W.hull,...W.interactables,...W.loose.map(o=>o.mesh),...W.movingParts,W.safeDoor]);
  const batches=new Map();const fixed=[];
  ship.traverse(o=>{if(!o.isMesh||excluded.has(o)||!o.geometry.attributes.normal||Array.isArray(o.material)||o.material.transparent)return;for(let p=o.parent;p&&p!==ship;p=p.parent)if(p===camera||p===W.chair||p===W.suitGroup||W.movingParts.includes(p))return;fixed.push(o);});
  for(const o of fixed){let b=batches.get(o.material.uuid);if(!b){b={material:o.material,geos:[],sources:[]};batches.set(o.material.uuid,b);}const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone();g.applyMatrix4(o.matrixWorld);b.geos.push(g);b.sources.push(o);}
  for(const b of batches.values()){
    if(b.geos.length<2){b.geos.forEach(g=>g.dispose());continue;}
    const total=b.geos.reduce((n,g)=>n+g.attributes.position.count,0),positions=new Float32Array(total*3),normals=new Float32Array(total*3),uvs=new Float32Array(total*2);let offset=0;
    for(const g of b.geos){positions.set(g.attributes.position.array,offset*3);normals.set(g.attributes.normal.array,offset*3);if(g.attributes.uv)uvs.set(g.attributes.uv.array,offset*2);offset+=g.attributes.position.count;g.dispose();}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(positions,3));g.setAttribute('normal',new T.BufferAttribute(normals,3));g.setAttribute('uv',new T.BufferAttribute(uvs,2));g.computeBoundingSphere();ship.add(new T.Mesh(g,b.material));for(const o of b.sources){o.removeFromParent();o.geometry.dispose();}
  }
  ship.traverse(o=>{if(!o.isMesh||!o.material)return;const materials=Array.isArray(o.material)?o.material:[o.material];o.castShadow=materials.every(m=>!m.transparent&&!m.isMeshBasicMaterial);o.receiveShadow=o.castShadow;for(const m of materials)if(m.isMeshStandardMaterial)m.envMapIntensity=.62;});
  // A depth-aware finishing pass adds contact occlusion without extra scene lights.
  // Use the same render path for gameplay, screenshots and resize verification.
  const targetSize=new T.Vector2();renderer.getDrawingBufferSize(targetSize);
  const finishTarget=new T.WebGLRenderTarget(targetSize.x,targetSize.y,{depthBuffer:true,type:T.HalfFloatType});
  finishTarget.samples=renderer.capabilities.isWebGL2?(compactGPU?0:2):0;
  finishTarget.depthTexture=new T.DepthTexture(targetSize.x,targetSize.y,T.UnsignedIntType);
  const finishScene=new T.Scene(),finishCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const finishMaterial=new T.ShaderMaterial({
    uniforms:{colorMap:{value:finishTarget.texture},depthMap:{value:finishTarget.depthTexture},resolution:{value:targetSize},inverseProjection:{value:camera.projectionMatrixInverse},aoStrength:{value:compactGPU?.55:.75}},
    extensions:{derivatives:true},depthTest:false,depthWrite:false,
    vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
    fragmentShader:`
      uniform sampler2D colorMap;uniform sampler2D depthMap;uniform vec2 resolution;
      uniform mat4 inverseProjection;uniform float aoStrength;varying vec2 vUv;
      vec3 viewPosition(vec2 uv){float d=texture2D(depthMap,uv).r;vec4 p=inverseProjection*vec4(uv*2.0-1.0,d*2.0-1.0,1.0);return p.xyz/p.w;}
      void main(){
        vec3 color=texture2D(colorMap,vUv).rgb;vec3 p=viewPosition(vUv);
        vec3 n=normalize(cross(dFdx(p),dFdy(p)));if(dot(n,-p)<0.0)n=-n;
        float occlusion=0.0;vec3 glow=vec3(0.0);
        float radius=clamp(120.0/max(-p.z,1.0),3.0,26.0);
        for(int i=0;i<8;i++){
          float angle=float(i)*2.399963;vec2 direction=vec2(cos(angle),sin(angle));
          vec2 uv=clamp(vUv+direction*radius*(.35+float(i)*.09)/resolution,.001,.999);
          vec3 delta=viewPosition(uv)-p;float distance=length(delta);
          occlusion+=max(dot(n,delta/max(distance,.0001))-.12,0.0)*(1.0-smoothstep(.04,.42,distance));
          vec3 neighbor=texture2D(colorMap,clamp(vUv+direction*4.0/resolution,.001,.999)).rgb;
          glow+=max(neighbor-vec3(.78),vec3(0.0));
        }
        float ao=p.z> -35.0?1.0-aoStrength*occlusion/8.0:1.0;
        color=color*ao+glow*.014;
        float vignette=1.0-.085*pow(length((vUv-.5)*1.35),2.0);
        gl_FragColor=vec4(color*vignette,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  });
  finishScene.add(new T.Mesh(new T.PlaneGeometry(2,2),finishMaterial));
  W.render=()=>{renderer.setRenderTarget(finishTarget);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(finishScene,finishCamera);};
  W.resize=()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.getDrawingBufferSize(targetSize);finishTarget.setSize(targetSize.x,targetSize.y);};
  window.addEventListener('resize',W.resize);
  return W;
})();