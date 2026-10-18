import * as THREE from 'three';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
import {people,areas,leadForArea} from './data.js';
import {guestAppearance} from './life.js';
import {areaFacing} from './viewpoints.js';
import {OFFICE,roomAt} from './rooms.js';

const PI=Math.PI;
const geometries=new Map();
function geo(type,a){const key=type+':'+a.join(',');if(!geometries.has(key)){let g;if(type==='box')g=new THREE.BoxGeometry(...a);if(type==='round')g=new RoundedBoxGeometry(...a);if(type==='sphere')g=new THREE.SphereGeometry(1,20,12);if(type==='cyl')g=new THREE.CylinderGeometry(...a);g.userData.shared=true;geometries.set(key,g);}return geometries.get(key);}
function material(color,options={}){return new THREE.MeshStandardMaterial({color,roughness:.5,metalness:.08,...options});}
function textureCanvas(draw,w=1024,h=512){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function random(seed){let n=seed;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296;};}
const woods=()=>textureCanvas((c,w,h)=>{const rnd=random(43);c.fillStyle='#b8a18b';c.fillRect(0,0,w,h);for(let row=0;row<16;row++){const y=row*h/16;for(let col=0;col<4;col++){const x=col*w/3-(row%2)*w/6;const v=150+Math.floor(rnd()*25);c.fillStyle=`rgb(${v+28},${v+10},${v-9})`;c.fillRect(x,y,w/3-.8,h/16-.7);for(let k=0;k<10;k++){c.strokeStyle=`rgba(75,49,28,${rnd()*.07})`;c.lineWidth=.5;c.beginPath();c.moveTo(x,y+rnd()*h/16);c.bezierCurveTo(x+60,y+rnd()*h/16,x+140,y+rnd()*h/16,x+w/3,y+rnd()*h/16);c.stroke();}}}});

function builder(){
 const group=new THREE.Group(),cache=new Map(),statics=[],pickables=[],colliders=[],leds=[];
 const mat=(color,opts={})=>{const k=color+JSON.stringify(Object.fromEntries(Object.entries(opts).map(([k,v])=>[k,v?.isTexture?v.uuid:v])));if(!cache.has(k))cache.set(k,material(color,opts));return cache.get(k);};
 const silver=mat('#aeb9bf',{metalness:.8,roughness:.24}),navy=mat('#1c324a',{roughness:.4}),oak=mat('#88705b'),white=mat('#efeee9'),dark=mat('#28343e'),glass=new THREE.MeshPhysicalMaterial({color:'#cce2e8',transparent:true,opacity:.13,roughness:.08,metalness:.08,clearcoat:1,depthWrite:false,side:THREE.DoubleSide});
 function mesh(g,m,x,y,z,parent=group,staticMesh=true){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=!m.transparent;o.receiveShadow=!m.transparent;parent.add(o);if(staticMesh)statics.push(o);return o;}
 const box=(x,y,z,w,h,d,m,parent=group,r=.04,stat=true)=>mesh(r?geo('round',[w,h,d,2,Math.min(r,w/3,h/3,d/3)]):geo('box',[w,h,d]),m,x,y,z,parent,stat);
 const ball=(x,y,z,sx,sy,sz,m,parent=group,stat=true)=>{const o=mesh(geo('sphere',[]),m,x,y,z,parent,stat);o.scale.set(sx,sy,sz);return o;};
 const cylinder=(x,y,z,rt,rb,h,m,parent=group,stat=true)=>mesh(geo('cyl',[rt,rb,h,16]),m,x,y,z,parent,stat);
 function label(text,x,y,z,w=4,h=.7,color='#edf2f1',parent=group,bg=null){const t=textureCanvas((c,W,H)=>{if(bg){c.fillStyle=bg;c.fillRect(0,0,W,H);}c.fillStyle=color;c.font=text==='Studio De Caro'?'400 120px DeCaroScript':'500 64px Georgia';c.textAlign='center';c.textBaseline='middle';c.fillText(text,W/2,H/2,W*.96);},1024,192);t.userData.text=text;const m=new THREE.MeshBasicMaterial({map:t,transparent:!bg,side:THREE.DoubleSide,depthWrite:false});return mesh(new THREE.PlaneGeometry(w,h),m,x,y,z,parent);}
 function led(x,y,z,w,h,d,color='#ffe1a7',parent=group){const m=mat(color,{emissive:color,emissiveIntensity:.15,roughness:.2});leds.push(m);return box(x,y,z,w,h,d,m,parent,0);}
 function glassWall(x,z,w,rotation=0,h=4.8){const wall=new THREE.Group();wall.position.set(x,0,z);wall.rotation.y=rotation;group.add(wall);box(0,h/2,0,w,h,.045,glass,wall,0);for(let i=0;i<=Math.ceil(w/2.3);i++){const xx=-w/2+i*w/Math.ceil(w/2.3);box(xx,h/2,0,.045,h,.065,silver,wall,0);}box(0,h,0,w+.07,.07,.09,silver,wall,0);box(0,.06,0,w+.07,.10,.09,silver,wall,0);return wall;}
 function plant(x,z,size=1,parent=group){cylinder(x,.3*size,z,.3*size,.24*size,.6*size,mat('#a3a5a0'),parent);cylinder(x,.61*size,z,.26*size,.26*size,.04*size,mat('#4a4737'),parent);cylinder(x,1.25*size,z,.035*size,.055*size,1.5*size,mat('#6c5943'),parent);const rnd=random(Math.floor((x+31)*(z+38)));for(let k=0;k<8;k++){const a=k*2.4;const leaf=ball(x+Math.cos(a)*.26*size,(1.15+k*.13)*size,z+Math.sin(a)*.25*size,.12*size,.48*size,.19*size,mat(k%2?'#526e55':'#6b8767'),parent);leaf.rotation.z=Math.cos(a)*.75;leaf.rotation.x=Math.sin(a)*.75;}return parent;}
 function chair(x,z,angle=0,m=navy,parent=group){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;parent.add(g);box(0,.64,0,.86,.18,.82,m,g,.08);box(0,1.14,-.34,.84,.92,.16,m,g,.09);cylinder(0,.34,0,.055,.075,.48,silver,g);for(let a=0;a<5;a++){const leg=box(0,.12,0,.63,.055,.055,silver,g,.02);leg.rotation.y=a*PI/2.5;leg.position.x=Math.sin(a*PI/2.5)*.25;leg.position.z=Math.cos(a*PI/2.5)*.25;}box(-.5,.91,.04,.07,.13,.65,dark,g);box(.5,.91,.04,.07,.13,.65,dark,g);return g;}
 function laptop(x,y,z,parent=group,big=false){const holder=new THREE.Group();holder.position.set(x,y,z);holder.scale.setScalar(.55);parent.add(holder);parent=holder;x=0;y=0;z=0;const shell=big?mat('#596a87',{metalness:.7,roughness:.25}):silver;box(x,y,z,1.05,.04,.72,shell,parent,.025);const g=new THREE.Group();g.name='MacBook Neo — rappresentazione stilizzata';g.position.set(x,y+.34,z-.27);g.rotation.x=-.12;parent.add(g);box(0,0,0,1.05,.67,.038,shell,g,.025);const t=textureCanvas((c,w,h)=>{c.fillStyle='#152c43';c.fillRect(0,0,w,h);c.fillStyle='#aebfcb';c.font='22px sans-serif';c.fillText('STUDIO DE CARO',28,42);c.fillStyle='#c7dde3';for(let i=0;i<5;i++)c.fillRect(28,76+i*26,95+i*16,5);for(let i=0;i<7;i++){c.fillStyle=i===6?'#d4b78c':'#7da4b5';c.fillRect(250+i*28,h-30-(i*.5+2)*20,17,(i*.5+2)*20);}c.strokeStyle='#d9ba89';c.lineWidth=3;c.beginPath();c.moveTo(250,150);c.lineTo(295,135);c.lineTo(335,140);c.lineTo(375,95);c.lineTo(430,80);c.stroke();},512,256);mesh(new THREE.PlaneGeometry(.96,.56),new THREE.MeshBasicMaterial({map:t}),0,0,.024,g);box(x,y+.026,z+.04,.74,.006,.30,mat('#7b8991'),parent,0);for(let row=0;row<4;row++)for(let col=0;col<11;col++)box(x-.36+col*.071,y+.031,z-.06+row*.064,.055,.007,.045,dark,parent,0);box(x,y+.029,z+.24,.30,.008,.11,mat('#c1cbd0'),parent,.02);label('MacBook Neo',0,-.306,.025,.45,.035,'#c7d4db',g);return g;}
 function desk(x,z,angle=0,width=3.4,name=''){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;group.add(g);box(0,1.08,0,width,.14,1.55,white,g,.09);for(const a of [-1,1])box(a*(width/2-.22),.54,0,.08,1.02,1.25,silver,g,.02);box(width/2-.55,.49,-.05,.65,.94,1.16,mat('#c4c4bc'),g,.05);laptop(-.20,1.18,-.08,g);box(.86,1.18,.34,.48,.035,.34,mat('#dbd8cb'),g,.015);cylinder(.91,1.29,-.29,.10,.085,.23,white,g);cylinder(-1.02,1.23,-.31,.08,.07,.18,navy,g);chair(0,.95,PI,navy,g);if(name){box(0,1.29,.70,1.7,.30,.08,navy,g,.025);label(name,0,1.30,.747,1.55,.23,'#f4eee1',g);const back=label(name,0,1.30,.653,1.55,.23,'#f4eee1',g);back.rotation.y=PI;}colliders.push({x,z,w:width+.15,d:1.7});return g;}
 function signMark(x,y,z,s=1,parent=group){const g=new THREE.Group();g.position.set(x,y,z);g.scale.setScalar(s);parent.add(g);const m=silver;box(-.4,0,0,.18,1.1,.08,m,g);box(.03,.46,0,.85,.18,.08,m,g);box(.03,-.46,0,.85,.18,.08,m,g);box(.4,-.15,0,.18,.73,.08,m,g);box(-.01,-.08,0,.20,.20,.09,m,g,.025);return g;}
 function batch(){group.updateMatrixWorld(true);const buckets=new Map();for(const o of statics){const k=o.material.uuid+(o.castShadow?'c':'')+(o.receiveShadow?'r':'');if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(o);}for(const list of buckets.values()){if(list.length<2)continue;const geos=list.map(o=>(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrixWorld));const combined=mergeGeometries(geos,false);if(!combined)continue;const out=new THREE.Mesh(combined,list[0].material);out.castShadow=list[0].castShadow;out.receiveShadow=list[0].receiveShadow;group.add(out);for(const o of list)o.removeFromParent();geos.forEach(g=>g.dispose());}statics.length=0;}
 return {group,mat,box,ball,cylinder,label,led,glassWall,plant,chair,laptop,desk,signMark,batch,mesh,pickables,colliders,leds,silver,navy,oak,white,dark,glass};
}

