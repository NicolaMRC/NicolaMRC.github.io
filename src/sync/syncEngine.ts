import type { AppData } from '../types'
import { GithubError, listVersions, readFile, readVersion, writeFile, type Version } from './github'
import { isGithubConfigured, loadConfig, saveConfig } from '../store/localConfig'
import { normalizeAppData } from '../store/defaults'
import { debounce, nowIso } from '../lib/utils'

/**
 * Motore di backup automatico su repository GitHub privato.
 *
 * Regola di fondo: non sovrascrivere mai nulla in silenzio. Quando locale e
 * cloud divergono entrambi rispetto all'ultimo allineamento, l'utente vede le
 * due date e sceglie. In tutti gli altri casi la riconciliazione è automatica,
 * perché una sola delle due copie è effettivamente cambiata.
 */

export type SyncStatus =
  | 'disattivato'
  | 'allineato'
  | 'in-attesa'
  | 'in-corso'
  | 'offline'
  | 'errore'
  | 'conflitto'

export interface ConflictInfo {
  remote: AppData
  remoteSha: string
  remoteUpdatedAt: string
  localUpdatedAt: string
}

export interface SyncState {
  status: SyncStatus
  message: string | null
  lastSyncedAt: string | null
  conflict: ConflictInfo | null
}

export interface SyncDeps {
  getData: () => AppData | null
  /** Sostituisce i dati locali senza generare una nuova modifica da caricare. */
  adoptRemote: (data: AppData) => Promise<void>
  /** Sostituisce i dati e li marca come modifica locale da caricare. */
  adoptAsLocalChange: (data: AppData) => Promise<void>
  onState: (state: SyncState) => void
}

let deps: SyncDeps | null = null
let started = false

let state: SyncState = {
  status: 'disattivato',
  message: null,
  lastSyncedAt: null,
  conflict: null,
}

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch }
  deps?.onState(state)
}

export function getSyncState(): SyncState {
  return state
}

function serialize(data: AppData): string {
  // Indentato di proposito: rende leggibili le differenze tra versioni su GitHub.
  return JSON.stringify(data, null, 2)
}

function parse(content: string, deviceId: string): AppData {
  return normalizeAppData(JSON.parse(content), deviceId)
}

/**
 * Un documento "vergine" non ha ancora contenuti dell'utente: può essere
 * sostituito dalla copia cloud senza chiedere nulla.
 */
function isPristine(data: AppData): boolean {
  return (
    data.foods.length === 0 &&
    data.menus.length === 0 &&
    data.recipes.length === 0 &&
    data.equivalenceGroups.length === 0 &&
    data.weeks.length === 0 &&
    data.shoppingLists.length === 0 &&
    data.measurements.length === 0 &&
    data.profile === null
  )
}

function describeError(err: unknown): string {
  if (err instanceof GithubError) return err.message
  if (err instanceof SyntaxError) return 'Il file nel cloud non è leggibile: potrebbe essere danneggiato.'
  return 'Salvataggio nel cloud non riuscito.'
}

/* ------------------------------------------------------------ operazioni */

async function pushNow(sha: string | null): Promise<void> {
  const config = loadConfig()
  if (!isGithubConfigured(config) || !config.github) {
    setState({ status: 'disattivato', message: null })
    return
  }
  const data = deps?.getData()
  if (!data) return
  if (!navigator.onLine) {
    setState({ status: 'offline', message: 'Modifiche in attesa di connessione.' })
    return
  }

  setState({ status: 'in-corso', message: null })
  const when = new Date().toLocaleString('it-IT', { dateStyle: 'short', timeStyle: 'short' })
  try {
    const result = await writeFile(
      config.github,
      serialize(data),
      sha,
      `Dati aggiornati — ${when} (${config.deviceName})`,
    )
    const syncedAt = nowIso()
    saveConfig({
      ...loadConfig(),
      lastSyncedSha: result.sha,
      lastSyncedAt: syncedAt,
      lastSyncedUpdatedAt: data.updatedAt,
    })
    setState({ status: 'allineato', message: null, lastSyncedAt: syncedAt, conflict: null })
  } catch (err) {
    // Il file remoto è cambiato: si riconcilia e, se il caso, si riprova.
    if (err instanceof GithubError && (err.status === 409 || err.status === 422)) {
      await reconcile({ retryPush: true })
      return
    }
    setState({ status: 'errore', message: describeError(err) })
  }
}

