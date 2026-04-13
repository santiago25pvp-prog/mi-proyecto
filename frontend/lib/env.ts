const LOCAL_API_FALLBACK = "http://localhost:3001";
const TEST_SUPABASE_URL_FALLBACK = "https://example.supabase.co";
const TEST_SUPABASE_ANON_KEY_FALLBACK = "fake-anon-key-for-tests";

type FrontendPublicEnv = {
  NODE_ENV?: string;
  NEXT_PUBLIC_API_URL?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

export function readFrontendPublicEnv(): FrontendPublicEnv {
  return {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

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

export function resolveApiUrl(env: FrontendPublicEnv) {
  const configured = getTrimmed(env.NEXT_PUBLIC_API_URL);

  if (configured) {
    return configured;
  }

  if (env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_API_URL is required in production");
  }

  return LOCAL_API_FALLBACK;
}

export function resolveSupabaseBrowserEnv(env: FrontendPublicEnv) {
  const configuredUrl = getTrimmed(env.NEXT_PUBLIC_SUPABASE_URL);
  const configuredAnonKey = getTrimmed(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (configuredUrl && configuredAnonKey) {
    return {
      url: configuredUrl,
      anonKey: configuredAnonKey,
    };
  }

  if (env.NODE_ENV === "test") {
    return {
      url: configuredUrl || TEST_SUPABASE_URL_FALLBACK,
      anonKey: configuredAnonKey || TEST_SUPABASE_ANON_KEY_FALLBACK,
    };
  }

  return {
    url: requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL", configuredUrl),
    anonKey: requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", configuredAnonKey),
  };
}
