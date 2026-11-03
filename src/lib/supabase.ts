import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wpoflstozrfgdumulaap.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indwb2Zsc3RvenJmZ2R1bXVsYWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MjkyMzQsImV4cCI6MjEwOTIwNTIzNH0.Z1VbzGwLqA4lYWiLG7SXJz6kHw19TE_hx1wW9IK7iaU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

