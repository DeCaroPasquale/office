import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as Three from 'three';
import * as data from '../dist/data.js';
import {cafeMenu} from '../dist/cafe-menu.js';
import * as dialogues from '../dist/dialogues.js';
import * as life from '../dist/life.js';
import {guestProfiles} from '../dist/guests.js';
import {roomAt,OFFICE,insideWalkBounds} from '../dist/rooms.js';
import {floorMapSVG} from '../dist/wayfinding.js';
import {areaView,personView} from '../dist/viewpoints.js';
import {ALESSIA_WELCOME,TOUR_STOPS,tourDuration} from '../dist/tour.js';
import {REGATTA_TEAMS,REGATTA_CENTER} from '../dist/regatta.js';

// Contratto DOM e flussi in assenza di WebGL: non è un collaudo visuale.
const nodes=new Map(),all=new Set();
class Element {
 constructor(tag='div',attrs=''){this.tagName=tag.toUpperCase();this.dataset={};this.children=[];this.handlers={};this.hidden=/\bhidden\b/.test(attrs);this.open=false;this.value='';this.style={};this.textContent='';this.scrollHeight=100;this.classList={add(){},remove(){},toggle(){}};for(const m of attrs.matchAll(/([\w-]+)="([^"]*)"/g)){if(m[1]==='id'){this.id=m[2];nodes.set(this.id,this);}if(['href','target','rel','type'].includes(m[1]))this[m[1]]=m[2];if(m[1].startsWith('data-'))this.dataset[m[1].slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=m[2];}all.add(this);}
 set id(v){this._id=v;nodes.set(v,this);}
 get id(){return this._id;}
 set innerHTML(html){this.html=html;this.children=[];for(const m of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/g))this.children.push(new Element(m[1],m[2]));}
 get innerHTML(){return this.html??'';}
 appendChild(n){this.children.push(n);return n;}
 replaceChildren(){this.children=[];}
 addEventListener(type,fn){(this.handlers[type]??=[]).push(fn);}
 fire(type,event={}){for(const f of this.handlers[type]??[])f({target:this,preventDefault(){},...event});}
 querySelectorAll(selector){return this.children.filter(n=>match(n,selector));}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 setAttribute(k,v){this[k]=v;}
 showModal(){this.open=true;}
 close(){this.open=false;this.fire('close');}
 closest(selector){return selector.split(',').some(t=>t.trim().toUpperCase()===this.tagName)?this:null;}
 getBoundingClientRect(){return {width:380,height:480,left:0,right:380,top:0,bottom:480};}
 setPointerCapture(){}
 focus(){this.focused=true;}
 select(){this.selected=true;}
 setSelectionRange(start,end){this.selectionStart=start;this.selectionEnd=end;}
}
function match(n,selector){if(selector==='dialog[open]')return n.tagName==='DIALOG'&&n.open;if(selector==='dialog')return n.tagName==='DIALOG';const data=selector.match(/^\[data-([\w-]+)\]$/);if(data)return n.dataset[data[1].replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]!==undefined;return false;}
const html=fs.readFileSync('dist/index.html','utf8');for(const m of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*)>/g))new Element(m[1],m[2]);
const handlers={},document={hidden:false,body:new Element('body'),getElementById:id=>nodes.get(id),createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),querySelectorAll:selector=>[...all].filter(n=>match(n,selector)),querySelector:selector=>[...all].find(n=>match(n,selector))??null,addEventListener(type,fn){(handlers[type]??=[]).push(fn);}};
const external=[],window={addEventListener(){},open(url,name,features){external.push({url,name,features});return {opener:null,focus(){}};},visualViewport:{addEventListener(){}}};
const audio={voiceOn:false,musicOn:false,voices:[],onChange(){},cancel(){},speak(){},setVoice(){return false;}};
const timers=new Map();let timerId=0;
const copied=[],navigator={clipboard:{async writeText(text){copied.push(text);}}};
const context=vm.createContext({...data,...dialogues,...life,guestProfiles,cafeMenu,roomAt,OFFICE,insideWalkBounds,floorMapSVG,areaView,personView,ALESSIA_WELCOME,TOUR_STOPS,tourDuration,REGATTA_TEAMS,REGATTA_CENTER,THREE:{...Three,WebGLRenderer:class{constructor(){throw new Error('WebGL absent in DOM contract test');}}},createAudio:()=>audio,document,window,navigator,screen:{availWidth:1440,availHeight:900},innerWidth:1200,innerHeight:900,devicePixelRatio:1,matchMedia:()=>({matches:false}),performance:{now:()=>100},setTimeout:(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;},clearTimeout:id=>timers.delete(id),setInterval:()=>1,console:{error(){},log(){}}});
const source=fs.readFileSync('dist/office.js','utf8').replace(/^import .*;\n/gm,'');
vm.runInContext(source,context);await new Promise(resolve=>setImmediate(resolve));
const run=code=>vm.runInContext(code,context),plain=value=>JSON.parse(JSON.stringify(value));
assert.equal(window.officeReady,true);assert.equal(external.length,0,'No external service opens on initial load');
assert.equal(nodes.get('panel').hidden,true,'Chat must start closed');
assert.equal([...all].filter(n=>n.dataset.roomArea).length,0,'Floating signs are removed');
for(const a of data.areas){[...all].find(n=>n.dataset.area===a.id).fire('click');assert.equal(run('area'),a.id);assert.equal(nodes.get('panel').hidden,true,'Map navigation must not open a chat');}
const firstMap=[...all].find(n=>n.dataset.mapArea==='contabilita');firstMap.fire('keydown',{key:'Enter'});assert.equal(run('area'),'contabilita');assert.equal(nodes.get('panel').hidden,true);
run('enterOffice(true)');assert.equal(nodes.get('panel').hidden,false,'Arrival opens Alessia only');assert.equal(run('activeConversation'),'alessia');assert.equal(run('messages.at(-1).text'),ALESSIA_WELCOME);
assert.deepEqual(nodes.get('choices').children.map(n=>n.textContent),['Tour veloce','Ti racconto cosa mi serve']);
nodes.get('choices').children[0].fire('click');assert.equal(nodes.get('guided-tour').hidden,false);assert.equal(nodes.get('panel').hidden,true);assert.equal(run('activeConversation'),null);
const stale=timers.get(run('tourTimer')).fn;nodes.get('tour-next').fire('click');assert.equal(run('area'),'contabilita');assert.equal(run('tour.index'),1);stale();assert.equal(run('tour.index'),1,'Old callbacks cannot jump the tour');
nodes.get('tour-pause').fire('click');assert.equal(run('tour.paused'),true);assert.ok(!timers.has(run('tourTimer')));nodes.get('tour-pause').fire('click');assert.equal(run('tour.paused'),false);
for(let i=2;i<TOUR_STOPS.length;i++){nodes.get('tour-next').fire('click');assert.equal(run('area'),TOUR_STOPS[i].area);assert.equal(run('activeConversation'),null);assert.equal(nodes.get('panel').hidden,true);}
nodes.get('tour-close').fire('click');assert.equal(run('tour'),null);assert.equal(run('activeConversation'),'alessia');assert.equal(nodes.get('guided-tour').hidden,true);assert.equal(nodes.get('panel').hidden,false);
nodes.get('choices').children[1].fire('click');assert.ok(nodes.get('choices').children.length>=6);assert.ok(run('messages.at(-1).text').includes('Ti ascolto'));
run('startTour()');const cancelled=timers.get(run('tourTimer')).fn;handlers.keydown.forEach(fn=>fn({key:'Escape',target:new Element('div'),preventDefault(){}}));cancelled();assert.equal(run('tour'),null);assert.equal(run('activeConversation'),'alessia');
run('startTour()');run("useArea('consulenza')");assert.equal(run('tour'),null);assert.equal(nodes.get('panel').hidden,true);
run('startTour()');run('showTourStep(8)');nodes.get('tour-next').fire('click');assert.equal(run('tour'),null);assert.equal(run('activeConversation'),'alessia');assert.ok(run('messages.at(-1).text').includes('Ora conosci lo studio'));

