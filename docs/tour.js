// Un'unica guida, nove ambienti: nessuna chat dei reparti si apre durante il tour.
export const ALESSIA_WELCOME='Benvenuto nello Studio De Caro, sono Alessia. Ti aiuto a trovare la persona giusta e a capire come possiamo affiancarti. Vuoi conoscere lo studio oppure raccontarmi subito di cosa hai bisogno?';
export const TOUR_STOPS=Object.freeze([
 {area:'reception',text:'Qui ti accolgo io, Alessia. Raccontami la tua esigenza: ti accompagno dal referente giusto e resto a disposizione durante la visita.'},
 {area:'contabilita',text:'Beatrice e il suo team seguono contabilità e adempimenti. Tu dedicati alla tua attività: partiamo dalla tua organizzazione e dalle difficoltà da risolvere.'},
 {area:'consulenza',text:'Con Chiara puoi dare forma a una nuova attività o a un piano industriale. Qui trovi anche consulenza per creator e finanza agevolata.'},
 {area:'operazioni',text:'Lorenzo ti aiuta a mettere a fuoco trasformazioni, acquisizioni e valutazioni. Prima capiamo il tuo obiettivo, poi prepariamo il confronto con Pasquale.'},
 {area:'ricerca',text:'Luca e Alice studiano processi e soluzioni digitali. Quale attività ti fa perdere tempo? È un buon punto da cui iniziare insieme.'},
 {area:'cfo',text:'Questo è l’ufficio di Pasquale De Caro. Qui parliamo di liquidità, margini e progetti: numeri comprensibili per decidere con maggiore consapevolezza.'},
 {area:'riunioni',text:'Riccardo accoglie i nuovi progetti. Scopri le esigenze degli ospiti: potresti riconoscerti e preparare anche tu il primo incontro con Pasquale.'},
 {area:'lounge',text:'Adriana ti aspetta al ristobar. Un caffè, un pranzo leggero e il panorama: qui continuano le conversazioni di chi ha scelto lo studio.'},
 {area:'terrazza',text:'Biliardino, bar all’aperto e vele sul Golfo. Quando vuoi parlare della tua attività, siamo a disposizione: il primo confronto con Pasquale dura trenta minuti ed è gratuito.'}
]);
export const tourDuration=step=>Math.max(7100,step.text.split(/\s+/).length*260);
