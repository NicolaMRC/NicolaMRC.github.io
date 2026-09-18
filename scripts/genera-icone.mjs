/**
 * Genera le icone PNG dell'app senza dipendenze esterne.
 *
 * Disegno: sfondo verde, piatto chiaro al centro, anello esterno.
 * Le forme restano dentro la zona sicura circolare richiesta dalle icone
 * "maskable", cosi' nulla viene tagliato su Android.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const USCITA = resolve(QUI, '..', 'public', 'icons')

const VERDE = [47, 107, 79]
const CREMA = [250, 249, 246]

/* --------------------------------------------------------------- PNG --- */

const tabellaCrc = (() => {
  const tabella = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    tabella[n] = c
  }
  return tabella
})()

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = tabellaCrc[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(tipo, dati) {
  const lunghezza = Buffer.alloc(4)
  lunghezza.writeUInt32BE(dati.length)
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dati])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(corpo))
  return Buffer.concat([lunghezza, corpo, crc])
}

function scriviPng(percorso, larghezza, altezza, pixel) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(larghezza, 0)
  ihdr.writeUInt32BE(altezza, 4)
  ihdr[8] = 8 // bit per canale
  ihdr[9] = 6 // RGBA
  const righe = []
  for (let y = 0; y < altezza; y++) {
    righe.push(Buffer.from([0])) // filtro "none"
    righe.push(pixel.subarray(y * larghezza * 4, (y + 1) * larghezza * 4))
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(Buffer.concat(righe), { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  writeFileSync(percorso, png)
}

/* ------------------------------------------------------------ disegno --- */

/** Copertura di un cerchio su un pixel, con sovracampionamento per i bordi. */
function coperturaCerchio(x, y, cx, cy, raggio, spessore = null) {
  const campioni = 4
  let dentro = 0
  for (let sy = 0; sy < campioni; sy++) {
    for (let sx = 0; sx < campioni; sx++) {
      const px = x + (sx + 0.5) / campioni
      const py = y + (sy + 0.5) / campioni
      const d = Math.hypot(px - cx, py - cy)
      if (spessore === null ? d <= raggio : Math.abs(d - raggio) <= spessore / 2) dentro++
    }
  }
  return dentro / (campioni * campioni)
}

function mescola(base, colore, alfa) {
  return [
    Math.round(base[0] * (1 - alfa) + colore[0] * alfa),
    Math.round(base[1] * (1 - alfa) + colore[1] * alfa),
    Math.round(base[2] * (1 - alfa) + colore[2] * alfa),
  ]
}

function disegna(size) {
  const pixel = Buffer.alloc(size * size * 4)
  const c = size / 2
  const raggioPiatto = size * 0.26
  const raggioAnello = size * 0.36
  const spessoreAnello = size * 0.035

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let colore = VERDE
      const anello = coperturaCerchio(x, y, c, c, raggioAnello, spessoreAnello)
      if (anello > 0) colore = mescola(colore, CREMA, anello * 0.55)
      const piatto = coperturaCerchio(x, y, c, c, raggioPiatto)
      if (piatto > 0) colore = mescola(colore, CREMA, piatto)

      const i = (y * size + x) * 4
      pixel[i] = colore[0]
      pixel[i + 1] = colore[1]
      pixel[i + 2] = colore[2]
      pixel[i + 3] = 255
    }
  }
  return pixel
}

mkdirSync(USCITA, { recursive: true })

for (const [nome, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  scriviPng(resolve(USCITA, nome), size, size, disegna(size))
  console.log(`creato ${nome} (${size}px)`)
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#2f6b4f"/>
  <circle cx="32" cy="32" r="23" fill="none" stroke="#faf9f6" stroke-opacity="0.55" stroke-width="2.2"/>
  <circle cx="32" cy="32" r="16.6" fill="#faf9f6"/>
</svg>
`
writeFileSync(resolve(USCITA, 'favicon.svg'), favicon)
console.log('creato favicon.svg')
