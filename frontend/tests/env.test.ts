const assert = require("node:assert/strict");
const { test } = require("node:test");

import { resolveApiUrl, resolveSupabaseBrowserEnv } from "../lib/env";

test("resolveApiUrl uses configured NEXT_PUBLIC_API_URL when present", () => {
  assert.equal(
    resolveApiUrl({ NEXT_PUBLIC_API_URL: "https://api.example.com" }),
    "https://api.example.com",
  );
});

test("resolveApiUrl falls back to localhost in non-production when unset", () => {
  assert.equal(resolveApiUrl({ NODE_ENV: "development" }), "http://localhost:3001");
});

test("resolveApiUrl throws in production when NEXT_PUBLIC_API_URL is missing", () => {
  assert.throws(
    () => resolveApiUrl({ NODE_ENV: "production", NEXT_PUBLIC_API_URL: "" }),
    /NEXT_PUBLIC_API_URL is required in production/,
  );
});

test("resolveSupabaseBrowserEnv returns required public supabase config", () => {
  assert.deepEqual(
    resolveSupabaseBrowserEnv({
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    }),
    {
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    },
  );
});

test("resolveSupabaseBrowserEnv throws when url is missing", () => {
  assert.throws(
    () =>
      resolveSupabaseBrowserEnv({
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    /NEXT_PUBLIC_SUPABASE_URL is required/,
  );
});

test("resolveSupabaseBrowserEnv throws when anon key is missing", () => {
  assert.throws(
    () =>
      resolveSupabaseBrowserEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "",
      }),
    /NEXT_PUBLIC_SUPABASE_ANON_KEY is required/,
  );
});
