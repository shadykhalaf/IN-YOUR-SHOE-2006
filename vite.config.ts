/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'robots.txt', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'IYS Internet 2006 - Concept',
        short_name: 'IYS 2006 (concept)',
        description: 'Unofficial speculative concept by Omar Akram - today’s In Your Shoe catalogue inside a 2006-style computer. Not affiliated with In Your Shoe. No orders can be placed.',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#06478e',
        background_color: '#06478e',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + critical local assets only. The 1,000+ remote CDN product
        // photos and the catalogue detail shards are never precached.
        globPatterns: ['**/*.{js,css,html}', 'favicon.svg', 'icons/*.png', 'iys/brand/*', 'iys/os/*', 'iys/campaign/fw27-2.webp', 'iys/campaign/fw27-m1.webp'],
        globIgnores: ['**/catalogue/**', 'assets/Showcase-*'],
        maximumFileSizeToCacheInBytes: 1_500_000,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/iys\//, /^\/catalogue\//, /^\/assets\//, /^\/_vercel\//, /^\/api\//],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/catalogue/'), handler: 'NetworkFirst', options: { cacheName: 'iys-catalogue-shards', networkTimeoutSeconds: 4, expiration: { maxEntries: 40 } } },
          { urlPattern: ({ url }) => url.origin === self.location.origin && url.pathname.startsWith('/iys/'), handler: 'CacheFirst', options: { cacheName: 'iys-local-images', expiration: { maxEntries: 160 } } },
        ],
      },
    }),
  ],
  appType: 'spa',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 700,
  },
  test: {
    include: ['src/tests/**/*.test.ts'],
    environment: 'node',
  },
});
