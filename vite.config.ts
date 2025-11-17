import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,ico}'],
        cleanupOutdatedCaches: true,
      },
      manifest: {
        short_name: "Vocab Builder",
        name: "AI Vocab Builder",
        icons: [
          {
            "src": "icon.svg",
            "type": "image/svg+xml",
            "sizes": "192x192 512x512"
          }
        ],
        start_url: ".",
        display: "standalone",
        theme_color: "#111827",
        background_color: "#111827"
      }
    })
  ],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY)
  }
})