/** Confronta la copia locale con quella nel cloud e decide come procedere. */
async function reconcile(options: { retryPush?: boolean } = {}): Promise<void> {
  const config = loadConfig()
  if (!isGithubConfigured(config) || !config.github) {
    setState({ status: 'disattivato', message: null, conflict: null })
    return
  }
  if (!navigator.onLine) {
    setState({
      status: 'offline',
      message: 'Nessuna connessione: i dati restano salvati sul dispositivo.',
    })
    return
  }

  const local = deps?.getData()
  if (!local) return

  setState({ status: 'in-corso', message: null })
  try {
    const remoteFile = await readFile(config.github)

    // Primo salvataggio in assoluto: nel cloud non c'è ancora nulla.
    if (!remoteFile) {
      await pushNow(null)
      return
    }

    const remote = parse(remoteFile.content, config.deviceId)
    const localChanged = local.updatedAt !== config.lastSyncedUpdatedAt
    const remoteIsOurs = remoteFile.sha === config.lastSyncedSha

    if (remoteIsOurs) {
      // Nessuno ha toccato il cloud da fuori: comanda il locale.
      if (localChanged || options.retryPush) await pushNow(remoteFile.sha)
      else setState({ status: 'allineato', message: null, lastSyncedAt: config.lastSyncedAt })
      return
    }

    // Il cloud è cambiato altrove. Se qui non c'è nulla di nuovo, si adotta.
    if (!localChanged || isPristine(local) || remote.updatedAt === local.updatedAt) {
      await deps?.adoptRemote(remote)
      const syncedAt = nowIso()
      saveConfig({
        ...loadConfig(),
        lastSyncedSha: remoteFile.sha,
        lastSyncedAt: syncedAt,
        lastSyncedUpdatedAt: remote.updatedAt,
      })
      setState({ status: 'allineato', message: null, lastSyncedAt: syncedAt, conflict: null })
      return
    }

    // Entrambe le copie sono cambiate: decide l'utente.
    setState({
      status: 'conflitto',
      message: null,
      conflict: {
        remote,
        remoteSha: remoteFile.sha,
        remoteUpdatedAt: remote.updatedAt,
        localUpdatedAt: local.updatedAt,
      },
    })
  } catch (err) {
    setState({ status: 'errore', message: describeError(err) })
  }
}

async function reconcileThenPush(): Promise<void> {
  const config = loadConfig()
  if (!isGithubConfigured(config)) {
    setState({ status: 'disattivato', message: null })
    return
  }
  // Si scrive direttamente usando l'ultimo identificativo noto: se nel
  // frattempo il cloud è cambiato, la scrittura fallisce e si riconcilia.
  await pushNow(config.lastSyncedSha)
}

const scheduledPush = debounce(() => {
  void reconcileThenPush()
}, 2500)

/* ------------------------------------------------------------------ api */

/** Segnala che i dati locali sono cambiati e programma il caricamento. */
export function notifyLocalChange(): void {
  const config = loadConfig()
  if (!isGithubConfigured(config)) {
    setState({ status: 'disattivato', message: null })
    return
  }
  setState({ status: 'in-attesa', message: null })
  scheduledPush()
}

/** Forza subito il caricamento, senza attendere il ritardo. */
export async function flushNow(): Promise<void> {
  scheduledPush.cancel()
  await reconcileThenPush()
}

/** Rilegge il cloud e riconcilia: usata all'avvio e dal pulsante manuale. */
export async function syncNow(): Promise<void> {
  scheduledPush.cancel()
  await reconcile()
}

export async function resolveConflict(choice: 'locale' | 'cloud'): Promise<void> {
  const conflict = state.conflict
  if (!conflict) return
  if (choice === 'cloud') {
    await deps?.adoptRemote(conflict.remote)
    const syncedAt = nowIso()
    saveConfig({
      ...loadConfig(),
      lastSyncedSha: conflict.remoteSha,
      lastSyncedAt: syncedAt,
      lastSyncedUpdatedAt: conflict.remoteUpdatedAt,
    })
    setState({ status: 'allineato', message: null, lastSyncedAt: syncedAt, conflict: null })
    return
  }
  // Tenendo il locale, la versione nel cloud non va persa: resta nella
  // cronologia dei commit e può essere ripristinata in qualsiasi momento.
  setState({ conflict: null })
  await pushNow(conflict.remoteSha)
}

export async function fetchVersions(): Promise<Version[]> {
  const config = loadConfig()
  if (!isGithubConfigured(config) || !config.github) return []
  return listVersions(config.github)
}

/** Ripristina una versione passata: diventa lo stato corrente e viene ricaricata. */
export async function restoreVersion(sha: string): Promise<void> {
  const config = loadConfig()
  if (!isGithubConfigured(config) || !config.github) return
  const content = await readVersion(config.github, sha)
  if (!content) throw new Error('Versione non leggibile.')
  const data = parse(content, config.deviceId)
  await deps?.adoptAsLocalChange(data)
  await flushNow()
}

export function startSync(newDeps: SyncDeps): void {
  deps = newDeps
  if (started) return
  started = true

  window.addEventListener('online', () => {
    void syncNow()
  })
  window.addEventListener('offline', () => {
    setState({
      status: 'offline',
      message: 'Nessuna connessione: i dati restano salvati sul dispositivo.',
    })
  })
  // Su iPhone la scheda può essere congelata senza preavviso: quando l'app
  // passa in secondo piano si carica subito quanto è in attesa.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && state.status === 'in-attesa') void flushNow()
    if (document.visibilityState === 'visible' && state.status !== 'conflitto') void syncNow()
  })

  const config = loadConfig()
  setState({ lastSyncedAt: config.lastSyncedAt })
  void syncNow()
}
