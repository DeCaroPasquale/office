import * as THREE from 'three';
import {OrbitControls} from './vendor/OrbitControls.js';
import {RoomEnvironment} from './vendor/RoomEnvironment.js';
import {CONTACT,areas,people,areaById,personById,leadForArea,portraitSVG} from './data.js';
import {topics,recognize,profileFrom,answerFor,welcomeFor,contactLinks,contactSummary} from './dialogues.js';
import {cafeMenu} from './cafe-menu.js';
import {createAudio} from './audio.js';
import {createOffice,createTower,positionOnRoute} from './world.js';
import {createScenery} from './scenery.js';
import {roomAt,OFFICE,insideWalkBounds} from './rooms.js';
import {floorMapSVG} from './wayfinding.js';
import {areaView,personView} from './viewpoints.js';
import {ALESSIA_WELCOME,TOUR_STOPS,tourDuration} from './tour.js';
import {REGATTA_TEAMS,REGATTA_CENTER} from './regatta.js';
import {guestProfiles} from './guests.js';
import {createGuestPool,guestAppearance,collaboratorMessage,roomMessages,GUEST_REFRESH_MS} from './life.js';

const $=id=>document.getElementById(id),icon=id=>`<svg aria-hidden="true"><use href="#${id}"/></svg>`;
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mobile=()=>innerWidth<=700,reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;
const audio=createAudio(),conversations=new Map(),visitNeeds=[],movement=new Set(),guestPool=createGuestPool();
let messages=[],activeConversation=null,regattaWatch=null,tour=null,tourTimer=null,tourEpoch=0;
const touchDevice=()=>matchMedia('(pointer: coarse)').matches;
let guestSelection=guestPool.next(),guestRefreshAt=performance.now()+GUEST_REFRESH_MS,socialContext=null,roomNoticeTimer,noticeRoom=null,lastWalkRoom=null,escort=null;
let renderer,camera,controls,officeScene,towerScene,office,tower,scene,environment;
let mode='exterior',view='overview',area='reception',person=people[0],tab='dialogo',night=false,nightValue=0,animation=!reduced,autoCycle=!reduced;
let startTime=performance.now(),lastFrame=0,lifeTime=0,transition=null,cinemaStart=0,cinemaStage=0,drag=null,yaw=0,pitch=0,essential=false,frameCount=0,quality='auto',slowFrames=0;
let lastNightChange=0,toastTimer,knownProfile=null;
const interiorFlight=new THREE.CatmullRomCurve3([[30,3.2,-12],[22,3.5,-5],[20,3.5,-1],[7,4.2,1],[7,4.5,21]].map(v=>new THREE.Vector3(...v)));
const environments=[],lights=[],raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),v3=new THREE.Vector3();

