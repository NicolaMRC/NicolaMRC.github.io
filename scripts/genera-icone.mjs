/**
 * Genera le icone PNG di PrepEat senza dipendenze esterne.
 *
 * Disegno: fondo nero, contenitore porta-pranzo bianco con coperchio pieno,
 * forchetta e coltello all'interno. Le forme sono definite su una griglia di
 * 256 e riscalate: la stessa descrizione produce tutte le dimensioni.
 *
 * Il contorno si ottiene riempiendo la forma esterna di bianco e poi quella
 * interna di nero: evita di dover tracciare i bordi, che su un rasterizzatore
 * scritto a mano sarebbe molto più complicato.
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const QUI = dirname(fileURLToPath(import.meta.url))
const USCITA = resolve(QUI, '..', 'public', 'icons')

const NERO = [0, 0, 0]
const BIANCO = [255, 255, 255]
const GRIGLIA = 256

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

function scriviPng(percorso, size, pixel) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6 // RGBA
  const righe = []
  for (let y = 0; y < size; y++) {
    righe.push(Buffer.from([0]))
    righe.push(pixel.subarray(y * size * 4, (y + 1) * size * 4))
  }
  writeFileSync(
    percorso,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(Buffer.concat(righe), { level: 9 })),
      chunk('IEND', Buffer.alloc(0)),
    ]),
  )
}

/* -------------------------------------------------------- rasterizzatore */

/** Riempie una forma descritta da un predicato, con 4x4 campioni per pixel. */
function riempi(pixel, size, dentro, colore) {
  const scala = size / GRIGLIA
  const campioni = 4
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let coperti = 0
      for (let sy = 0; sy < campioni; sy++) {
        for (let sx = 0; sx < campioni; sx++) {
          const px = (x + (sx + 0.5) / campioni) / scala
          const py = (y + (sy + 0.5) / campioni) / scala
          if (dentro(px, py)) coperti++
        }
      }
      if (coperti === 0) continue
      const alfa = coperti / (campioni * campioni)
      const i = (y * size + x) * 4
      for (let c = 0; c < 3; c++) {
        pixel[i + c] = Math.round(pixel[i + c] * (1 - alfa) + colore[c] * alfa)
      }
    }
  }
}

function poligono(punti) {
  return (x, y) => {
    let dentro = false
    for (let i = 0, j = punti.length - 1; i < punti.length; j = i++) {
      const [xi, yi] = punti[i]
      const [xj, yj] = punti[j]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro
    }
    return dentro
  }
}

function rettangoloTondo(x0, y0, larghezza, altezza, raggio) {
  const x1 = x0 + larghezza
  const y1 = y0 + altezza
  const r = Math.min(raggio, larghezza / 2, altezza / 2)
  return (x, y) => {
    if (x < x0 || x > x1 || y < y0 || y > y1) return false
    const dx = x < x0 + r ? x0 + r - x : x > x1 - r ? x - (x1 - r) : 0
    const dy = y < y0 + r ? y0 + r - y : y > y1 - r ? y - (y1 - r) : 0
    return dx * dx + dy * dy <= r * r
  }
}

/* ------------------------------------------------------------- disegno --- */

function disegna(size) {
  const pixel = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    pixel[i * 4] = NERO[0]
    pixel[i * 4 + 1] = NERO[1]
    pixel[i * 4 + 2] = NERO[2]
    pixel[i * 4 + 3] = 255
  }

  // Vasca superiore: contorno bianco, interno nero.
  riempi(pixel, size, poligono([[80, 64], [176, 64], [202, 130], [54, 130]]), BIANCO)
  riempi(pixel, size, poligono([[90, 75], [166, 75], [186, 130], [70, 130]]), NERO)

  // Coperchio: fascia piena, sporge appena oltre gli spigoli della vasca.
  riempi(pixel, size, rettangoloTondo(50, 130, 156, 20, 9), BIANCO)

  // Vasca inferiore: si restringe verso il basso.
  riempi(pixel, size, poligono([[58, 150], [198, 150], [180, 196], [76, 196]]), BIANCO)
  riempi(pixel, size, poligono([[72, 150], [184, 150], [170, 184], [86, 184]]), NERO)

  // Forchetta: tre rebbi e un manico che scende verso il coperchio.
  for (const x of [106, 114, 122]) {
    riempi(pixel, size, rettangoloTondo(x, 84, 6, 24, 3), BIANCO)
  }
  riempi(pixel, size, rettangoloTondo(110, 100, 10, 30, 5), BIANCO)

  // Coltello: lama con dorso dritto e filo inclinato, poi il manico.
  riempi(pixel, size, poligono([[140, 84], [154, 93], [154, 114], [140, 114]]), BIANCO)
  riempi(pixel, size, rettangoloTondo(142, 108, 9, 22, 4.5), BIANCO)

  // Le due barrette ai lati, appoggiate al coperchio.
  riempi(pixel, size, rettangoloTondo(78, 119, 24, 9, 4.5), BIANCO)
  riempi(pixel, size, rettangoloTondo(158, 119, 24, 9, 4.5), BIANCO)

  return pixel
}

mkdirSync(USCITA, { recursive: true })

for (const [nome, size] of [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
]) {
  scriviPng(resolve(USCITA, nome), size, disegna(size))
  console.log(`creato ${nome} (${size}px)`)
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect width="256" height="256" fill="#000"/>
  <g fill="#fff">
    <path d="M80 64h96l26 66H54z"/>
    <rect x="50" y="130" width="156" height="20" rx="9"/>
    <path d="M58 150h140l-18 46H76z"/>
    <rect x="106" y="84" width="6" height="24" rx="3"/>
    <rect x="114" y="84" width="6" height="24" rx="3"/>
    <rect x="122" y="84" width="6" height="24" rx="3"/>
    <rect x="110" y="100" width="10" height="30" rx="5"/>
    <path d="M140 84l14 9v21h-14z"/>
    <rect x="142" y="108" width="9" height="22" rx="4.5"/>
    <rect x="78" y="119" width="24" height="9" rx="4.5"/>
    <rect x="158" y="119" width="24" height="9" rx="4.5"/>
  </g>
  <g fill="#000">
    <path d="M90 75h76l20 55H70z"/>
    <path d="M72 150h112l-14 34H86z"/>
  </g>
</svg>
`
writeFileSync(resolve(USCITA, 'favicon.svg'), favicon)
console.log('creato favicon.svg')
