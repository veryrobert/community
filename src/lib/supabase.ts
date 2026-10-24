import { createClient } from '@supabase/supabase-js'

// The anon key is public by design; row level security in supabase/schema.sql decides what anyone can read or write
const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const configured = Boolean(url && key)
export const supabase = createClient(url || 'http://localhost', key || 'missing')
