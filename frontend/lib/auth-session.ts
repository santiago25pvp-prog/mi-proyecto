import type { Session, SupabaseClient } from "@supabase/supabase-js";

const EXPIRY_SKEW_MS = 30_000;

export function isSessionExpiringSoon(session: Session | null, skewMs = EXPIRY_SKEW_MS) {
  if (!session?.expires_at) {
    return false;
  }

  return session.expires_at * 1000 <= Date.now() + skewMs;
}

export async function resolveFreshSession(client: SupabaseClient) {
  const {
    data: { session },
  } = await client.auth.getSession();

  if (session && !isSessionExpiringSoon(session)) {
    return session;
  }

  const { data, error } = await client.auth.refreshSession();

  if (!error && data.session) {
    return data.session;
  }

  return session;
}
