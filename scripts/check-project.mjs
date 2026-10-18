import assert from 'node:assert/strict';
import fs from 'node:fs';
import {areas,people,CONTACT} from '../dist/data.js';
import {recognize,topics,contactLinks,contactSummary} from '../dist/dialogues.js';
assert.equal(areas.length,9);assert.equal(people.length,16);assert.equal(people.filter(p=>p.areaId==='reception'&&p.gender==='f').length,1);assert.deepEqual(Object.fromEntries(areas.slice(0,6).map(a=>[a.id,people.filter(p=>p.areaId===a.id).length])),{reception:1,cfo:1,contabilita:5,consulenza:2,operazioni:3,ricerca:2});
for(const [id,t]of Object.entries(topics)){assert.ok(t.choices.every(c=>topics[c]),id+' references an unknown topic');assert.ok(t.area===null||areas.some(a=>a.id===t.area));}
const routes=[['Ho una SRL e vorrei la contabilità','contabilita'],['Vorrei aprire una partita IVA','partita-iva'],['Mi serve un piano industriale per la banca','piano-industriale'],['Cerco finanza agevolata','agevolazioni'],['Devo trasformare una SNC in SRL','trasformazione'],['Vorrei digitalizzare i processi','processi'],['Mi aiutate con il cash flow?','liquidita'],['Quanto costa?','prezzi'],['Vorrei fissare un appuntamento','appuntamento'],['Sono un creator su YouTube','creator'],['Voglio cambiare commercialista','cambio-studio'],['Domanda non prevista xyz','NO']];
for(const [s,id]of routes)assert.equal(recognize(s)??'NO',id,s);
assert.equal(topics.agevolazioni.area,'consulenza');assert.equal(topics.automazione.area,'ricerca');
const state={area:'contabilita',messages:[{role:'user',text:'Una SRL & un progetto? <script>alert(1)</script>'}]};const links=contactLinks(state);assert.equal(links.calendar,CONTACT.calendar);assert.ok(links.whatsapp.startsWith('https://wa.me/393288038318?text='));assert.ok(links.email.startsWith('mailto:pasqualedecaro@live.it?subject='));assert.ok(decodeURIComponent(links.email).includes(state.messages[0].text));assert.ok(contactSummary(state).includes('30 minuti'));assert.ok(contactSummary({...state,phone:true}).includes('telefonico'));
const html=fs.readFileSync('dist/index.html','utf8');for(const m of html.matchAll(/(?:src|href)="(\.\/[^"?#]+)(?:[^\"]*)"/g))assert.ok(fs.existsSync('dist/'+m[1].slice(2)),m[1]);
const app=fs.readFileSync('dist/office.js','utf8');for(const m of app.matchAll(/\$\('([^']+)'\)/g)){const id=m[1];if(['area-talk'].includes(id))continue;assert.ok(html.includes('id="'+id+'"'), 'Missing DOM ID: '+id);}
assert.ok(!/Studio Michele|ufficio virtuale.*voxel/.test(html));assert.ok(app.includes('window.open(CONTACT.alterego'));assert.ok(!app.includes('<iframe'));assert.ok(html.includes('id="alterego-open"'));
console.log('PASS: staff, areas, dialogue routing, contacts, user text, duration, DOM IDs and asset references.');
