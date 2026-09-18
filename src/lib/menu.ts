import {
  MEAL_KEYS,
  MEAL_LABELS,
  type AppData,
  type DayMenu,
  type Food,
  type Meal,
  type MealOption,
  type MenuItem,
} from '../types'
import { formatNumber, nowIso, uid } from './utils'

/**
 * Quantità di un elemento espressa nell'unità base dell'alimento.
 *
 * Quando l'elemento usa una misura casalinga, la quantità indicata è il numero
 * di misure: «2 cucchiai» di un olio con misura da 10 g valgono 20 g. È la
 * conversione su cui si baserà la somma della lista della spesa.
 */
export function quantitaBase(
  item: { quantity: number; measureId?: string },
  food: Food | undefined,
): number {
  if (!food) return 0
  if (!item.measureId) return item.quantity
  const misura = food.measures.find((m) => m.id === item.measureId)
  if (!misura) return item.quantity
  return item.quantity * misura.amount
}

/**
 * Plurale italiano di una misura casalinga: cucchiaio → cucchiai,
 * fetta → fette, bicchiere → bicchieri. Copre i casi regolari, che sono
 * praticamente tutti quelli usati in cucina.
 */
export function pluralizza(label: string, quantita: number): string {
  if (quantita === 1 || !label) return label
  if (label.endsWith('io')) return `${label.slice(0, -2)}i`
  if (label.endsWith('o') || label.endsWith('e')) return `${label.slice(0, -1)}i`
  if (label.endsWith('a')) return `${label.slice(0, -1)}e`
  return label
}

/** "80 g" oppure "2 cucchiai (20 g)". */
export function descriviQuantita(item: MenuItem, food: Food | undefined): string {
  if (!food) return `${formatNumber(item.quantity)}`
  if (!item.measureId) return `${formatNumber(item.quantity)} ${food.unit}`
  const misura = food.measures.find((m) => m.id === item.measureId)
  if (!misura) return `${formatNumber(item.quantity)} ${food.unit}`
  const base = quantitaBase(item, food)
  const etichetta = pluralizza(misura.label, item.quantity)
  return `${formatNumber(item.quantity)} ${etichetta} (${formatNumber(base)} ${food.unit})`
}

export function trovaAlimento(data: AppData | null, foodId: string): Food | undefined {
  return data?.foods.find((f) => f.id === foodId)
}

/* ------------------------------------------------------------ creazione */

export function nuovoElemento(foodId: string): MenuItem {
  return { id: uid('item-'), foodId, quantity: 0 }
}

export function nuovaOpzione(): MealOption {
  return { id: uid('opt-'), items: [] }
}

export function nuovoMenu(nome = '', colore?: string): DayMenu {
  const stamp = nowIso()
  const meals: Meal[] = MEAL_KEYS.map((key) => ({ key, options: [nuovaOpzione()] }))
  return {
    id: uid('menu-'),
    name: nome,
    meals,
    tags: [],
    color: colore,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

/** Copia di un menu, con nuovi identificativi a ogni livello. */
export function duplicaMenu(menu: DayMenu): DayMenu {
  const stamp = nowIso()
  return {
    ...menu,
    id: uid('menu-'),
    name: `${menu.name} (copia)`,
    meals: menu.meals.map((meal) => ({
      key: meal.key,
      options: meal.options.map((opzione) => ({
        id: uid('opt-'),
        name: opzione.name,
        items: opzione.items.map((item) => ({ ...item, id: uid('item-') })),
      })),
    })),
    createdAt: stamp,
    updatedAt: stamp,
  }
}

/**
 * Ripristina i pasti mancanti e garantisce almeno un'opzione per pasto,
 * cosi' l'editor lavora sempre su una struttura completa.
 */
export function normalizzaMenu(menu: DayMenu): DayMenu {
  const meals: Meal[] = MEAL_KEYS.map((key) => {
    const esistente = menu.meals.find((m) => m.key === key)
    if (!esistente || esistente.options.length === 0) return { key, options: [nuovaOpzione()] }
    return esistente
  })
  return { ...menu, meals }
}

/* -------------------------------------------------------------- lettura */

export function pastiCompilati(menu: DayMenu): Meal[] {
  return menu.meals.filter((meal) => meal.options.some((o) => o.items.length > 0))
}

export function contaElementi(menu: DayMenu): number {
  return menu.meals.reduce(
    (totale, meal) => totale + meal.options.reduce((n, o) => n + o.items.length, 0),
    0,
  )
}

/** "Colazione, Pranzo, Cena · 8 alimenti" */
export function riassuntoMenu(menu: DayMenu): string {
  const pasti = pastiCompilati(menu)
  if (pasti.length === 0) return 'Nessun pasto compilato'
  const nomi = pasti.map((m) => MEAL_LABELS[m.key]).join(', ')
  const n = contaElementi(menu)
  return `${nomi} · ${n} ${n === 1 ? 'alimento' : 'alimenti'}`
}

/** L'opzione scelta per un pasto, o la prima disponibile. */
export function opzioneScelta(meal: Meal, optionId: string | undefined): MealOption | undefined {
  if (optionId) {
    const scelta = meal.options.find((o) => o.id === optionId)
    if (scelta) return scelta
  }
  return meal.options.find((o) => o.items.length > 0) ?? meal.options[0]
}

/**
 * Sottotitolo di un menu negli elenchi: la nota se c'è, altrimenti un invito
 * a scriverla. La nota dice cosa si mangia molto meglio dell'elenco dei pasti.
 */
export function notaMenu(menu: DayMenu): { testo: string; invito: boolean } {
  const nota = menu.notes?.trim()
  return nota ? { testo: nota, invito: false } : { testo: 'Aggiungi una nota', invito: true }
}
