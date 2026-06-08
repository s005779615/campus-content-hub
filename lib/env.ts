export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  };
}

export function isSupabaseConfigured() {
  const env = getSupabaseEnv();
  return Boolean(env.url && env.anonKey);
}

export function assertSupabaseConfigured() {
  const env = getSupabaseEnv();

  if (!env.url || !env.anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }

  return {
    url: env.url,
    anonKey: env.anonKey,
    serviceRoleKey: env.serviceRoleKey
  };
}

export function assertServiceRoleConfigured() {
  const env = assertSupabaseConfigured();

  if (!env.serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
  }

  return {
    url: env.url,
    serviceRoleKey: env.serviceRoleKey
  };
}
