"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveSupabaseBrowserEnv } from "@/lib/env";

let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, anonKey } = resolveSupabaseBrowserEnv();

    browserClient = createClient(
      url,
      anonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    );
  }

  return browserClient;
}
