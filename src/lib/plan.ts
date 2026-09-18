import type { AppData, DayAssignment, DayMenu, WeekPlan } from '../types'
import { parseIsoDate, startOfWeek } from './date'
import { toIsoDate } from './utils'

/**
 * Letture pure sul piano settimanale.
 *
 * Stanno qui, e non nello store, perché servono anche alla generazione della
 * lista della spesa: tenerle separate evita dipendenze circolari.
 */

export function settimanaDi(data: AppData | null, startIso: string): WeekPlan | undefined {
  return data?.weeks.find((w) => w.startDate === startIso)
}

export function giornoDi(data: AppData | null, date: string): DayAssignment | undefined {
  const inizio = toIsoDate(startOfWeek(parseIsoDate(date)))
  return settimanaDi(data, inizio)?.days.find((d) => d.date === date)
}

export function menuDi(data: AppData | null, date: string): DayMenu | undefined {
  const giorno = giornoDi(data, date)
  if (!giorno?.menuId) return undefined
  return data?.menus.find((m) => m.id === giorno.menuId)
}
