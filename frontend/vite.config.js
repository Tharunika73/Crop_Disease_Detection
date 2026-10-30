import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/auth': 'http://localhost:8000',
      '/dashboard': 'http://localhost:8000',
      '/farms': 'http://localhost:8000',
      '/fields': 'http://localhost:8000',
      '/crops': 'http://localhost:8000',
      '/monitoring': 'http://localhost:8000',
      '/treatments': 'http://localhost:8000',
      '/reminders': 'http://localhost:8000',
      '/ai': 'http://localhost:8000',
      '/admin': 'http://localhost:8000',
      '/health': 'http://localhost:8000',
      '/uploads': 'http://localhost:8000'
    }
  }
})
