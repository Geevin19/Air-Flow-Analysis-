import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  },
  define: {
    // Expose VITE_API_URL to the app at build time
    // Falls back to localhost:8000 for local dev
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost:8000'),
  }
})
