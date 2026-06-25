import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/PEDOMAN-LPPD-KAB-KOTA-2025/',
  plugins: [
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['data/ikk_details.json', 'data/intro_chapters.json', 'assets/logo-sultra.png'],
      manifest: {
        name: 'LPPD 2025 Sultra',
        short_name: 'LPPD Sultra',
        description: 'Pedoman Tim LPPD Kab/Kota Inspektorat Provinsi Sulawesi Tenggara',
        theme_color: '#e11d48',
        background_color: '#f8fafc',
        display: 'standalone'
      }
    })
  ]
})