function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
function avatar(p){return p.id==='pasquale'?'<img src="./assets/pasquale-de-caro.jpeg" alt="Pasquale De Caro">':portraitSVG(p);}
function updateAudioUI(){
 for(const id of ['voice-toggle','voice-setting']){$(id).setAttribute('aria-pressed',String(audio.voiceOn));$(id).classList.toggle('on',audio.voiceOn);}
 $('voice-setting').textContent=audio.voiceOn?'Attive':'Attiva';$('voice-toggle').setAttribute('aria-label',audio.voiceOn?'Disattiva le voci':'Attiva le voci');
 $('voice-status').textContent=audio.voices.length?'Ascolta i dialoghi con le voci disponibili sul dispositivo':'La lettura vocale non è disponibile su questo dispositivo';
 $('music-toggle').setAttribute('aria-pressed',String(audio.musicOn));$('music-toggle').classList.toggle('on',audio.musicOn);$('music-toggle').textContent=audio.musicOn?'Attivo':'Attiva';
}
function toggleVoice(){const on=audio.setVoice(!audio.voiceOn);if(on&&tour){narrateTour();}else if(on){const last=[...messages].reverse().find(m=>m.role==='bot');if(last)speak(last.text);}else {if(tour)tour.narrating=false;if(!audio.voices.length)toast('La voce non è disponibile su questo dispositivo. Puoi continuare con i dialoghi scritti.');}updateAudioUI();}
function speak(text){const p=person;audio.speak(text,p,state=>{const a=office?.getActor(p.id);if(a)a.speaking=state;});}
function activateConversation(p){
 person=p;activeConversation=p.id;if(!conversations.has(p.id))conversations.set(p.id,{messages:[],choices:null,welcome:p.id==='alessia'});messages=conversations.get(p.id).messages;renderMessages();
}
function addMessage(role,text,p=person){if(activeConversation!==p.id)activateConversation(p);messages.push({role,text,personId:p.id,name:p.name});if(messages.length>45)messages.splice(0,messages.length-45);if(role==='user'&&visitNeeds.at(-1)?.text!==text){visitNeeds.push({role,text});if(visitNeeds.length>20)visitNeeds.shift();}if(role==='user')syncContactLinks();renderMessages();if(role==='bot')speak(text);}
function renderMessages(){const root=$('messages');root.replaceChildren();if(!activeConversation)return;for(const m of messages){const node=document.createElement('div');node.className='message '+(m.role==='user'?'user':m.role==='notice'?'notice':'bot');if(m.role==='bot'){const name=document.createElement('span');name.className='speaker';name.textContent=m.name;node.appendChild(name);}node.appendChild(document.createTextNode(m.text));root.appendChild(node);}root.scrollTop=root.scrollHeight;}
function renderChoices(ids){if(activeConversation)conversations.get(activeConversation).choices=[...ids];$('choices').replaceChildren();for(const id of ids){if(!topics[id])continue;const b=document.createElement('button');b.className='choice';b.textContent=topics[id].label;b.addEventListener('click',()=>sendTopic(id,topics[id].label));$('choices').appendChild(b);}}
function updatePerson(){
 $('person-avatar').innerHTML=avatar(person);$('person-name').textContent=person.name;$('person-role').textContent=person.role;$('person-kind').textContent=person.id==='pasquale'?'Avatar di Pasquale · risposte preparate':'Assistente virtuale · dialoghi guidati';
 office?.actors.forEach(a=>{a.selected=a.p.id===person.id&&!$('panel').hidden;});$('pasquale-tools').hidden=person.id!=='pasquale';$('pasquale-contact').hidden=person.id!=='pasquale';document.body.classList.toggle('pasquale-open',person.id==='pasquale'&&!$('panel').hidden);syncContactLinks();offsetCamera();
}
function setTab(next){if(next==='dialogo'&&!activeConversation){activateConversation(person);if(!messages.length)addMessage('bot',welcomeFor(person));renderConversationChoices();}tab=next;for(const b of document.querySelectorAll('[data-tab]')){b.setAttribute('aria-selected',String(b.dataset.tab===next));b.tabIndex=b.dataset.tab===next?0:-1;}for(const id of ['dialogo','servizi','team'])$('tab-'+id).hidden=id!==next;}
function showPanel(next='dialogo'){$('panel').hidden=false;document.body.classList.add('panel-open');setTab(next);offsetCamera();}
function closePanel(){office?.releasePresentation?.();$('panel').hidden=true;activeConversation=null;messages=[];$('messages').replaceChildren();$('choices').replaceChildren();$('chat-input').value='';document.body.classList.remove('panel-open','pasquale-open');audio.cancel();office?.actors.forEach(a=>{a.selected=false;a.speaking=false;});offsetCamera();}
function renderArea(){
 const a=areaById(area);$('cafe-menu-open').hidden=area!=='lounge';$('regatta-watch').hidden=!['lounge','terrazza'].includes(area)||essential;document.querySelectorAll('[data-map-area]').forEach(b=>b.classList.toggle('current',b.dataset.mapArea===area));$('area-number').textContent=a.number+' / '+a.name.toUpperCase();$('area-title').textContent=a.short;$('area-subtitle').textContent=a.description;$('panel-area').textContent=a.name.toUpperCase();
 document.querySelectorAll('[data-area]').forEach(b=>b.classList.toggle('active',b.dataset.area===area));
 const lead=leadForArea(area);$('area-person-open').textContent='Parla con '+lead.name;
 $('tab-servizi').innerHTML=`<span class="eyebrow">IL TUO SPAZIO · ${a.number}</span><h2>${escape(a.short)}</h2><p>${escape(a.description)}</p><ul class="service-list">${a.services.map(v=>`<li>${escape(v)}</li>`).join('')}</ul><p>${escape(a.promise)}</p><button class="secondary" id="area-talk">Parla con ${escape(lead.name)} ${icon('arrow')}</button>`;
 $('area-talk').addEventListener('click',()=>openPerson(lead.id));
 const team=people.filter(p=>p.areaId===area);
 $('tab-team').innerHTML=(team.length?team.map(p=>`<button class="team-member" data-person="${p.id}"><span class="person-avatar">${avatar(p)}</span><span><strong>${escape(p.name)}</strong><small>${escape(p.role)}${p.fullCard?' · Il tuo referente':''}</small></span>${icon('arrow')}</button>`).join(''):`<p class="team-note">Uno spazio condiviso con lo studio. Adriana ti accoglie nella Lounge, proprio accanto alla terrazza.</p><button class="secondary" data-person="adriana">Parla con Adriana ${icon('arrow')}</button>`)+`<p class="team-note">I collaboratori sono assistenti virtuali. Il tuo riferimento per gli incarichi professionali è il Dott. Pasquale De Caro.</p>`;
 if(['riunioni','lounge'].includes(area)){$('tab-team').innerHTML+=`<button class="secondary social-more" data-room="${area}">Scopri gli incontri ${icon('arrow')}</button>`;$('tab-team').querySelector('[data-room]').addEventListener('click',()=>openRoomPeople(area));}
 $('tab-team').querySelectorAll('[data-person]').forEach(b=>b.addEventListener('click',()=>openPerson(b.dataset.person)));
 updatePerson();
}
function useArea(id,{panel=false,talk=false,move=true,fromTour=false,prepare=true}={}){
 const a=areaById(id);if(!a)return;if(!fromTour)stopTour();stopRegattaWatch();if(escort)finishEscort();
 if(mode==='exterior'||mode==='cinematic')enterOffice(false);
 closePanel();office?.activateArea?.(prepare?id:null);area=id;person=leadForArea(id);renderArea();$('spaces').hidden=true;$('spaces-open').setAttribute('aria-expanded','false');
 if(move&&camera)focusAreaPeople(id);
 if(talk){activateConversation(person);showPanel('dialogo');if(!messages.length)addMessage('bot',welcomeFor(person));renderConversationChoices();updatePerson();if(move&&camera)focusAreaPeople(id);}
 else if(panel)showPanel('servizi');
 if(roomMessages[id]&&!fromTour)showRoomNotice(id);else $('room-notice').hidden=true;
}
function openPerson(id){
 stopTour();stopRegattaWatch();
 const p=personById(id);if(!p){if(guestProfiles.some(g=>g.id===id))openGuest(id);return;}if(!p.fullCard){openCollaborator(p);return;}if($('social-dialog').open)closeSocial();
 if(area!==p.areaId)useArea(p.areaId,{move:false,prepare:false});else closePanel();person=p;activateConversation(p);renderArea();showPanel('dialogo');updatePerson();
 if(!messages.length)addMessage('bot',welcomeFor(p));renderConversationChoices();
 if(camera&&office&&controls){setView('overview',false);const v=personView(p,office.getActor(id),camera.aspect);moveCamera(v.position,v.target,1100);}
}
function sendTopic(id,label){
 if(!activeConversation||$('panel').hidden)return;
 knownProfile=profileFrom(label)??knownProfile;
 if(id==='contabilita'&&knownProfile)id=knownProfile;
 const answer=answerFor(id,area);if(!answer)return;
 audio.cancel();if(person.id==='alessia')conversations.get(person.id).welcome=false;addMessage('user',label);
 if(answer.area!==area){const previous=person.name,fromReception=area==='reception';useArea(answer.area,{talk:true,move:!fromReception});addMessage('user',label);addMessage('notice',`${previous} ti accompagna nell’area ${areaById(area).name}. Ti accoglie ${person.name}.`);updatePerson();if(fromReception)startEscort(answer.area);}
 setTab('dialogo');addMessage('bot',answer.answer);renderChoices(answer.choices.length?answer.choices:['appuntamento']);
 if(id==='appuntamento')openContact();else if(id==='alterego')openAlterEgo();
}
function sendText(text){
 text=String(text).trim().slice(0,1000);if(!text||!activeConversation||$('panel').hidden)return;
 const topic=recognize(text);if(topic){sendTopic(topic,text);return;}
 if(person.id==='alessia')conversations.get(person.id).welcome=false;addMessage('user',text);addMessage('bot','Grazie, ho aggiunto la tua descrizione al riepilogo di questa visita. Per questo punto serve un confronto con Pasquale: puoi inviargli il riepilogo, oppure scegliere un argomento qui sotto per una prima indicazione.');renderChoices([...areaById(area).topics.slice(0,4),'appuntamento']);
}
function reviewOffice(){if($('social-dialog').open)closeSocial();useArea(area);}
function openCafeMenu(){stopTour();movement.clear();audio.cancel();$('cafe-menu-dialog').showModal();}
function syncContactLinks(){
 const state={area,messages:visitNeeds},links=contactLinks(state);
 for(const id of ['book-link','pasquale-calendar','contact-calendar-here'])$(id).href=links.calendar;
 for(const id of ['whatsapp-link','pasquale-whatsapp','contact-whatsapp-here'])$(id).href=links.whatsapp;
 for(const id of ['email-link','pasquale-email','contact-email-here'])$(id).href=links.email;
 $('contact-calendar-value').value=CONTACT.calendar;$('contact-whatsapp-value').value='+'+CONTACT.whatsapp;$('contact-email-value').value=CONTACT.email;
 $('phone-link').href=links.phone;$('contact-summary').textContent=contactSummary(state);
}
function openContact(){stopTour();movement.clear();if(escort)finishEscort();syncContactLinks();audio.cancel();if(!$('contact-dialog').open)$('contact-dialog').showModal();}


