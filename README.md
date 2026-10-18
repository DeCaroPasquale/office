# De Caro Tower — Studio De Caro

Ufficio virtuale completo di Pasquale De Caro, CFO e Dottore Commercialista. Questa cartella è pronta per essere caricata nel tuo repository GitHub. Comprende l’ultima versione del progetto: reception con tour, cinque aree professionali, sala riunioni, lounge/ristobar, terrazza, paesaggio e regata sul Golfo di Napoli, dialoghi guidati, contatti e collegamento AlterEgo.

## Pubblicare su GitHub Pages

1. Crea su GitHub un repository, per esempio `de-caro-tower`. Per GitHub Pages su GitHub Free scegli un repository pubblico.
2. Carica **tutto il contenuto di questa cartella**, mantenendo `docs`, `dist` e `scripts` come cartelle. Non caricare lo ZIP completo o la cartella esterna del pacchetto. Nel repository usa **Add file → Upload files**; se il repository è appena creato, usa il collegamento per caricare file esistenti.
3. Conferma con **Commit changes**.
4. Apri **Settings → Pages**. In **Build and deployment**, scegli **Deploy from a branch**.
5. Scegli il branch **main**, la cartella **/docs** e premi **Save**.
6. Apri il collegamento che GitHub mostra nella sezione Pages dopo la pubblicazione.

`docs/index.html` è già pronto: non serve compilare il progetto prima del primo caricamento. CSS, immagini, font, Three.js e componenti grafici sono inclusi. I percorsi sono relativi, adatti anche a un sito pubblicato sotto il nome del repository.

## Cartelle e modifiche

- `dist/`: sorgenti web modificabili dell’ufficio, già eseguibili come sito statico.
- `docs/`: copia pronta da pubblicare con GitHub Pages.
- `scripts/`: verifiche originali del progetto e preparazione della cartella Pages.
- `DOCUMENTAZIONE_UFFICIO.md`: descrizione tecnica e funzionale completa del progetto.

Per modifiche successive lavora su `dist/`, poi sincronizza `docs/` prima di caricare le modifiche:

```bash
npm ci
npm test
npm run pages
```

Le dipendenze npm servono per eseguire i controlli; il sito già pronto usa i moduli locali in `docs/vendor`. Per un’anteprima locale, servi `dist/` con un server statico HTTP (non aprire l’HTML come file).

I video promozionali e il dossier si trovano nelle altre cartelle del pacchetto, separati dal progetto web. I contatti professionali presenti nel sito sono quelli configurati nel progetto originale.

## Versione e licenze

Esportazione della versione 10 del progetto, commit `91a4867f2c1d850e49b5f93ff939dfde7e9fbf13`, verificata il 17 ottobre 2026. I file applicativi di `dist/` corrispondono al progetto originale; gli strumenti per preparare GitHub Pages sono aggiunti soltanto a questa copia di consegna.

Le licenze di Three.js e del font Allura sono incluse nelle rispettive cartelle `vendor` e `assets`. Marchio e ritratto sono i materiali forniti per Studio De Caro.

## Guide ufficiali

Consultate il 17 ottobre 2026:

- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site
