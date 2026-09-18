import type { AppData, Aisle, FrequencyRule, SeasonalPreference } from '../types'
import { SCHEMA_VERSION } from '../types'
import { nowIso } from '../lib/utils'

/**
 * Reparti predefiniti, nell'ordine tipico di attraversamento di un supermercato.
 * Sono completamente modificabili dall'utente.
 */
export const DEFAULT_AISLES: Aisle[] = [
  { id: 'aisle-ortofrutta', name: 'Ortofrutta', order: 10 },
  { id: 'aisle-macelleria', name: 'Macelleria', order: 20 },
  { id: 'aisle-pescheria', name: 'Pescheria', order: 30 },
  { id: 'aisle-salumi', name: 'Salumi e formaggi', order: 40 },
  { id: 'aisle-latticini', name: 'Latticini e uova', order: 50 },
  { id: 'aisle-pane', name: 'Pane e sostituti', order: 60 },
  { id: 'aisle-dispensa', name: 'Dispensa', order: 70 },
  { id: 'aisle-surgelati', name: 'Surgelati', order: 80 },
  { id: 'aisle-bevande', name: 'Bevande', order: 90 },
  { id: 'aisle-altro', name: 'Altro', order: 100 },
]

/**
 * Limiti di frequenza settimanale predefiniti. Il pesce due volte a settimana
 * è l'indicazione più diffusa nei piani alimentari: resta modificabile, ma
 * partire con la regola già attiva evita di doversela ricordare.
 */
export function regolePredefinite(): FrequencyRule[] {
  return [{ id: 'reg-pesce', label: 'Pesce', tag: 'pesce', timesPerWeek: 2 }]
}

/** Preferenza stagionale spenta: si attiva quando serve, dalle regole. */
export function stagionalitaPredefinita(): SeasonalPreference {
  return { enabled: false, season: 'auto', strength: 'media' }
}

export function emptyAppData(deviceId: string): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: nowIso(),
    updatedBy: deviceId,
    aisles: DEFAULT_AISLES.map((a) => ({ ...a })),
    foods: [],
    menus: [],
    recipes: [],
    equivalenceGroups: [],
    weeks: [],
    shoppingLists: [],
    profile: null,
    measurements: [],
    settings: { frequencyRules: regolePredefinite(), seasonal: stagionalitaPredefinita() },
  }
}

/**
 * Porta un documento letto da disco o dal cloud alla forma corrente.
 * Tollerante: un campo mancante non deve mai impedire l'apertura dell'app.
 */
export function normalizeAppData(raw: unknown, deviceId: string): AppData {
  const base = emptyAppData(deviceId)
  if (!raw || typeof raw !== 'object') return base
  const d = raw as Partial<AppData>
  const versione = typeof d.schemaVersion === 'number' ? d.schemaVersion : 1

  const settings = d.settings ?? base.settings
  // Migrazione alla versione 2: i documenti nati prima dei limiti di frequenza
  // ricevono la regola predefinita sul pesce.
  if (versione < 2 && (settings.frequencyRules ?? []).length === 0) {
    settings.frequencyRules = regolePredefinite()
  }
  // Migrazione alla versione 3: preferenza stagionale, spenta di default.
  if (!settings.seasonal) settings.seasonal = stagionalitaPredefinita()

  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: typeof d.updatedAt === 'string' ? d.updatedAt : base.updatedAt,
    updatedBy: typeof d.updatedBy === 'string' ? d.updatedBy : deviceId,
    aisles: Array.isArray(d.aisles) && d.aisles.length ? d.aisles : base.aisles,
    foods: Array.isArray(d.foods) ? d.foods : [],
    menus: Array.isArray(d.menus) ? d.menus : [],
    recipes: Array.isArray(d.recipes) ? d.recipes : [],
    equivalenceGroups: Array.isArray(d.equivalenceGroups) ? d.equivalenceGroups : [],
    weeks: Array.isArray(d.weeks) ? d.weeks : [],
    shoppingLists: Array.isArray(d.shoppingLists) ? d.shoppingLists : [],
    profile: d.profile ?? null,
    measurements: Array.isArray(d.measurements) ? d.measurements : [],
    settings,
  }
}