function makeActor(p){
 const b=builder(),{box,ball,cylinder,mat,group:g}=b;
 const skin=mat(p.skin,{roughness:.72}),hair=mat(p.hair,{roughness:.8}),suit=mat(p.outfit,{roughness:.68}),shirt=mat('#f2eee8'),shoe=mat('#25303a',{roughness:.28}),eye=mat('#28353b');
 const homeZ=p.homeZ??(p.areaId==='reception'?p.z:p.id==='pasquale'?-13.2:['riunioni','lounge'].includes(p.areaId)?p.z:p.z+1.3);
 const facing=p.facing??(p.areaId==='reception'||p.id==='pasquale'?0:p.areaId==='lounge'?-PI/2:PI);
 g.position.set(p.x,0,homeZ);g.rotation.y=facing;g.scale.set(p.height??1,p.height??1,p.height??1);
 // Softly modelled proportions: a deliberate stylized character, not a voxel.
 const body=new THREE.Group();body.scale.x=p.build??1;g.add(body);
 box(0,1.1,0,.66,.66,.40,suit,body,.13);box(0,1.15,.218,.23,.5,.025,shirt,body,.02);
 box(0,1.14,.244,.065,.34,.025,mat('#1c304b'),body,.015);
 const lapelL=box(-.17,1.3,.235,.13,.37,.04,suit,body,.02);lapelL.rotation.z=.27;
 const lapelR=box(.17,1.3,.235,.13,.37,.04,suit,body,.02);lapelR.rotation.z=-.27;
 if(p.id==='pasquale'){box(-.23,1.25,.244,.12,.06,.025,shirt,body,.01);box(-.25,1.21,.242,.16,.015,.025,suit,body,0);}
 cylinder(0,1.52,0,.10,.12,.22,skin,body);
 const head=new THREE.Group();head.position.y=1.88;body.add(head);
 ball(0,0,0,.32,.39,.30,skin,head);ball(-.325,-.04,0,.07,.10,.06,skin,head);ball(.325,-.04,0,.07,.10,.06,skin,head);
 const cap=ball(0,.16,-.045,.335,.28,.30,hair,head);
 ball(-.13,.25,.19,.21,.12,.16,hair,head);ball(.09,.28,.18,.22,.11,.13,hair,head);
 if(p.gender==='f'){ball(0,-.05,-.16,.34,.44,.20,hair,head);ball(-.27,-.12,-.03,.08,.33,.14,hair,head);ball(.27,-.12,-.03,.08,.33,.14,hair,head);}
 for(const x of [-.12,.12]){ball(x,.015,.263,.064,.062,.033,shirt,head);ball(x,.01,.291,.029,.039,.02,eye,head);ball(x-.008,.022,.309,.009,.012,.006,shirt,head);const brow=box(x,.105,.27,.105,.026,.024,hair,head,.012);brow.rotation.z=x<0?.09:-.09;}
 ball(0,-.07,.30,.055,.075,.07,skin,head);const mouth=box(0,-.205,.259,.105,.026,.025,mat('#a56f61'),head,.012);mouth.rotation.z=.04;
 if(p.hairStyle===1){ball(0,.37,-.1,.20,.17,.19,hair,head);}if(p.hairStyle===2){ball(.29,.17,-.17,.16,.22,.18,hair,head);}if(p.hairStyle===3&&p.gender==='f'){ball(0,-.22,-.31,.18,.38,.16,hair,head);}if(p.glasses){for(const x of [-.12,.12]){box(x,.018,.308,.18,.027,.027,mat('#36424a'),head,.01);box(x,-.045,.308,.18,.022,.027,mat('#36424a'),head,.01);}box(0,.008,.319,.08,.018,.02,hair,head,.008);}if(p.beard)ball(0,-.22,.19,.22,.13,.14,hair,head);
 const arms=[],legs=[];
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.40,1.35,0);body.add(arm);box(0,-.25,0,.19,.52,.23,suit,arm,.08);ball(0,-.55,0,.105,.12,.11,skin,arm);arms.push(arm);
  const leg=new THREE.Group();leg.position.set(side*.17,.78,0);g.add(leg);box(0,-.18,0,.24,.36,.27,suit,leg,.065);const knee=new THREE.Group();knee.position.y=-.36;leg.add(knee);box(0,-.16,0,.23,.32,.26,suit,knee,.055);box(0,-.35,.07,.27,.16,.43,shoe,knee,.06);leg.userData.knee=knee;legs.push(leg);
 }
 const pick=new THREE.Mesh(new THREE.BoxGeometry(1.05,2.5,1.05),new THREE.MeshBasicMaterial({visible:false}));pick.position.y=1.15;pick.userData.personId=p.id;g.add(pick);
 // Merge rigid pieces in their own joint coordinate system, keeping every joint animated.
 function mergeRigid(root){root.updateMatrixWorld(true);const lists=new Map();root.children.filter(o=>o.isMesh&&o!==pick).forEach(o=>{const a=lists.get(o.material)??[];a.push(o);lists.set(o.material,a);});for(const [m,list]of lists){if(list.length<2)continue;root.updateMatrix();const geos=list.map(o=>(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone()).applyMatrix4(o.matrix));const merged=mergeGeometries(geos,false);if(merged){const o=new THREE.Mesh(merged,m);o.castShadow=true;root.add(o);list.forEach(q=>q.removeFromParent());}geos.forEach(q=>q.dispose());}}
 for(const root of [head,body,...arms,...legs,...legs.map(l=>l.userData.knee)])mergeRigid(root);
 const cup=new THREE.Group();arms[1].add(cup);cylinder(.04,-.61,.07,.085,.07,.14,mat('#ece9df'),cup,false);cup.visible=false;
 const snack=new THREE.Group();arms[1].add(snack);snack.position.set(0,-.61,.08);box(0,0,0,.24,.09,.19,mat('#cfa56a'),snack,.035,false);box(0,.06,0,.23,.025,.18,mat('#7a9b55'),snack,.01,false);box(0,.09,0,.24,.07,.19,mat('#e2bf83'),snack,.035,false);snack.visible=false;
 const actor={p,group:g,body,head,arms,legs,pick,speaking:false,selected:false,home:new THREE.Vector3(p.x,0,homeZ),route:null,time:0,lastTime:0};
 actor.update=(time)=>{
  if(!actor.selected&&!actor.presenting&&!actor.stationed)actor.time+=Math.max(0,time-actor.lastTime);actor.lastTime=time;
  const t=time+p.index*.8;const cycle=(actor.time+p.index*9)%160;
  let walk=0,activity=p.areaId==='riunioni'?'meeting':p.areaId==='lounge'?'coffee':'work';
  // Several colleagues stand and meet in the lounge; only the same assigned staff appear.
  if(actor.stationed){g.position.copy(actor.home);g.rotation.y=areaFacing(p);walk=0;}
  else if(actor.selected||actor.presenting){walk=0;activity=actor.activity??activity;if(actor.returning)actor.returning.lastTime=time;}
  else if(actor.escortActive){walk=1;activity='walk';}
  else if(actor.returning){const r=actor.returning;r.progress=Math.max(0,r.progress-Math.max(0,time-(r.lastTime??time))/7);r.lastTime=time;const at=positionOnRoute(r.path,r.progress);g.position.copy(at.position);g.rotation.y=Math.atan2(-at.direction.x,-at.direction.z);walk=1;activity='walk';if(r.progress===0){actor.returning=null;g.position.copy(actor.home);}}
  else if(actor.route&&cycle>70){
   const phase=(cycle-70)/90;let f=phase<.4?phase/.4:phase>.6?(1-phase)/.4:1;f=Math.max(0,Math.min(1,f));
   const path=actor.route;const distance=f*path.length;let i=0;while(i<path.points.length-2&&path.cumulative[i+1]<distance)i++;
   const start=path.points[i],end=path.points[i+1];const segment=path.cumulative[i+1]-path.cumulative[i];g.position.lerpVectors(start,end,segment?(distance-path.cumulative[i])/segment:0);
   walk=(phase<.4||phase>.6)?1:0;activity=walk?'walk':path.venue;const dir=end.clone().sub(start);if(phase>.6)dir.negate();g.rotation.y=Math.atan2(dir.x,dir.z);if(!walk&&['meeting','view','eat'].includes(path.venue))g.rotation.y=Math.atan2((path.lookAt?.[0]??7)-g.position.x,(path.lookAt?.[1]??4)-g.position.z);
  }else{g.position.copy(actor.home);g.rotation.y=facing;}
  const sitting=!walk&&(activity==='work'&&p.areaId!=='reception'||p.seated===true||activity==='eat');body.position.y=(sitting?-.14:0)+Math.sin(t*1.5)*.012+walk*Math.abs(Math.sin(t*7))*.035;
  head.rotation.y=actor.selected?.08:Math.sin(t*.46)*.11;head.rotation.z=Math.sin(t*.67)*.025;
  head.rotation.x=actor.speaking?Math.sin(t*9)*.025:Math.sin(t*.8)*.015;
  arms.forEach((a,i)=>{a.rotation.x=walk?Math.sin(t*7+i*PI)*.55:-.55+Math.sin(t*3.5+i)*.06;a.rotation.z=(i?-.07:.07)+Math.sin(t*2+i)*.025;});
  if(activity==='coffee'){arms[1].rotation.x=-1.6+Math.sin(t*.8)*.14;arms[0].rotation.x=-.18;head.rotation.y=Math.sin(t*.9)*.22;}else if(activity==='eat'){arms[1].rotation.x=-1.5+Math.sin(t*.9)*.2;arms[0].rotation.x=-.6;head.rotation.x=.05+Math.sin(t*1.2)*.025;}else if(activity==='view'){arms[0].rotation.x=-.18;arms[1].rotation.x=-.1;head.rotation.y=Math.sin(t*.23)*.16;}else if(activity==='meeting'){arms[1].rotation.x=-.75+Math.sin(t*1.4)*.25;arms[0].rotation.x=-.2;}
  cup.visible=activity==='coffee';snack.visible=activity==='eat';actor.activity=activity;
  legs.forEach((a,i)=>{a.position.y=sitting?.64:.78;a.rotation.x=walk?Math.sin(t*7+i*PI)*.55:sitting?-1.45:-.12;a.userData.knee.rotation.x=sitting?1.45:0;});
 };
 return actor;
}

