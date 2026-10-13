import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 500000 // 500 KB limit to inline QRIS and SVGs directly into JS
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['**/*'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg,jpg,webp,woff,woff2,ttf}'],
        maximumFileSizeToCacheInBytes: 5000000 // 5 MB
      },
      devOptions: {
        enabled: true
      },
      manifest: {
        name: 'Sekawan Putri POS',
        short_name: 'Sekawan Putri',
        description: 'POS & Inventory Management for Sekawan Putri',
        theme_color: '#1a1a1a',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'https://cdn-icons-png.flaticon.com/512/5110/5110754.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
