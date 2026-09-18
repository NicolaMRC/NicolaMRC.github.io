import { uid } from '../lib/utils'

/**
 * Configurazione che resta SOLO su questo dispositivo.
 *
 * Volutamente separata da AppData: il token di accesso a GitHub non deve mai
 * finire dentro il documento sincronizzato, altrimenti verrebbe caricato in
 * chiaro nel repository insieme ai dati.
 */
export interface GithubConfig {
  owner: string
  repo: string
  path: string
  branch: string
  token: string
}

export interface LocalConfig {
  deviceId: string
  deviceName: string
  github: GithubConfig | null
  /** Stato dell'ultimo allineamento riuscito, per rilevare le divergenze. */
  lastSyncedSha: string | null
  lastSyncedAt: string | null
  lastSyncedUpdatedAt: string | null
}

const KEY = 'piano-alimentare:config'

const EMPTY: LocalConfig = {
  deviceId: '',
  deviceName: '',
  github: null,
  lastSyncedSha: null,
  lastSyncedAt: null,
  lastSyncedUpdatedAt: null,
}

function guessDeviceName(): string {
  const ua = navigator.userAgent
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) return 'Android'
  if (/Mac/i.test(ua)) return 'Mac'
  if (/Windows/i.test(ua)) return 'PC'
  return 'Dispositivo'
}

export function loadConfig(): LocalConfig {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? (JSON.parse(raw) as Partial<LocalConfig>) : {}
    const config: LocalConfig = { ...EMPTY, ...parsed }
    if (!config.deviceId) {
      config.deviceId = uid('dev-')
      config.deviceName = guessDeviceName()
      saveConfig(config)
    }
    return config
  } catch {
    const fallback = { ...EMPTY, deviceId: uid('dev-'), deviceName: guessDeviceName() }
    return fallback
  }
}

export function saveConfig(config: LocalConfig): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(config))
  } catch (err) {
    console.error('Salvataggio della configurazione locale fallito', err)
  }
}

export function isGithubConfigured(config: LocalConfig): boolean {
  const g = config.github
  return Boolean(g && g.owner && g.repo && g.path && g.token)
}
