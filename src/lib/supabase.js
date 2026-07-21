/**
 * ReviewFlow AI — Supabase Client
 * Shared singleton client for all frontend Supabase operations.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

function hasPlaceholderValue(value) {
  if (!value) return true
  const normalized = value.toLowerCase()
  return normalized.includes('replace-with-your') || normalized.includes('your-project') || normalized.includes('your-') || normalized.includes('example') || normalized.includes('changeme') || normalized.includes('demo')
}

console.log('SUPABASE_URL', import.meta.env.VITE_SUPABASE_URL)
console.log('SUPABASE_KEY_EXISTS', !!import.meta.env.VITE_SUPABASE_ANON_KEY)
if (typeof window !== 'undefined') {
  window.__SUPABASE_ENV = {
    url: import.meta.env.VITE_SUPABASE_URL,
    keyExists: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
    keyPresent: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'present' : 'missing',
  }
}

if (!supabaseUrl || !supabaseAnonKey || hasPlaceholderValue(supabaseUrl) || hasPlaceholderValue(supabaseAnonKey)) {
  const errorMessage = 'Invalid Supabase configuration. Set real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values before running the app.'
  console.error('[supabase] ' + errorMessage)
  throw new Error(errorMessage)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})
