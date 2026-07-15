import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load ALL env variables (including non-VITE_ prefixed ones) for the define block
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    // Expose VITE_-prefixed vars automatically via import.meta.env (Vite native)
    // Plus expose process.env.SUPABASE_* for the legacy supabase.js pattern
    define: {
      'process.env': {
        SUPABASE_URL: env.SUPABASE_URL,
        SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
      }
    },
    // Make VITE_BACKEND_URL available — falls back to localhost:8000 in dev
    // The env file should have: VITE_BACKEND_URL=http://localhost:8000
    // When running in dev without VITE_BACKEND_URL set, the fallback in ai.js / QRManagement handles it.
  }
})
