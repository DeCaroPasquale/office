import {people,leadForArea,areaById} from './data.js';
const PI=Math.PI;
export const areaFacing=p=>p.areaId==='riunioni'?PI/2:homeFacing(p);
export const homeFacing=p=>p.areaId==='reception'||p.id==='pasquale'?0:p.areaId==='lounge'?-PI/2:PI;
export function homePoint(p){return {x:p.x,z:p.homeZ??(['reception','riunioni','lounge'].includes(p.areaId)?p.z:p.z+1.3),y:1.72,angle:homeFacing(p)};}
function point(p,actor){return actor?{x:actor.group.position.x,z:actor.group.position.z,y:1.72,angle:actor.group.rotation.y}:{x:p.x,z:p.homeZ??(['reception','riunioni','lounge'].includes(p.areaId)?p.z:p.z+1.3),y:1.72,angle:homeFacing(p)};}
// Frame actual faces. Local +Z is the front of every character, including while walking.
export function personView(p,actor,aspect=1.6){
 const q=point(p,actor),front={x:Math.sin(q.angle),z:Math.cos(q.angle)},side={x:front.z,z:-front.x};
 const d=aspect<.8?7.8:6.8;
 return {position:[q.x+front.x*d+side.x*1.05,3.0,q.z+front.z*d+side.z*1.05],target:[q.x,q.y,q.z],faces:[q]};
}
// Department views use desk anchors, never the current location or number of people.
export function areaView(id,_actors=[],aspect=1.6,availableFraction=1){
 const a=areaById(id);if(id==='terrazza'){const scale=Math.max(1,.78/(aspect*availableFraction));return {position:a.view.map((v,i)=>a.target[i]+(v-a.target[i])*scale),target:a.target,faces:[],fov:aspect<.8?76:45};}
 const primary=leadForArea(id),angle=areaFacing(primary),front={x:Math.sin(angle),z:Math.cos(angle)},side={x:front.z,z:-front.x};
 const faces=people.filter(p=>p.areaId===id).map(p=>({...homePoint(p),personId:p.id,angle}));
 // Reserve both guest seats so social spaces also keep the same composition on every visit.
 if(id==='riunioni')for(const x of [-32,-24])faces.push({x,z:-21.2,y:1.72,angle});
 if(id==='lounge')for(const x of [21.6,26.4])faces.push({x,z:13.8,y:1.72,angle});
 const minX=Math.min(...faces.map(q=>q.x)),maxX=Math.max(...faces.map(q=>q.x)),minZ=Math.min(...faces.map(q=>q.z)),maxZ=Math.max(...faces.map(q=>q.z)),cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
 const breadth=Math.max(...faces.map(q=>(q.x-cx)*side.x+(q.z-cz)*side.z))-Math.min(...faces.map(q=>(q.x-cx)*side.x+(q.z-cz)*side.z));
 const depth=Math.max(...faces.map(q=>(q.x-cx)*front.x+(q.z-cz)*front.z));
 const fov=aspect<.8?Math.min(95,Math.max(58,2*Math.atan(Math.tan(38*PI/180)*.46/aspect)*180/PI)):45,d=Math.max(7.8,(breadth+4.3)/(2*Math.tan(fov*PI/360)*Math.max(.22,aspect*availableFraction))*.94)+depth;
 // Eye-level emphasis, with enough elevation to see the second row of desks.
 const y=faces.length>3?3.8:3.2;
 return {position:[cx+front.x*d+side.x*.5,y,cz+front.z*d+side.z*.5],target:[cx,1.65,cz],faces,fov};
}
