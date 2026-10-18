import {guestProfiles} from './guests.js';
import {leadForArea} from './data.js';

export const GUEST_REFRESH_MS=180000;
export function createGuestPool(rng=Math.random){
 let bag=[];const active=new Set();
 function refill(){bag=[...guestProfiles];for(let i=bag.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]];}}
 function draw(count){const result=[];while(result.length<count){if(!bag.length)refill();const index=bag.findIndex(p=>!active.has(p.id));if(index<0){refill();continue;}const [p]=bag.splice(index,1);active.add(p.id);result.push(p);}return result;}
 return {next(){active.clear();const meeting=draw(rng()<.5?1:2),lounge=draw(rng()<.5?1:2);return {meeting,lounge};}};
}
export function guestAppearance(p){
 const n=Number(p.id.slice(1)),skin=['#efc7a8','#dba783','#bb8968','#895e49','#e2b297','#a57559'][n%6],hair=['#302925','#674731','#aa794b','#2b2728','#776a60','#c2a37b'][Math.floor(n/3)%6];
 const colors=['#294863','#91887e','#8d9e9a','#4a5d74','#a5a7ae','#9d735e','#536d68','#7c718c','#b2a18a','#34425b'];
 return {skin,hair,outfit:colors[n%10],height:.92+(n%7)*.025,build:.9+(Math.floor(n/7)%5)*.05,hairStyle:n%5,glasses:n%4===0,beard:p.gender==='m'&&n%3===0,accessory:n%3};
}
export function collaboratorMessage(p,activity='work'){
 const leader=leadForArea(p.areaId);
 const text=activity==='meeting'?'Ci stiamo confrontando su una soluzione per i nostri clienti. Ogni progetto merita attenzione: racconta la tua esigenza a '+leader.name+'.':activity==='coffee'||activity==='walk'||activity==='eat'||activity==='view'?'Una breve pausa per tornare dai nostri clienti con nuove energie. Se ti serve una mano, '+leader.name+' è a tua disposizione.':'Sto seguendo il lavoro dei nostri clienti. Sei già cliente dello Studio De Caro o vuoi conoscerci? Per la tua esigenza puoi parlare con '+leader.name+'.';
 return {text,leader};
}
export const roomMessages={riunioni:{title:'Meeting in corso',text:'Qui prende forma un nuovo progetto. Scopri di più.',stage:'Primo incontro',invite:'Ogni collaborazione inizia da un confronto. Raccontaci la tua attività: puoi prenotare un primo incontro gratuito di 30 minuti con Pasquale De Caro.'},lounge:{title:'Benvenuto nella Lounge',text:'Un caffè, una conversazione, una collaborazione che continua. Scopri di più.',stage:'Collaborazione avviata',invite:'Anche il tuo progetto può trovare spazio nello studio. Scegli come organizzare un primo incontro gratuito di 30 minuti con Pasquale De Caro.'}};