function openContactHelp(){openContact();$('contact-help').open=true;$('contact-help').querySelector('summary')?.focus();}
async function copyContact(kind){
 const field=$('contact-'+kind+'-value'),status=$('contact-copy-status'),labels={calendar:'link del calendario',whatsapp:'numero WhatsApp',email:'indirizzo email'};
 if(!field||!labels[kind])return;
 status.textContent='';
 try{
  if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
  await navigator.clipboard.writeText(field.value);status.textContent='Copiato: '+labels[kind]+'.';
 }catch{
  field.focus();field.select();field.setSelectionRange(0,field.value.length);
  status.textContent='Copia automatica non disponibile. Il dato è selezionato: tieni premuto oppure usa il comando Copia del dispositivo.';
 }
}

function closeSocial(){audio.cancel();$('social-dialog').close();}
function speakSocial(text,p){audio.speak(text,p,state=>{const a=office?.getActor(p.id);if(a)a.speaking=state;});}
function showSocial(context,eyebrow,title,body){
 stopTour();closePanel();movement.clear();audio.cancel();socialContext=context;$('social-eyebrow').textContent=eyebrow;$('social-title').textContent=title;$('social-body').innerHTML=body;
 if(context.id&&office){const a=office.getActor(context.id);if(a)a.selected=true;}
 if(!$('social-dialog').open)$('social-dialog').showModal();
 $('social-body').querySelectorAll('[data-lead]').forEach(b=>b.addEventListener('click',()=>{closeSocial();openPerson(b.dataset.lead);}));
 $('social-body').querySelectorAll('[data-contact]').forEach(b=>b.addEventListener('click',()=>{closeSocial();openContact();}));
 $('social-body').querySelectorAll('[data-guest]').forEach(b=>b.addEventListener('click',()=>openGuest(b.dataset.guest)));
 $('social-body').querySelectorAll('[data-need]').forEach(b=>b.addEventListener('click',()=>{const g=guestProfiles.find(g=>g.id===b.dataset.need);if(!g)return;closeSocial();useArea(g.areaId,{talk:true});addMessage('user','Mi riconosco in questa esigenza: '+g.question);addMessage('bot','Partiamo da qui. '+g.collect+' Possiamo raccogliere la tua situazione e preparare il primo confronto con Pasquale.');renderChoices([...areaById(g.areaId).topics,'appuntamento']);}));
 $('social-body').querySelectorAll('[data-alterego]').forEach(b=>b.addEventListener('click',prepareAlterEgoLink));
}
function openCollaborator(p){const actor=office?.getActor(p.id),answer=collaboratorMessage(p,actor?.activity??'work');showSocial({kind:'staff',id:p.id},p.role,p.name,`<div class="social-person"><span class="person-avatar">${avatar(p)}</span><p>${escape(answer.text)}</p></div><div class="social-actions"><button class="secondary" data-lead="${answer.leader.id}">Parla con ${escape(answer.leader.name)} ${icon('arrow')}</button><button class="choice" data-contact>Richiedi il primo incontro</button><button class="choice" data-contact>Sono già cliente · Contatti</button></div>`);speakSocial(answer.text,p);}
function guestRoom(id){return guestSelection.meeting.some(g=>g.id===id)?'riunioni':'lounge';}
function openGuest(id){const g=guestProfiles.find(g=>g.id===id);if(!g)return;const room=guestRoom(id),copy=roomMessages[room],lead=leadForArea(g.areaId),look={...g,...guestAppearance(g),index:20+Number(g.id.slice(1))};showSocial({kind:'guest',id,room},copy.stage,g.name,`<div class="social-person"><span class="person-avatar">${portraitSVG(look)}</span><p>${escape(g.role)}</p></div><span class="eyebrow">IL TEMA DEL CONFRONTO</span><p class="guest-question">“${escape(g.question)}”</p><p>${escape(copy.invite)}</p><div class="social-actions"><button class="secondary" data-need="${g.id}">Ho un’esigenza simile ${icon('arrow')}</button><button class="choice" data-lead="${lead.id}">Scopri l’area ${escape(areaById(g.areaId).name)}</button><button class="choice" data-contact>Primo incontro gratuito · 30 minuti</button></div><p class="profile-note">Profilo narrativo dell’esperienza, ispirato a esigenze di imprese e professionisti.</p>`);speakSocial(g.question+' '+copy.invite,look);}
function openRoomPeople(id){if(!roomMessages[id])return;const list=id==='riunioni'?guestSelection.meeting:guestSelection.lounge,copy=roomMessages[id],host=leadForArea(id);showSocial({kind:'room',room:id},copy.stage,copy.title,`<p>${escape(copy.text)}</p><div class="guest-list">${list.map(g=>`<button class="team-member" data-guest="${g.id}"><span class="person-avatar">${portraitSVG({...g,...guestAppearance(g)})}</span><span><strong>${escape(g.name)}</strong><small>${escape(g.role)}</small><span class="guest-preview">${escape(g.question)}</span></span>${icon('arrow')}</button>`).join('')}</div><div class="social-actions"><button class="secondary" data-lead="${host.id}">Parla con ${host.name} ${icon('arrow')}</button><button class="choice" data-contact>Prenota il tuo primo incontro</button></div>`);}
function showRoomNotice(id){noticeRoom=id;const copy=roomMessages[id];$('room-notice-title').textContent=copy.title;$('room-notice-text').textContent=copy.text;$('room-notice').hidden=false;clearTimeout(roomNoticeTimer);roomNoticeTimer=setTimeout(()=>$('room-notice').hidden=true,11000);}
function checkWalkRoom(){if(view!=='walk')return;const id=roomAt(camera.position.x,camera.position.z);if(id!==lastWalkRoom){lastWalkRoom=id;if(id&&id!==area){closePanel();office?.activateArea?.(id);area=id;person=leadForArea(id);renderArea();}if(id&&roomMessages[id])showRoomNotice(id);else $('room-notice').hidden=true;}}
function refreshGuests(now){if(now<guestRefreshAt||$('social-dialog').open||escort||tour)return;guestSelection=guestPool.next();guestRefreshAt=now+GUEST_REFRESH_MS;office?.setGuests(guestSelection,!animation);}
function startEscort(id){if(essential||!office||reduced||!animation){if(camera)focusAreaPeople(id);return;}const path=office.escortTo(id);if(!path){focusAreaPeople(id);return;}escort={...path,areaId:id,start:performance.now(),duration:Math.min(8500,Math.max(4500,path.path.length*210))};transition=null;movement.clear();controls.enabled=false;$('escort-strip').hidden=false;$('escort-label').textContent='Alessia ti accompagna · '+areaById(id).name;}
function updateEscort(now){const e=escort;if(!e)return;const f=Math.min(1,(now-e.start)/e.duration),at=positionOnRoute(e.path,f);e.actor.group.position.copy(at.position);e.actor.group.rotation.y=Math.atan2(at.direction.x,at.direction.z);camera.position.lerp(new THREE.Vector3(at.position.x+3.4,4.8,at.position.z+5.7),.12);controls.target.copy(at.position).add(new THREE.Vector3(0,1.1,0));camera.lookAt(controls.target);if(f===1)finishEscort();}
function finishEscort(){if(!escort)return;const e=escort;escort=null;office.finishEscort(e);$('escort-strip').hidden=true;focusAreaPeople(e.areaId,900);controls.enabled=view==='overview';}
function openPasqualeBio(){showSocial({kind:'bio'},'CFO · DOTTORE COMMERCIALISTA','Pasquale De Caro',`<div class="bio-heading"><img src="./assets/pasquale-de-caro.jpeg" alt="Pasquale De Caro"><p>Affianco imprese, professionisti e nuove attività nella gestione contabile, nelle scelte societarie e nella finanza aziendale.</p></div><ul class="service-list"><li>CFO, controllo di gestione, liquidità e marginalità</li><li>Piani industriali e business plan</li><li>Contabilità, fiscalità e consulenza societaria</li><li>Valutazioni e operazioni straordinarie</li><li>Creator economy e innovazione dei processi</li></ul><p>Puoi approfondire il mio modo di affrontare questi temi con il mio AlterEgo, costruito sui contenuti che pubblico.</p><div class="social-actions"><a class="secondary" data-alterego href="${CONTACT.alterego}" target="_blank" rel="noopener noreferrer">Conversa con il mio AlterEgo ${icon('arrow')}</a><button class="choice" data-contact>Parliamo della tua impresa · 30 minuti gratuiti</button></div>`);}
function prepareAlterEgoLink(){movement.clear();audio.cancel();}
function openAlterEgo(){
 prepareAlterEgoLink();let chat=null;
 try{
  const sw=Number(screen.availWidth)||innerWidth,sh=Number(screen.availHeight)||innerHeight,w=Math.min(540,sw),h=Math.min(800,sh),left=Math.max(0,sw-w-30),top=Math.max(0,(sh-h)/2);
  chat=window.open(CONTACT.alterego,'decaro-alterego',`popup=yes,width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`);
 }catch{chat=null;}
 if(chat){try{chat.opener=null;chat.focus();}catch{}toast('La tua visita resta aperta qui. Puoi riprenderla quando vuoi.');}
 else showSocial({kind:'alterego'},'CONVERSA CON PASQUALE','Apri l’AlterEgo di Pasquale',`<p>La finestra non si è aperta. Usa il collegamento qui sotto per continuare in una nuova scheda: la Tower resta aperta.</p><a class="secondary" href="${CONTACT.alterego}" target="_blank" rel="noopener noreferrer">Apri AlterEgo in una nuova scheda ${icon('arrow')}</a>`);
}