export function positionOnRoute(path,f){if(path.points.length<2)return {position:path.points[0].clone(),direction:new THREE.Vector3(0,0,1)};const distance=Math.max(0,Math.min(1,f))*path.length;let i=0;while(i<path.points.length-2&&path.cumulative[i+1]<distance)i++;const a=path.points[i],b=path.points[i+1],length=path.cumulative[i+1]-path.cumulative[i];return {position:a.clone().lerp(b,length?(distance-path.cumulative[i])/length:0),direction:b.clone().sub(a)};}

export function createOffice(){
 const b=builder(),{group,box,ball,cylinder,mat,glassWall,plant,chair,desk,laptop,label,led,signMark}=b;
 group.name='Studio De Caro — grande attico sul Golfo';
 const floorTex=woods();floorTex.wrapS=floorTex.wrapT=THREE.RepeatWrapping;floorTex.repeat.set(6,5);
 const timber=mat('#ead5b5',{map:floorTex,roughness:.36}),stone=mat('#e5e0d5',{roughness:.3}),accent=mat('#b89867',{metalness:.6,roughness:.28});
 box(0,-.36,0,76,.7,52,mat('#394d60'),group,.32);box(0,.015,0,75.8,.10,51.8,timber,group,.02);
 // A 9 metre central gallery and a 6 metre side gallery leave real circulation space.
 box(7.5,.079,0,8.6,.025,51.7,stone,group,0);box(-14,.08,8,5.6,.026,35.5,stone,group,0);box(-17,.08,-6,41.7,.026,5.7,stone,group,0);
 for(const x of [3.22,11.78])led(x,.099,0,.025,.008,51.5,'#ddc595');
 glassWall(0,-26,76,0,6.1);glassWall(38,-9,34,PI/2,6.1);glassWall(38,20,12,PI/2,6.1);
 box(-38,1.05,0,.18,2.1,52,mat('#d8d9d2'),group,.04);box(0,.64,26,76,1.28,.2,stone,group,.04);
 box(0,6.12,-26,76,.16,.16,b.silver,group,0);box(38,6.12,0,.16,.16,52,b.silver,group,0);
 led(0,.18,-25.85,75.6,.035,.04);led(37.85,.18,0,.035,.04,51.6);
 function wallZ(z,a,c,door=null,gap=3.2){for(const [l,r]of door===null?[[a,c]]:[[a,door-gap/2],[door+gap/2,c]])if(r-l>.05){glassWall((l+r)/2,z,r-l,0,5.65);b.colliders.push({x:(l+r)/2,z,w:r-l,d:.12});}}
 function wallX(x,a,c,door=null,gap=3.2){for(const [l,r]of door===null?[[a,c]]:[[a,door-gap/2],[door+gap/2,c]])if(r-l>.05){glassWall(x,(l+r)/2,r-l,PI/2,5.65);b.colliders.push({x,z:(l+r)/2,w:.12,d:r-l});}}
 wallX(-17,-26,-9);wallZ(-9,-38,-17,-28,3.6);wallZ(-9,-17,3,-8,3.6);wallX(3,-26,-9);
 wallZ(-3,-38,-17);wallX(-17,-3,10,4,3.6);wallZ(10,-38,-17);wallX(-17,10,26,21,3.6);
 wallX(-11,3,15);wallX(-11,15,26,21);wallZ(3,-11,3,-5,3.4);wallX(3,3,15,11,3.2);wallZ(15,-11,3);wallX(3,15,26,21,3.8);
 wallX(9,-26,-3);wallZ(-3,9,38,20,3.8);wallX(12,3,26,21,4);wallZ(3,12,38,20,4);
 const roomSpecs=[['Contabilità',-16.9,4,PI/2,3.8],['Consulenza',-16.9,21,PI/2,3.8],['Operazioni straordinarie',-5,2.91,PI,7],['Ricerca e Sviluppo',-8,-8.91,0,6],['Sala riunioni',-28,-8.91,0,4.8],['Reception',3.1,21,PI/2,3.6],['Lounge',11.9,21,-PI/2,3.6],['CFO',20,-2.9,0,3]];
 for(const [name,x,z,angle,w]of roomSpecs){const g=new THREE.Group();g.position.set(x,4.5,z);g.rotation.y=angle;group.add(g);box(0,0,0,w+.35,.72,.09,b.navy,g,.04);label(name,0,0,.057,w,.40,'#f5eddc',g);led(0,-.41,0,w,.025,.04,'#ffe1a7',g);}
 // Executive suite: private meeting table, library, seating and an uninterrupted sea corner.
 box(23.5,.09,-14.5,28.6,.08,22.6,stone,group,.025);
 box(27,1.15,-20,6.8,.22,2.2,b.oak,group,.16);box(27,1.03,-20,6.8,.07,2.2,b.silver,group,.04);
 for(const x of [24.3,29.7])box(x,.54,-20,1,.95,1.8,b.navy,group,.12);
 const cfoLaptop=new THREE.Group();cfoLaptop.position.set(26,0,-20.03);cfoLaptop.rotation.y=PI;group.add(cfoLaptop);laptop(0,1.29,0,cfoLaptop,true);chair(27,-22.3,0,b.navy);
 box(28.6,1.3,-19.8,.85,.05,.6,b.navy);box(28.7,1.34,-19.9,.58,.03,.38,b.white);cylinder(29.2,1.48,-20.3,.12,.10,.28,b.white);
 box(27,1.48,-18.87,2.9,.32,.1,b.navy);label('Pasquale De Caro',27,1.49,-18.81,2.65,.24,'#f4eee1');
 box(10.7,.75,-19,1.4,1.5,9,b.oak,group,.1);for(let k=0;k<12;k++)box(10.7,1.6,-22.5+k*.55,1.05,.4,.28,k%3?b.navy:b.white,group,.025);
 label('CFO',26,4.4,-25.9,3.5,.85,'#2d485e');label('PASQUALE DE CARO',26,3.55,-25.9,7,.52,'#2d485e');
 cylinder(27,1,-10,1.7,1.7,.14,b.oak);cylinder(27,.5,-10,.25,.4,.95,b.silver);
 for(const a of [0,PI/2,PI,PI*1.5])chair(27+Math.sin(a)*2.5,-10+Math.cos(a)*2.5,a,mat('#9aadb8'));
 for(const [x,z]of [[12,-24],[35.5,-23.5],[35.5,-5.5]])plant(x,z,1.65);
 // Human scale furnishings distributed throughout the larger rooms.
 for(const p of people.filter(p=>['contabilita','consulenza','operazioni','ricerca'].includes(p.areaId)))desk(p.x,p.z,0,p.areaId==='ricerca'?4.1:3.7,p.name);
 for(const [x,z,w]of [[-36.5,8,1.2],[-36.5,23,1.2],[-9.5,-24,9],[-9.5,14,1.1]]){box(x,.8,z,w,1.6,w>2?1:3,b.oak,group,.08);box(x,1.64,z,w+.05,.06,w>2?1.05:3.05,b.white);}
 const art=textureCanvas((c,w,h)=>{c.fillStyle='#ece2cf';c.fillRect(0,0,w,h);for(let i=0;i<7;i++){c.fillStyle=['#1b4a68','#2c7787','#9db4a5','#c09c63'][i%4];c.beginPath();c.arc(w*(.12+i*.14),h*(.5+.18*Math.sin(i)),h*(.13+i*.015),0,PI*2);c.fill();}});
 const artMesh=new THREE.Mesh(new THREE.PlaneGeometry(5.5,2.5),new THREE.MeshBasicMaterial({map:art}));artMesh.position.set(-37.85,3.2,20);artMesh.rotation.y=PI/2;group.add(artMesh);
 // Reception and arrival lounge, with an architectural brand wall.
 box(-4,.7,22.2,8,1.3,1.65,stone,group,.25);box(-4,1.4,22.1,8.2,.15,1.9,b.oak,group,.12);led(-4,.2,23.04,8.5,.045,.035);
 signMark(-6.8,.79,23.05,.65);label('Studio De Caro',-2.7,.86,23.05,4.9,.56,'#304454');
 const device=new THREE.Group();device.position.set(-4,0,22);device.rotation.y=PI;group.add(device);laptop(0,1.51,0,device);
 box(-4,1.64,22.95,1.9,.3,.08,b.navy);label('Alessia',-4,1.65,23,1.75,.22,'#f4eee1');b.colliders.push({x:-4,z:22.2,w:8.4,d:2});
 box(-24,2.8,25.85,17,5.3,.24,b.navy,group,.06);signMark(-30.3,3.1,25.68,1.8);label('Studio De Caro',-22.6,3.2,25.67,9,.95).rotation.y=PI;label('tax and corporate consulting',-23.2,2.15,25.66,10,.4).rotation.y=PI;led(-24,.42,25.65,16,.035,.04);
 for(const [x,z]of [[-9,24.2],[1,24.2],[7,16],[7,-17],[-14,14],[-14,-1]])plant(x,z,1.25);
 // The gallery has a sculptural focal point and places to pause, without blocking doors.
 cylinder(7,.32,-.2,1.05,1.15,.65,stone);const ring=new THREE.Mesh(new THREE.TorusGeometry(.85,.12,12,40),accent);ring.position.set(7,1.7,-.2);ring.rotation.y=.55;group.add(ring);
 b.colliders.push({x:7,z:-.2,w:2.3,d:2.3});
 // Spacious boardroom: guests stay opposite their dedicated host.
 box(-28,.84,-18.5,10.8,.22,3.4,b.oak,group,.3);
 for(const x of [-32,-28,-24]){chair(x,-15.5,PI,mat('#687e8e'));chair(x,-21.2,0,mat('#687e8e'));}
 box(-28,3.3,-25.8,10,3.2,.12,b.dark,group,.05);
 const board=textureCanvas((c,w,h)=>{c.fillStyle='#132d44';c.fillRect(0,0,w,h);c.fillStyle='#f2ecdb';c.font='42px Georgia';c.fillText('Il prossimo passo, insieme.',58,90);c.font='19px sans-serif';c.fillStyle='#adc5cb';c.fillText('STUDIO DE CARO  /  VISIONE · NUMERI · DECISIONI',58,140);for(let i=0;i<8;i++){c.fillStyle=i===7?'#dbb96f':'#36849a';c.fillRect(70+i*100,400-i*19,60,90+i*19);}c.strokeStyle='#dfbf7c';c.lineWidth=4;c.beginPath();c.moveTo(70,340);c.lineTo(220,300);c.lineTo(370,310);c.lineTo(520,240);c.lineTo(670,190);c.lineTo(820,160);c.stroke();});
 b.mesh(new THREE.PlaneGeometry(9.7,2.95),new THREE.MeshBasicMaterial({map:board}),-28,3.3,-25.71);
 box(-28,1.08,-16.95,1.7,.26,.08,b.navy);label('Riccardo',-28,1.09,-16.9,1.55,.21,'#f4eee1');
 for(const x of [-36,-19])plant(x,-23.7,1.55);
 // Lounge: two seating islands, an actual bar and an open connection to the roof garden.
 const sofa=mat('#b8c6bf',{roughness:.85}),cushion=mat('#24556f',{roughness:.85});
 function sofaAt(x,z,w=7){box(x,.5,z,w,.75,1.9,sofa,group,.24);box(x,.95,z+.75,w,1.2,.45,sofa,group,.18);for(const sign of [-1,1]){box(x+sign*(w/2-.2),.8,z,.4,1,1.9,sofa,group,.16);box(x+sign*(w/2-1),.95,z+.15,.8,.72,.28,cushion,group,.15);}b.colliders.push({x,z,w:w+.15,d:2.1});}
 box(25,.09,13,16,.035,12,mat('#ded6c6',{roughness:1}),group,.2);sofaAt(24,14,8);sofaAt(22,23,6);
 cylinder(24,.48,10,1.5,1.5,.13,b.oak);cylinder(24,.25,10,.5,.6,.44,b.silver);box(24,.58,10,.7,.06,.4,b.white);cylinder(24.7,.65,10.3,.1,.09,.24,b.white);chair(30,10,-PI/2,sofa);
 box(35,.67,20,2,1.3,8,b.oak,group,.1);box(35,1.36,20,2.2,.1,8.2,stone,group,.06);box(35,1.8,19,.9,.8,1.15,b.silver,group,.07);box(34.49,1.75,19,.05,.4,.7,b.dark);cylinder(34.25,1.5,19,.12,.11,.2,b.white);
 box(35,1.55,22.5,1.5,.25,.08,b.navy);label('Adriana',35,1.56,22.55,1.35,.2,'#f4eee1');label('Una pausa. Nuove idee.',37.7,3.2,20,6,.55,'#334859').rotation.y=-PI/2;
 for(const z of [17,20,23]){cylinder(32.8,.85,z,.45,.43,.12,b.navy);cylinder(32.8,.43,z,.07,.2,.8,b.silver);}
 for(const [x,z]of [[15,5],[36,15],[15,24.3]])plant(x,z,1.6);
 b.colliders.push({x:35,z:20,w:2.2,d:8.2},{x:27,z:-20,w:7,d:2.4},{x:-28,z:-18.5,w:11,d:3.6},{x:27,z:-10,w:3.4,d:3.4},{x:24,z:10,w:3,d:3});
 // Ristobar: proper dining tables, a pastry case, dishes and an L-shaped service counter.
 box(31.5,.67,24,9,1.3,1.6,b.oak,group,.1);box(31.5,1.36,24,9.2,.1,1.8,stone,group,.06);led(31.5,.2,24.83,8.8,.035,.035);
 const menu=new THREE.Group();menu.name='Tabellone De Caro Coffee Club';menu.position.set(29,3.75,25.6);menu.rotation.y=PI;group.add(menu);
 box(0,0,0,11.7,3.85,.14,b.oak,menu,.08);box(0,0,.085,11.45,3.60,.03,mat('#183f37'),menu,.02);
 const menuTexture=new THREE.TextureLoader().load('./assets/ristobar-menu.svg');menuTexture.colorSpace=THREE.SRGBColorSpace;menuTexture.anisotropy=8;
 const menuFace=b.mesh(new THREE.PlaneGeometry(11.35,3.72),new THREE.MeshBasicMaterial({map:menuTexture,side:THREE.FrontSide}),0,0,.115,menu);menuFace.userData.cafeMenu=true;
 led(0,1.94,.09,11.3,.035,.06,'#ffe3b3',menu);led(0,-1.94,.09,11.3,.035,.06,'#ffe3b3',menu);
 box(29.8,1.7,24,3.4,.66,1.25,b.glass,group,.035);box(29.8,1.41,24,3.6,.10,1.3,b.silver);for(let i=0;i<5;i++){ball(28.5+i*.6,1.56,24,.23,.13,.16,mat(i%2?'#b9854c':'#e0b778'));}
 for(const [x,z,w]of [[18.5,6.5,4.8],[30,5.8,4]]){box(x,.94,z,w,.16,1.7,b.oak,group,.12);for(const side of [-1,1])box(x+side*(w/2-.35),.46,z,.09,.88,1.3,b.silver);for(const dx of [-1.4,1.4]){cylinder(x+dx,1.045,z,.38,.38,.045,b.white);box(x+dx,1.12,z,.36,.10,.25,mat('#d6af77'),group,.04);box(x+dx,1.18,z,.34,.035,.24,mat('#72984e'));cylinder(x+dx+.42,1.14,z-.45,.095,.08,.20,b.white);box(x+dx-.45,1.06,z,.05,.025,.6,b.silver,group,.01);}b.colliders.push({x,z,w:w+.1,d:1.9});}
 for(const x of [17.1,19.9])chair(x,8.2,PI,sofa);for(const x of [28.6,31.4])chair(x,7.5,PI,sofa);
 for(const z of [21,22]){cylinder(34.2,1.46,z,.18,.18,.04,b.white);cylinder(34.2,1.58,z,.095,.08,.20,b.white);}box(35,2.05,17.4,.6,.5,.45,b.dark,group,.04);cylinder(35,2.4,17.4,.20,.20,.30,b.glass);
 b.colliders.push({x:31.5,z:24,w:9.2,d:1.8});
 // Three outdoor islands leave the doorway and the central sea-view promenade clear.
 box(46,-.27,6,16,.54,40,mat('#637b79'),group,.2);box(46,.04,6,15.8,.12,39.8,mat('#c3af8a'),group,.03);
 for(let z=-13.6;z<26;z+=.6)box(46,.112,z,15.7,.018,.016,mat('#998969'),group,0);
 glassWall(54,6,40,PI/2,1.4);glassWall(46,-14,16,0,1.4);glassWall(46,26,16,0,1.4);
 box(46,.5,-12,13,.9,1.5,mat('#6a7d6c'),group,.1);for(const x of [41,46,51])plant(x,-12,1.25);
 box(41.5,.5,24,5,.9,1.5,mat('#6a7d6c'),group,.1);plant(40,23.7,1.6);plant(44,23.7,1.25);
 // A quiet bistro table and a low sea-facing bench, separate from the games and bar.
 cylinder(42.5,.68,17,.9,.9,.1,b.white);cylinder(42.5,.34,17,.1,.22,.62,b.silver);chair(40.9,17,PI/2,sofa);chair(44.1,17,-PI/2,sofa);
 box(42.3,.46,-7,4.8,.7,1.6,sofa,group,.16);box(42.3,.9,-6.35,4.8,1.0,.25,sofa,group,.12);for(const x of [40.8,43.8])box(x,.83,-6.95,.8,.65,.24,cushion,group,.1);
 cylinder(42.3,.48,-9.3,.73,.73,.09,b.oak);cylinder(42.3,.25,-9.3,.12,.3,.44,b.silver);
 b.colliders.push({x:42.3,z:-7,w:4.9,d:1.9},{x:42.5,z:17,w:1.9,d:1.9});
 // A modelled foosball table: pitch, eight steel rods, players, goals and score beads.
 const game=new THREE.Group();game.name='Biliardino panoramico';game.position.set(49.5,0,-3.2);group.add(game);
 const gameWood=mat('#75604b',{roughness:.48}),teal=mat('#225f64',{roughness:.62}),warm=mat('#b87255',{roughness:.65});
 box(0,.84,0,2.55,.46,1.50,gameWood,game,.09);for(const x of [-1.02,1.02])for(const z of [-.5,.5])box(x,.37,z,.16,.74,.16,b.navy,game,.035);
 const pitchTexture=textureCanvas((c,w,h)=>{c.fillStyle='#30665e';c.fillRect(0,0,w,h);for(let i=0;i<8;i++){c.fillStyle=i%2?'#356e63':'#30665e';c.fillRect(i*w/8,0,w/8,h);}c.strokeStyle='#f4f0d6';c.lineWidth=3;c.strokeRect(12,12,w-24,h-24);c.beginPath();c.moveTo(w/2,12);c.lineTo(w/2,h-12);c.stroke();c.beginPath();c.arc(w/2,h/2,h*.19,0,PI*2);c.stroke();c.strokeRect(12,h*.27,w*.13,h*.46);c.strokeRect(w-w*.13-12,h*.27,w*.13,h*.46);},512,256);
 box(0,1.082,0,2.31,.025,1.26,mat('#ffffff',{map:pitchTexture,roughness:.85,metalness:0}),game,0);
 for(const side of [-1,1]){box(0,1.12,side*.715,2.55,.17,.09,b.oak,game,.025);box(side*1.24,1.10,0,.10,.15,1.5,b.oak,game,.025);box(side*1.29,.98,0,.12,.21,.40,b.dark,game,.015);}
 const formations=[[-.25,.25],[0],[-.39,0,.39],[-.25,.25],[-.25,.25],[-.39,0,.39],[0],[-.25,.25]];
 for(let i=0;i<8;i++){const x=-1.02+i*.292,team=i<4?teal:warm,rod=cylinder(x,1.21,0,.017,.017,2.48,b.silver,game);rod.rotation.x=PI/2;const side=i%2?1:-1;const grip=cylinder(x,1.21,side*1.16,.055,.055,.28,b.navy,game);grip.rotation.x=PI/2;
  for(const z of formations[i]){ball(x,1.29,z,.055,.055,.055,mat('#e5bd94'),game);box(x,1.20,z,.085,.14,.095,team,game,.015);box(x,1.10,z,.065,.075,.085,b.dark,game,.01);}
 }
 ball(.12,1.12,.23,.032,.032,.032,b.white,game);for(const end of [-1,1])for(let i=0;i<10;i++)ball(end*1.20,1.23,-.46+i*.10,.035,.035,.035,end<0?teal:warm,game);
 b.colliders.push({x:49.5,z:-3.2,w:2.65,d:2.65});
 // Corner bar, sheltered by a light bronze pergola; the sea-facing edge stays open.
 const outdoorBar=new THREE.Group();outdoorBar.name='Bar ad angolo della terrazza';group.add(outdoorBar);
 const barStone=mat('#dfd5be',{roughness:.4}),terracotta=mat('#a66e53',{roughness:.8}),bronze=mat('#8c775b',{metalness:.72,roughness:.3});
 box(52, .69,21,1.5,1.36,6.8,teal,outdoorBar,.1);box(52,1.42,21,1.75,.12,7.0,barStone,outdoorBar,.06);
 box(49.1,.69,23.8,7.2,1.36,1.4,teal,outdoorBar,.1);box(49.1,1.42,23.8,7.4,.12,1.65,barStone,outdoorBar,.06);
 for(let z=18;z<24;z+=.32)box(51.22,.73,z,.035,1.15,.065,bronze,outdoorBar,0);
 led(51.15,.28,21,.035,.045,6.4,'#ffe0ad',outdoorBar);led(49.1,.28,22.96,7.0,.045,.035,'#ffe0ad',outdoorBar);
 box(51.9,1.86,22.2,.80,.76,1.05,b.silver,outdoorBar,.08);box(51.47,1.82,22.2,.04,.30,.67,b.dark,outdoorBar,.01);cylinder(51.3,1.57,22.2,.10,.08,.18,b.white,outdoorBar);
 box(48.2,1.56,23.7,1.3,.12,.65,b.oak,outdoorBar,.04);for(const x of [47.85,48.25,48.65]){cylinder(x,1.72,23.7,.09,.075,.25,b.glass,outdoorBar);ball(x,1.64,23.7,.065,.04,.065,mat('#dda447'),outdoorBar);}
 cylinder(50.3,1.56,23.7,.30,.25,.16,barStone,outdoorBar);for(let i=0;i<5;i++)ball(50.1+(i%3)*.17,1.69,23.6+Math.floor(i/3)*.18,.11,.10,.09,mat(i%2?'#d5a14b':'#9caa57'),outdoorBar);
 for(const z of [19,21.2]){cylinder(49.9,.87,z,.43,.43,.14,terracotta,outdoorBar);cylinder(49.9,.44,z,.065,.18,.83,bronze,outdoorBar);}
 for(const x of [47.3,53.2])for(const z of [17.4,24.7]){box(x,1.75,z,.09,3.5,.09,bronze,outdoorBar,.02);b.colliders.push({x,z,w:.2,d:.2});}
 for(const z of [17.4,24.7])box(49.75,3.5,z,7.05,.14,.14,bronze,outdoorBar,.025);
 for(let x=46.3;x<53.3;x+=.55)box(x,3.58,21,.07,.13,7.6,b.oak,outdoorBar,.02);
 for(const x of [47.4,49.6,51.8]){cylinder(x,3.02,21.2,.16,.24,.34,barStone,outdoorBar);led(x,2.86,21.2,.2,.035,.2,'#ffe4b5',outdoorBar);}
 plant(52.4,16.3,1.25);plant(45.4,24.3,1.4);
 b.colliders.push({x:46,z:-12,w:13,d:1.5},{x:41.5,z:24,w:5,d:1.5},{x:52,z:21,w:1.85,d:7.1},{x:49.1,z:23.8,w:7.5,d:1.8},{x:49.9,z:19,w:1,d:1},{x:49.9,z:21.2,w:1,d:1});
 const terraceFeatures=Object.freeze([{id:'biliardino',x:49.5,z:-3.2,w:2.65,d:2.65},{id:'bar',x:52,z:21,w:1.85,d:7.1},{id:'sedute',x:42.3,z:-7,w:4.9,d:1.9}]);
 group.userData.terraceFeatures=terraceFeatures;
 led(53.8,.17,6,.04,.035,39.3);led(46,.17,25.8,15.5,.035,.04);
 // Long, refined light lines emphasize the scale, rather than filling the floor with furniture.
 for(const [x,z,w]of [[-28,-18,12],[-7,-18,12],[-28,4,12],[-28,18,12],[-4,9,8],[-4,21,8],[25,-16,16],[25,13,16],[7,13,1.2],[7,-16,1.2]]){box(x,5.8,z,w,.08,.14,b.dark,group,.03);led(x,5.75,z,w-.25,.025,.09);}
 b.batch();
 const actors=people.map(p=>makeActor({...p,seated:['riunioni','lounge'].includes(p.areaId)}));for(const a of actors){group.add(a.group);b.pickables.push(a.pick);}
 function findRoute(start,end){
  const step=.5,originX=OFFICE.x[0]+.5,originZ=OFFICE.z[0]+.5,cols=Math.round((OFFICE.x[1]-OFFICE.x[0]-1)/step)+1,rows=Math.round((OFFICE.z[1]-OFFICE.z[0]-1)/step)+1;
  const cell=p=>[Math.round((p.x-originX)/step),Math.round((p.z-originZ)/step)],key=(x,z)=>z*cols+x;
  const valid=(x,z)=>{if(x<0||x>=cols||z<0||z>=rows)return false;const px=originX+x*step,pz=originZ+z*step;return !b.colliders.some(c=>Math.abs(px-c.x)<c.w/2+.19&&Math.abs(pz-c.z)<c.d/2+.19);};
  const [sx,sz]=cell(start),[ex,ez]=cell(end);if(!valid(sx,sz)||!valid(ex,ez))return null;const queue=[[sx,sz]],parents=new Map([[key(sx,sz),null]]);let found=false;
  for(let h=0;h<queue.length;h++){const [x,z]=queue[h];if(x===ex&&z===ez){found=true;break;}for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(valid(nx,nz)&&!parents.has(k)){parents.set(k,key(x,z));queue.push([nx,nz]);}}}
  if(!found)return null;const points=[];let k=key(ex,ez);while(k!==null){points.push(new THREE.Vector3(originX+(k%cols)*step,0,originZ+Math.floor(k/cols)*step));k=parents.get(k);}points.reverse();points[0]=start.clone();points[points.length-1]=end.clone();const cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+points[i].distanceTo(points[i-1]));return {points,cumulative,length:cumulative.at(-1)};
 }
 const pauseSpots=[{x:31,z:21,venue:'coffee',lookAt:[35,20]},{x:17.1,z:8.2,venue:'eat',lookAt:[17.1,6.5]},{x:5,z:4,venue:'meeting',lookAt:[8,4]},{x:36.5,z:5,venue:'view',lookAt:[660,-930]},{x:19.9,z:8.2,venue:'eat',lookAt:[19.9,6.5]},{x:36.5,z:7,venue:'view',lookAt:[660,-930]},{x:30,z:17,venue:'coffee',lookAt:[35,20]},{x:8,z:4,venue:'meeting',lookAt:[5,4]}];
 for(const a of actors.filter(a=>!['reception','riunioni','lounge'].includes(a.p.areaId))){const spot=a.p.id==='pasquale'?{x:34,z:-10,venue:'coffee',lookAt:[27,-10]}:pauseSpots[a.p.index%pauseSpots.length];a.route=findRoute(a.home,new THREE.Vector3(spot.x,0,spot.z));if(a.route){a.route.venue=spot.venue;a.route.lookAt=spot.lookAt;}}
 const entrances={reception:[5,21],cfo:[20,-1.5],contabilita:[-15.5,4],consulenza:[-15.5,21],operazioni:[-5,1.5],ricerca:[-8,-7.5],riunioni:[-28,-7.5],lounge:[10,21],terrazza:[10,21]};
 let guestActors=[],guestPending=null,lastUpdate=0;
 function disposeGuest(a){a.group.removeFromParent();a.group.traverse(o=>{if(o.isMesh){if(!o.geometry.userData.shared)o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){m.map?.dispose();m.dispose();}}});}
 function applyGuests(selection){guestActors.forEach(disposeGuest);guestActors=[];let i=0;for(const [room,list]of [['riunioni',selection.meeting],['lounge',selection.lounge]]){list.forEach((profile,j)=>{const appearance=guestAppearance(profile),x=room==='riunioni'?-32+j*8:21.6+j*4.8,z=room==='riunioni'?-21.2:13.8;const a=makeActor({...profile,...appearance,areaId:room,serviceAreaId:profile.areaId,index:20+i++,x,z,homeZ:z,facing:room==='riunioni'?0:PI,isGuest:true,seated:true});a.guestBorn=lastUpdate;group.add(a.group);guestActors.push(a);});}b.pickables.splice(0,b.pickables.length,...actors.map(a=>a.pick),...guestActors.map(a=>a.pick));}
 function fadeGuest(a,alpha){a.group.traverse(o=>{if(o.isMesh&&o!==a.pick){if(!o.material.transparent){o.material.transparent=true;o.material.needsUpdate=true;}o.material.opacity=alpha;}});a.pick.visible=alpha>.2;}
 const ceiling=new THREE.Group();group.add(ceiling);const roof=new THREE.Mesh(new THREE.BoxGeometry(76,.18,52),stone);roof.position.set(0,6.2,0);roof.receiveShadow=true;ceiling.add(roof);const west=new THREE.Mesh(new THREE.BoxGeometry(.18,4.2,52),stone);west.position.set(-38,4.1,0);ceiling.add(west);const entranceWall=new THREE.Mesh(new THREE.BoxGeometry(76,4.8,.2),stone);entranceWall.position.set(0,3.8,26);ceiling.add(entranceWall);ceiling.visible=false;
 const floorPick=new THREE.Mesh(new THREE.PlaneGeometry(76,52),new THREE.MeshBasicMaterial({visible:false}));floorPick.rotation.x=-PI/2;floorPick.position.y=.13;floorPick.userData.floor=true;group.add(floorPick);
 function activateArea(id){
  // The selected office is ready to receive the visitor. Other colleagues keep their routines.
  actors.forEach(a=>a.stationed=false);
  const lead=leadForArea(id),a=actors.find(a=>a.p.id===lead?.id);
  if(!a||a.p.areaId!==id)return;
  a.returning=null;a.escortActive=false;a.group.position.copy(a.home);a.group.rotation.y=areaFacing(a.p);
  a.time=(160-(a.p.index*9)%160)%160;a.lastTime=lastUpdate;a.activity=a.p.areaId==='riunioni'?'meeting':a.p.areaId==='lounge'?'coffee':'work';a.stationed=true;
 }
 return {...b,activateArea,menuPickables:[menuFace],releasePresentation(){[...actors,...guestActors].forEach(a=>a.presenting=false);},presentArea(id){[...actors,...guestActors].forEach(a=>{a.presenting=a.p.areaId===id&&roomAt(a.group.position.x,a.group.position.z)===id;if(a.presenting)a.group.rotation.y=a.p.areaId==='reception'||a.p.id==='pasquale'?0:a.p.areaId==='lounge'?-PI/2:a.p.areaId==='riunioni'?PI/2:PI;});},actors,floorPick,ceiling,entrances,findRoute,get guestActors(){return guestActors;},setGuests(selection,immediate=false){if(immediate||!guestActors.length){applyGuests(selection);if(immediate)guestActors.forEach(a=>a.guestBorn=-1000);}else guestPending={selection,start:lastUpdate};},getActor(id){return [...actors,...guestActors].find(a=>a.p.id===id);},escortTo(id){const a=actors.find(a=>a.p.id==='alessia'),point=entrances[id];if(!point)return null;const path=findRoute(a.group.position,new THREE.Vector3(point[0],0,point[1]));if(!path)return null;a.returning=null;a.escortActive=true;return {actor:a,path};},finishEscort(e){e.actor.escortActive=false;e.actor.returning={path:e.path,progress:1,lastTime:lastUpdate};},setNight(n){for(const m of b.leds)m.emissiveIntensity=.12+n*2.5;},update(t,holdGuests=false){lastUpdate=t;actors.forEach(a=>a.update(t));if(guestPending&&holdGuests)guestPending.start=t;if(guestPending&&t-guestPending.start>.65){applyGuests(guestPending.selection);guestPending=null;}guestActors.forEach(a=>{a.update(t);fadeGuest(a,guestPending?Math.max(0,1-(t-guestPending.start)/.65):Math.min(1,(t-a.guestBorn)/.8));});}};
}

