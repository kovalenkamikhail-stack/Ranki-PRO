import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        // Keep the sql.js wasm URL stable so cached shells do not chase a missing hashed asset.
        assetFileNames: (assetInfo) => {
          const assetNames = [assetInfo.name, ...(assetInfo.names ?? [])].filter(
            (name): name is string => Boolean(name),
          )

          return assetNames.some((name) =>
            /^sql-wasm(?:-browser)?\.wasm$/i.test(name),
          )
            ? 'assets/[name][extname]'
            : 'assets/[name]-[hash][extname]'
        },
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Ranki',
        short_name: 'Ranki',
        description:
          'Offline-first flashcards for calm daily review on desktop and iPhone.',
        theme_color: '#13231f',
        background_color: '#13231f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/ranki-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/ranki-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/ranki-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,wasm}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
