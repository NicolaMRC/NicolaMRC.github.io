# PrepEat

Web app installabile (PWA) per gestire il piano alimentare: menu giornalieri,
liste della spesa settimanali, ricette con varianti e scheda personale delle
misurazioni.

Funziona offline, senza account e senza server. I dati vivono sul dispositivo e
vengono copiati automaticamente in un repository GitHub privato.

## Avvio in sviluppo

```bash
npm install
npm run dev
```

L'app risponde su <http://localhost:5180>.

Per aprirla dal telefono sulla stessa rete Wi-Fi:

```bash
npm run dev -- --host
```

## Build di produzione

```bash
npm run build
```

Il risultato è in `dist/`, pubblicabile su qualsiasi hosting statico.

## Come sono organizzati i dati

Tutti i dati dell'utente stanno in un **unico documento JSON** (`AppData` in
[`src/types.ts`](src/types.ts)), salvato in IndexedDB sotto una sola chiave.

La scelta è deliberata: il volume di dati è piccolo (qualche centinaio di
kilobyte), e avere un documento unico rende banali il backup, il confronto fra
versioni, l'export e il ripristino. Il modello è definito per intero fin
dall'inizio — comprese le parti non ancora costruite — così il formato del file
resta stabile e i dati inseriti oggi restano leggibili domani.

## Come funziona il backup

Tre livelli indipendenti, in modo che non esista un singolo punto di rottura:

1. **IndexedDB locale** — copia di lavoro, immediata e disponibile offline.
2. **Repository GitHub privato** — a ogni modifica, dopo un paio di secondi di
   inattività, il documento viene scritto come file JSON con un commit. Ogni
   salvataggio è quindi una versione ripristinabile.
3. **Export manuale** — file scaricabile, leggibile senza l'app.

Il token di accesso a GitHub è memorizzato in `localStorage`, **separato dal
documento dei dati**: non viene mai incluso nel file caricato nel repository.

### Riconciliazione

All'avvio e a ogni ritorno in primo piano l'app confronta la copia locale con
quella nel cloud:

- cloud invariato dall'ultimo caricamento → vince il locale, che viene caricato;
- locale invariato dall'ultimo allineamento → viene adottata la copia del cloud;
- **entrambi modificati** → l'app mostra le due date e fa scegliere l'utente,
  senza toccare nulla nel frattempo.

Tenendo la copia locale, quella nel cloud non viene persa: resta nella
cronologia dei commit e può essere ripristinata.

## Come è organizzata la navigazione

Quattro sezioni in basso: **Home**, **Spesa**, **Menu**, **Altro**.

- **Home** mostra un giorno alla volta, oggi all'apertura. Si cambia giorno
  scorrendo col dito a destra o a sinistra, con le frecce, oppure tornando a
  oggi dal pulsante centrale. La settimana non è più una sezione a sé: è il
  pulsante in alto a destra, che apre la stessa schermata di prima.
- **Menu** elenca l'archivio. Toccare una scheda apre il menu con la stessa
  impaginazione della Home — titolo, nota, stelle, tag, pasti — dove però le
  alternative sono mostrate tutte, perché quale fare si decide nel giorno.
  Da lì la matita porta all'editor.
- Negli elenchi (archivio, ricerca, settimana) il sottotitolo di un menu è la
  **sua nota**: dice cosa si mangia molto meglio dell'elenco dei pasti. Quando
  manca, al suo posto compare in corsivo l'invito a scriverla.

## Struttura

```
src/
  types.ts            modello dati completo dell'app
  lib/utils.ts        funzioni di servizio (id, date, formattazione)
  store/
    db.ts             IndexedDB e archiviazione persistente
    localConfig.ts    configurazione locale, token incluso
    defaults.ts       reparti predefiniti e normalizzazione del documento
    appStore.ts       stato dell'app e azioni
  sync/
    github.ts         client dell'API Contents di GitHub
    syncEngine.ts     riconciliazione, coda di caricamento, versioni
  components/         intestazione, navigazione, modale, indicatore di stato
  pages/              schermate
```

## Stato di avanzamento

- [x] **Tappa 1** — fondamenta, persistenza, backup GitHub, archivio alimenti
- [x] **Tappa 2** — menu giornalieri, alternative per pasto, tag e calendario settimanale
- [x] **Tappa 4** — generazione pesata per gradimento e limiti di frequenza settimanali
- [x] **Tappa 3** — lista della spesa aggregata, per reparto, con spunta e condivisione
- [x] **Tappa 5** — ricette, equivalenze e varianti dei pasti
- [x] **Tappa 6** — scheda personale, rilevazioni e grafico del peso

## Riprendere il lavoro in una sessione nuova

Tutto quello che serve sta in questa cartella e nel repository.

- **Il codice** è qui, con la cronologia git completa, e si pubblica da solo a
  ogni `git push` su <https://nicolamrc.github.io>.
- **I dati** (alimenti, menu, settimane, misurazioni) vivono nel browser e
  hanno una copia nel repository privato configurato in *Altro → Backup*.
  Non stanno qui e non vanno mai commessi.
- **`strumenti-locali/`** contiene la scansione del piano nutrizionale e gli
  script che l'hanno trascritta. È escluso dal versionamento di proposito:
  sono dati sanitari e questo repository è pubblico.

### Convenzioni decise

- **Nomi dei menu**: `Menu A1`…`A7` per la prima settimana del piano, `B` e
  `C` per le successive, `D1`–`D3` per le seconde versioni di lunedì, martedì
  e mercoledì della terza. Il numero è il giorno, da lunedì a domenica.
- **Nomi degli alimenti**: dicono *cosa si compra*, non come si cucina —
  «Zucchine», non «zucchine crude» o «zucchine bollite». Restano solo le
  parole che identificano un prodotto diverso allo scaffale: affumicato,
  sott'olio, in scatola, grattugiato, e il cotto/crudo del prosciutto.
- **Alternative**: quando il piano dà due versioni dello stesso giorno che
  cambiano poco (la colazione, una grammatura), diventano alternative dentro
  un unico menu. Quando cambiano quasi tutti i pasti, diventano menu separati.
- **Tag**: si usano solo quelli di *proteina principale* e *tipo di piatto*.
  Stagionalità, caratteristiche e tipo di giornata si impostano a mano.
- **Acqua**: non viene mai inserita nei menu.

### Trappole già pagate

- **La sfumatura dei menu non deve tornare `position: fixed`.** Su iPhone,
  con l'app installata sulla schermata Home, la striscia in cima allo
  schermo — quella dell'orologio — mostra la pagina. Da fissa, la sfumatura
  finiva su un livello composto a parte che iOS non ridisegnava quando
  cambiava solo la sua variabile di colore: scorrendo i giorni restava lassù
  il colore del menu di prima. Da assoluta il problema sparisce, e il
  comportamento è anche più naturale, perché il colore scorre con la pagina.
- **La data di compilazione in *Altro*** serve a sapere quale versione gira
  su un telefono: il service worker aggiorna l'app da sé, e senza quel dato
  non c'è modo di distinguere un codice nuovo che non funziona da un codice
  vecchio ancora in cache. Il fuso è fissato su `Europe/Rome` perché a
  compilare è GitHub, che lavora in UTC.

### Rigenerare il file da importare

Dopo un export dei dati dall'app:

```bash
cd strumenti-locali
node genera.mjs <export-app.json> <file-da-importare.json>
```

Lo script riusa gli alimenti esistenti per nome, crea solo quelli mancanti e
non tocca nulla di quello che c'è già.
