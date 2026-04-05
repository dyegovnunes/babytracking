import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = 'https://kgfjfdizxziacblgvplh.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZmpmZGl6eHppYWNibGd2cGxoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMDEzMTAsImV4cCI6MjA5MDg3NzMxMH0.Qo5SJpaYpQx7NtmngxK6CWusKfPmYdEJYu7hVQC4dhU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
