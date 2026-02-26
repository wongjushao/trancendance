import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: { usePolling: true },
    proxy: {
      '/api/auth': {
        target: 'http://auth-service:5001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/auth/, ''),
      },
      '/api/chat': {
        target: 'http://chat-service:5002',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/chat/, ''),
      },
      '/api/org': {
        target: 'http://org-service:5003',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/org/, ''),
      },
    },
  },
})
