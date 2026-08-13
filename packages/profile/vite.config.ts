import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/profile/',
  plugins: [vue()],
  server: {
    host: '::',
    port: 5176,
    strictPort: true,
    allowedHosts: ['pan5.xyz'],
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
})