function stopRegattaWatch(){regattaWatch=null;$('regatta-strip').hidden=true;if(camera){camera.fov=45;camera.zoom=1;camera.updateProjectionMatrix();}}
function watchRegatta(teamId='all'){
 if(teamId!=='all'&&!REGATTA_TEAMS.some(t=>t.id===teamId))return;
 if($('social-dialog').open)closeSocial();useArea('terrazza',{move:false});closePanel();regattaWatch=teamId;$('regatta-select').value=teamId;$('regatta-strip').hidden=false;
 if(!camera||!office||!controls)return;setView('overview',false);regattaWatch=teamId;
 camera.zoom=teamId==='all'?(mobile()?.55:1):(mobile()?4.8:5.5);camera.updateProjectionMatrix();const boat=environments[0]?.regatta.boats.find(b=>b.team.id===teamId),target=boat?[boat.group.position.x,boat.group.position.y+15,boat.group.position.z]:[REGATTA_CENTER.x,-161,REGATTA_CENTER.z];moveCamera([51.7,4.1,-8],target,1500);
}
function regattaDetails(){showSocial({kind:'regatta'},'IL GOLFO, DA VICINO','Le vele davanti allo studio',`<p>Barche sui foil, scie sull’acqua e colori dei team. Una regata scenografica ispirata all’America’s Cup: scegli una barca per osservarla dalla terrazza.</p><div class="regatta-team-list">${REGATTA_TEAMS.map(t=>`<button class="team-member" data-race-team="${t.id}"><span class="team-swatch" style="background:${t.accent}">${t.nation}</span><span><strong>${t.name}</strong><small>Segui la barca dal punto panoramico</small></span>${icon('arrow')}</button>`).join('')}</div><p class="profile-note">Modelli e livree interpretati per questa esperienza. La scena non trasmette una gara o risultati in diretta.</p>`);$('social-body').querySelectorAll('[data-race-team]').forEach(b=>b.addEventListener('click',()=>watchRegatta(b.dataset.raceTeam)));}
function renderConversationChoices(){
 const state=conversations.get(person.id);
 if(person.id==='alessia'&&state?.welcome){
  $('choices').replaceChildren();
  for(const [label,action]of [['Tour veloce',startTour],['Ti racconto cosa mi serve',receptionNeeds]]){const b=document.createElement('button');b.className='choice welcome-choice';b.textContent=label;b.addEventListener('click',action);$('choices').appendChild(b);}
 }else renderChoices(state?.choices??areaById(person.areaId).topics);
}
function welcomeReception(){
 person=personById('alessia');activateConversation(person);conversations.get(person.id).welcome=true;renderArea();showPanel('dialogo');
 if(!messages.length||messages.at(-1)?.text!==ALESSIA_WELCOME)addMessage('bot',ALESSIA_WELCOME);
 renderConversationChoices();updatePerson();
}
function receptionNeeds(){
 conversations.get('alessia').welcome=false;addMessage('user','Ti racconto cosa mi serve');
 addMessage('bot','Ti ascolto. Hai già un’attività o stai pensando di iniziare? Scrivi pure con parole tue, oppure scegli il tema più vicino alla tua esigenza: prepariamo insieme il primo passo.');
 renderChoices(areaById('reception').topics);$('chat-input').focus();
}
function focusAreaPeople(id,duration=1300){
 if(!camera||!controls)return;setView('overview',false);office?.presentArea?.(id);
 const overlay=tour?$('guided-tour'):!$('panel').hidden?$('panel'):null,stacked=tour?innerWidth<=1100&&innerHeight>520:mobile()&&innerHeight>520;
 const fraction=overlay&&!stacked?Math.max(.3,1-(overlay.getBoundingClientRect().width+40)/innerWidth):1;
 const v=!$('panel').hidden&&!tour?personView(person,office?.getActor(person.id),camera.aspect):areaView(id,[...(office?.actors??[]),...(office?.guestActors??[])],camera.aspect,fraction);camera.fov=v.fov??45;camera.updateProjectionMatrix();moveCamera(v.position,v.target,duration);offsetCamera();
}
function narrateTour(){
 if(!tour)return;const epoch=tourEpoch,index=tour.index,p=personById('alessia');
 tour.narrating=audio.speak(TOUR_STOPS[index].text,p,state=>{const actor=office?.getActor('alessia');if(actor)actor.speaking=state;if(tour&&epoch===tourEpoch&&tour.index===index)tour.narrating=state;});
}
function scheduleTour(delay){
 clearTimeout(tourTimer);if(!tour||tour.paused)return;const epoch=tourEpoch,index=tour.index;tour.due=performance.now()+delay;
 tourTimer=setTimeout(()=>{if(!tour||epoch!==tourEpoch||tour.index!==index||tour.paused)return;if(tour.narrating){scheduleTour(400);return;}if(index===TOUR_STOPS.length-1)stopTour(true,true);else showTourStep(index+1);},delay);
}
function showTourStep(index){
 if(!tour)return;clearTimeout(tourTimer);tourEpoch++;audio.cancel();tour.index=Math.max(0,Math.min(TOUR_STOPS.length-1,index));
 const step=TOUR_STOPS[tour.index],a=areaById(step.area);useArea(step.area,{fromTour:true});
 $('guided-tour').hidden=false;$('tour-title').textContent=a.name;$('tour-text').textContent=step.text;$('tour-step').textContent=`${tour.index+1} / ${TOUR_STOPS.length}`;
 $('tour-prev').disabled=tour.index===0;$('tour-next').textContent=tour.index===TOUR_STOPS.length-1?'Parliamone →':'Avanti →';
 document.querySelectorAll('[data-tour-area]').forEach(b=>{b.classList.toggle('current',b.dataset.tourArea===step.area);b.setAttribute('aria-current',b.dataset.tourArea===step.area?'step':'false');});
 $('room-notice').hidden=true;tour.remaining=tourDuration(step);offsetCamera();
 if(!tour.paused){narrateTour();scheduleTour(tour.remaining);}
}
function startTour(){
 stopTour();if(mode!=='office')enterOffice(false);if($('settings-dialog').open)$('settings-dialog').close();if($('social-dialog').open)closeSocial();
 closePanel();movement.clear();tour={index:0,paused:reduced,remaining:0};document.body.classList.add('tour-active');$('guided-tour').hidden=false;
 $('tour-pause').textContent=tour.paused?'Riprendi':'Pausa';$('tour-pause').setAttribute('aria-pressed',String(tour.paused));showTourStep(0);$('tour-close').focus();
}
function pauseTour(){
 if(!tour)return;tour.paused=!tour.paused;$('tour-pause').textContent=tour.paused?'Riprendi':'Pausa';$('tour-pause').setAttribute('aria-pressed',String(tour.paused));
 if(tour.paused){tour.narrating=false;tour.remaining=Math.max(1000,(tour.due??performance.now()+tour.remaining)-performance.now());clearTimeout(tourTimer);tourEpoch++;audio.cancel();}
 else{narrateTour();scheduleTour(Math.max(tour.remaining,tourDuration(TOUR_STOPS[tour.index])));}
}
function stopTour(reception=false,completed=false){
 if(!tour)return;clearTimeout(tourTimer);tourEpoch++;tour=null;audio.cancel();transition=null;if(controls)controls.enabled=view==='overview';$('guided-tour').hidden=true;document.body.classList.remove('tour-active');offsetCamera();
 if(completed){try{localStorage.setItem('decaro-tour-completed','1');}catch{}}
 if(reception){useArea('reception',{move:false});if(camera&&controls){const v=personView(personById('alessia'),office?.getActor('alessia'),camera.aspect);camera.position.set(...v.position);controls.target.set(...v.target);camera.lookAt(controls.target);}welcomeReception();if(completed){conversations.get('alessia').welcome=false;addMessage('bot','Ora conosci lo studio. Da quale esigenza vuoi partire? Ti aiuto a trovare il referente e a preparare il primo incontro con Pasquale.');renderChoices(areaById('reception').topics);}$('chat-input').focus();}
}

