import { openDB, type IDBPDatabase } from 'idb'
import type { AppData } from '../types'

const DB_NAME = 'piano-alimentare'
const DB_VERSION = 1
const STORE = 'documento'
const DOC_KEY = 'data'

/**
 * Oltre questo tempo si considera l'archivio non raggiungibile.
 *
 * IndexedDB può restare in attesa indefinita — per esempio quando un'altra
 * scheda tiene aperta una connessione durante un aggiornamento — e senza un
 * limite l'app resterebbe bloccata sulla schermata di avvio senza spiegare
 * nulla. Meglio arrendersi e dirlo.
 */
const TIMEOUT_APERTURA = 5000

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    const apertura = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
      },
      blocked() {
        console.warn('Apertura del database in attesa: un’altra scheda la sta bloccando.')
      },
      blocking(_versioneAttuale, _versioneRichiesta, event) {
        // Un'altra scheda vuole aggiornare o eliminare il database: si libera
        // subito la connessione, altrimenti resterebbe bloccata all'infinito.
        ;(event.target as IDBDatabase | null)?.close()
        dbPromise = null
      },
      terminated() {
        dbPromise = null
      },
    })

    let scaduto: ReturnType<typeof setTimeout>
    dbPromise = Promise.race([
      apertura,
      new Promise<never>((_, reject) => {
        scaduto = setTimeout(
          () => reject(new Error('Archivio locale non raggiungibile.')),
          TIMEOUT_APERTURA,
        )
      }),
    ])
      .then((db) => {
        clearTimeout(scaduto)
        return db
      })
      .catch((err) => {
        // Al prossimo tentativo si riparte da zero invece di riusare una
        // promessa già fallita.
        dbPromise = null
        // Se l'apertura arriva comunque, ma in ritardo, la connessione va
        // chiusa: lasciata aperta bloccherebbe per sempre eliminazioni e
        // aggiornamenti del database, anche dalle altre schede.
        void apertura.then((db) => db.close()).catch(() => undefined)
        throw err
      })
  }
  return dbPromise
}

export interface EsitoLettura {
  data: AppData | null
  errore: string | null
}

/**
 * Legge il documento salvato. Distingue "non c'è ancora nulla" (primo avvio)
 * da "non riesco ad accedere all'archivio": nel secondo caso l'app deve
 * avvisare, perché continuare a lavorare significherebbe perdere il lavoro.
 */
export async function loadLocal(): Promise<EsitoLettura> {
  try {
    const db = await getDb()
    const value = await db.get(STORE, DOC_KEY)
    return { data: (value as AppData) ?? null, errore: null }
  } catch (err) {
    console.error('Lettura dal database locale fallita', err)
    return {
      data: null,
      errore:
        'Non riesco ad accedere all’archivio del browser. Chiudi le altre schede dell’app e ricarica la pagina.',
    }
  }
}

export async function saveLocal(data: AppData): Promise<void> {
  const db = await getDb()
  await db.put(STORE, data, DOC_KEY)
}

/**
 * Chiede al browser di marcare i dati come persistenti, così che non vengano
 * eliminati automaticamente quando lo spazio sul dispositivo scarseggia.
 * Su iPhone la richiesta viene accolta più facilmente quando l'app è stata
 * installata nella schermata Home.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

export async function isStoragePersisted(): Promise<boolean> {
  try {
    return (await navigator.storage?.persisted?.()) ?? false
  } catch {
    return false
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const est = await navigator.storage?.estimate?.()
    if (!est) return null
    return { usage: est.usage ?? 0, quota: est.quota ?? 0 }
  } catch {
    return null
  }
}
