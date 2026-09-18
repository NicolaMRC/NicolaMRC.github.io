import { create } from 'zustand'
import type {
  AppData,
  Aisle,
  DayAssignment,
  DayMenu,
  Food,
  EquivalenceGroup,
  FrequencyRule,
  MealKey,
  Measurement,
  Profile,
  Recipe,
  SeasonalPreference,
  ShoppingList,
  TemaApp,
  Unit,
} from '../types'
import { loadLocal, saveLocal } from './db'
import { emptyAppData, normalizeAppData } from './defaults'
import { loadConfig, saveConfig, type GithubConfig, type LocalConfig } from './localConfig'
import {
  notifyLocalChange,
  startSync,
  syncNow,
  type SyncState,
} from '../sync/syncEngine'
import { nowIso, toIsoDate, uid } from '../lib/utils'
import { dateNellIntervallo, parseIsoDate, startOfWeek } from '../lib/date'
import { generaVoci, nuovaLista } from '../lib/shopping'
import { duplicaMenu } from '../lib/menu'

interface AppStore {
  data: AppData | null
  ready: boolean
  sync: SyncState
  config: LocalConfig
  /** Valorizzato quando l'archivio del browser non è utilizzabile. */
  storageError: string | null

  init: () => Promise<void>
  /** Applica una modifica ai dati, salva in locale e programma il backup. */
  mutate: (recipe: (draft: AppData) => void) => void

  upsertFood: (food: Food) => void
  deleteFood: (id: string) => void
  upsertAisle: (aisle: Aisle) => void
  deleteAisle: (id: string) => void

  upsertMenu: (menu: DayMenu) => void
  deleteMenu: (id: string) => void
  duplicateMenu: (id: string) => void
  /** Gradimento del menu: 0 azzera la valutazione. */
  impostaRating: (menuId: string, valore: number) => void

  setDayMenu: (date: string, menuId: string | null) => void
  /** Assegna più giorni in una sola modifica, per la generazione automatica. */
  assegnaMenuMultipli: (assegnazioni: Record<string, string | null>) => void
  setDayOption: (date: string, meal: MealKey, optionId: string) => void
  /** Applica (o toglie, con null) una ricetta come variante di un pasto. */
  applicaVariante: (date: string, meal: MealKey, recipeId: string | null) => void

  impostaTema: (tema: TemaApp) => void
  upsertRegola: (regola: FrequencyRule) => void
  eliminaRegola: (id: string) => void
  impostaStagionalita: (preferenza: SeasonalPreference) => void

  aggiornaProfilo: (profilo: Profile) => void
  upsertRilevazione: (misura: Measurement) => void
  eliminaRilevazione: (id: string) => void

  upsertRecipe: (recipe: Recipe) => void
  deleteRecipe: (id: string) => void
  upsertEquivalenceGroup: (gruppo: EquivalenceGroup) => void
  deleteEquivalenceGroup: (id: string) => void
  toggleDayLocked: (date: string) => void
  toggleDaySkipped: (date: string) => void

  generaLista: (fromDate: string, toDate: string, persone?: number) => void
  impostaPersone: (listaId: string, persone: number) => void
  toggleVoceSpesa: (listaId: string, voceId: string) => void
  aggiungiVoceManuale: (listaId: string, nome: string, quantita: number, unit: Unit) => void
  rimuoviVoceSpesa: (listaId: string, voceId: string) => void
  eliminaLista: (listaId: string) => void

  saveGithubConfig: (github: GithubConfig) => void
  disconnectGithub: () => void
  refreshConfig: () => void

  exportToFile: () => void
  importFromFile: (file: File) => Promise<void>
  replaceAll: (data: AppData, asLocalChange: boolean) => Promise<void>
}

