const LOCAL_API_FALLBACK = "http://localhost:3001";

type FrontendPublicEnv = {
  NODE_ENV?: string;
  NEXT_PUBLIC_API_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

function getTrimmed(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "";
}

function requirePublicEnv(name: string, value: string | undefined) {
  const trimmed = getTrimmed(value);

  if (!trimmed) {
    throw new Error(`${name} is required`);
  }

  return trimmed;
}

export function resolveApiUrl(env: FrontendPublicEnv = process.env) {
  const configured = getTrimmed(env.NEXT_PUBLIC_API_URL);

  if (configured) {
    return configured;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL is required in production");
  }

  return LOCAL_API_FALLBACK;
}

export function resolveSupabaseBrowserEnv(env: FrontendPublicEnv = process.env) {
  return {
    url: requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL),
    anonKey: requirePublicEnv(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
  };
}
