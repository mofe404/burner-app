import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const getSupabase = () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Supabase credentials missing in browser environment!");
  }
  return createClient(supabaseUrl, supabaseAnonKey);
};

export const supabase = typeof window !== 'undefined' && supabaseUrl ? createClient(supabaseUrl, supabaseAnonKey) : null;
