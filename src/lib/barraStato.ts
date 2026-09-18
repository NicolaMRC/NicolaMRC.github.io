import { useEffect } from 'react'

/**
 * Colore della barra di stato.
 *
 * Quando l'app gira installata sulla home dell'iPhone, la striscia in cima —
 * ora, batteria, campo — non fa parte della pagina: la disegna iOS leggendo
 * `<meta name="theme-color">`. Se quella resta ferma mentre la pagina cambia,
 * lassù rimane il colore di prima: è il motivo per cui scorrendo i giorni la
 * barra restava della tinta del menu di oggi.
 *
 * Va quindi riscritta a ogni cambio di menu, con lo stesso colore che la
 * sfumatura dipinge in cima alla pagina, così le due parti combaciano.
 */

/**
 * La tinta richiesta dalla schermata aperta, se ne ha una. Sta qui fuori dai
 * componenti perché anche il cambio di tema deve poterla ridipingere senza
 * prima cancellarla: i due effetti scattano in ordini diversi a seconda di
 * chi si monta, e uno che azzera vince su uno che colora.
 */
let tintaAttiva: string | undefined

function leggiVariabile(nome: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nome).trim()
}

/** Lo sfondo del tema corrente come terna RGB. */
function sfondoCorrente(): [number, number, number] {
  const esa = leggiVariabile('--sfondo').replace('#', '')
  if (esa.length !== 6) return [250, 250, 249]
  return [
    parseInt(esa.slice(0, 2), 16),
    parseInt(esa.slice(2, 4), 16),
    parseInt(esa.slice(4, 6), 16),
  ]
}

/**
 * Il colore del menu posato sullo sfondo del tema, cioè esattamente quello che
 * si vede in cima alla sfumatura. Senza menu resta lo sfondo e basta.
 */
export function coloreBarra(rgbMenu: string | undefined): string {
  const sfondo = sfondoCorrente()
  if (!rgbMenu) return `rgb(${sfondo.join(', ')})`

  const tinta = rgbMenu.trim().split(/\s+/).map(Number)
  if (tinta.length !== 3 || tinta.some((n) => !Number.isFinite(n))) {
    return `rgb(${sfondo.join(', ')})`
  }

  const alfa = Number.parseFloat(leggiVariabile('--menu-alfa-1'))
  const peso = Number.isFinite(alfa) ? alfa : 0.45
  const mescolato = tinta.map((canale, i) => Math.round(canale * peso + sfondo[i] * (1 - peso)))
  return `rgb(${mescolato.join(', ')})`
}

/** Riscrive la meta con la tinta attiva e i colori del tema di adesso. */
export function ridipingiBarraStato(): void {
  const meta = document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', coloreBarra(tintaAttiva))
}

/**
 * Tiene la barra di stato in tinta con il menu mostrato nella schermata.
 * Lasciando la schermata torna al colore di sfondo.
 */
export function useBarraStato(rgbMenu: string | undefined): void {
  useEffect(() => {
    tintaAttiva = rgbMenu
    ridipingiBarraStato()
    return () => {
      tintaAttiva = undefined
      ridipingiBarraStato()
    }
  }, [rgbMenu])
}
