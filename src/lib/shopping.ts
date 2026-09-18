import type { AppData, Food, ShoppingItem, ShoppingList, Unit } from '../types'
import { giornoDi } from './plan'
import { opzioneScelta, pluralizza, quantitaBase } from './menu'
import { ingredientiPerPorzione } from './varianti'
import { descriviGiorno, parseIsoDate } from './date'
import { byName, formatNumber, nowIso, uid } from './utils'

export interface Fabbisogno {
  /** Quanto serve in tutto il periodo, per una persona. */
  quantita: number
  /** In quanti pasti del periodo ricorre l'alimento. */
  pasti: number
}

/**
 * Quanto serve di ogni alimento nell'intervallo di giorni indicato, contato
 * in due modi: la quantità, che serve ad arrotondare ai formati di vendita,
 * e i pasti, che sono quello che poi si legge in lista.
 *
 * Restano fuori: i giorni esclusi, quelli senza menu e gli alimenti marcati
 * come sempre presenti in dispensa. Quando un pasto ha più alternative si
 * considera quella scelta per quel giorno, non tutte.
 */
export function calcolaFabbisogno(data: AppData, date: string[]): Map<string, Fabbisogno> {
  const totali = new Map<string, Fabbisogno>()

  /** `vistiNelPasto` tiene un alimento ripetuto dentro lo stesso pasto a uno. */
  const somma = (foodId: string, quantita: number, vistiNelPasto: Set<string>) => {
    const voce = totali.get(foodId) ?? { quantita: 0, pasti: 0 }
    voce.quantita += quantita
    if (!vistiNelPasto.has(foodId)) {
      voce.pasti += 1
      vistiNelPasto.add(foodId)
    }
    totali.set(foodId, voce)
  }

  for (const iso of date) {
    const giorno = giornoDi(data, iso)
    if (!giorno || giorno.skipped || !giorno.menuId) continue
    const menu = data.menus.find((m) => m.id === giorno.menuId)
    if (!menu) continue

    for (const pasto of menu.meals) {
      const visti = new Set<string>()

      // Una variante applicata sostituisce il pasto del piano: la spesa deve
      // seguire quello che cucinerai davvero, non quello che era previsto.
      const varianteId = giorno.appliedVariants?.[pasto.key]
      const ricetta = varianteId ? data.recipes.find((r) => r.id === varianteId) : undefined
      if (ricetta) {
        for (const [foodId, quantita] of ingredientiPerPorzione(data, ricetta)) {
          const alimento = data.foods.find((f) => f.id === foodId)
          if (!alimento || alimento.alwaysInPantry) continue
          somma(foodId, quantita, visti)
        }
        continue
      }

      const scelta = opzioneScelta(pasto, giorno.chosenOptions?.[pasto.key])
      if (!scelta) continue
      for (const item of scelta.items) {
        const alimento = data.foods.find((f) => f.id === item.foodId)
        if (!alimento || alimento.alwaysInPantry) continue
        const quantita = quantitaBase(item, alimento)
        if (quantita <= 0) continue
        somma(item.foodId, quantita, visti)
      }
    }
  }
  return totali
}

/** Porta la quantità al multiplo superiore del formato di vendita. */
export function arrotondaAlFormato(
  food: Food,
  necessario: number,
): { daComprare: number; confezioni: number | null } {
  if (!food.roundToPurchase || !food.purchaseSize || food.purchaseSize <= 0) {
    return { daComprare: necessario, confezioni: null }
  }
  const confezioni = Math.ceil(necessario / food.purchaseSize)
  return { daComprare: confezioni * food.purchaseSize, confezioni }
}

/** "850 g", "1,5 kg", "3 pz". Passa a chili e litri quando la cifra lo merita. */
export function formatQuantita(valore: number, unit: Unit): string {
  if (unit === 'g' && valore >= 1000) return `${formatNumber(valore / 1000)} kg`
  if (unit === 'ml' && valore >= 1000) return `${formatNumber(valore / 1000)} l`
  return `${formatNumber(valore)} ${unit}`
}

/**
 * Etichetta principale di una voce: in quanti pasti serve.
 *
 * I grammi non si leggono più in lista. Davanti al banco «tre pasti di pollo»
 * dice quello che serve sapere meglio di «540 g», perché le porzioni del piano
 * sono sempre quelle.
 */
export function descriviVoce(item: ShoppingItem, _food?: Food | undefined): string {
  // Le voci aggiunte a mano non nascono da un menu: tengono la loro quantità.
  // Come le liste generate prima di questa modifica, che i pasti non li hanno.
  if (item.manual || item.meals === undefined) {
    return item.quantity > 0 ? formatQuantita(item.quantity, item.unit) : ''
  }
  return `${formatNumber(item.meals)} ${pluralizza('pasto', item.meals)}`
}

/**
 * Quante confezioni mettere nel carrello, per gli alimenti che si comprano a
 * formato. È l'unico numero che sopravvive ai pasti, perché non dice quanto ti
 * serve ma cosa prendi dallo scaffale.
 */
export function descriviConfezioni(item: ShoppingItem, food: Food | undefined): string {
  if (!item.packages) return ''
  if (food?.purchaseLabel) {
    return item.packages === 1
      ? food.purchaseLabel
      : `${formatNumber(item.packages)} × ${food.purchaseLabel}`
  }
  return `${formatNumber(item.packages)} × ${formatQuantita(
    item.quantity / item.packages,
    item.unit,
  )}`
}

/**
 * Costruisce le voci della lista.
 *
 * `precedenti` serve a non buttare via il lavoro già fatto quando si rigenera:
 * le spunte degli alimenti già presi vengono conservate, e le voci aggiunte a
 * mano restano dove sono.
 */
