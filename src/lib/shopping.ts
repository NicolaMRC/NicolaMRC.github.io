import type { AppData, Food, ShoppingItem, ShoppingList, Unit } from '../types'
import { giornoDi } from './plan'
import { opzioneScelta, quantitaBase } from './menu'
import { ingredientiPerPorzione } from './varianti'
import { descriviGiorno, parseIsoDate } from './date'
import { byName, formatNumber, nowIso, uid } from './utils'

/**
 * Somma di quanto serve, per alimento, nell'intervallo di giorni indicato.
 *
 * Restano fuori: i giorni esclusi, quelli senza menu e gli alimenti marcati
 * come sempre presenti in dispensa. Quando un pasto ha più alternative si
 * considera quella scelta per quel giorno, non tutte.
 */
export function calcolaFabbisogno(data: AppData, date: string[]): Map<string, number> {
  const totali = new Map<string, number>()

  for (const iso of date) {
    const giorno = giornoDi(data, iso)
    if (!giorno || giorno.skipped || !giorno.menuId) continue
    const menu = data.menus.find((m) => m.id === giorno.menuId)
    if (!menu) continue

    for (const pasto of menu.meals) {
      // Una variante applicata sostituisce il pasto del piano: la spesa deve
      // seguire quello che cucinerai davvero, non quello che era previsto.
      const varianteId = giorno.appliedVariants?.[pasto.key]
      const ricetta = varianteId ? data.recipes.find((r) => r.id === varianteId) : undefined
      if (ricetta) {
        for (const [foodId, quantita] of ingredientiPerPorzione(data, ricetta)) {
          const alimento = data.foods.find((f) => f.id === foodId)
          if (!alimento || alimento.alwaysInPantry) continue
          totali.set(foodId, (totali.get(foodId) ?? 0) + quantita)
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
        totali.set(item.foodId, (totali.get(item.foodId) ?? 0) + quantita)
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

/** Etichetta principale di una voce: le confezioni, quando ci sono, o la quantità. */
export function descriviVoce(item: ShoppingItem, food: Food | undefined): string {
  if (item.packages && food?.purchaseLabel) {
    return item.packages === 1
      ? food.purchaseLabel
      : `${formatNumber(item.packages)} × ${food.purchaseLabel}`
  }
  if (item.packages) {
    return `${formatNumber(item.packages)} × ${formatQuantita(
      item.quantity / item.packages,
      item.unit,
    )}`
  }
  if (item.quantity <= 0) return ''
  return formatQuantita(item.quantity, item.unit)
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
  for (const [foodId, perUnaPersona] of fabbisogno) {
    const alimento = data.foods.find((f) => f.id === foodId)
    if (!alimento) continue
    // Si moltiplica prima di arrotondare: due porzioni da 240 g fanno 480 g,
    // cioè ancora un pacco solo, non due.
    const necessario = perUnaPersona * moltiplicatore
    const { daComprare, confezioni } = arrotondaAlFormato(alimento, necessario)
    voci.push({
      id: uid('voce-'),
      foodId,
      quantity: daComprare,
      needed: necessario,
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
      const quantita = descriviVoce(voce, alimento)
      const spunta = voce.checked ? '[x]' : '[ ]'
      righe.push(`${spunta} ${nomeVoce(data, voce)}${quantita ? ` — ${quantita}` : ''}`)
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
