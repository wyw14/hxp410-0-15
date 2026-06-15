import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 41015,
    proxy: {
      '/api': {
        target: 'http://localhost:41115',
        changeOrigin: true
      }
    }
  }
})