run("useArea('contabilita')");assert.equal(nodes.get('panel').hidden,true,'Area navigation must not open a chat');
nodes.get('area-person-open').fire('click');assert.equal(nodes.get('panel').hidden,false);assert.equal(run('activeConversation'),'beatrice');
run("sendText('Domanda esclusiva per Beatrice xyz123')");nodes.get('office-return').fire('click');assert.equal(nodes.get('panel').hidden,true);assert.equal(run('area'),'contabilita');assert.equal(run('activeConversation'),null);run("openPerson('beatrice')");assert.ok(run("messages.some(m=>m.text.includes('xyz123'))"),'Reviewing the office must preserve its conversation');
run("openPerson('chiara')");assert.equal(run('activeConversation'),'chiara');assert.ok(!run("messages.some(m=>m.text.includes('xyz123'))"),'A different lead must not display another conversation');assert.ok(run("messages.filter(m=>m.role==='bot').every(m=>m.personId==='chiara')"));
run("useArea('ricerca')");assert.equal(nodes.get('panel').hidden,true);assert.equal(nodes.get('messages').children.length,0,'Closed chat must remove old bubbles from the DOM');assert.equal(run('activeConversation'),null);
run("openPerson('beatrice')");assert.ok(run("messages.some(m=>m.text.includes('xyz123'))"),'Returning deliberately restores only the selected conversation');
run("useArea('contabilita',{talk:true})");assert.equal(nodes.get('person-name').textContent,'Beatrice');
run("openPerson('marco')");assert.equal(nodes.get('social-title').textContent,'Marco');assert.ok(nodes.get('social-body').innerHTML.includes('Beatrice'));
nodes.get('social-body').querySelector('[data-lead]').fire('click');assert.equal(nodes.get('person-name').textContent,'Beatrice');
for(const [member,leader]of [['davide','Chiara'],['francesca','Lorenzo'],['matteo','Lorenzo'],['alice','Luca']]){run(`openPerson('${member}')`);assert.ok(nodes.get('social-body').innerHTML.includes(leader));nodes.get('social-dialog').close();}
for(const [id,name]of [['beatrice','Beatrice'],['chiara','Chiara'],['lorenzo','Lorenzo'],['luca','Luca']]){run(`openPerson('${id}')`);assert.equal(nodes.get('person-name').textContent,name);assert.equal(nodes.get('social-dialog').open,false);}
run("openPerson('pasquale')");assert.equal(nodes.get('pasquale-tools').hidden,false);assert.equal(external.length,0);
run('openAlterEgo()');assert.equal(external.length,1);assert.equal(external[0].url,data.CONTACT.alterego);assert.equal(run('mode'),'office');
const guest=run('guestSelection.meeting[0].id');run(`openGuest('${guest}')`);assert.equal(run('socialContext.kind'),'guest');assert.ok(nodes.get('social-body').innerHTML.includes('Profilo narrativo'));
const before=plain(run('guestSelection'));run('refreshGuests(1000000)');assert.deepEqual(plain(run('guestSelection')),before,'An open card prevents guest replacement');nodes.get('social-dialog').close();run('refreshGuests(1000000)');assert.notDeepEqual(plain(run('guestSelection')),before);
run("mode='office';view='walk';movement.clear()");const event={key:'ArrowUp',code:'ArrowUp',target:new Element('div'),preventDefault(){}};handlers.keydown.forEach(fn=>fn(event));assert.equal(run("movement.has('forward')"),true);handlers.keyup.forEach(fn=>fn(event));assert.equal(run('movement.size'),0);
handlers.keydown.forEach(fn=>fn({...event,target:new Element('textarea')}));assert.equal(run('movement.size'),0,'Typing must not move the visit');
const forward=[...all].find(n=>n.dataset.move==='forward');forward.fire('pointerdown',{pointerId:1});assert.equal(run("movement.has('forward')"),true);forward.fire('pointercancel');assert.equal(run('movement.size'),0);
assert.equal(external.length,1,'Other interactions do not open external services');
run("useArea('lounge')");assert.equal(nodes.get('cafe-menu-open').hidden,false);nodes.get('cafe-menu-open').fire('click');assert.equal(nodes.get('cafe-menu-dialog').open,true);assert.ok(nodes.get('cafe-menu-content').innerHTML.includes('Matcha latte'));nodes.get('cafe-menu-dialog').close();assert.equal(nodes.get('panel').hidden,true);assert.equal(nodes.get('messages').children.length,0);
run("window.areaPreparations=[];office={actors:[],getActor(){return null;},activateArea(id){window.areaPreparations.push(id);}}");
[...all].find(n=>n.dataset.area==='consulenza').fire('click');assert.equal(window.areaPreparations.at(-1),'consulenza');assert.equal(nodes.get('panel').hidden,true);run("openPerson('beatrice')");assert.equal(window.areaPreparations.at(-1),null,'Selecting a moving person must preserve the deliberate portrait flow');

