import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;

// Quick health-check: returns { ok, error } without affecting app state
export async function testSupabaseConnection() {
  if (!supabase) return { ok: false, error: 'Supabase not configured (missing env vars)' };
  try {
    const { error } = await supabase
      .from('complaints')
      .select('id')
      .limit(1);
    if (error) return { ok: false, error: error.message || JSON.stringify(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
}
