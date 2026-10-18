import assert from 'node:assert/strict';
const context=new Proxy({},{get(o,k){if(k==='measureText')return s=>({width:String(s).length*15});if(!(k in o))o[k]=()=>{};return o[k];},set(o,k,v){o[k]=v;return true;}});
globalThis.document={createElementNS(){return {addEventListener(){},removeEventListener(){}};},createElement(){return {width:0,height:0,getContext:()=>context};}};
const {createOffice,createTower}=await import('../dist/world.js');
const {OFFICE,insideWalkBounds}=await import('../dist/rooms.js');
const office=createOffice(),tower=createTower();
assert.equal(office.actors.length,16);assert.equal(office.pickables.length,16);
for(const root of [office.group,tower.group]){root.updateMatrixWorld(true);root.traverse(o=>{if(!o.isMesh)return;assert.ok(Number.isFinite(o.position.x)&&Number.isFinite(o.position.y)&&Number.isFinite(o.position.z));for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v),'Invalid geometry coordinate');});}
const labels=new Set();office.group.traverse(o=>{if(o.material?.map?.userData?.text)labels.add(o.material.map.userData.text);});for(const p of office.actors.map(a=>a.p))assert.ok(labels.has(p.name),'Missing nameplate: '+p.name);
const paths=office.actors.filter(a=>a.route);assert.ok(paths.length>=4,'Walking routes were not found');assert.ok(office.actors.find(a=>a.p.id==='pasquale').route,'Pasquale needs a walking route');
for(const t of [0,3,31,80,95,111,140,190])office.update(t);
for(const a of office.actors){assert.ok(insideWalkBounds(a.group.position.x,a.group.position.z),'Actor outside enlarged floor: '+a.p.id);if(a.route){for(const p of a.route.points){assert.ok(!office.colliders.some(c=>Math.abs(p.x-c.x)<c.w/2+.1&&Math.abs(p.z-c.z)<c.d/2+.1),'Walking route crosses a partition or desk: '+a.p.id);}}}
const {createGuestPool}=await import('../dist/life.js');
const {areas}=await import('../dist/data.js');
const {createScenery}=await import('../dist/scenery.js');
for(const id of areas.filter(a=>a.id!=='reception').map(a=>a.id)){const escort=office.escortTo(id);assert.ok(escort,'Missing escort route: '+id);assert.ok(escort.path.length>0);office.finishEscort(escort);}
assert.equal(paths.length,13,'Every operational person needs a route');
const pool=createGuestPool(),first=pool.next();office.setGuests(first,true);office.update(191);assert.equal(office.guestActors.length,first.meeting.length+first.lounge.length);assert.equal(office.pickables.length,16+office.guestActors.length);
const oldIds=office.guestActors.map(a=>a.p.id),second=pool.next();office.setGuests(second);office.update(192,true);assert.deepEqual(office.guestActors.map(a=>a.p.id),oldIds,'Do not replace guests during a conversation');office.update(195,true);assert.deepEqual(office.guestActors.map(a=>a.p.id),oldIds);office.update(196);assert.deepEqual(office.guestActors.map(a=>a.p.id),[...second.meeting,...second.lounge].map(g=>g.id));
assert.ok((OFFICE.x[1]-OFFICE.x[0])*(OFFICE.z[1]-OFFICE.z[0])>=1200*3,'The floor needs at least three times its former usable area');
const scenery=createScenery({elevated:true,compact:true});
scenery.group.updateMatrixWorld(true);const THREE=await import('three');for(const [x,z]of [[0,0],[-77,6],[78,6],[0,75]]){const ray=new THREE.Raycaster(new THREE.Vector3(x,0,z),new THREE.Vector3(0,-1,0));assert.ok(ray.intersectObject(scenery.land).length,'Land must really cover tower and urban blocks');}const neighbors=scenery.buildings.filter(b=>b.near&&Math.hypot(b.x,b.z)<180);assert.ok(neighbors.length>=12,'Tower must stand in a populated neighborhood');assert.ok(neighbors.every(b=>Math.abs(b.x)-b.w/2>54||Math.abs(b.z)-b.d/2>40),'Neighbors overlap the tower forecourt');for(const n of [0,.5,1])scenery.update(33,n);scenery.group.traverse(o=>{if(!o.isMesh&&!o.isPoints)return;for(const v of o.geometry.attributes.position.array)assert.ok(Number.isFinite(v),'Scenery coordinate is invalid');});
const {REGATTA_TEAMS,racePose}=await import('../dist/regatta.js');
assert.equal(scenery.regatta.boats.length,7);assert.equal(new Set(REGATTA_TEAMS.map(t=>t.id)).size,7);assert.equal(scenery.regatta.pickables.length,7);assert.ok(REGATTA_TEAMS.some(t=>t.id==='luna-rossa'));
for(const t of [0,25,90,180,280]){scenery.regatta.update(t);scenery.group.updateMatrixWorld(true);for(const b of scenery.regatta.boats){const p=b.group.position;assert.ok(Number.isFinite(p.x)&&Number.isFinite(p.z));const ray=new THREE.Raycaster(new THREE.Vector3(p.x,100,p.z),new THREE.Vector3(0,-1,0));assert.equal(ray.intersectObject(scenery.land).length,0,'Racecourse must stay offshore');}}
assert.notDeepEqual(racePose(0,0),racePose(20,0),'The fleet needs actual movement');assert.ok(office.actors.some(a=>a.route?.venue==='eat'));assert.ok(office.actors.some(a=>a.route?.venue==='view'));
for(const a of office.actors.filter(a=>['eat','view'].includes(a.route?.venue))){const dest=a.route.points.at(-1);assert.ok(dest.x>12&&dest.x<38&&dest.z>3&&dest.z<26,'Dining and viewing pauses belong in the lounge');a.time=115-a.p.index*9;a.lastTime=300;office.update(300);assert.equal(a.activity,a.route.venue);}
// Department selection must summon its own lead and keep the same room, even during a break.
const {leadForArea}=await import('../dist/data.js');const {roomAt}=await import('../dist/rooms.js');
let visitTime=400;
for(const id of ['cfo','contabilita','consulenza','operazioni','ricerca']){
 const leader=office.getActor(leadForArea(id).id),other=office.actors.find(a=>a.p.areaId===id&&!a.p.fullCard);
 leader.group.position.set(31,0,21);leader.activity='coffee';const colleagueBefore=other?.group.position.clone();
 office.activateArea(id);assert.ok(leader.group.position.equals(leader.home));assert.equal(roomAt(leader.group.position.x,leader.group.position.z),id);assert.equal(leader.stationed,true);
 if(other)assert.ok(other.group.position.equals(colleagueBefore),'Colleagues must keep their routines');
 office.update(visitTime);office.releasePresentation();office.update(visitTime+180);assert.ok(leader.group.position.equals(leader.home),'Lead must remain available while office is selected');
 office.activateArea(null);assert.ok(office.actors.every(a=>!a.stationed));office.update(visitTime+180.1);assert.ok(leader.group.position.distanceTo(leader.home)<.1,'Leaving the department must not jump back to a break');visitTime+=200;
}
const terrace=office.group.userData.terraceFeatures;assert.deepEqual(terrace.map(f=>f.id),['biliardino','bar','sedute']);
for(const f of terrace){assert.ok(f.x-f.w/2>38&&f.x+f.w/2<54&&f.z-f.d/2>-14&&f.z+f.d/2<26,'Outdoor furniture outside terrace');assert.ok(office.colliders.some(c=>c.x===f.x&&c.z===f.z),'Missing outdoor furniture collider');}
for(let x=38;x<=46;x+=.25)assert.ok(!office.colliders.some(c=>Math.abs(x-c.x)<c.w/2+.32&&Math.abs(11-c.z)<c.d/2+.32),'Terrace doorway path obstructed');
for(let z=-9;z<=21;z+=.25)assert.ok(!office.colliders.some(c=>Math.abs(46-c.x)<c.w/2+.32&&Math.abs(z-c.z)<c.d/2+.32),'Central outdoor promenade obstructed');
const routeSnapshots=paths.map(a=>({actor:a,route:a.route}));
// Check actual face rays in the real room geometry, including foreground signs and screens.
const {areaView}=await import('../dist/viewpoints.js');
const architecture=tower.group.userData.architecture;
assert.equal(architecture.skyGardens,3);assert.equal(architecture.plantedBalconies,92);assert.ok(architecture.trees>200);assert.deepEqual(architecture.penthouse,[76,52]);
for(const a of [...office.actors,...office.guestActors]){a.route=null;a.returning=null;a.time=0;a.group.position.copy(a.home);}
office.update(301);office.ceiling.visible=false;const opaque=[];
office.group.traverse(o=>{if(o.isMesh&&o.material.visible!==false&&!o.material.transparent)opaque.push(o);});
for(const [w,h]of [[390,844],[844,390],[768,1024],[1440,900]])for(const guided of [false,true])for(const a of areas.filter(a=>a.id!=='terrazza')){
 office.presentArea(a.id);office.group.updateMatrixWorld(true);
 const fraction=guided&&(w>1100||h<=520)?Math.max(.3,1-((h<=520?w*.44:540)+40)/w):1;
 const v=areaView(a.id,[...office.actors,...office.guestActors],w/h,fraction),from=new THREE.Vector3(...v.position);
 for(const face of v.faces){
  let clear=0;for(const eye of [-.14,0,.14]){
   const target=new THREE.Vector3(face.x+Math.cos(face.angle)*eye,face.y+.16,face.z-Math.sin(face.angle)*eye),distance=from.distanceTo(target),ray=new THREE.Raycaster(from,target.clone().sub(from).normalize(),.1,distance-.43);
   const hit=ray.intersectObjects(opaque,false).find(h=>{for(let p=h.object;p;p=p.parent)if(!p.visible)return false;return true;});if(!hit)clear++;
  }
  assert.ok(clear>=2,`${a.id}: geometry blocks a face at ${w} × ${h}, tour=${guided}`);
 }
 const selected=office.actors.filter(p=>p.presenting),before=selected.map(p=>p.group.position.clone());office.update(301.1);selected.forEach((p,i)=>assert.ok(p.group.position.equals(before[i]),'A presented person walks out of frame'));
 office.releasePresentation();assert.ok([...office.actors,...office.guestActors].every(p=>!p.presenting));
}
routeSnapshots.forEach(({actor,route})=>actor.route=route);
const count=root=>{let meshes=0,triangles=0;root.traverse(o=>{if(o.isMesh&&o.material.visible!==false){meshes++;triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);}});return {meshes,triangles:Math.round(triangles)};};
console.log(JSON.stringify({status:'PASS',office:count(office.group),tower:count(tower.group),napoli:count(scenery.group),neighborBuildings:neighbors.length,regattaTeams:scenery.regatta.boats.map(b=>b.team.name),pauses:[...new Set(paths.map(a=>a.route.venue))],walking:paths.map(a=>({person:a.p.id,meters:Math.round(a.route.length)})),architecture,terraceFeatures:terrace.map(f=>f.id),checks:'fixed departments, lead home/hold/release, clear terrace access and promenade, face rays without opaque occlusion, presentation hold/release, planted tower, finite geometry, 16 actors, 100-profile guest rotation, interaction hold, eight escort destinations, 13 walking routes, 3D scenery'},null,2));
