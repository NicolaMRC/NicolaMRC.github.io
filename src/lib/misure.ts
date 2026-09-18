import type { Measurement, Profile } from '../types'
import { formatNumber } from './utils'

/**
 * Calcoli e formattazioni della scheda personale.
 *
 * Nessuna interpretazione clinica: l'app registra e mostra l'andamento, non
 * dice se un valore è buono o cattivo. Quella è materia del nutrizionista.
 */

export const CIRCONFERENZE = [
  { chiave: 'vita', etichetta: 'Vita' },
  { chiave: 'fianchi', etichetta: 'Fianchi' },
  { chiave: 'torace', etichetta: 'Torace' },
  { chiave: 'braccio', etichetta: 'Braccio' },
  { chiave: 'coscia', etichetta: 'Coscia' },
] as const

export type ChiaveCirconferenza = (typeof CIRCONFERENZE)[number]['chiave']

/** Indice di massa corporea, quando ci sono sia peso sia altezza. */
export function calcolaBmi(pesoKg: number | undefined, altezzaCm: number | undefined): number | null {
  if (!pesoKg || !altezzaCm || altezzaCm <= 0) return null
  const metri = altezzaCm / 100
  return pesoKg / (metri * metri)
}

/** Da percentuale a chilogrammi, e viceversa, quando il peso è noto. */
export function daPercentuale(percentuale: number, pesoKg: number): number {
  return (percentuale / 100) * pesoKg
}

export function aPercentuale(kg: number, pesoKg: number): number {
  if (pesoKg <= 0) return 0
  return (kg / pesoKg) * 100
}

/** Rilevazioni dalla più recente alla più vecchia. */
export function ordinateDesc(misure: Measurement[]): Measurement[] {
  return [...misure].sort((a, b) => b.date.localeCompare(a.date))
}

export function ultimaRilevazione(misure: Measurement[]): Measurement | undefined {
  return ordinateDesc(misure)[0]
}

export function ultimaCompleta(misure: Measurement[]): Measurement | undefined {
  return ordinateDesc(misure).find((m) => m.type === 'completa')
}

/** Differenza di peso fra le due rilevazioni più recenti che lo riportano. */
export function variazionePeso(misure: Measurement[]): { delta: number; da: string } | null {
  const conPeso = ordinateDesc(misure).filter((m) => typeof m.weightKg === 'number')
  if (conPeso.length < 2) return null
  const attuale = conPeso[0].weightKg as number
  const precedente = conPeso[1].weightKg as number
  return { delta: attuale - precedente, da: conPeso[1].date }
}

/** "+0,4 kg" oppure "−1,2 kg". */
export function formatDelta(delta: number): string {
  const segno = delta > 0 ? '+' : delta < 0 ? '−' : ''
  return `${segno}${formatNumber(Math.abs(delta))} kg`
}

export function profiloVuoto(): Profile {
  return {}
}

/** Quante rilevazioni portano davvero un peso: servono al grafico. */
export function puntiPeso(misure: Measurement[]): Measurement[] {
  return [...misure]
    .filter((m) => typeof m.weightKg === 'number' && (m.weightKg as number) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
}
