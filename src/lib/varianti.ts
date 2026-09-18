import type { AppData, MealKey, MenuItem, Recipe } from '../types'
import { quantitaBase } from './menu'

/**
 * Motore delle varianti.
 *
 * Una variante è una ricetta che rispetta quello che il piano prescrive per
 * quel pasto. Due livelli, tenuti distinti perché non sono la stessa cosa:
 *
 * - **esatta**: la ricetta usa gli stessi alimenti nelle stesse grammature;
 * - **con sostituzione**: ci arriva scambiando un alimento con un altro
 *   dichiarato equivalente nella tabella degli scambi.
 *
 * Gli alimenti marcati come sempre in dispensa (sale, olio, spezie) sono
 * ignorati da entrambi i lati: non è su quelli che si gioca l'aderenza al
 * piano, e pretendere che combacino renderebbe il confronto inutilizzabile.
 */

/** Scostamento ammesso fra quantità richiesta e quantità della ricetta. */
export const TOLLERANZA = 0.1

export interface Sostituzione {
  daFoodId: string
  aFoodId: string
  quantitaOriginale: number
  quantitaSostituita: number
}

export type TipoVariante = 'esatta' | 'sostituzione'

export interface Variante {
  recipe: Recipe
  tipo: TipoVariante
  sostituzioni: Sostituzione[]
}

function entroTolleranza(valore: number, atteso: number): boolean {
  if (atteso <= 0) return valore <= 0
  return Math.abs(valore - atteso) / atteso <= TOLLERANZA
}

/** Quantità per singola porzione degli ingredienti di una ricetta. */
export function ingredientiPerPorzione(data: AppData, recipe: Recipe): Map<string, number> {
  const porzioni = Math.max(1, recipe.servings || 1)
  const mappa = new Map<string, number>()
  for (const ingrediente of recipe.ingredients) {
    const alimento = data.foods.find((f) => f.id === ingrediente.foodId)
    if (!alimento) continue
    const quantita = quantitaBase(ingrediente, alimento) / porzioni
    if (quantita <= 0) continue
    mappa.set(ingrediente.foodId, (mappa.get(ingrediente.foodId) ?? 0) + quantita)
  }
  return mappa
}

/** Quantità richieste da un pasto, esclusi gli alimenti sempre in dispensa. */
export function fabbisognoPasto(data: AppData, items: MenuItem[]): Map<string, number> {
  const mappa = new Map<string, number>()
  for (const item of items) {
    const alimento = data.foods.find((f) => f.id === item.foodId)
    if (!alimento || alimento.alwaysInPantry) continue
    const quantita = quantitaBase(item, alimento)
    if (quantita <= 0) continue
    mappa.set(item.foodId, (mappa.get(item.foodId) ?? 0) + quantita)
  }
  return mappa
}

/**
 * Cerca, fra gli ingredienti ancora liberi della ricetta, uno che possa
 * sostituire l'alimento richiesto secondo la tabella degli scambi.
 */
function cercaSostituzione(
  data: AppData,
  foodId: string,
  richiesta: number,
  disponibili: Map<string, number>,
): Sostituzione | null {
  for (const gruppo of data.equivalenceGroups) {
    const origine = gruppo.members.find((m) => m.foodId === foodId)
    if (!origine || origine.amount <= 0) continue

    for (const membro of gruppo.members) {
      if (membro.foodId === foodId || membro.amount <= 0) continue
      const offerta = disponibili.get(membro.foodId)
      if (offerta === undefined) continue
      // 80 g di pasta valgono 100 g di riso: il rapporto scala la richiesta.
      const attesa = richiesta * (membro.amount / origine.amount)
      if (!entroTolleranza(offerta, attesa)) continue
      return {
        daFoodId: foodId,
        aFoodId: membro.foodId,
        quantitaOriginale: richiesta,
        quantitaSostituita: offerta,
      }
    }
  }
  return null
}

/** Valuta una singola ricetta contro un pasto. Restituisce null se non regge. */
export function valutaRicetta(data: AppData, items: MenuItem[], recipe: Recipe): Variante | null {
  const richiesti = fabbisognoPasto(data, items)
  if (richiesti.size === 0) return null

  const disponibili = ingredientiPerPorzione(data, recipe)
  const sostituzioni: Sostituzione[] = []

  for (const [foodId, richiesta] of richiesti) {
    const offerta = disponibili.get(foodId)
    if (offerta !== undefined && entroTolleranza(offerta, richiesta)) {
      disponibili.delete(foodId)
      continue
    }
    const sostituzione = cercaSostituzione(data, foodId, richiesta, disponibili)
    if (!sostituzione) return null
    sostituzioni.push(sostituzione)
    disponibili.delete(sostituzione.aFoodId)
  }

  // Quello che avanza nella ricetta può essere solo roba da dispensa.
  for (const foodId of disponibili.keys()) {
    const alimento = data.foods.find((f) => f.id === foodId)
    if (!alimento?.alwaysInPantry) return null
  }

  return {
    recipe,
    tipo: sostituzioni.length > 0 ? 'sostituzione' : 'esatta',
    sostituzioni,
  }
}

/** Tutte le varianti possibili per un pasto, le esatte per prime. */
export function trovaVarianti(data: AppData, items: MenuItem[], meal: MealKey): Variante[] {
  const varianti: Variante[] = []
  for (const recipe of data.recipes) {
    // Una ricetta dichiarata per certi pasti non compare negli altri.
    if (recipe.suitableFor.length > 0 && !recipe.suitableFor.includes(meal)) continue
    const variante = valutaRicetta(data, items, recipe)
    if (variante) varianti.push(variante)
  }
  return varianti.sort((a, b) => {
    if (a.tipo !== b.tipo) return a.tipo === 'esatta' ? -1 : 1
    return a.recipe.name.localeCompare(b.recipe.name, 'it', { sensitivity: 'base' })
  })
}

/** "riso al posto della pasta" */
export function descriviSostituzione(data: AppData, sostituzione: Sostituzione): string {
  const da = data.foods.find((f) => f.id === sostituzione.daFoodId)
  const a = data.foods.find((f) => f.id === sostituzione.aFoodId)
  return `${a?.name ?? 'alimento'} al posto di ${da?.name ?? 'alimento'}`
}

export function nomeAlimento(data: AppData, foodId: string): string {
  return data.foods.find((f) => f.id === foodId)?.name ?? 'Alimento rimosso'
}

/** Alimenti che compaiono in almeno un gruppo di scambio. */
export function alimentiScambiabili(data: AppData): Set<string> {
  const ids = new Set<string>()
  for (const gruppo of data.equivalenceGroups) {
    for (const membro of gruppo.members) ids.add(membro.foodId)
  }
  return ids
}