function setupUI(){
 $('office-return').addEventListener('click',reviewOffice);$('cafe-menu-open').addEventListener('click',openCafeMenu);
 $('cafe-menu-content').innerHTML=cafeMenu.map(category=>`<section class="cafe-category"><span class="cafe-category-label">${escape(category.subtitle)}</span><h3>${escape(category.title)}</h3><ul>${category.items.map(([name,description])=>`<li><strong>${escape(name)}</strong><span>${escape(description)}</span></li>`).join('')}</ul></section>`).join('');

 $('tour-avatar').innerHTML=avatar(personById('alessia'));$('tour-map').innerHTML=floorMapSVG().replaceAll('data-map-area','data-tour-area');
 $('tour-map').querySelectorAll('[data-tour-area]').forEach(b=>{const go=()=>showTourStep(TOUR_STOPS.findIndex(s=>s.area===b.dataset.tourArea));b.addEventListener('click',go);b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();go();}});});
 $('tour-close').addEventListener('click',()=>stopTour(true));$('tour-alessia').addEventListener('click',()=>stopTour(true));$('tour-pause').addEventListener('click',pauseTour);
 $('tour-prev').addEventListener('click',()=>{if(tour)showTourStep(tour.index-1);});$('tour-next').addEventListener('click',()=>{if(!tour)return;if(tour.index===TOUR_STOPS.length-1)stopTour(true,true);else showTourStep(tour.index+1);});$('tour-replay').addEventListener('click',startTour);

 const map=document.createElement('div');map.className='office-map-wrap';map.innerHTML='<span class="eyebrow">SCEGLI UN AMBIENTE</span>'+floorMapSVG();$('spaces').appendChild(map);map.querySelectorAll('[data-map-area]').forEach(b=>{b.addEventListener('click',()=>useArea(b.dataset.mapArea));b.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();useArea(b.dataset.mapArea);}});});
 $('regatta-select').innerHTML='<option value="all">Panoramica della regata</option>'+REGATTA_TEAMS.map(t=>`<option value="${t.id}">${t.name}</option>`).join('');$('regatta-select').addEventListener('change',e=>watchRegatta(e.target.value));$('regatta-watch').addEventListener('click',()=>watchRegatta('luna-rossa'));$('regatta-back').addEventListener('click',()=>useArea('lounge'));$('regatta-info').addEventListener('click',regattaDetails);
 for(const a of areas){const b=document.createElement('button');b.className='space-item';b.dataset.area=a.id;b.innerHTML=`<span class="space-number">${a.number}</span><span><strong>${escape(a.name)}</strong><small>${escape(a.short)}</small></span>${icon('arrow')}`;b.addEventListener('click',()=>useArea(a.id));$('spaces').appendChild(b);}
 $('enter').addEventListener('click',startIntro);$('skip-intro').addEventListener('click',()=>enterOffice(true));$('essential-enter').addEventListener('click',()=>enterOffice(true));
 $('brand').addEventListener('click',()=>mode==='exterior'?startIntro():useArea('reception',{talk:true}));
 $('spaces-open').addEventListener('click',()=>{stopTour();closePanel();const on=$('spaces').hidden;$('spaces').hidden=!on;$('spaces-open').setAttribute('aria-expanded',String(on));});
 $('area-person-open').addEventListener('click',()=>openPerson(leadForArea(area).id));
 $('panel-close').addEventListener('click',closePanel);$('reception-open').addEventListener('click',()=>useArea('reception',{talk:true}));
 $('contact-open').addEventListener('click',openContact);$('panel-contact').addEventListener('click',openContact);
 $('pasquale-contact-help').addEventListener('click',openContactHelp);document.querySelectorAll('[data-copy-contact]').forEach(b=>b.addEventListener('click',()=>copyContact(b.dataset.copyContact)));
 $('day-toggle').addEventListener('click',()=>setNight(!night));$('voice-toggle').addEventListener('click',toggleVoice);$('voice-setting').addEventListener('click',toggleVoice);
 $('music-toggle').addEventListener('click',async()=>{try{await audio.toggleMusic();updateAudioUI();}catch{toast('Il sottofondo non è disponibile su questo dispositivo.');}});
 $('settings-open').addEventListener('click',()=>{if(tour&&!tour.paused)pauseTour();updateAudioUI();$('settings-dialog').showModal();});
 $('motion-toggle').addEventListener('click',()=>{animation=!animation;syncToggle('motion-toggle',animation);});$('cycle-toggle').addEventListener('click',()=>{autoCycle=!autoCycle;lastNightChange=performance.now();syncToggle('cycle-toggle',autoCycle);});
 $('quality').addEventListener('change',e=>{quality=e.target.value;setQuality();});
 $('replay').addEventListener('click',()=>{$('settings-dialog').close();stopTour();stopRegattaWatch();closePanel();mode='exterior';document.body.classList.add('exterior');$('office-ui').hidden=true;$('intro').hidden=false;$('intro').classList.remove('leaving');if(renderer){scene=towerScene;controls.enabled=false;camera.clearViewOffset();}startTime=performance.now();});
 $('view-overview').addEventListener('click',()=>{setView('overview');});$('view-walk').addEventListener('click',()=>setView('walk'));
 $('room-notice').addEventListener('click',()=>openRoomPeople(noticeRoom));$('escort-skip').addEventListener('click',finishEscort);$('alterego-open').addEventListener('click',prepareAlterEgoLink);$('pasquale-bio').addEventListener('click',openPasqualeBio);
 $('social-dialog').addEventListener('cancel',()=>audio.cancel());
 $('social-dialog').addEventListener('close',()=>{if(office&&socialContext?.id){const a=office.getActor(socialContext.id);if(a)a.selected=false;}socialContext=null;});
 document.querySelectorAll('[data-tab]').forEach((b,i)=>{b.addEventListener('click',()=>setTab(b.dataset.tab));b.addEventListener('keydown',e=>{const tabs=[...document.querySelectorAll('[data-tab]')];let next;if(e.key==='ArrowRight')next=(i+1)%tabs.length;if(e.key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;if(e.key==='Home')next=0;if(e.key==='End')next=tabs.length-1;if(next!==undefined){e.preventDefault();setTab(tabs[next].dataset.tab);tabs[next].focus();}});});
 $('chat-form').addEventListener('submit',e=>{e.preventDefault();const text=$('chat-input').value;$('chat-input').value='';$('chat-input').style.height='auto';sendText(text);});
 $('chat-input').addEventListener('input',e=>{e.target.style.height='auto';e.target.style.height=Math.min(90,e.target.scrollHeight)+'px';});
 $('chat-input').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!mobile()){e.preventDefault();$('chat-form').requestSubmit();}});
 document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.dataset.close==='social-dialog'?closeSocial():$(b.dataset.close).close()));
 document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
 document.querySelectorAll('[data-move]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);movement.add(b.dataset.move);});for(const evt of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(evt,()=>movement.delete(b.dataset.move));});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(tour){e.preventDefault();stopTour(true);return;}closePanel();$('spaces').hidden=true;$('spaces-open').setAttribute('aria-expanded','false');}if(mode!=='office'||view!=='walk'||escort||tour||e.target.closest('input,textarea,select')||document.querySelector('dialog[open]'))return;const m=keyMove(e.code);if(m){e.preventDefault();movement.add(m);}});
 document.addEventListener('keyup',e=>movement.delete(keyMove(e.code)));window.addEventListener('blur',()=>movement.clear());document.addEventListener('visibilitychange',()=>{lastFrame=0;movement.clear();if(document.hidden&&tour&&!tour.paused)pauseTour();});
 window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',()=>{if(mobile())offsetCamera();});
 audio.onChange(updateAudioUI);syncToggle('motion-toggle',animation);syncToggle('cycle-toggle',autoCycle);updateAudioUI();renderArea();
}
function syncToggle(id,on){$(id).setAttribute('aria-pressed',String(on));$(id).classList.toggle('on',on);$(id).textContent=on?'Attiva':'In pausa';}
function keyMove(c){return {KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right'}[c];}

const PI=Math.PI;
function sceneLights(s,external){
 const hemi=new THREE.HemisphereLight('#c5e4ff','#9a917e',1.5);s.add(hemi);
 const sun=new THREE.DirectionalLight('#fff0d4',2.4);sun.position.set(...(external?[-120,260,100]:[-45,80,35]));sun.castShadow=true;sun.shadow.mapSize.set(external?1024:1024,1024);Object.assign(sun.shadow.camera,{left:external?-160:-65,right:external?160:65,top:external?220:65,bottom:-65,near:1,far:external?450:200});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;s.add(sun);
 const fill=new THREE.DirectionalLight('#c3daeb',1);fill.position.set(30,15,-10);s.add(fill);lights.push({hemi,sun,fill});
 if(!external){for(const [x,z]of[[-28,-18],[25,-16],[-28,3],[-28,18],[-4,9],[-4,21],[25,13]]){const l=new THREE.PointLight('#ffe2b9',0,30,1.6);l.position.set(x,3.8,z);s.add(l);lights.push({lamp:l});}}
}
async function init3D(){
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false});renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;setQuality();$('stage').appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Studio De Caro in 3D. Trascina per guardarti intorno, tocca una persona per parlare.');
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback();});
 camera=new THREE.PerspectiveCamera(45,innerWidth/innerHeight,.1,24000);camera.rotation.order='YXZ';
 controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=3;controls.maxDistance=600;controls.maxPolarAngle=PI*.49;controls.minPolarAngle=.15;controls.enabled=false;controls.addEventListener('start',()=>{transition=null;if(mode==='office'){stopTour();closePanel();stopRegattaWatch();}});
 if(document.fonts){await Promise.race([document.fonts.load('32px DeCaroScript'),new Promise(resolve=>setTimeout(resolve,1500))]);}
 const pmrem=new THREE.PMREMGenerator(renderer);const room=new RoomEnvironment();environment=pmrem.fromScene(room,.04).texture;room.dispose();pmrem.dispose();
 officeScene=new THREE.Scene();officeScene.background=new THREE.Color('#90b4c5');officeScene.environment=environment;officeScene.fog=new THREE.FogExp2('#8ebedb',.000045);const officeView=createScenery({elevated:true,compact:mobile()});officeScene.add(officeView.group);environments.push(officeView);sceneLights(officeScene,false);office=createOffice();officeScene.add(office.group);office.setGuests(guestSelection,true);
 towerScene=new THREE.Scene();towerScene.background=new THREE.Color('#9cc5db');towerScene.environment=environment;towerScene.fog=new THREE.FogExp2('#8ebedb',.000045);const towerView=createScenery({compact:mobile()});towerScene.add(towerView.group);environments.push(towerView);sceneLights(towerScene,true);tower=createTower();towerScene.add(tower.group);scene=towerScene;
 setupPointer();resize();window.officeReady=true;$('loading').style.opacity='0';setTimeout(()=>$('loading').hidden=true,650);renderer.setAnimationLoop(frame);
 window.officeDiagnostics=()=>({mode,view,night,area,person:person.id,people:office.actors.length,guests:office.guestActors.map(a=>a.p.id),guestCatalog:guestProfiles.length,areas:areas.length,internalAreas:areas.length-1,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,voiceCount:audio.voices.length,quality,externalRequests:'AlterEgo/calendar/WhatsApp/email only after visitor action; no paid API',rooms:8,floorArea:3952,terraceArea:640,chat:activeConversation,chatOpen:!$('panel').hidden,regattaTeams:REGATTA_TEAMS.length,regattaWatch,roomBanners:0,tour:tour?{index:tour.index,paused:tour.paused}:null,escort:!!escort});
}
function setQuality(){if(!renderer)return;const light=quality==='light';const ratio=quality==='high'?Math.min(devicePixelRatio||1,2):light?1:Math.min(devicePixelRatio||1,mobile()?1.35:1.65);renderer.setPixelRatio(ratio);renderer.shadowMap.enabled=!light;renderer.setSize(innerWidth,innerHeight,false);}
function offsetCamera(){if(!camera)return;camera.clearViewOffset();if(mode==='office'){
 const node=tour?$('guided-tour'):!$('panel').hidden?$('panel'):null;
 if(node){const r=node.getBoundingClientRect();if((tour?innerWidth<=1100:mobile())&&innerHeight>520)camera.setViewOffset(innerWidth,innerHeight,0,r.height*.46,innerWidth,innerHeight);else camera.setViewOffset(innerWidth,innerHeight,(tour?-1:1)*r.width*.43,0,innerWidth,innerHeight);}
 }camera.updateProjectionMatrix();}
