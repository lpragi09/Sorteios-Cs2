import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente Supabase isomórfico (funciona no client e no server)
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}