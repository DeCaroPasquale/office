import assert from 'node:assert/strict';
import fs from 'node:fs';
import {people,areas,leadForArea} from '../dist/data.js';
import {guestProfiles} from '../dist/guests.js';
import {createGuestPool,guestAppearance,collaboratorMessage,GUEST_REFRESH_MS} from '../dist/life.js';
import {roomAt} from '../dist/rooms.js';

assert.equal(people.length,16);assert.equal(people.filter(p=>p.fullCard).length,8);
assert.deepEqual(['contabilita','consulenza','operazioni','ricerca'].map(id=>leadForArea(id).name),['Beatrice','Chiara','Lorenzo','Luca']);
assert.equal(leadForArea('reception').name,'Alessia');assert.equal(leadForArea('lounge').name,'Adriana');
assert.ok(people.find(p=>p.id==='francesca'&&p.name==='Francesca'));
assert.equal(guestProfiles.length,100);assert.equal(new Set(guestProfiles.map(g=>g.name)).size,100);assert.equal(new Set(guestProfiles.map(g=>g.question)).size,100);
assert.equal(guestProfiles.filter(g=>g.gender==='m').length,50);assert.equal(guestProfiles.filter(g=>g.gender==='f').length,50);
assert.equal(new Set(guestProfiles.map(g=>JSON.stringify(guestAppearance(g)))).size,100);
assert.ok(guestProfiles.every(g=>areas.some(a=>a.id===g.areaId)&&g.collect&&leadForArea(g.areaId).fullCard));
assert.equal(GUEST_REFRESH_MS,180000);
let seed=41;const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};const pool=createGuestPool(random),seen=new Set();
for(let i=0;i<300;i++){const pair=pool.next(),all=[...pair.meeting,...pair.lounge];assert.ok([1,2].includes(pair.meeting.length));assert.ok([1,2].includes(pair.lounge.length));assert.equal(new Set(all.map(g=>g.id)).size,all.length);all.forEach(g=>seen.add(g.id));}assert.equal(seen.size,100);
for(const p of people.filter(p=>!p.fullCard)){const work=collaboratorMessage(p,'work'),talk=collaboratorMessage(p,'meeting'),coffee=collaboratorMessage(p,'coffee');assert.equal(work.leader.id,leadForArea(p.areaId).id);assert.ok(work.text.includes('già cliente'));assert.ok(talk.text.includes('confrontando'));assert.ok(coffee.text.includes('energie'));}
for(const p of people){const z=p.homeZ??(['reception','riunioni','lounge'].includes(p.areaId)?p.z:p.z+1.3);assert.equal(roomAt(p.x,z),p.areaId,'Assigned room for '+p.id);}
assert.equal(roomAt(7,21),null,'Reception circulation must remain clear');assert.equal(roomAt(46,4),'terrazza');
const app=fs.readFileSync('dist/office.js','utf8'),css=fs.readFileSync('dist/experience.css','utf8');
assert.ok(app.includes("$('social-dialog').open||escort"));assert.ok(app.includes('office.update(lifeTime,')&&app.includes("$('social-dialog').open"));
assert.ok(app.includes("if(!p.fullCard){openCollaborator(p);return;}"));
assert.ok(app.includes('window.open(CONTACT.alterego'));assert.ok(!app.includes('<iframe'));assert.ok(!app.includes('napoli-giorno.png'));
assert.ok(app.includes('startEscort(answer.area)')&&app.includes("$('escort-skip').addEventListener('click',finishEscort)"));
assert.ok(css.includes('(pointer:coarse)')&&fs.readFileSync('dist/style.css','utf8').includes('touch-action:none'));
console.log('PASS: eight main cards, 100 distinct profiles and appearances, 50/50 split, randomized groups, state-specific messages, department routing, visit rooms, guarded refresh and dedicated AlterEgo window.');
