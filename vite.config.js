import fs from 'fs'
import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function loadEnvFiles(mode) {
  const env = loadEnv(mode, process.cwd(), '')
  const files = ['.env', 'frontend.env']

  for (const file of files) {
    const filePath = path.resolve(process.cwd(), file)
    if (!fs.existsSync(filePath)) continue

    const contents = fs.readFileSync(filePath, 'utf8')
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const separatorIndex = trimmed.indexOf('=')
      if (separatorIndex === -1) continue

      const key = trimmed.slice(0, separatorIndex).trim()
      const rawValue = trimmed.slice(separatorIndex + 1).trim()
      const value = rawValue.replace(/^['"]|['"]$/g, '')

      if (key.startsWith('VITE_')) {
        env[key] = value
      }
    }
  }

  return env
}

export default defineConfig(({ mode }) => {
  const env = loadEnvFiles(mode)

  return {
    plugins: [react()],
    define: {
      'process.env': {
        SUPABASE_URL: env.SUPABASE_URL || '',
        SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY || '',
      }
    },
  }
})
