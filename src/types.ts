/**
 * Modello dati completo dell'applicazione.
 *
 * Definito per intero fin dalla prima tappa (anche per le funzioni non ancora
 * costruite) in modo che il formato del file di backup resti stabile nel tempo:
 * i dati inseriti oggi restano leggibili da tutte le versioni future.
 */

export type Unit = 'g' | 'ml' | 'pz'

export const UNIT_LABELS: Record<Unit, string> = {
  g: 'grammi',
  ml: 'millilitri',
  pz: 'pezzi',
}

/** Misura casalinga: "1 cucchiaio = 10 g". Convertita in unita' base per la spesa. */
export interface HouseholdMeasure {
  id: string
  /** Singolare, minuscolo: "cucchiaio", "fetta", "vasetto". */
  label: string
  /** Quantita' equivalente espressa nell'unita' base dell'alimento. */
  amount: number
}

/** Reparto del supermercato, usato per raggruppare la lista della spesa. */
export interface Aisle {
  id: string
  name: string
  /** Ordine di attraversamento del supermercato. */
  order: number
}

export interface Food {
  id: string
  name: string
  aisleId: string
  unit: Unit
  measures: HouseholdMeasure[]
  /** Formato di vendita nell'unita' base (es. 500 per un pacco da 500 g). */
  purchaseSize?: number
  /** Etichetta del formato mostrata nella lista ("pacco da 500 g"). */
  purchaseLabel?: string
  /** Se true la spesa arrotonda al formato di vendita superiore. */
  roundToPurchase: boolean
  /** "Ce l'ho gia'": escluso dalla lista della spesa. */
  alwaysInPantry: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ menu */

export type MealKey = 'colazione' | 'spuntino' | 'pranzo' | 'merenda' | 'cena'

export const MEAL_KEYS: MealKey[] = ['colazione', 'spuntino', 'pranzo', 'merenda', 'cena']

export const MEAL_LABELS: Record<MealKey, string> = {
  colazione: 'Colazione',
  spuntino: 'Spuntino',
  pranzo: 'Pranzo',
  merenda: 'Merenda',
  cena: 'Cena',
}

/** Riga di un pasto: un alimento con la sua quantita'. */
export interface MenuItem {
  id: string
  foodId: string
  /** Quantita' nell'unita' base, oppure numero di misure casalinghe se measureId e' valorizzato. */
  quantity: number
  /** Se valorizzato, la quantita' e' espressa in questa misura casalinga. */
  measureId?: string
  note?: string
}

/**
 * Un'alternativa per un pasto. Un pasto con una sola opzione e' un pasto fisso,
 * con piu' opzioni e' una scelta: stessa struttura per entrambi i casi.
 */
export interface MealOption {
  id: string
  name?: string
  items: MenuItem[]
}

export interface Meal {
  key: MealKey
  options: MealOption[]
}

/** Una giornata completa del piano alimentare. */
export interface DayMenu {
  id: string
  name: string
  meals: Meal[]
  tags: string[]
  /**
   * Gradimento da 1 a 5 stelle. Assente o 0 significa "non valutato" e viene
   * trattato come 3 dalla generazione automatica.
   */
  rating?: number
  /** Appunti liberi sul menu: come cucinarlo, cosa ricordarsi, varianti veloci. */
  notes?: string
  /** Identificativo del colore della palette, per la sfumatura e la barra negli elenchi. */
  color?: string
  createdAt: string
  updatedAt: string
}

/* --------------------------------------------------------------- ricette */

export interface RecipeIngredient {
  id: string
  foodId: string
  quantity: number
  measureId?: string
}

export interface Recipe {
  id: string
  name: string
  ingredients: RecipeIngredient[]
  steps: string
  minutes?: number
  servings: number
  tags: string[]
  /** Pasti a cui la ricetta si adatta; vuoto = qualunque pasto. */
  suitableFor: MealKey[]
  createdAt: string
  updatedAt: string
}

/**
 * Gruppo di scambio dichiarato dal nutrizionista: tutti gli elementi del gruppo
 * sono intercambiabili nelle quantita' indicate (80 g pasta = 100 g riso).
 */
export interface EquivalenceMember {
  id: string
  foodId: string
  amount: number
}

export interface EquivalenceGroup {
  id: string
  name: string
  members: EquivalenceMember[]
  notes?: string
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------- settimana/spesa */

/** Assegnazione di un menu a un giorno, con eventuale variante applicata. */
export interface DayAssignment {
  /** Data ISO (YYYY-MM-DD). */
  date: string
  menuId: string | null
  /** Opzione scelta per ciascun pasto, quando il pasto ha piu' alternative. */
  chosenOptions: Partial<Record<MealKey, string>>
  /** Ricetta applicata come variante, per pasto. */
  appliedVariants: Partial<Record<MealKey, string>>
  /** Giorno escluso dalla generazione random e dalla lista della spesa. */
  locked: boolean
  skipped: boolean
}

export interface WeekPlan {
  id: string
  /** Data ISO del lunedi'. */
  startDate: string
  days: DayAssignment[]
  createdAt: string
  updatedAt: string
}

/** Voce della lista della spesa, con lo stato di spunta. */
export interface ShoppingItem {
  id: string
  foodId: string | null
  /** Per le voci aggiunte a mano che non corrispondono a un alimento in archivio. */
  customName?: string
  /** Quantità da acquistare, già arrotondata al formato di vendita. */
  quantity: number
  /** Quantità effettivamente richiesta dai menu, prima dell'arrotondamento. */
  needed?: number
  /** Numero di confezioni da prendere, quando l'alimento ha un formato. */
  packages?: number
  unit: Unit
  checked: boolean
  manual: boolean
}

export interface ShoppingList {
  id: string
  weekId: string | null
  fromDate: string
  toDate: string
  /** Commensali: moltiplica le quantità dei menu, non le voci aggiunte a mano. */
  people: number
  items: ShoppingItem[]
  createdAt: string
  updatedAt: string
}

/**
 * Limite di frequenza settimanale su un tag.
 *
 * La generazione automatica lo rispetta; l'assegnazione manuale resta libera,
 * con il contatore della settimana che segnala lo sforamento.
 */
export interface FrequencyRule {
  id: string
  label: string
  /** Tag dei menu a cui si applica il limite. */
  tag: string
  /** Numero massimo di giorni a settimana. */
  timesPerWeek: number
}

/* --------------------------------------------------------------- profilo */

export interface Profile {
  name?: string
  birthDate?: string
  /** Altezza in cm, dato fisso. */
  heightCm?: number
  targetWeightKg?: number
  notes?: string
}

export interface Circumferences {
  vita?: number
  fianchi?: number
  torace?: number
  braccio?: number
  coscia?: number
}

/**
 * Rilevazione corporea. Due tipi distinti sulla stessa linea del tempo:
 * "completa" dopo un controllo, "rapida" come aggiornamento settimanale.
 */
export interface Measurement {
  id: string
  date: string
  type: 'completa' | 'rapida'
  weightKg?: number
  fatMassKg?: number
  fatMassPct?: number
  leanMassKg?: number
  leanMassPct?: number
  circumferences?: Circumferences
  notes?: string
  createdAt: string
}

/* -------------------------------------------------------------- settings */

export type Stagione = 'estate' | 'inverno'

/**
 * Preferenza stagionale della generazione automatica.
 *
 * Non esclude mai nulla: sposta soltanto le probabilita'. I menu senza tag di
 * stagione restano completamente inalterati.
 */
export interface SeasonalPreference {
  enabled: boolean
  /** 'auto' segue il mese corrente. */
  season: 'auto' | Stagione
  /** Quanto pesa la stagione rispetto al gradimento. */
  strength: 'leggera' | 'media' | 'forte'
}

export type TemaApp = 'auto' | 'chiaro' | 'scuro'

export interface Settings {
  /** Aspetto dell'app: 'auto' segue il sistema. */
  theme?: TemaApp
  /** Regole di frequenza settimanale mostrate come contatori. */
  frequencyRules: FrequencyRule[]
  /** Preferenza stagionale della generazione automatica. */
  seasonal: SeasonalPreference
  /** Promemoria periodico a esportare una copia manuale. */
  lastManualExport?: string
}

/** Documento unico che contiene tutti i dati dell'utente. */
export interface AppData {
  schemaVersion: number
  /** Timestamp dell'ultima modifica, usato per confrontare locale e cloud. */
  updatedAt: string
  /** Dispositivo che ha fatto l'ultima modifica, usato negli avvisi di conflitto. */
  updatedBy: string
  aisles: Aisle[]
  foods: Food[]
  menus: DayMenu[]
  recipes: Recipe[]
  equivalenceGroups: EquivalenceGroup[]
  weeks: WeekPlan[]
  shoppingLists: ShoppingList[]
  profile: Profile | null
  measurements: Measurement[]
  settings: Settings
}

export const SCHEMA_VERSION = 3
