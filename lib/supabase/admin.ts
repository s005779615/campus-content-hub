import { createClient } from "@supabase/supabase-js";
import { assertServiceRoleConfigured } from "@/lib/env";

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = assertServiceRoleConfigured();

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
