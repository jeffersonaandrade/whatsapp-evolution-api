import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL ou Anon Key não configurados');
}

/**
 * Cliente Supabase para uso no cliente (browser)
 */
export function createClientSupabase() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Cliente Supabase para uso no servidor (API Routes)
 * Usa service role key para bypass RLS quando necessário
 */
export function createServerSupabase() {
  if (!supabaseServiceRoleKey) {
    console.warn('Supabase Service Role Key não configurado. Usando Anon Key.');
    return createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Cliente Supabase com autenticação do usuário
 */
export async function createAuthenticatedSupabase() {
  const supabase = createClientSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error('Usuário não autenticado');
  }
  
  return supabase;
}

