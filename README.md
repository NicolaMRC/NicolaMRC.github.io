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
