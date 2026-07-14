/**
 * ReviewFlow AI — Supabase Client
 * Shared singleton client for all frontend Supabase operations.
 */
import { createClient } from '@supabase/supabase-js'

// Vite exposes these via vite.config.js define.process.env
const supabaseUrl = process.env.SUPABASE_URL
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY. ' +
    'Check your .env file and vite.config.js define block.'
  )
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
)