export const useApp = create<AppStore>()((set, get) => ({
  data: null,
  ready: false,
  sync: { status: 'disattivato', message: null, lastSyncedAt: null, conflict: null },
  config: loadConfig(),
  storageError: null,

  async init() {
    const config = loadConfig()
    const { data: stored, errore } = await loadLocal()
    const data = stored ? normalizeAppData(stored, config.deviceId) : emptyAppData(config.deviceId)
    let storageError = errore
    if (!stored && !errore) {
      try {
        await saveLocal(data)
      } catch {
        storageError =
          'Non riesco a scrivere nell’archivio del browser: le modifiche non verranno conservate.'
      }
    }
    // L'app parte comunque: meglio poter consultare i dati in sola lettura che
    // restare bloccati su una schermata di attesa.
    set({ data, ready: true, config, storageError })

    startSync({
      getData: () => get().data,
      adoptRemote: async (remote) => {
        await saveLocal(remote)
        set({ data: remote })
      },
      adoptAsLocalChange: async (next) => {
        const stamped: AppData = {
          ...next,
          updatedAt: nowIso(),
          updatedBy: loadConfig().deviceId,
        }
        await saveLocal(stamped)
        set({ data: stamped })
      },
      onState: (sync) => set({ sync, config: loadConfig() }),
    })
  },

  mutate(recipe) {
    const current = get().data
    if (!current) return
    const draft = structuredClone(current)
    recipe(draft)
    draft.updatedAt = nowIso()
    draft.updatedBy = get().config.deviceId
    set({ data: draft })
    void saveLocal(draft)
      .then(() => {
        if (get().storageError) set({ storageError: null })
      })
      .catch((err) => {
        console.error('Salvataggio locale fallito', err)
        set({
          storageError:
            'Non riesco a scrivere nell’archivio del browser: le ultime modifiche potrebbero andare perse. Esporta una copia dei dati.',
        })
      })
    notifyLocalChange()
  },

  upsertFood(food) {
    get().mutate((draft) => {
      const index = draft.foods.findIndex((f) => f.id === food.id)
      if (index >= 0) draft.foods[index] = food
      else draft.foods.push(food)
    })
  },

  deleteFood(id) {
    get().mutate((draft) => {
      draft.foods = draft.foods.filter((f) => f.id !== id)
    })
  },

  upsertAisle(aisle) {
    get().mutate((draft) => {
      const index = draft.aisles.findIndex((a) => a.id === aisle.id)
      if (index >= 0) draft.aisles[index] = aisle
      else draft.aisles.push(aisle)
    })
  },

  deleteAisle(id) {
    get().mutate((draft) => {
      const fallback = draft.aisles.find((a) => a.id !== id)
      if (!fallback) return
      // Gli alimenti del reparto rimosso non restano orfani.
      draft.foods = draft.foods.map((f) => (f.aisleId === id ? { ...f, aisleId: fallback.id } : f))
      draft.aisles = draft.aisles.filter((a) => a.id !== id)
    })
  },

  upsertMenu(menu) {
    get().mutate((draft) => {
      const index = draft.menus.findIndex((m) => m.id === menu.id)
      if (index >= 0) draft.menus[index] = menu
      else draft.menus.push(menu)
    })
  },

  deleteMenu(id) {
    get().mutate((draft) => {
      draft.menus = draft.menus.filter((m) => m.id !== id)
      // Nessun giorno deve restare agganciato a un menu che non esiste piu'.
      for (const week of draft.weeks) {
        for (const day of week.days) {
          if (day.menuId === id) {
            day.menuId = null
            day.chosenOptions = {}
            day.appliedVariants = {}
          }
        }
      }
    })
  },

  duplicateMenu(id) {
    const originale = get().data?.menus.find((m) => m.id === id)
    if (!originale) return
    get().upsertMenu(duplicaMenu(originale))
  },

  impostaRating(menuId, valore) {
    const pulito = Math.min(5, Math.max(0, Math.round(valore)))
    get().mutate((draft) => {
      const menu = draft.menus.find((m) => m.id === menuId)
      if (!menu) return
      menu.rating = pulito || undefined
      menu.updatedAt = nowIso()
    })
  },

  setDayMenu(date, menuId) {
    get().mutate((draft) => {
      const giorno = assicuraGiorno(draft, date)
      giorno.menuId = menuId
      // Le scelte precedenti non hanno senso su un menu diverso.
      giorno.chosenOptions = {}
      giorno.appliedVariants = {}
    })
  },

  assegnaMenuMultipli(assegnazioni) {
    get().mutate((draft) => {
      for (const [date, menuId] of Object.entries(assegnazioni)) {
        const giorno = assicuraGiorno(draft, date)
        giorno.menuId = menuId
        giorno.chosenOptions = {}
        giorno.appliedVariants = {}
      }
    })
  },

  setDayOption(date, meal, optionId) {
    get().mutate((draft) => {
      const giorno = assicuraGiorno(draft, date)
      giorno.chosenOptions = { ...giorno.chosenOptions, [meal]: optionId }
    })
  },

  applicaVariante(date, meal, recipeId) {
    get().mutate((draft) => {
      const giorno = assicuraGiorno(draft, date)
      const varianti = { ...giorno.appliedVariants }
      if (recipeId) varianti[meal] = recipeId
      else delete varianti[meal]
      giorno.appliedVariants = varianti
    })
  },

  impostaTema(tema) {
    get().mutate((draft) => {
      draft.settings.theme = tema
    })
  },

  upsertRegola(regola) {
    get().mutate((draft) => {
      const indice = draft.settings.frequencyRules.findIndex((r) => r.id === regola.id)
      if (indice >= 0) draft.settings.frequencyRules[indice] = regola
      else draft.settings.frequencyRules.push(regola)
    })
  },

  eliminaRegola(id) {
    get().mutate((draft) => {
      draft.settings.frequencyRules = draft.settings.frequencyRules.filter((r) => r.id !== id)
    })
  },

  impostaStagionalita(preferenza) {
    get().mutate((draft) => {
      draft.settings.seasonal = preferenza
    })
  },

  aggiornaProfilo(profilo) {
    get().mutate((draft) => {
      draft.profile = profilo
    })
  },

  upsertRilevazione(misura) {
    get().mutate((draft) => {
      const indice = draft.measurements.findIndex((m) => m.id === misura.id)
      if (indice >= 0) draft.measurements[indice] = misura
      else draft.measurements.push(misura)
      // Ordinate per data: la linea del tempo e il grafico contano su questo.
      draft.measurements.sort((a, b) => a.date.localeCompare(b.date))
    })
  },

  eliminaRilevazione(id) {
    get().mutate((draft) => {
      draft.measurements = draft.measurements.filter((m) => m.id !== id)
    })
  },

  upsertRecipe(recipe) {
    get().mutate((draft) => {
      const indice = draft.recipes.findIndex((r) => r.id === recipe.id)
      if (indice >= 0) draft.recipes[indice] = recipe
      else draft.recipes.push(recipe)
    })
  },

  deleteRecipe(id) {
    get().mutate((draft) => {
      draft.recipes = draft.recipes.filter((r) => r.id !== id)
      // Nessun giorno deve restare agganciato a una variante che non esiste più.
      for (const settimana of draft.weeks) {
        for (const giorno of settimana.days) {
          for (const [meal, recipeId] of Object.entries(giorno.appliedVariants)) {
            if (recipeId === id) delete giorno.appliedVariants[meal as MealKey]
          }
        }
      }
    })
  },

  upsertEquivalenceGroup(gruppo) {
    get().mutate((draft) => {
      const indice = draft.equivalenceGroups.findIndex((g) => g.id === gruppo.id)
      if (indice >= 0) draft.equivalenceGroups[indice] = gruppo
      else draft.equivalenceGroups.push(gruppo)
    })
  },

  deleteEquivalenceGroup(id) {
    get().mutate((draft) => {
      draft.equivalenceGroups = draft.equivalenceGroups.filter((g) => g.id !== id)
    })
  },

  toggleDayLocked(date) {
    get().mutate((draft) => {
      const giorno = assicuraGiorno(draft, date)
      giorno.locked = !giorno.locked
    })
  },

  toggleDaySkipped(date) {
    get().mutate((draft) => {
      const giorno = assicuraGiorno(draft, date)
      giorno.skipped = !giorno.skipped
    })
  },

  generaLista(fromDate, toDate, persone) {
    const date = dateNellIntervallo(fromDate, toDate)
    if (date.length === 0) return
    get().mutate((draft) => {
      const indice = draft.shoppingLists.findIndex(
        (l) => l.fromDate === fromDate && l.toDate === toDate,
      )
      if (indice >= 0) {
        // Rigenerando si conservano le spunte già fatte e le voci aggiunte a mano.
        const esistente = draft.shoppingLists[indice]
        esistente.people = persone ?? esistente.people ?? 1
        esistente.items = generaVoci(draft, date, esistente.items, esistente.people)
        esistente.updatedAt = nowIso()
        return
      }
      draft.shoppingLists.push(nuovaLista(draft, fromDate, toDate, date, [], persone ?? 1))
      // Non serve un archivio infinito di liste passate.
      if (draft.shoppingLists.length > 5) {
        draft.shoppingLists = draft.shoppingLists.slice(-5)
      }
    })
  },

  impostaPersone(listaId, persone) {
    const valore = Math.min(20, Math.max(1, Math.round(persone)))
    get().mutate((draft) => {
      const lista = draft.shoppingLists.find((l) => l.id === listaId)
      if (!lista) return
      lista.people = valore
      // Le quantità vanno ricalcolate subito: un numero di persone che non
      // cambia la lista sarebbe solo un'etichetta senza effetto.
      lista.items = generaVoci(
        draft,
        dateNellIntervallo(lista.fromDate, lista.toDate),
        lista.items,
        valore,
      )
      lista.updatedAt = nowIso()
    })
  },

  toggleVoceSpesa(listaId, voceId) {
    get().mutate((draft) => {
      const lista = draft.shoppingLists.find((l) => l.id === listaId)
      const voce = lista?.items.find((v) => v.id === voceId)
      if (!lista || !voce) return
      voce.checked = !voce.checked
      lista.updatedAt = nowIso()
    })
  },

  aggiungiVoceManuale(listaId, nome, quantita, unit) {
    get().mutate((draft) => {
      const lista = draft.shoppingLists.find((l) => l.id === listaId)
      if (!lista) return
      lista.items.push({
        id: uid('voce-'),
        foodId: null,
        customName: nome.trim(),
        quantity: quantita,
        unit,
        checked: false,
        manual: true,
      })
      lista.updatedAt = nowIso()
    })
  },

  rimuoviVoceSpesa(listaId, voceId) {
    get().mutate((draft) => {
      const lista = draft.shoppingLists.find((l) => l.id === listaId)
      if (!lista) return
      lista.items = lista.items.filter((v) => v.id !== voceId)
      lista.updatedAt = nowIso()
    })
  },

  eliminaLista(listaId) {
    get().mutate((draft) => {
      draft.shoppingLists = draft.shoppingLists.filter((l) => l.id !== listaId)
    })
  },

  saveGithubConfig(github) {
    const config = { ...loadConfig(), github, lastSyncedSha: null, lastSyncedUpdatedAt: null }
    saveConfig(config)
    set({ config })
    void syncNow()
  },

  disconnectGithub() {
    const config = {
      ...loadConfig(),
      github: null,
      lastSyncedSha: null,
      lastSyncedAt: null,
      lastSyncedUpdatedAt: null,
    }
    saveConfig(config)
    set({
      config,
      sync: { status: 'disattivato', message: null, lastSyncedAt: null, conflict: null },
    })
  },

  refreshConfig() {
    set({ config: loadConfig() })
  },

  exportToFile() {
    const data = get().data
    if (!data) return
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `piano-alimentare-${toIsoDate(new Date())}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    get().mutate((draft) => {
      draft.settings.lastManualExport = nowIso()
    })
  },

  async importFromFile(file) {
    const text = await file.text()
    const parsed = normalizeAppData(JSON.parse(text), get().config.deviceId)
    await get().replaceAll(parsed, true)
  },

  async replaceAll(data, asLocalChange) {
    const stamped: AppData = asLocalChange
      ? { ...data, updatedAt: nowIso(), updatedBy: get().config.deviceId }
      : data
    await saveLocal(stamped)
    set({ data: stamped })
    if (asLocalChange) notifyLocalChange()
  },
}))

/**
 * Restituisce il giorno indicato, creando la settimana e l'assegnazione se non
 * esistono ancora. Le settimane nascono solo quando si assegna davvero
 * qualcosa, così il documento non si riempie di settimane vuote.
 */
function assicuraGiorno(draft: AppData, date: string): DayAssignment {
  const inizio = toIsoDate(startOfWeek(parseIsoDate(date)))
  let settimana = draft.weeks.find((w) => w.startDate === inizio)
  if (!settimana) {
    settimana = {
      id: uid('week-'),
      startDate: inizio,
      days: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    }
    draft.weeks.push(settimana)
  }
  let giorno = settimana.days.find((d) => d.date === date)
  if (!giorno) {
    giorno = {
      date,
      menuId: null,
      chosenOptions: {},
      appliedVariants: {},
      locked: false,
      skipped: false,
    }
    settimana.days.push(giorno)
    settimana.days.sort((a, b) => a.date.localeCompare(b.date))
  }
  settimana.updatedAt = nowIso()
  return giorno
}

/* --------------------------------------------------------------- letture */

// Definite in lib/plan: servono anche fuori dallo store, ma le pagine
// continuano a importarle da qui.
export { giornoDi, menuDi, settimanaDi } from '../lib/plan'

/** Crea un alimento nuovo con valori predefiniti sensati. */
export function newFood(aisleId: string): Food {
  const stamp = nowIso()
  return {
    id: uid('food-'),
    name: '',
    aisleId,
    unit: 'g',
    measures: [],
    roundToPurchase: false,
    alwaysInPantry: false,
    createdAt: stamp,
    updatedAt: stamp,
  }
}

/** La lista della spesa su cui si sta lavorando: la più recente. */
export function listaCorrente(data: AppData | null): ShoppingList | undefined {
  if (!data?.shoppingLists.length) return undefined
  return [...data.shoppingLists].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
}
