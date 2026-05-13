import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/chat/',
  plugins: [vue()],
  server: {
    host: '::',
    port: 5174,
    allowedHosts: ['pan5.xyz'],
  },
})
