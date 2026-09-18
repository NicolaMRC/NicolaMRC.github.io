/**
 * Genera le icone di PrepEat a partire dall'immagine originale.
 *
 * La sorgente è `assets/icona-sorgente.jpg`: sta nel repository proprio perché
 * le icone siano rigenerabili in qualunque momento, senza dover ritrovare il
 * file altrove.
 *
 * L'immagine è già quadrata e con il margine giusto attorno al disegno,
 * quindi serve solo ridimensionarla.
 */
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const QUI = dirname(fileURLToPath(import.meta.url))
const SORGENTE = resolve(QUI, '..', 'assets', 'icona-sorgente.jpg')
const USCITA = resolve(QUI, '..', 'public', 'icons')

/**
 * icon-192 e icon-512 servono al manifest, apple-touch-icon alla schermata
 * Home dell'iPhone, favicon alla scheda del browser.
 */
const MISURE = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon.png', 64],
]

mkdirSync(USCITA, { recursive: true })

for (const [nome, size] of MISURE) {
  await sharp(SORGENTE)
    .resize(size, size, { fit: 'cover', kernel: 'lanczos3' })
    // Il fondo dell'icona è nero pieno: non c'è trasparenza da preservare.
    .flatten({ background: '#000000' })
    .png({ compressionLevel: 9 })
    .toFile(resolve(USCITA, nome))
  console.log(`creato ${nome} (${size}px)`)
}
