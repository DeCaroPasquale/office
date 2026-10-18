import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {floorMapSVG} from '../dist/wayfinding.js';
import {areaView,personView,homeFacing} from '../dist/viewpoints.js';
import {areas,people} from '../dist/data.js';
import {TOUR_STOPS,tourDuration,ALESSIA_WELCOME} from '../dist/tour.js';
assert.equal((floorMapSVG().match(/data-map-area=/g)??[]).length,9);
assert.deepEqual(new Set(TOUR_STOPS.map(s=>s.area)),new Set(areas.map(a=>a.id)));
const duration=TOUR_STOPS.reduce((t,s)=>t+tourDuration(s),0);assert.ok(duration>=60000&&duration<=80000);
assert.ok(ALESSIA_WELCOME.startsWith('Benvenuto nello Studio De Caro, sono Alessia.'));
const html=fs.readFileSync('dist/index.html','utf8'),app=fs.readFileSync('dist/office.js','utf8');
assert.ok(!html.includes('room-banners')&&!app.includes('placeRoomBanners'));
assert.ok(!html.includes('UNA NUOVA PROSPETTIVA'));assert.ok(!html.includes('ESPERIENZA INTERATTIVA')&&!html.includes('NAPOLI · SEDE VIRTUALE'));assert.ok(app.includes("['Tour veloce',startTour]"));
for(const [w,h]of [[390,844],[844,390],[768,1024],[1440,900]]){
 for(const guided of [false,true])for(const a of areas.filter(a=>a.id!=='terrazza')){
  const fraction=guided&&(w>1100||h<=520)?Math.max(.3,1-((h<=520?w*.44:540)+40)/w):1;
  const v=areaView(a.id,[],w/h,fraction);
  const wandering=people.map(p=>({p,group:{position:new THREE.Vector3(30,0,20),rotation:{y:.37}}}));assert.deepEqual(areaView(a.id,wandering,w/h,fraction),v,`The ${a.id} camera must not follow wandering people`);
  const camera=new THREE.PerspectiveCamera(v.fov??45,w/h,.1,24000);camera.position.set(...v.position);camera.lookAt(new THREE.Vector3(...v.target));camera.updateMatrixWorld();if(guided){if(w<=1100&&h>520)camera.setViewOffset(w,h,0,140,w,h);else camera.setViewOffset(w,h,-(h<=520?w*.44:540)*.43,0,w,h);}
  for(const q of v.faces){const front=new THREE.Vector3(Math.sin(q.angle),0,Math.cos(q.angle)),toCamera=camera.position.clone().sub(new THREE.Vector3(q.x,0,q.z));toCamera.y=0;assert.ok(front.dot(toCamera.normalize())>.75,`${a.id}: face not visible at ${w} × ${h}`);
   const face=new THREE.Vector3(q.x,q.y,q.z).project(camera);assert.ok(Math.abs(face.x)<.96&&Math.abs(face.y)<.9,`${a.id}: cropped face at ${w} × ${h}`);
  }
 }
 for(const p of people)for(const yaw of [homeFacing(p),0,Math.PI/2,Math.PI,-Math.PI/2]){
  const actor={group:{position:new THREE.Vector3(p.x+2,0,p.z+3),rotation:{y:yaw}}};const v=personView(p,actor,w/h),front=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw)),ray=new THREE.Vector3(...v.position).sub(actor.group.position);ray.y=0;
  assert.ok(front.dot(ray.normalize())>.98,`${p.name}: portrait from the wrong side while moving`);
 }
}
for(const [w,h]of [[390,844],[844,390],[768,1024],[1440,900]]){const v=areaView('terrazza',[],w/h),c=new THREE.PerspectiveCamera(v.fov,w/h,.1,24000);c.position.set(...v.position);c.lookAt(new THREE.Vector3(...v.target));c.updateMatrixWorld();for(const x of [39,53])for(const z of [-12,24]){const p=new THREE.Vector3(x,1,z).project(c);assert.ok(Math.abs(p.x)<.98&&Math.abs(p.y)<.98,`Terrace corner cropped at ${w} × ${h}`);}}
console.log(`PASS: nine map destinations without floating banners; nine-stop tour (${Math.round(duration/1000)} s); face-side group framing and moving-person portraits at four viewport ratios.`);