run("office={colliders:[],actors:[],entrances:{},getActor(){return null;}};camera=new THREE.PerspectiveCamera(45,1.6,.1,24000);controls={target:new THREE.Vector3(),enabled:false};mode='office';view='walk';camera.position.set(7,2.15,21);yaw=0;movement.add('forward');openPerson('chiara');view='walk';movement.add('forward');walk(.05)");
assert.equal(nodes.get('panel').hidden,true,'Walking closes an active chat');assert.equal(run('activeConversation'),null);
for(const [w,h]of [[390,844],[844,390],[768,1024],[1440,900]]){run(`camera.aspect=${w}/${h};camera.updateProjectionMatrix();setView('overview');camera.position.copy(transition.to);camera.lookAt(transition.toTarget);camera.updateMatrixWorld()`);for(const x of [OFFICE.x[0],OFFICE.terrace.x[1]])for(const z of OFFICE.z){const p=plain(run(`new THREE.Vector3(${x},0,${z}).project(camera)`));assert.ok(Math.abs(p.x)<.96&&Math.abs(p.y)<.96,`Floor cropped at ${w} × ${h}`);}}
run("watchRegatta('luna-rossa')");assert.equal(run('regattaWatch'),'luna-rossa');assert.ok(run('camera.zoom')>1);assert.equal(nodes.get('panel').hidden,true);assert.equal(nodes.get('regatta-strip').hidden,false);nodes.get('regatta-back').fire('click');assert.equal(run('regattaWatch'),null);assert.equal(run('camera.zoom'),1);assert.equal(run('area'),'lounge');assert.equal(nodes.get('panel').hidden,true);run("watchRegatta('luna-rossa');enterOffice()");assert.equal(run('regattaWatch'),null);assert.equal(run('camera.zoom'),1,'Returning to the office must reset the regatta lens');
// Regression: contact actions must work after an actual avatar click and from written requests.
run("openPerson('pasquale')");assert.equal(nodes.get('pasquale-contact').hidden,false);
assert.equal(nodes.get('pasquale-calendar').href,data.CONTACT.calendar);assert.ok(nodes.get('pasquale-whatsapp').href.startsWith('https://wa.me/'+data.CONTACT.whatsapp));assert.ok(nodes.get('pasquale-email').href.startsWith('mailto:'+data.CONTACT.email));
for(const id of ['pasquale-calendar','pasquale-whatsapp','pasquale-email','alterego-open'])assert.equal(nodes.get(id).tagName,'A','Actions must have native link navigation');
assert.equal(nodes.get('alterego-open').href,data.CONTACT.alterego);assert.equal(nodes.get('alterego-open').target,'_blank');
let prevented=0;const countBeforeLink=external.length;nodes.get('alterego-open').fire('click',{preventDefault(){prevented++;}});assert.equal(prevented,0,'The primary AlterEgo link must keep native navigation');assert.equal(external.length,countBeforeLink,'A native link must not create a duplicate scripted popup');
nodes.get('panel-contact').fire('click');assert.equal(nodes.get('contact-dialog').open,true);assert.equal(nodes.get('book-link').href,data.CONTACT.calendar);assert.equal(nodes.get('email-link').href,nodes.get('pasquale-email').href);nodes.get('contact-dialog').close();
run("sendText('Vorrei una videocall per la contabilità')");assert.equal(nodes.get('contact-dialog').open,true);assert.equal(run('area'),'cfo','A request for contact must not be diverted to a service');assert.ok(decodeURIComponent(nodes.get('pasquale-whatsapp').href).includes('videocall per la contabilità'));nodes.get('contact-dialog').close();
run("sendText('Come posso contattarti via mail?')");assert.equal(nodes.get('contact-dialog').open,true);nodes.get('contact-dialog').close();
const realOpen=window.open;let beforeOpen=external.length;
run("sendText('voglio parlare con alterego')");assert.equal(external.length,beforeOpen+1);assert.equal(external.at(-1).url,data.CONTACT.alterego);assert.equal(nodes.get('contact-dialog').open,false,'AlterEgo must not open the appointment dialog');
window.open=()=>null;run("sendText('voglio parlare con alter ego')");assert.equal(run('socialContext.kind'),'alterego');assert.equal(nodes.get('social-dialog').open,true);assert.ok(nodes.get('social-body').innerHTML.includes('target="_blank"'));assert.ok(nodes.get('social-body').innerHTML.includes(data.CONTACT.alterego));
run("openPerson('pasquale')");window.open=()=>{throw new Error('Popup blocked by browser policy');};assert.doesNotThrow(()=>run("sendText('apri alterego')"));assert.equal(nodes.get('social-dialog').open,true);assert.equal(run('socialContext.kind'),'alterego');
window.open=realOpen;run("openPerson('pasquale');renderChoices(['alterego'])");beforeOpen=external.length;nodes.get('choices').children[0].fire('click');assert.equal(external.length,beforeOpen+1);assert.equal(nodes.get('contact-dialog').open,false);
run("openPerson('chiara')");assert.equal(nodes.get('pasquale-contact').hidden,true);
// External navigation can be blocked by a host: usable contact details must remain available.
run("openPerson('pasquale')");nodes.get('contact-dialog').close();nodes.get('pasquale-contact-help').fire('click');
assert.equal(nodes.get('contact-dialog').open,true);assert.equal(nodes.get('contact-help').open,true);
assert.equal(nodes.get('contact-calendar-value').value,data.CONTACT.calendar);assert.equal(nodes.get('contact-whatsapp-value').value,'+'+data.CONTACT.whatsapp);assert.equal(nodes.get('contact-email-value').value,data.CONTACT.email);
for(const [kind,primary]of [['calendar','book-link'],['whatsapp','whatsapp-link'],['email','email-link']]){
 const alternative=nodes.get('contact-'+kind+'-here');assert.equal(alternative.tagName,'A');assert.equal(alternative.target,'_top');assert.equal(alternative.href,nodes.get(primary).href);
 const copy=[...all].find(n=>n.dataset.copyContact===kind);assert.ok(copy);copy.fire('click');await new Promise(resolve=>setImmediate(resolve));
 assert.equal(copied.at(-1),nodes.get('contact-'+kind+'-value').value);assert.ok(nodes.get('contact-copy-status').textContent.includes('Copiato'));
}
for(const id of ['pasquale-calendar','pasquale-whatsapp','pasquale-email','book-link','whatsapp-link','email-link','contact-calendar-here','contact-whatsapp-here','contact-email-here']){
 prevented=0;const count=external.length;nodes.get(id).fire('click',{preventDefault(){prevented++;}});assert.equal(prevented,0,id+' must preserve native navigation');assert.equal(external.length,count,'No duplicate scripted popup');
}
assert.equal(nodes.get('email-link').target,'_blank');assert.equal(nodes.get('pasquale-email').target,'_blank');
navigator.clipboard.writeText=async()=>{throw new Error('Clipboard denied');};
const copyEmail=[...all].find(n=>n.dataset.copyContact==='email');copyEmail.fire('click');await new Promise(resolve=>setImmediate(resolve));
assert.equal(nodes.get('contact-email-value').selected,true);assert.equal(nodes.get('contact-email-value').focused,true);assert.equal(nodes.get('contact-email-value').selectionEnd,data.CONTACT.email.length);assert.ok(nodes.get('contact-copy-status').textContent.includes('selezionato'));assert.ok(!nodes.get('contact-copy-status').textContent.includes('Copiato'));
delete navigator.clipboard;const copyCalendar=[...all].find(n=>n.dataset.copyContact==='calendar');copyCalendar.fire('click');await new Promise(resolve=>setImmediate(resolve));assert.equal(nodes.get('contact-calendar-value').selected,true);
assert.ok(html.includes('Apri qui sostituisce la visita allo studio'));
console.log('PASS: contact links and alternative native navigation; clipboard success, denial and absence; manual-copy fallback; AlterEgo, conversations, tours and navigation.');
