import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kuqszuplazsdxnuljxzk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1cXN6dXBsYXpzZHhudWxqeHprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDQ4NjUsImV4cCI6MjA5NjA4MDg2NX0.U4MVLeEswzRUOcEDRWwYF-WOIok-IRZqDQZfLRRKq8w';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);