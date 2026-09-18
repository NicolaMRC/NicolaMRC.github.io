import type { GithubConfig } from '../store/localConfig'

/**
 * Client minimo per l'API Contents di GitHub.
 *
 * Il documento dei dati viene salvato come singolo file JSON nel repository
 * privato dell'utente: ogni salvataggio e' un commit, quindi la cronologia
 * delle versioni e il ripristino sono gratuiti.
 */

const API = 'https://api.github.com'

export class GithubError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'GithubError'
    this.status = status
  }
}

/** Traduce gli errori dell'API in messaggi comprensibili. */
function describe(status: number, fallback: string): string {
  switch (status) {
    case 401:
      return 'Token non valido o scaduto. Generane uno nuovo su GitHub.'
    case 403:
      return 'Accesso negato: il token non ha i permessi di scrittura su questo repository.'
    case 404:
      return 'Repository o percorso non trovato. Controlla nome utente, repository e che il token veda questo repository.'
    case 409:
    case 422:
      return 'Il file nel cloud è cambiato nel frattempo: ricarico prima di salvare.'
    default:
      return fallback
  }
}

async function request<T>(config: GithubConfig, path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${config.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new GithubError('Nessuna connessione a GitHub.', 0)
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { message?: string }
      if (body?.message) detail = body.message
    } catch {
      /* corpo non leggibile: resta lo statusText */
    }
    throw new GithubError(describe(res.status, detail), res.status)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/* ------------------------------------------------------- base64 unicode */

export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

export function decodeBase64(b64: string): string {
  const binary = atob(b64.replace(/\s/g, ''))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

/* ------------------------------------------------------------ operazioni */

export interface RemoteFile {
  content: string
  sha: string
}

interface ContentsResponse {
  content?: string
  sha: string
  size?: number
  encoding?: string
}

/** Verifica che il token veda il repository e vi possa scrivere. */
export async function verifyAccess(config: GithubConfig): Promise<{ ok: true; private: boolean }> {
  const repo = await request<{ private: boolean; permissions?: { push?: boolean } }>(
    config,
    `/repos/${config.owner}/${config.repo}`,
  )
  if (repo.permissions && repo.permissions.push === false) {
    throw new GithubError('Il token puo’ leggere ma non scrivere su questo repository.', 403)
  }
  return { ok: true, private: repo.private }
}

/** Legge il file dei dati. Restituisce null se non esiste ancora. */
export async function readFile(config: GithubConfig, ref?: string): Promise<RemoteFile | null> {
  const query = new URLSearchParams({ ref: ref ?? config.branch })
  try {
    const res = await request<ContentsResponse>(
      config,
      `/repos/${config.owner}/${config.repo}/contents/${encodeURI(config.path)}?${query}`,
    )
    // Oltre una certa dimensione l'API restituisce il contenuto vuoto:
    // in quel caso si legge il blob corrispondente.
    if (!res.content && res.size) {
      const blob = await request<{ content: string }>(
        config,
        `/repos/${config.owner}/${config.repo}/git/blobs/${res.sha}`,
      )
      return { content: decodeBase64(blob.content), sha: res.sha }
    }
    return { content: decodeBase64(res.content ?? ''), sha: res.sha }
  } catch (err) {
    if (err instanceof GithubError && err.status === 404) return null
    throw err
  }
}

/** Scrive il file dei dati creando un commit. */
export async function writeFile(
  config: GithubConfig,
  content: string,
  sha: string | null,
  message: string,
): Promise<RemoteFile> {
  const res = await request<{ content: { sha: string } }>(
    config,
    `/repos/${config.owner}/${config.repo}/contents/${encodeURI(config.path)}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        message,
        content: encodeBase64(content),
        branch: config.branch,
        ...(sha ? { sha } : {}),
      }),
    },
  )
  return { content, sha: res.content.sha }
}

export interface Version {
  sha: string
  date: string
  message: string
}

/** Elenco dei salvataggi passati, dal piu' recente. */
export async function listVersions(config: GithubConfig, limit = 30): Promise<Version[]> {
  const query = new URLSearchParams({
    path: config.path,
    sha: config.branch,
    per_page: String(limit),
  })
  const commits = await request<
    Array<{ sha: string; commit: { message: string; committer: { date: string } } }>
  >(config, `/repos/${config.owner}/${config.repo}/commits?${query}`)
  return commits.map((c) => ({
    sha: c.sha,
    date: c.commit.committer.date,
    message: c.commit.message,
  }))
}

/** Contenuto del file a una versione specifica, per il ripristino. */
export async function readVersion(config: GithubConfig, sha: string): Promise<string | null> {
  const file = await readFile(config, sha)
  return file?.content ?? null
}
