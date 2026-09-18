import { toIsoDate } from './utils'

/** La settimana inizia di lunedì, come da abitudine italiana. */
export function startOfWeek(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const giorno = (d.getDay() + 6) % 7 // 0 = lunedì
  d.setDate(d.getDate() - giorno)
  return d
}

export function addDays(date: Date, giorni: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + giorni)
  return d
}

/**
 * Converte una data ISO in Date locale.
 * Si costruisce a mano perché `new Date('2026-09-17')` viene interpretata come
 * UTC e, nei fusi a est di Greenwich, restituisce il giorno precedente.
 */
export function parseIsoDate(iso: string): Date {
  const [anno, mese, giorno] = iso.split('-').map(Number)
  return new Date(anno, mese - 1, giorno)
}

/** Le sette date ISO della settimana che inizia alla data indicata. */
export function weekDates(startIso: string): string[] {
  const inizio = parseIsoDate(startIso)
  return Array.from({ length: 7 }, (_, i) => toIsoDate(addDays(inizio, i)))
}

export function isoWeekStart(date: Date = new Date()): string {
  return toIsoDate(startOfWeek(date))
}

/** "lunedì", "martedì"… */
export function nomeGiorno(iso: string): string {
  return parseIsoDate(iso).toLocaleDateString('it-IT', { weekday: 'long' })
}

/** "lun 22" */
export function giornoBreve(iso: string): string {
  const d = parseIsoDate(iso)
  const nome = d.toLocaleDateString('it-IT', { weekday: 'short' }).replace('.', '')
  return `${nome} ${d.getDate()}`
}

/** "22 – 28 settembre" oppure "29 settembre – 5 ottobre" */
export function intervalloSettimana(startIso: string): string {
  const date = weekDates(startIso)
  const inizio = parseIsoDate(date[0])
  const fine = parseIsoDate(date[6])
  const meseInizio = inizio.toLocaleDateString('it-IT', { month: 'long' })
  const meseFine = fine.toLocaleDateString('it-IT', { month: 'long' })
  if (meseInizio === meseFine) return `${inizio.getDate()} – ${fine.getDate()} ${meseFine}`
  return `${inizio.getDate()} ${meseInizio} – ${fine.getDate()} ${meseFine}`
}

export function isOggi(iso: string): boolean {
  return iso === toIsoDate(new Date())
}

/** "oggi", "domani", "ieri" oppure "lunedì 22 settembre". */
export function descriviGiorno(iso: string): string {
  const oggi = new Date()
  if (iso === toIsoDate(oggi)) return 'oggi'
  if (iso === toIsoDate(addDays(oggi, 1))) return 'domani'
  if (iso === toIsoDate(addDays(oggi, -1))) return 'ieri'
  return parseIsoDate(iso).toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

/** Tutte le date ISO comprese fra due estremi, inclusi. */
export function dateNellIntervallo(fromIso: string, toIso: string): string[] {
  const inizio = parseIsoDate(fromIso)
  const fine = parseIsoDate(toIso)
  if (fine < inizio) return []
  const date: string[] = []
  for (let d = inizio; d <= fine; d = addDays(d, 1)) date.push(toIsoDate(d))
  return date
}

/**
 * Stagione "gastronomica" del mese corrente: da aprile a settembre estate,
 * altrimenti inverno. Una divisione in due basta allo scopo, che e' spostare
 * le probabilita', non fare l'almanacco.
 */
export function stagioneCorrente(oggi: Date = new Date()): 'estate' | 'inverno' {
  const mese = oggi.getMonth() + 1
  return mese >= 4 && mese <= 9 ? 'estate' : 'inverno'
}
