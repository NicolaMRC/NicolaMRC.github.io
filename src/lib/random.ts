import type { DayMenu, FrequencyRule, SeasonalPreference, Stagione } from '../types'
import { stagioneCorrente } from './date'
import { TAG_ESTIVO, TAG_INVERNALE } from './tags'
import { pastiCompilati } from './menu'

/** Mescolamento di Fisher-Yates su una copia dell'elenco. */
export function mescola<T>(items: T[]): T[] {
  const copia = [...items]
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copia[i], copia[j]] = [copia[j], copia[i]]
  }
  return copia
}

/** Solo i menu che hanno almeno un pasto compilato sono assegnabili. */
export function menuUtilizzabili(menus: DayMenu[]): DayMenu[] {
  return menus.filter((menu) => pastiCompilati(menu).length > 0)
}

/** Un menu non valutato vale come tre stelle: né favorito né penalizzato. */
export function ratingEffettivo(menu: DayMenu): number {
  const valore = menu.rating ?? 0
  return valore >= 1 && valore <= 5 ? valore : 3
}

/**
 * Fasce di gradimento e probabilità con cui la generazione pesca da ciascuna.
 *
 * Le percentuali valgono sulla fascia, non sul singolo menu: se in "alto" ci
 * sono tre menu, quel 50% se lo dividono fra loro.
 */
export const FASCE = [
  { id: 'alto', etichetta: '4 e 5 stelle', peso: 50, test: (r: number) => r >= 4 },
  { id: 'medio', etichetta: '3 stelle', peso: 30, test: (r: number) => r === 3 },
  { id: 'basso', etichetta: '2 stelle', peso: 15, test: (r: number) => r === 2 },
  { id: 'minimo', etichetta: '1 stella', peso: 5, test: (r: number) => r <= 1 },
] as const

function fasciaDi(menu: DayMenu) {
  const rating = ratingEffettivo(menu)
  return FASCE.find((f) => f.test(rating)) ?? FASCE[1]
}

/** Quanto la stagione sposta le probabilità, per ciascuna intensità. */
const INTENSITA: Record<SeasonalPreference['strength'], { bonus: number; malus: number }> = {
  leggera: { bonus: 1.6, malus: 0.7 },
  media: { bonus: 2.5, malus: 0.4 },
  forte: { bonus: 4, malus: 0.15 },
}

export interface ContestoStagionale {
  stagione: Stagione
  bonus: number
  malus: number
}

/** Traduce la preferenza salvata in coefficienti, o null se è spenta. */
export function contestoStagionale(
  preferenza: SeasonalPreference | undefined,
  oggi: Date = new Date(),
): ContestoStagionale | null {
  if (!preferenza?.enabled) return null
  const stagione = preferenza.season === 'auto' ? stagioneCorrente(oggi) : preferenza.season
  const { bonus, malus } = INTENSITA[preferenza.strength] ?? INTENSITA.media
  return { stagione, bonus, malus }
}

/**
 * Coefficiente stagionale di un menu.
 *
 * Fuori stagione la probabilità cala ma non arriva mai a zero: un menu non
 * viene mai escluso, diventa solo più raro. Senza tag di stagione — o con
 * entrambi — il menu è adatto tutto l'anno e resta intoccato.
 */
export function moltiplicatoreStagionale(
  menu: DayMenu,
  contesto: ContestoStagionale | null,
): number {
  if (!contesto) return 1
  const estivo = menu.tags.includes(TAG_ESTIVO)
  const invernale = menu.tags.includes(TAG_INVERNALE)
  if (estivo === invernale) return 1
  const inStagione = contesto.stagione === 'estate' ? estivo : invernale
  return inStagione ? contesto.bonus : contesto.malus
}

/**
 * Peso di ciascun candidato: la quota della sua fascia divisa fra i menu che
 * la compongono, moltiplicata per il coefficiente stagionale.
 *
 * Le fasce vuote non partecipano, quindi il loro peso si redistribuisce da
 * solo: senza questo, con soli menu a cinque stelle metà delle estrazioni
 * andrebbe a vuoto.
 */
export function pesiCandidati(
  candidati: DayMenu[],
  contesto: ContestoStagionale | null,
): number[] {
  const quanti = new Map<string, number>()
  for (const menu of candidati) {
    const id = fasciaDi(menu).id
    quanti.set(id, (quanti.get(id) ?? 0) + 1)
  }
  /*
   * Il coefficiente stagionale moltiplica il peso del singolo menu: quelli
   * senza tag di stagione hanno coefficiente 1, quindi il filtro non agisce
   * mai su di loro.
   *
   * La loro quota relativa cala comunque un po' quando i piatti di stagione
   * crescono — è aritmetica, le probabilità devono sommare a uno. L'alternativa
   * (ridistribuire solo all'interno del gruppo stagionale) lascerebbe i neutri
   * matematicamente intatti, ma renderebbe il filtro del tutto inefficace nel
   * caso più comune: tag solo sui piatti estivi e nessun tag invernale.
   */
  return candidati.map((menu) => {
    const fascia = fasciaDi(menu)
    const base = fascia.peso / (quanti.get(fascia.id) as number)
    return base * moltiplicatoreStagionale(menu, contesto)
  })
}

