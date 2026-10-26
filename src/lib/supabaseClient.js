import { createClient } from '@supabase/supabase-js';

// Suporte para Vite (VITE_) e Next.js (NEXT_PUBLIC_)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://elwlmlxnurbdpcnkzxqq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Shk71IKblwuzmNEcKkbK8w_Ta0dISno';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.includes('.supabase.co') &&
  !supabaseAnonKey.includes('sua-chave')
);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
