import type { CSSProperties } from 'react'
import type { DayMenu } from '../types'

/**
 * Palette dei menu.
 *
 * L'interfaccia è in bianco e nero: il colore resta solo qui, sui menu, dove
 * serve a riconoscerli a colpo d'occhio. Sono tinte piene e sature, usate
 * sempre in trasparenza — mai come fondo pieno — così il testo sopra resta
 * leggibile.
 *
 * Tutte stanno in una fascia di luminosità media. È un vincolo, non un gusto:
 * lo stesso colore deve reggere sul chiaro e sullo scuro, e una tinta molto
 * pallida sparisce sul fondo chiaro come una molto cupa sparisce sul fondo
 * scuro. Il colore che si vede resta comunque quello, solo velato.
 *
 * Gli **id non si toccano**: i menu già salvati vi fanno riferimento, quindi
 * restano quelli della prima palette anche dove il nome non corrisponde più.
 *
 * I valori sono terne RGB separate da spazi: entrano direttamente nella
 * sintassi `rgb(var(--menu-rgb) / 0.3)` senza conversioni.
 */

export interface ColoreMenu {
  id: string
  nome: string
  rgb: string
}

export const COLORI_MENU: ColoreMenu[] = [
  { id: 'muschio', nome: 'Lime', rgb: '181 206 27' },
  { id: 'salvia', nome: 'Verde', rgb: '18 161 80' },
  { id: 'menta', nome: 'Menta', rgb: '0 184 148' },
  { id: 'foresta', nome: 'Foresta', rgb: '14 122 112' },
  { id: 'acqua', nome: 'Turchese', rgb: '0 155 176' },
  { id: 'cielo', nome: 'Cielo', rgb: '45 155 240' },
  { id: 'polvere', nome: 'Oltremare', rgb: '66 87 214' },
  { id: 'lavanda', nome: 'Lilla', rgb: '139 111 232' },
  { id: 'prugna', nome: 'Prugna', rgb: '180 79 200' },
  { id: 'rosa', nome: 'Rosa', rgb: '242 104 179' },
  { id: 'bordeaux', nome: 'Bordeaux', rgb: '160 32 80' },
  { id: 'corallo', nome: 'Corallo', rgb: '240 72 60' },
  { id: 'terracotta', nome: 'Terracotta', rgb: '210 88 42' },
  { id: 'cioccolato', nome: 'Cioccolato', rgb: '154 90 43' },
  { id: 'pesca', nome: 'Arancio', rgb: '255 140 0' },
  { id: 'ocra', nome: 'Mango', rgb: '255 194 14' },
  { id: 'senape', nome: 'Senape', rgb: '199 154 18' },
  { id: 'ardesia', nome: 'Ardesia', rgb: '110 124 140' },
]

const INDICE = new Map(COLORI_MENU.map((c) => [c.id, c]))

export function coloreDi(id: string | undefined): ColoreMenu | undefined {
  return id ? INDICE.get(id) : undefined
}

/**
 * Colore da assegnare a un menu nuovo: il meno usato fra quelli esistenti,
 * a parità scelto a caso. Inserendo molti menu di seguito si ottiene una
 * distribuzione varia invece di una fila di tinte uguali.
 */
export function coloreSuggerito(menus: DayMenu[]): string {
  const usi = new Map<string, number>(COLORI_MENU.map((c) => [c.id, 0]))
  for (const menu of menus) {
    if (menu.color && usi.has(menu.color)) usi.set(menu.color, (usi.get(menu.color) ?? 0) + 1)
  }
  const minimo = Math.min(...usi.values())
  const candidati = [...usi.entries()].filter(([, n]) => n === minimo).map(([id]) => id)
  return candidati[Math.floor(Math.random() * candidati.length)]
}

/**
 * Espone il colore del menu come variabile CSS. Il disegno vero e proprio —
 * sfumatura dall'alto o bagliore dai bordi — sta nel foglio di stile.
 */
export function stileMenu(menu: Pick<DayMenu, 'color'> | undefined): CSSProperties {
  const colore = coloreDi(menu?.color)
  if (!colore) return {}
  return { '--menu-rgb': colore.rgb } as CSSProperties
}