/** Pesca un menu rispettando gradimento e stagione. */
export function pescaPesato(
  candidati: DayMenu[],
  contesto: ContestoStagionale | null = null,
): DayMenu {
  if (candidati.length === 0) throw new Error('Nessun candidato da cui pescare.')
  const pesi = pesiCandidati(candidati, contesto)
  const totale = pesi.reduce((somma, p) => somma + p, 0)
  if (totale <= 0) return candidati[Math.floor(Math.random() * candidati.length)]

  let estratto = Math.random() * totale
  for (let i = 0; i < candidati.length; i++) {
    estratto -= pesi[i]
    if (estratto <= 0) return candidati[i]
  }
  return candidati[candidati.length - 1]
}

/** Conta quanti menu assegnati portano ciascun tag. */
export function conteggiaTag(menus: DayMenu[]): Map<string, number> {
  const conteggi = new Map<string, number>()
  for (const menu of menus) {
    for (const tag of menu.tags) conteggi.set(tag, (conteggi.get(tag) ?? 0) + 1)
  }
  return conteggi
}

function rispettaRegole(
  menu: DayMenu,
  conteggi: Map<string, number>,
  regole: FrequencyRule[],
): boolean {
  for (const regola of regole) {
    if (regola.timesPerWeek <= 0) continue
    if (!menu.tags.includes(regola.tag)) continue
    if ((conteggi.get(regola.tag) ?? 0) + 1 > regola.timesPerWeek) return false
  }
  return true
}

export interface EsitoGenerazione {
  assegnazioni: Record<string, string>
  /** Regole che è stato necessario violare per non lasciare giorni vuoti. */
  regoleForzate: string[]
}

/**
 * Compone la settimana pescando fra i menu disponibili.
 *
 * I vincoli si applicano in ordine di importanza e si allentano solo quando
 * altrimenti non resterebbe alcun candidato: prima si rinuncia a evitare le
 * ripetizioni, e solo come ultima risorsa ai limiti di frequenza — meglio una
 * settimana completa con uno sforamento segnalato che dei buchi inspiegabili.
 */
export function generaSettimana(
  date: string[],
  menus: DayMenu[],
  giaAssegnati: string[] = [],
  regole: FrequencyRule[] = [],
  stagionalita?: SeasonalPreference,
): EsitoGenerazione {
  const contesto = contestoStagionale(stagionalita)
  const utilizzabili = menuUtilizzabili(menus)
  if (utilizzabili.length === 0 || date.length === 0) {
    return { assegnazioni: {}, regoleForzate: [] }
  }

  const perId = new Map(menus.map((m) => [m.id, m]))
  const conteggi = conteggiaTag(
    giaAssegnati.map((id) => perId.get(id)).filter((m): m is DayMenu => Boolean(m)),
  )

  const usati = new Set(giaAssegnati)
  const assegnazioni: Record<string, string> = {}
  const regoleForzate = new Set<string>()
  let ultimo: string | null = giaAssegnati.at(-1) ?? null

  for (const giorno of date) {
    const ammessi = utilizzabili.filter((m) => rispettaRegole(m, conteggi, regole))

    let candidati = ammessi.filter((m) => m.id !== ultimo && !usati.has(m.id))
    if (candidati.length === 0) candidati = ammessi.filter((m) => m.id !== ultimo)
    if (candidati.length === 0) candidati = ammessi
    if (candidati.length === 0) {
      // Nessun menu rispetta più i limiti: si prosegue segnalando lo sforamento.
      for (const regola of regole) {
        if ((conteggi.get(regola.tag) ?? 0) >= regola.timesPerWeek) regoleForzate.add(regola.label)
      }
      candidati = utilizzabili.filter((m) => m.id !== ultimo)
      if (candidati.length === 0) candidati = utilizzabili
    }

    const scelto = pescaPesato(candidati, contesto)
    assegnazioni[giorno] = scelto.id
    usati.add(scelto.id)
    for (const tag of scelto.tags) conteggi.set(tag, (conteggi.get(tag) ?? 0) + 1)
    ultimo = scelto.id
  }

  return { assegnazioni, regoleForzate: [...regoleForzate] }
}
