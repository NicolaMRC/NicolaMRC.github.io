import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/apple-touch-icon-v2.png', 'icons/favicon-v2.png'],
      manifest: {
        name: 'PrepEat',
        short_name: 'PrepEat',
        description: 'Menu settimanali, lista della spesa e ricette del tuo piano alimentare',
        lang: 'it',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#fafaf9',
        theme_color: '#fafaf9',
        icons: [
          { src: 'icons/icon-192-v2.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512-v2.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-v2.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Il service worker aggiornato prende il controllo subito: senza
        // questo, la versione vecchia continuerebbe a servire i file finché
        // tutte le schede non vengono chiuse.
        clientsClaim: true,
        skipWaiting: true,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html'
      }
    })
  ],
  // Marca temporale della compilazione, mostrata in "Altro". Serve a capire
  // quale versione sta girando su un telefono: il service worker aggiorna
  // l'app da solo e senza questa non c'è modo di dirlo guardando lo schermo.
  // Il fuso è fissato di proposito: la compilazione che conta avviene sui
  // server di GitHub, che lavorano in UTC, e un orario indietro di due ore
  // farebbe sembrare vecchia una versione appena pubblicata.
  define: {
    __VERSIONE__: JSON.stringify(
      new Date().toLocaleString('it-IT', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'Europe/Rome',
      }),
    ),
  },
  server: { port: 5180 }
})
