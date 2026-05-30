import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Forward all /api/* calls to the FastAPI backend.
      // SSE streams are kept alive (no buffering) because we don't override
      // response handling and http-proxy passes chunks through by default.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: false,
      },
    },
  },
})