function resize(){if(!renderer||!camera)return;renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();if(mode==='office'&&view==='overview'&&!regattaWatch&&(tour||!$('panel').hidden||office?.actors.some(a=>a.presenting)))focusAreaPeople(area,0);offsetCamera();}
function moveCamera(position,target,duration=1100){if(!camera||!controls)return;const pos=new THREE.Vector3(...position),tar=new THREE.Vector3(...target);if(reduced||duration===0){transition=null;camera.position.copy(pos);controls.target.copy(tar);camera.lookAt(tar);return;}transition={start:performance.now(),duration,from:camera.position.clone(),to:pos,fromTarget:controls.target.clone(),toTarget:tar};controls.enabled=false;}
function startIntro(){
 stopTour();stopRegattaWatch();office?.activateArea?.(null);
 if(essential){enterOffice(true);return;}if(!window.officeReady)return;
 audio.cancel();closePanel();$('intro').classList.add('leaving');setTimeout(()=>$('intro').hidden=true,650);$('office-ui').hidden=true;$('cinematic').hidden=false;mode='cinematic';cinemaStart=performance.now();cinemaStage=0;controls.enabled=false;camera.clearViewOffset();transition=null;if(reduced)enterOffice(true);
}
function enterOffice(welcome=true){
 stopTour();stopRegattaWatch();
 mode='office';document.body.classList.remove('exterior');$('intro').hidden=true;$('intro').classList.remove('leaving');$('cinematic').hidden=true;$('office-ui').hidden=false;$('fade').classList.remove('cover');$('essential').hidden=true;
 if(renderer&&camera&&office&&officeScene){scene=officeScene;setView('overview',false);const v=areaView('reception',office.actors,camera.aspect);camera.position.set(...v.position);controls.target.set(...v.target);camera.lookAt(controls.target);controls.enabled=true;offsetCamera();}
 office?.activateArea?.('reception');area='reception';person=people[0];renderArea();lastNightChange=performance.now();
 closePanel();if(welcome)welcomeReception();
}
function setView(next,home=true){
 if(home){stopTour();stopRegattaWatch();}if(!camera||!office||!controls)return;document.body.classList.toggle('walk-mode',next==='walk');view=next;movement.clear();transition=null;if(escort)finishEscort();lastWalkRoom=null;
 for(const id of ['overview','walk']){$('view-'+id).classList.toggle('active',id===next);$('view-'+id).setAttribute('aria-pressed',String(id===next));}
 $('walk-controls').hidden=next!=='walk';controls.enabled=next==='overview';$('dock-hint').textContent=next==='walk'?(touchDevice()?'Usa i comandi touch · Trascina per guardarti intorno':'Frecce per camminare · Trascina per guardarti intorno'):'Trascina per guardarti intorno · Tocca una persona';
 if(next==='walk'){
  closePanel();const a=areaById(area);const entry=office.entrances[area]??OFFICE.walkStart;let position=[entry[0],2.15,entry[1]];if(area==='reception')position=[OFFICE.walkStart[0],2.15,OFFICE.walkStart[1]];if(area==='terrazza')position=[44,2.15,10];camera.position.set(...position);yaw=({reception:PI/2,contabilita:PI/2,consulenza:PI/2,operazioni:PI,lounge:-PI/2,terrazza:-PI/2})[area]??0;pitch=-.03;camera.rotation.set(pitch,yaw,0,'YXZ');
 }else if(home){closePanel();office.activateArea?.(null);camera.fov=45;camera.updateProjectionMatrix();const d=Math.max(100,92/(2*Math.tan(camera.fov*PI/360)*camera.aspect))*1.3;const v=new THREE.Vector3(.64,.7,1).normalize().multiplyScalar(d);moveCamera([v.x+7,v.y,v.z],[7,1.5,0],1300);$('area-number').textContent='DE CARO TOWER / ULTIMO PIANO';$('area-title').textContent='Uno studio. Tante prospettive.';$('area-subtitle').textContent='Scopri gli ambienti e incontra il tuo referente.';}
 offsetCamera();
}
function setNight(on){night=on;lastNightChange=performance.now();$('day-toggle').innerHTML=icon(on?'sun':'moon');$('day-toggle').setAttribute('aria-label',on?'Passa al giorno':'Passa alla notte');document.body.classList.toggle('night',on);}
function setupPointer(){
 const canvas=renderer.domElement;
 canvas.addEventListener('pointerdown',e=>{if(mode!=='office'||escort)return;drag={x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,id:e.pointerId,total:0};if(view==='walk')canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{
  if(mode!=='office')return;
  if(drag&&drag.id===e.pointerId){const dx=e.clientX-drag.lastX,dy=e.clientY-drag.lastY;drag.total+=Math.abs(dx)+Math.abs(dy);drag.lastX=e.clientX;drag.lastY=e.clientY;if(drag.total>8&&!$('panel').hidden)closePanel();if(view==='walk'){yaw-=dx*.004;pitch=THREE.MathUtils.clamp(pitch-dy*.003,-.8,.65);camera.rotation.set(pitch,yaw,0,'YXZ');}}
  if(!drag&&!mobile()){const hit=pickPerson(e);$('hover-label').hidden=!hit;if(hit){$('hover-label').textContent=(personById(hit)??guestProfiles.find(g=>g.id===hit))?.name??'';$('hover-label').style.left=Math.min(e.clientX+14,innerWidth-180)+'px';$('hover-label').style.top=e.clientY+14+'px';canvas.style.cursor='pointer';}else canvas.style.cursor='grab';}
 });
 canvas.addEventListener('pointerup',e=>{if(drag?.id!==e.pointerId)return;const small=drag.total<8;drag=null;if(small){const id=pickPerson(e);if(id)openPerson(id);else {if(pickCafeMenu(e)){openCafeMenu();return;}const team=pickRegatta(e);if(team)watchRegatta(team);else closePanel();}}});canvas.addEventListener('pointercancel',()=>drag=null);canvas.addEventListener('pointerleave',()=>$('hover-label').hidden=true);
}
function pickPerson(e){if(!office||mode!=='office')return null;pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(office.pickables,false)[0]?.object.userData.personId??null;}
function pickCafeMenu(e){if(!camera||mode!=='office')return false;pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(office?.menuPickables??[],false).length>0;}
function pickRegatta(e){if(!camera||mode!=='office')return null;pointer.set(e.clientX/innerWidth*2-1,-e.clientY/innerHeight*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(environments[0]?.regatta.pickables??[],false)[0]?.object.userData.regattaTeam??null;}
function canWalk(x,z){if(!insideWalkBounds(x,z))return false;if(x>OFFICE.x[1]-.8&&x<OFFICE.x[1]+.7&&(z<OFFICE.terraceDoor[0]+.35||z>OFFICE.terraceDoor[1]-.35))return false;return !office.colliders.some(c=>Math.abs(x-c.x)<c.w/2+.32&&Math.abs(z-c.z)<c.d/2+.32);}
function walk(dt){if(!movement.size||!office)return;if(!$('panel').hidden)closePanel();const forward=(movement.has('forward')?1:0)-(movement.has('back')?1:0),side=(movement.has('right')?1:0)-(movement.has('left')?1:0);const speed=dt*5.2/(forward&&side?Math.sqrt(2):1),dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed,p=camera.position;if(canWalk(p.x+dx,p.z))p.x+=dx;if(canWalk(p.x,p.z+dz))p.z+=dz;}
function frame(now){
 if(document.hidden){lastFrame=0;return;}if(lastFrame&&now-lastFrame<(mobile()?28:13))return;const dt=lastFrame?Math.min(.06,(now-lastFrame)/1000):.016;lastFrame=now;frameCount++;
 if(animation)lifeTime+=dt;
 if(mode==='exterior'){
  const a=(reduced?0:Math.sin((now-startTime)*.00011)*.12)+.70;const radius=mobile()?325:280;camera.position.set(Math.sin(a)*radius,mobile()?155:130,Math.cos(a)*radius);camera.lookAt(mobile()?new THREE.Vector3(0,110,0):new THREE.Vector3(-35,90,0));
 }else if(mode==='cinematic'){
  const t=(now-cinemaStart)/1000;$('cinematic-progress').style.width=Math.min(100,t/17.2*100)+'%';
  if(t<10.4){scene=towerScene;const f=smooth(t/10.4);const a=new THREE.Vector3(205,130,265),end=new THREE.Vector3(49,178,52);camera.position.lerpVectors(a,end,f);camera.lookAt(new THREE.Vector3(0,90+87*f,0));$('cinematic-caption').textContent=t<5?'De Caro Tower':'Giardini sospesi sul Golfo.';}
  if(t>10&&cinemaStage===0){cinemaStage=1;$('fade').classList.add('cover');}
  if(t>10.8&&cinemaStage===1){cinemaStage=2;scene=officeScene;document.body.classList.remove('exterior');$('fade').classList.remove('cover');}
  if(t>=10.8&&t<14.1){const f=smooth((t-10.8)/3.3);camera.position.lerpVectors(new THREE.Vector3(34,4.3,-5),new THREE.Vector3(30,3.2,-12),f);camera.lookAt(27,1.6,-22);$('cinematic-caption').textContent='Benvenuto nello Studio De Caro.';}
  if(t>=14.1){const f=smooth((t-14.1)/3.1);camera.position.copy(interiorFlight.getPoint(f));camera.lookAt(new THREE.Vector3(27,1.6,-22).lerp(new THREE.Vector3(-4,1.5,21),f));$('cinematic-caption').textContent='Cominciamo dalla tua esigenza.';}
  if(t>=17.2)enterOffice(true);
 }else{
  if(transition){const t=Math.min(1,(now-transition.start)/transition.duration),f=smooth(t);camera.position.lerpVectors(transition.from,transition.to,f);controls.target.lerpVectors(transition.fromTarget,transition.toTarget,f);camera.lookAt(controls.target);if(t===1){transition=null;controls.enabled=view==='overview';}}
  else if(view==='overview')controls.update();else walk(dt);
  if(autoCycle&&now-lastNightChange>125000)setNight(!night);
 }
 office.ceiling.visible=(mode==='office'&&view==='walk')||(mode==='cinematic'&&cinemaStage===2);office.update(lifeTime,$('social-dialog').open||!!tour);if(escort)updateEscort(now);if(mode==='office'){refreshGuests(now);checkWalkRoom();}
 const target=night?1:0;nightValue=reduced?target:THREE.MathUtils.damp(nightValue,target,2,dt);
 officeScene.background.setRGB(.56-.53*nightValue,.71-.64*nightValue,.77-.63*nightValue);towerScene.background.copy(officeScene.background);
 for(const e of environments)e.update(lifeTime,nightValue);officeScene.fog.color.setRGB(.43-.40*nightValue,.67-.61*nightValue,.80-.68*nightValue);towerScene.fog.color.copy(officeScene.fog.color);
 for(const l of lights){if(l.hemi){l.hemi.intensity=1.5-nightValue*.95;l.sun.intensity=2.4-nightValue*2.05;l.sun.color.set(nightValue>.5?'#adc5eb':'#fff0d4');l.fill.intensity=1-nightValue*.3;}if(l.lamp)l.lamp.intensity=nightValue*6;}
 if(regattaWatch&&regattaWatch!=='all'&&!transition&&mode==='office'){const b=environments[0]?.regatta.boats.find(b=>b.team.id===regattaWatch);if(b){controls.target.lerp(new THREE.Vector3(b.group.position.x,b.group.position.y+15,b.group.position.z),.12);camera.lookAt(controls.target);}}
 office.setNight(nightValue);tower.setNight(nightValue>.5);renderer.toneMappingExposure=1.02-nightValue*.02;
 renderer.render(scene,camera);
 if(quality==='auto'&&frameCount>100&&frameCount<500){if(dt>.045)slowFrames++;if(slowFrames>90){quality='light';$('quality').value='light';setQuality();}}
}
function smooth(t){t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);}
function fallback(error){if(error)console.error('De Caro Tower:',error);essential=true;window.officeReady=true;renderer?.setAnimationLoop(null);$('loading').hidden=true;$('essential').hidden=false;$('enter').disabled=false;}
setupUI();
setInterval(()=>{if(essential&&mode==='office'&&!document.hidden)refreshGuests(performance.now());},15000);
init3D().catch(fallback);
