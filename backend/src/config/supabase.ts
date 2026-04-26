import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
// Service-role key bypasses RLS — required for backend writes (auth, credit ledger).
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

export const supabaseConfigured = !!(supabaseUrl && supabaseKey);

if (!supabaseConfigured) {
  console.warn('⚠️  Supabase not configured (set SUPABASE_URL + SUPABASE_SERVICE_KEY) — running in IN-MEMORY mode for auth + credits.');
}

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
      global: { headers: { 'x-application-name': 'haru-ai-teacher' } },
    })
  : null;
