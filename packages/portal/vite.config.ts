import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '::',
    port: 666,
    strictPort: true,
    allowedHosts: ['pan5.xyz'],
    proxy: {
      '/lucky-draw': {
        target: 'http://127.0.0.1:5173',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
