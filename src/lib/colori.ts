import type { CSSProperties } from 'react'
import type { DayMenu } from '../types'

/**
 * Palette dei menu.
 *
 * L'interfaccia è in bianco e nero: il colore resta solo qui, sui menu, dove
 * serve a riconoscerli a colpo d'occhio. Sono tinte tenui e desaturate, usate
 * sempre in trasparenza — mai come fondo pieno — così funzionano allo stesso
 * modo su sfondo chiaro e su sfondo scuro.
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
  { id: 'salvia', nome: 'Salvia', rgb: '134 163 141' },
  { id: 'menta', nome: 'Menta', rgb: '130 186 172' },
  { id: 'acqua', nome: 'Acqua', rgb: '126 176 186' },
  { id: 'cielo', nome: 'Cielo', rgb: '138 168 202' },
  { id: 'polvere', nome: 'Carta da zucchero', rgb: '148 163 200' },
  { id: 'lavanda', nome: 'Lavanda', rgb: '166 152 198' },
  { id: 'prugna', nome: 'Prugna', rgb: '172 138 178' },
  { id: 'rosa', nome: 'Rosa antico', rgb: '205 150 168' },
  { id: 'corallo', nome: 'Corallo', rgb: '216 148 140' },
  { id: 'terracotta', nome: 'Terracotta', rgb: '199 132 112' },
  { id: 'pesca', nome: 'Pesca', rgb: '226 172 138' },
  { id: 'ocra', nome: 'Ocra', rgb: '205 174 116' },
  { id: 'senape', nome: 'Senape', rgb: '190 170 96' },
  { id: 'muschio', nome: 'Muschio', rgb: '158 172 118' },
  { id: 'ardesia', nome: 'Ardesia', rgb: '145 155 165' },
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
