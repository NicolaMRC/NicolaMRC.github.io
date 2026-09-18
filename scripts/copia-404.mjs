/**
 * GitHub Pages non conosce le rotte dell'app: aprendo direttamente un
 * indirizzo come /settimana cercherebbe un file che non esiste e risponderebbe
 * con la pagina di errore.
 *
 * Servendo la stessa pagina anche come 404.html, il browser carica comunque
 * l'app, che legge l'indirizzo e mostra la schermata giusta.
 */
import { copyFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'))
// Senza questo file GitHub Pages ignorerebbe le cartelle che iniziano con "_".
writeFileSync(resolve(dist, '.nojekyll'), '')
console.log('creati 404.html e .nojekyll')
