import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ghlkezzhtulbkdvstumj.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdobGtlenpodHVsYmtkdnN0dW1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4NjkyNjIsImV4cCI6MjA5MjQ0NTI2Mn0.Ho6N0_LPnOdcnDhiY36YaeJ8A4ro5cd68NmLfGVNKYM'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
