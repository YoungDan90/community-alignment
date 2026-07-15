import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service-role client for server-side operations that must bypass RLS
// (e.g. reading all push subscriptions for a broadcast). Never import
// this from client components — the service role key is server-only.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
