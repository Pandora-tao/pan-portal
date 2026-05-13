import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/lucky-draw/',
  plugins: [vue()],
  server: {
    host: '::',
    port: 5173,
    allowedHosts: ['pan5.xyz'],
  },
})
