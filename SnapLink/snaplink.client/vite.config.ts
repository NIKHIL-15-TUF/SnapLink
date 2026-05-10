import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://localhost:7175',
        changeOrigin: true,
        secure: false,
      },
      '/r': {
        target: 'https://localhost:7175',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
