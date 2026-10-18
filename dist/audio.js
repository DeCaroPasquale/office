export function createAudio(){
 let enabled=false,music=false,voices=[],ctx=null,timer=null,step=0,utterance=null;
 const listeners=new Set();
 function refresh(){voices=('speechSynthesis' in window?window.speechSynthesis.getVoices():[]).filter(v=>v.localService&&/^it(?:-|_|$)/i.test(v.lang));listeners.forEach(f=>f(voices));}
 if('speechSynthesis' in window){refresh();window.speechSynthesis.addEventListener('voiceschanged',refresh);}
 function cancel(){if('speechSynthesis' in window)window.speechSynthesis.cancel();utterance=null;}
 function speak(text,p,onSpeaking=()=>{}){cancel();if(!enabled||!voices.length)return false;const u=new SpeechSynthesisUtterance(text);utterance=u;u.lang='it-IT';u.voice=voices[p.index%voices.length];u.rate=.92+(p.index%5)*.022;u.pitch=p.gender==='f'?1.03+(p.index%3)*.06:.86+(p.index%4)*.045;u.volume=.8;u.onstart=()=>onSpeaking(true);u.onend=u.onerror=()=>{onSpeaking(false);if(utterance===u)utterance=null;};window.speechSynthesis.speak(u);return true;}
 function tone(freq,time){if(!ctx)return;const o=ctx.createOscillator(),g=ctx.createGain();o.type='sine';o.frequency.value=freq;g.gain.setValueAtTime(0,time);g.gain.linearRampToValueAtTime(.009,time+.15);g.gain.exponentialRampToValueAtTime(.0001,time+6);o.connect(g);g.connect(ctx.destination);o.start(time);o.stop(time+6.1);}
 function chord(){if(!music||!ctx)return;[[130.81,196,261.63,329.63],[110,164.81,220,293.66],[146.83,196,293.66,369.99],[98,146.83,246.94,293.66]][step++%4].forEach((f,i)=>tone(f,ctx.currentTime+i*.18));}
 async function toggleMusic(){if(music){music=false;clearInterval(timer);await ctx?.suspend();return false;}const C=window.AudioContext||window.webkitAudioContext;if(!C)return false;ctx??=new C();await ctx.resume();music=true;chord();timer=setInterval(chord,6500);return true;}
 document.addEventListener('visibilitychange',()=>{if(document.hidden){cancel();if(music){music=false;clearInterval(timer);ctx?.suspend();listeners.forEach(f=>f(voices));}}});
 return {speak,cancel,toggleMusic,setVoice(v){refresh();enabled=!!v&&voices.length>0;if(!enabled)cancel();return enabled;},get voices(){return voices;},get voiceOn(){return enabled;},get musicOn(){return music;},onChange(f){listeners.add(f);}};
}