export function createTower(){
 const b=builder(),{group,mat,box,glassWall,led,label,signMark}=b;
 group.name='De Caro Tower — giardino verticale e attico mediterraneo';
 const surface=textureCanvas((c,w,h)=>{const rnd=random(122);c.fillStyle='#dfd4be';c.fillRect(0,0,w,h);for(let i=0;i<480;i++){const y=rnd()*h;c.strokeStyle=`rgba(112,92,64,${.015+rnd()*.055})`;c.lineWidth=.3+rnd()*1.5;c.beginPath();c.moveTo(0,y);c.bezierCurveTo(w*.3,y+rnd()*5,w*.7,y-rnd()*5,w,y+1);c.stroke();}},512,512);
 surface.wrapS=surface.wrapT=THREE.RepeatWrapping;surface.repeat.set(2,3);
 const stone=mat('#f2e5cc',{map:surface,bumpMap:surface,bumpScale:.035,roughness:.78,metalness:0}),edge=mat('#ede4d2',{roughness:.62,metalness:0}),bronze=mat('#9c8664',{roughness:.28,metalness:.72}),shadowStone=mat('#b4aa95',{roughness:.85,metalness:0}),soil=mat('#454c35',{roughness:1}),bark=mat('#756248',{roughness:.95});
 const windows=[mat('#365563',{metalness:.45,roughness:.19,envMapIntensity:1.3}),mat('#65818a',{metalness:.45,roughness:.16,envMapIntensity:1.4}),mat('#273e49',{metalness:.4,roughness:.23})];
 const trees=[],shrubs=[],rnd=random(714);
 function garden(x,y,z,w,d,density=4){
  box(x,y-.05,z,w,.5,d,stone,group,.12);box(x,y+.25,z,w-.35,.24,d-.35,soil,group,0);
  for(let i=0;i<density;i++){const xx=x+(rnd()-.5)*(w-1),zz=z+(rnd()-.5)*(d-.8);shrubs.push({x:xx,y:y+.55,z:zz,s:.65+rnd()*.45});if(i%3===0)trees.push({x:xx,y:y+.35,z:zz,s:1.05+rnd()*.65});}
 }
 function skyGarden(y,w,d){
  box(-4,y-.5,0,w,1.1,d,edge,group,.25);box(-4,y+.08,0,w-.6,.10,d-.6,shadowStone,group,0);
  for(const side of [-1,1]){garden(-4,y+.35,side*(d/2-2),w-4,3.0,18);garden(-4+side*(w/2-2),y+.35,0,3.0,d-9,12);}
  for(const side of [-1,1]){led(-4,y-.8,side*d/2,w-2,.07,.08,'#ffe6b9');for(let i=0;i<6;i++)box(-4-w/2+3+i*(w-6)/5,y+1.3,side*(d/2-.55),.07,2.5,.08,bronze,group,0);}
 }
 // A planted stone podium roots the tower in the existing waterfront neighbourhood.
 box(0,-.6,6,100,1.2,64,stone,group,.6);box(-4,5.7,0,70,11.4,52,shadowStone,group,.5);
 for(const x of [-35,-24,-13,5,16,27]){box(x,5.8,26.3,1.25,11.6,1.4,stone,group,.06);box(x,5.8,-26.3,1.25,11.6,1.4,stone,group,.06);}
 box(-4,5.6,26.1,68,10.3,.3,windows[0],group,0);box(-4,11.7,0,73,1.2,55,edge,group,.25);
 garden(-4,12.1,-23,65,5,26);garden(-28,12.1,14,14,16,18);garden(25,12.1,13,12,17,18);
 // Three subtly stepped volumes, with deep, offset planted balconies instead of a glass block.
 const levels=46,floorHeight=3.45;
 for(let f=0;f<levels;f++){
  const y=14+f*floorHeight,w=f<18?55:f<34?50:46,d=f<18?43:f<34?39:35,cx=-4;
  box(cx,y+.6,0,w,3.35,d,windows[f%3],group,.025);
  box(cx,y-1.02,0,w+.6,.5,d+.6,edge,group,0);
  for(const side of [-1,1]){
   // Wide stone piers and bronze vertical reveals keep the glazing recessed.
   for(let j=0;j<6;j++){const x=cx-w/2+1+j*(w-2)/5;box(x,y+.45,side*(d/2+.28),.62,3.3,.7,stone,group,0);box(x+.43,y+.45,side*(d/2+.48),.075,3.1,.075,bronze,group,0);}
   for(let j=0;j<4;j++)box(cx+side*(w/2+.28),y+.45,-d/2+1+j*(d-2)/3,.7,3.3,.62,stone,group,0);
   const shift=((f+(side>0?1:0))%3-1)*8.5,bw=f%4===0?25:17;
   box(cx+shift,y-.78,side*(d/2+2.15),bw,.48,4.8,edge,group,.10);
   box(cx+shift,y+.05,side*(d/2+4.35),bw,.95,.44,stone,group,.08);
   garden(cx+shift,y-.3,side*(d/2+3.55),bw-1,1.25,f%2?7:10);
   for(const dx of [-bw/2+.4,bw/2-.4])box(cx+shift+dx,y+.02,side*(d/2+2.1),.11,1.2,4.1,bronze,group,0);
   if(f%3===1){const z=(f%2?1:-1)*6;box(cx+side*(w/2+2.15),y-.78,z,4.8,.48,14,edge,group,.1);garden(cx+side*(w/2+3.5),y-.3,z,1.3,13,7);}
  }
 }
 skyGarden(76,67,52);skyGarden(131,61,48);skyGarden(172,74,54);
 // Broad 76 × 52 penthouse: matches the usable interior and the 640 m² terrace.
 for(const x of [-32,32])for(const z of [-21,21])box(x,170,z,1.1,10,1.1,stone,group,.08);
 box(0,174.5,0,77,1.15,53,edge,group,.25);box(0,175.1,0,76,.12,52,stone,group,0);
 glassWall(0,-26,76,0,6.1).position.y=175;glassWall(38,-6,40,PI/2,6.1).position.y=175;glassWall(0,26,76,0,6.1).position.y=175;glassWall(-38,0,52,PI/2,6.1).position.y=175;
 for(const x of [-37,-12,12,37]){box(x,178.1,-26.15,.85,6.2,.9,stone,group,.04);box(x,178.1,26.15,.85,6.2,.9,stone,group,.04);}
 box(0,181.6,0,80,.9,56,edge,group,.25);led(0,181.08,26.9,77,.07,.1);led(38.9,181.08,0,.1,.07,53);
 garden(-4,182.3,-24,70,3,24);garden(-4,182.3,24,70,3,24);garden(-35,182.3,0,4,43,20);
 for(let x=-28;x<30;x+=5)box(x,183.1,12,1,1.2,.9,bronze,group,.025);
 box(46,175.1,6,16,.5,40,stone,group,.2);glassWall(54,6,40,PI/2,1.4).position.y=175.35;glassWall(46,-14,16,0,1.4).position.y=175.35;glassWall(46,26,16,0,1.4).position.y=175.35;
 for(const z of [-11,23])garden(46,175.6,z,12,2,8);garden(51,175.6,4,2,22,12);
 for(const x of [-43,43])for(const z of [-24,-7,16])garden(x,.3,z,6,5,6);
 // Native instancing: layered foliage and trunks share geometry/materials on phones too.
 const foliage=[mat('#526a47',{roughness:.93,metalness:0}),mat('#778b57',{roughness:.95,metalness:0}),mat('#87957b',{roughness:.9,metalness:0})],dummy=new THREE.Object3D();
 const crowns=[[],[],[]];trees.forEach((t,i)=>{for(let j=0;j<3;j++)crowns[(i+j)%3].push({x:t.x+Math.cos(j*2.4)*t.s*.35,y:t.y+2.0*t.s+j*.2,z:t.z+Math.sin(j*2.4)*t.s*.35,sx:t.s*(.8+j*.08),sy:t.s*(.8+j*.08),sz:t.s*(.7+j*.07)});});
 shrubs.forEach((t,i)=>crowns[i%3].push({x:t.x,y:t.y,z:t.z,sx:t.s,sy:t.s*.6,sz:t.s*.75}));
 let vegetationInstances=0;
 for(let k=0;k<3;k++){const list=crowns[k],mesh=new THREE.InstancedMesh(new THREE.SphereGeometry(1,9,6),foliage[k],list.length);mesh.name='Chiome mediterranee '+k;list.forEach((q,i)=>{dummy.position.set(q.x,q.y,q.z);dummy.scale.set(q.sx,q.sy,q.sz);dummy.rotation.set(0,i*.7,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();group.add(mesh);vegetationInstances+=list.length;}
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.07,.13,1,7),bark,trees.length);trunks.name='Tronchi dei giardini verticali';trees.forEach((t,i)=>{dummy.position.set(t.x,t.y+t.s*.95,t.z);dummy.scale.set(t.s,t.s*1.9,t.s);dummy.rotation.set(0,0,(i%3-1)*.08);dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);});trunks.castShadow=true;trunks.computeBoundingSphere();group.add(trunks);
 // A quiet stone crown carries the name; the entry is a sheltered, planted loggia.
 box(-4,163,23.5,27,7.8,.7,stone,group,.12);label('DE CARO',-4,164,23.9,22,2.2,'#314b50');label('T O W E R',-4,161.5,23.91,17,1.0,'#675f4c');
 box(-4,7.2,30,29,.6,9,edge,group,.25);for(const x of [-17,9])box(x,3.7,33,.6,7.4,.6,bronze,group,.04);
 box(-4,3.6,26.5,20,6.8,.1,windows[0],group,0);signMark(-15,4.0,26.7,1.6);label('Studio De Caro',-2,4.8,26.7,17,1.7,'#f9edcf');label('tax and corporate consulting',-2,2.8,26.72,15,.65,'#ecddbb');led(-4,6.8,33.4,27,.08,.08);
 for(const x of [-25,25]){box(x,.9,33,9,1.1,1.3,b.oak,group,.15);led(x,.43,33.7,8.5,.08,.04);}
 b.batch();group.userData.architecture={concept:'A + attico e terrazze C',penthouse:[76,52],terraceArea:640,plantedBalconies:levels*2,skyGardens:3,trees:trees.length,vegetationInstances};
 return {...b,setNight(n){for(const m of b.leds)m.emissiveIntensity=n?2.4:.10;windows.forEach((m,i)=>{m.emissive.set(i===1?'#cba876':'#385564');m.emissiveIntensity=n?(i===1?.25:.10):0;});},update(){}};
}
