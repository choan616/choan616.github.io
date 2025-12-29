import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    plugins: [
      react(),
      VitePWA({
        // 개발 모드('serve')에서는 PWA 비활성화, 빌드 모드('build')에서만 활성화
        disable: command === 'serve', // Keep PWA disabled in dev mode to prevent caching issues
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'My Diary',
          short_name: 'My Diary',
          description: '내 소중한 일상을 기록하는 다이어리 앱',
          theme_color: '#3b82f6',
          background_color: '#ffffff',
          display: 'standalone',
          start_url: '/',
          icons: [
            {
              src: '/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png'
            },
            {
              src: '/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png'
            },
            {
              src: '/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable'
            }
          ],
          lang: 'ko-KR'
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/apis\.google\.com\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'google-api-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 // 1 day
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    server: {
      host: true
    },
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-ui': ['react-day-picker'],
            'vendor-db': ['dexie', 'dexie-react-hooks'],
            'vendor-utils': ['date-fns']
          }
        }
      }
    }
  }
})
