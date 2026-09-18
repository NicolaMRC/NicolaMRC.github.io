import type { AppData, DayMenu, Meal, MealKey, MenuItem, Recipe } from '../types'
import { MEAL_LABELS } from '../types'
import { descriviQuantita, opzioneScelta } from './menu'
import { giornoDi } from './plan'
import { ingredientiPerPorzione } from './varianti'
import { formatQuantita } from './shopping'
import { descriviGiorno } from './date'

/**
 * Un pasto risolto per un giorno specifico: tiene conto dell'alternativa
 * scelta e dell'eventuale variante applicata, così chi legge vede quello che
 * mangerà davvero e non quello che era previsto in astratto.
 */
export interface PastoRisolto {
  key: MealKey
  /** Ricetta applicata come variante, se c'è. */
  ricetta?: Recipe
  /** Righe da mostrare: alimento e quantità già formattata. */
  righe: { id: string; nome: string; quantita: string }[]
  /** Alternative disponibili per il pasto, per il selettore. */
  alternative: Meal['options']
  /** Identificativo dell'alternativa attualmente scelta. */
  sceltaId?: string
}

function righeDaItems(data: AppData, items: MenuItem[]) {
  return items.map((item) => {
    const alimento = data.foods.find((f) => f.id === item.foodId)
    return {
      id: item.id,
      nome: alimento?.name ?? 'Alimento non più in archivio',
      quantita: descriviQuantita(item, alimento),
    }
  })
}

/** I pasti compilati di un giorno, già risolti. */
export function pastiRisolti(data: AppData, date: string, menu: DayMenu): PastoRisolto[] {
  const giorno = giornoDi(data, date)
  const risultato: PastoRisolto[] = []

  for (const pasto of menu.meals) {
    const alternative = pasto.options.filter((o) => o.items.length > 0)
    const varianteId = giorno?.appliedVariants?.[pasto.key]
    const ricetta = varianteId ? data.recipes.find((r) => r.id === varianteId) : undefined

    if (ricetta) {
      risultato.push({
        key: pasto.key,
        ricetta,
        alternative,
        righe: [...ingredientiPerPorzione(data, ricetta)].map(([foodId, quantita]) => {
          const alimento = data.foods.find((f) => f.id === foodId)
          return {
            id: foodId,
            nome: alimento?.name ?? 'Alimento non più in archivio',
            quantita: formatQuantita(quantita, alimento?.unit ?? 'g'),
          }
        }),
      })
      continue
    }

    if (alternative.length === 0) continue
    const scelta = opzioneScelta(pasto, giorno?.chosenOptions?.[pasto.key])
    if (!scelta) continue
    risultato.push({
      key: pasto.key,
      alternative,
      sceltaId: scelta.id,
      righe: righeDaItems(data, scelta.items),
    })
  }

  return risultato
}

/** Versione testuale della giornata, per la condivisione. */
export function testoGiorno(data: AppData, date: string, menu: DayMenu): string {
  const righe: string[] = [`${menu.name} · ${descriviGiorno(date)}`]
  if (menu.notes?.trim()) righe.push('', menu.notes.trim())
  righe.push('')

  for (const pasto of pastiRisolti(data, date, menu)) {
    righe.push(MEAL_LABELS[pasto.key].toUpperCase())
    if (pasto.ricetta) righe.push(`Variante: ${pasto.ricetta.name}`)
    for (const riga of pasto.righe) {
      righe.push(`- ${riga.nome}${riga.quantita ? ` — ${riga.quantita}` : ''}`)
    }
    righe.push('')
  }

  return righe.join('\n').trim()
}

/** Versione testuale di un menu in archivio, con tutte le alternative. */
export function testoMenu(data: AppData, menu: DayMenu): string {
  const righe: string[] = [menu.name]
  if (menu.notes?.trim()) righe.push('', menu.notes.trim())
  righe.push('')

  for (const pasto of menu.meals) {
    const opzioni = pasto.options.filter((o) => o.items.length > 0)
    if (opzioni.length === 0) continue
    righe.push(MEAL_LABELS[pasto.key].toUpperCase())
    opzioni.forEach((opzione, indice) => {
      if (opzioni.length > 1) righe.push(`  ${opzione.name || `Alternativa ${indice + 1}`}`)
      for (const item of opzione.items) {
        const alimento = data.foods.find((f) => f.id === item.foodId)
        const quantita = descriviQuantita(item, alimento)
        righe.push(`- ${alimento?.name ?? 'Alimento rimosso'}${quantita ? ` — ${quantita}` : ''}`)
      }
    })
    righe.push('')
  }
  return righe.join('\n').trim()
}
