import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '::',
    port: 80,
    strictPort: true,
    allowedHosts: ['pan5.xyz'],
  },
})