export function generaVoci(
  data: AppData,
  date: string[],
  precedenti: ShoppingItem[] = [],
  persone = 1,
): ShoppingItem[] {
  const fabbisogno = calcolaFabbisogno(data, date)
  const spuntePrecedenti = new Map(
    precedenti.filter((v) => !v.manual && v.foodId).map((v) => [v.foodId as string, v.checked]),
  )
  const moltiplicatore = Math.max(1, Math.round(persone))

  const voci: ShoppingItem[] = []
  for (const [foodId, servono] of fabbisogno) {
    const alimento = data.foods.find((f) => f.id === foodId)
    if (!alimento) continue
    // Si moltiplica prima di arrotondare: due porzioni da 240 g fanno 480 g,
    // cioè ancora un pacco solo, non due. I pasti invece non si moltiplicano:
    // una cena per due resta una cena.
    const necessario = servono.quantita * moltiplicatore
    const { daComprare, confezioni } = arrotondaAlFormato(alimento, necessario)
    voci.push({
      id: uid('voce-'),
      foodId,
      quantity: daComprare,
      needed: necessario,
      meals: servono.pasti,
      packages: confezioni ?? undefined,
      unit: alimento.unit,
      checked: spuntePrecedenti.get(foodId) ?? false,
      manual: false,
    })
  }

  return [...voci, ...precedenti.filter((v) => v.manual)]
}

export interface GruppoSpesa {
  id: string
  nome: string
  voci: ShoppingItem[]
}

/** Raggruppa le voci per reparto, nell'ordine di attraversamento scelto. */
export function raggruppaPerReparto(data: AppData, voci: ShoppingItem[]): GruppoSpesa[] {
  const reparti = [...data.aisles].sort((a, b) => a.order - b.order)
  const gruppi: GruppoSpesa[] = []

  for (const reparto of reparti) {
    const delReparto = voci
      .filter((v) => {
        const alimento = v.foodId ? data.foods.find((f) => f.id === v.foodId) : undefined
        return alimento?.aisleId === reparto.id
      })
      .sort(ordinaPerNome(data))
    if (delReparto.length) gruppi.push({ id: reparto.id, nome: reparto.name, voci: delReparto })
  }

  // Alimenti il cui reparto è stato eliminato: non devono sparire dalla lista.
  const idNoti = new Set(data.aisles.map((a) => a.id))
  const orfani = voci
    .filter((v) => {
      if (v.manual) return false
      const alimento = v.foodId ? data.foods.find((f) => f.id === v.foodId) : undefined
      return !alimento || !idNoti.has(alimento.aisleId)
    })
    .sort(ordinaPerNome(data))
  if (orfani.length) gruppi.push({ id: 'senza-reparto', nome: 'Senza reparto', voci: orfani })

  const manuali = voci.filter((v) => v.manual)
  if (manuali.length) gruppi.push({ id: 'manuali', nome: 'Aggiunti a mano', voci: manuali })

  return gruppi
}

function ordinaPerNome(data: AppData) {
  return (a: ShoppingItem, b: ShoppingItem) =>
    byName(
      { name: nomeVoce(data, a) },
      { name: nomeVoce(data, b) },
    )
}

export function nomeVoce(data: AppData, item: ShoppingItem): string {
  if (item.customName) return item.customName
  const alimento = item.foodId ? data.foods.find((f) => f.id === item.foodId) : undefined
  return alimento?.name ?? 'Alimento rimosso'
}

/** Intervallo leggibile: "14 – 20 settembre" oppure "oggi". */
export function descriviIntervallo(fromDate: string, toDate: string): string {
  if (fromDate === toDate) return descriviGiorno(fromDate)
  const inizio = parseIsoDate(fromDate)
  const fine = parseIsoDate(toDate)
  const meseInizio = inizio.toLocaleDateString('it-IT', { month: 'long' })
  const meseFine = fine.toLocaleDateString('it-IT', { month: 'long' })
  if (meseInizio === meseFine) return `${inizio.getDate()} – ${fine.getDate()} ${meseFine}`
  return `${inizio.getDate()} ${meseInizio} – ${fine.getDate()} ${meseFine}`
}

/** Versione testuale della lista, per la condivisione. */
export function testoLista(data: AppData, lista: ShoppingList): string {
  const persone = lista.people ?? 1
  const righe: string[] = [
    `Lista della spesa · ${descriviIntervallo(lista.fromDate, lista.toDate)}${
      persone > 1 ? ` · per ${persone} persone` : ''
    }`,
    '',
  ]
  for (const gruppo of raggruppaPerReparto(data, lista.items)) {
    righe.push(gruppo.nome.toUpperCase())
    for (const voce of gruppo.voci) {
      const alimento = voce.foodId ? data.foods.find((f) => f.id === voce.foodId) : undefined
      const quanto = descriviVoce(voce, alimento)
      const confezioni = descriviConfezioni(voce, alimento)
      const spunta = voce.checked ? '[x]' : '[ ]'
      righe.push(
        `${spunta} ${nomeVoce(data, voce)}${quanto ? ` — ${quanto}` : ''}${
          confezioni ? ` (${confezioni})` : ''
        }`,
      )
    }
    righe.push('')
  }
  return righe.join('\n').trim()
}

export function nuovaLista(
  data: AppData,
  fromDate: string,
  toDate: string,
  date: string[],
  precedenti: ShoppingItem[] = [],
  persone = 1,
): ShoppingList {
  const stamp = nowIso()
  return {
    id: uid('spesa-'),
    weekId: null,
    fromDate,
    toDate,
    people: persone,
    items: generaVoci(data, date, precedenti, persone),
    createdAt: stamp,
    updatedAt: stamp,
  }
}
