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
        // 일기를 쓰는 중에 페이지가 갈리면 작성 중인 글이 사라진다. 새 SW 는 사용자가
        // 업데이트 띠의 「새로고침」을 누를 때까지 대기시킨다 (src/App.jsx)
        registerType: 'prompt',
        includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
        manifest: {
          name: 'Mmtm: Your Daily Momentum',
          short_name: 'Momentum',
          description: 'Mmtm: Keep Your Momentum - 서버 없는 평생 일기장',
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
          // skipWaiting 을 안 켠다 — 새 SW 가 기다려야 업데이트 띠를 띄울 수 있다
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          // 이 SW 는 스코프 '/' 라 같은 계정의 다른 프로젝트 페이지까지 관할에 들어온다.
          // 그쪽 주소를 mmtm 의 index.html 로 갈아치우면 안 된다.
          // mmtm 은 라우터 없이 루트 한 페이지(Dropbox 로그인 복귀 ?code= 포함)만 쓰므로,
          // 프로젝트를 늘릴 때마다 막을 경로를 적는 대신 루트만 허용한다
          navigateFallbackAllowlist: [/^\/(index\.html)?(\?.*)?$/],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: []
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
