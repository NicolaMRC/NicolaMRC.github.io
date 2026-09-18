/** Identificatore breve e univoco, sufficiente per dati di un singolo utente. */
export function uid(prefix = ''): string {
  const rnd = Math.random().toString(36).slice(2, 10)
  const time = Date.now().toString(36)
  return `${prefix}${time}${rnd}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** Data ISO (YYYY-MM-DD) di un oggetto Date, in fuso orario locale. */
export function toIsoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** "oggi alle 14:32", "ieri alle 9:05", "12 mar alle 18:20". */
export function formatWhen(iso: string | undefined | null): string {
  if (!iso) return 'mai'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'mai'
  const time = d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (toIsoDate(d) === toIsoDate(today)) return `oggi alle ${time}`
  if (toIsoDate(d) === toIsoDate(yesterday)) return `ieri alle ${time}`
  const date = d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  return `${date} alle ${time}`
}

/** Numero senza decimali inutili: 80, 12.5, 0.5. */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '0'
  return (Math.round(n * 100) / 100).toLocaleString('it-IT')
}

/** Confronto per ordinamento alfabetico italiano, insensibile ad accenti e maiuscole. */
export function byName<T extends { name: string }>(a: T, b: T): number {
  return a.name.localeCompare(b.name, 'it', { sensitivity: 'base' })
}

/** Normalizza per la ricerca: minuscolo e senza accenti. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  const wrapped = (...args: A) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }
  wrapped.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = undefined
  }
  wrapped.flush = (...args: A) => {
    if (timer) clearTimeout(timer)
    timer = undefined
    fn(...args)
  }
  return wrapped
}
