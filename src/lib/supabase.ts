import { createClient } from '@supabase/supabase-js'

const FALLBACK_SUPABASE_URL = 'https://bgmoqxppelmyexfjooot.supabase.co'
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_DYuYeuBB6eBxrHKXgqfIwA_5X2ILWyY'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || FALLBACK_SUPABASE_URL
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) || FALLBACK_SUPABASE_PUBLISHABLE_KEY

// 4Bit Studio has one online source of truth. Production never falls back to localStorage.
export const cloudEnabled = true
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
