/**
 * Catalogo dei tag selezionabili sui menu.
 *
 * Gli identificativi sono stabili e vengono salvati nei dati: le etichette e
 * le emoji si possono cambiare senza toccare i menu già inseriti. Saranno
 * anche la base dei contatori di frequenza settimanale.
 */

export interface TagDefinizione {
  id: string
  label: string
  emoji: string
}

export interface GruppoTag {
  titolo: string
  tags: TagDefinizione[]
}

export const CATALOGO_TAG: GruppoTag[] = [
  {
    titolo: 'Proteina principale',
    tags: [
      { id: 'pesce', label: 'Pesce', emoji: '🐟' },
      { id: 'carne-bianca', label: 'Carne bianca', emoji: '🍗' },
      { id: 'carne-rossa', label: 'Carne rossa', emoji: '🥩' },
      { id: 'uova', label: 'Uova', emoji: '🥚' },
      { id: 'legumi', label: 'Legumi', emoji: '🫘' },
      { id: 'formaggi', label: 'Formaggi', emoji: '🧀' },
      { id: 'salumi', label: 'Salumi', emoji: '🥓' },
    ],
  },
  {
    titolo: 'Tipo di piatto',
    tags: [
      { id: 'primo', label: 'Primo', emoji: '🍝' },
      { id: 'secondo', label: 'Secondo', emoji: '🥘' },
      { id: 'insalata', label: 'Insalata', emoji: '🥗' },
      { id: 'zuppa', label: 'Zuppa', emoji: '🍲' },
      { id: 'piatto-unico', label: 'Piatto unico', emoji: '🥪' },
      { id: 'pizza', label: 'Pizza', emoji: '🍕' },
    ],
  },
  {
    titolo: 'Come si prepara',
    tags: [
      { id: 'veloce', label: 'Veloce', emoji: '⚡' },
      { id: 'elaborato', label: 'Elaborato', emoji: '👨‍🍳' },
      { id: 'da-portare', label: 'Da portare via', emoji: '🍱' },
      { id: 'fuori-casa', label: 'Fuori casa', emoji: '🍽️' },
      { id: 'pasto-libero', label: 'Pasto libero', emoji: '🎉' },
    ],
  },
  {
    titolo: 'Caratteristiche',
    tags: [
      { id: 'vegetariano', label: 'Vegetariano', emoji: '🌱' },
      { id: 'vegano', label: 'Vegano', emoji: '🌿' },
      { id: 'senza-glutine', label: 'Senza glutine', emoji: '🌾' },
      { id: 'senza-lattosio', label: 'Senza lattosio', emoji: '🥛' },
      { id: 'leggero', label: 'Leggero', emoji: '🪶' },
      { id: 'proteico', label: 'Proteico', emoji: '💪' },
    ],
  },
  {
    titolo: 'Stagionalità',
    tags: [
      { id: 'estivo', label: 'Piatto estivo', emoji: '☀️' },
      { id: 'invernale', label: 'Piatto invernale', emoji: '❄️' },
    ],
  },
  {
    titolo: 'Tipo di giornata',
    tags: [
      { id: 'allenamento', label: 'Allenamento', emoji: '🏋️' },
      { id: 'riposo', label: 'Riposo', emoji: '🛋️' },
    ],
  },
]

const INDICE = new Map<string, TagDefinizione>(
  CATALOGO_TAG.flatMap((gruppo) => gruppo.tags.map((tag) => [tag.id, tag])),
)

const ORDINE = new Map<string, number>(
  CATALOGO_TAG.flatMap((gruppo) => gruppo.tags).map((tag, indice) => [tag.id, indice]),
)

/** Ordina i tag come compaiono nel catalogo; quelli sconosciuti vanno in fondo. */
export function ordinaTag(ids: string[]): string[] {
  return [...ids].sort(
    (a, b) => (ORDINE.get(a) ?? Number.MAX_SAFE_INTEGER) - (ORDINE.get(b) ?? Number.MAX_SAFE_INTEGER),
  )
}

/**
 * Definizione di un tag. I tag non più a catalogo restano comunque
 * visualizzabili, così i menu inseriti in passato non perdono informazioni.
 */
export function definizioneTag(id: string): TagDefinizione {
  return INDICE.get(id) ?? { id, label: id, emoji: '🏷️' }
}

export function emojiTag(id: string): string {
  return definizioneTag(id).emoji
}

/** Identificativi dei tag di stagione, usati dalla generazione automatica. */
export const TAG_ESTIVO = 'estivo'
export const TAG_INVERNALE = 'invernale'
