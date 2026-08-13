import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/people/',
  plugins: [vue()],
  server: {
    host: '::',
    port: 5177,
    strictPort: true,
    allowedHosts: ['mm', 'pan5.xyz'],
    proxy: {
      '/api': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/people/p': { target: 'http://127.0.0.1:8080', changeOrigin: true },
      '/people/sitemap.xml': { target: 'http://127.0.0.1:8080', changeOrigin: true },
    },
  },
})
