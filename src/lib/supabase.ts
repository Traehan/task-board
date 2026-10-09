import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key)

// Only the public anon key is used here. Row Level Security in the database is
// what keeps each guest's data private, not this key.
export const supabase = createClient(url ?? 'http://localhost', key ?? 'missing')

let pending: Promise<void> | null = null

/**
 * Makes sure the visitor has a guest account. supabase-js keeps the session in
 * localStorage, so a returning visitor gets the same account (and tasks) back.
 * The shared promise stops two callers from creating two guests at once.
 */
export function ensureGuestSession(): Promise<void> {
  pending ??= (async () => {
    if (!isConfigured) throw new Error('Supabase keys are missing. Copy .env.example to .env.local and fill it in.')
    const { data } = await supabase.auth.getSession()
    if (data.session) return
    const { error } = await supabase.auth.signInAnonymously()
    if (error) throw new Error(error.message)
  })().catch((error) => {
    pending = null // let "Try again" start fresh
    throw error
  })
  return pending
}
