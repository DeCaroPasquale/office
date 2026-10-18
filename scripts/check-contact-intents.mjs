import assert from 'node:assert/strict';
import {recognize} from '../dist/dialogues.js';
const cases=[
 ['Voglio parlare con AlterEgo','alterego'],['Voglio parlare con alter ego','alterego'],['Apri il mio AlterEgo CFO','alterego'],['Voglio parlare con AlterEgo di contabilità','alterego'],
 ['Voglio parlare con Pasquale','appuntamento'],['Un appuntamento per il piano industriale','appuntamento'],['Vorrei una videocall per la contabilità','appuntamento'],['Prenoto un appuntamento per la SRL','appuntamento'],['Come posso contattarti via mail?','appuntamento'],['Scriverti su Whats App','appuntamento'],['Vorrei una video call','appuntamento'],
 ['Vorrei automatizzare le email','automazione'],['Devo organizzare le fatture ricevute via email','fatture'],['Mi serve assistenza per la contabilità','contabilita'],['Mi aiuti con il cash flow?','liquidita'],['Vorrei aprire una partita IVA','partita-iva'],['Domanda sconosciuta xyz','NO']
];
for(const [text,expected]of cases)assert.equal(recognize(text)??'NO',expected,text);
console.log('PASS: AlterEgo and contact actions take priority over service keywords; ordinary service routing remains available.');
