/**
 * Genera le icone di PrepEat a partire dall'immagine originale.
 *
 * La sorgente è `assets/icona-sorgente.jpg`: sta nel repository proprio perché
 * le icone siano rigenerabili in qualunque momento, senza dover ritrovare il
 * file altrove. È il disegno bianco della vaschetta su fondo nero pieno.
 *
 * Il fondo non si cambia con un parametro, perché il nero fa parte
 * dell'immagine e un JPEG non ha trasparenza. Si usa allora il disegno come
 * maschera: il chiaro diventa opaco, lo scuro diventa trasparente, e sotto ci
 * si mette il colore che si vuole. Così il fondo si cambia quando si vuole
 * senza rifare il disegno.
 *
 * I nomi portano un numero di versione. Sembra un dettaglio, ma non lo è:
 * iOS memorizza l'icona della schermata Home la prima volta e non la aggiorna
 * mai più, e il service worker conserva a sua volta i file già scaricati.
 * Cambiando nome si ottiene un indirizzo nuovo, che nessuna cache può avere.
 * Quando l'immagine cambia, si alza questo numero.
 */
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

export const VERSIONE_ICONE = 3

/** Corallo della palette dei menu: il rosso acceso. */
const FONDO = { r: 240, g: 72, b: 60, alpha: 1 }

const QUI = dirname(fileURLToPath(import.meta.url))
const SORGENTE = resolve(QUI, '..', 'assets', 'icona-sorgente.jpg')
const USCITA = resolve(QUI, '..', 'public', 'icons')

/**
 * icon-192 e icon-512 servono al manifest, apple-touch-icon alla schermata
 * Home dell'iPhone, favicon alla scheda del browser.
 */
const MISURE = [
  ['icon-192', 192],
  ['icon-512', 512],
  ['apple-touch-icon', 180],
  ['favicon', 64],
]

mkdirSync(USCITA, { recursive: true })

for (const [nome, size] of MISURE) {
  const file = `${nome}-v${VERSIONE_ICONE}.png`

  // La maschera: chiaro dove c'è il disegno, scuro dove c'è il fondo. Il
  // contrasto spinto serve a spegnere il pulviscolo che il JPEG lascia nel
  // nero, senza però indurire i bordi, che altrimenti verrebbero seghettati.
  const maschera = await sharp(SORGENTE)
    .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
    .greyscale()
    .linear(1.6, -40)
    .toColourspace('b-w')
    .png()
    .toBuffer()

  const disegno = await sharp({
    create: { width: size, height: size, channels: 3, background: '#ffffff' },
  })
    .joinChannel(maschera)
    .png()
    .toBuffer()

  await sharp({ create: { width: size, height: size, channels: 4, background: FONDO } })
    .composite([{ input: disegno }])
    .png({ compressionLevel: 9 })
    .toFile(resolve(USCITA, file))

  console.log(`creato ${file} (${size}px)`)
}
