const assert = require("node:assert/strict");
const { mock, test } = require("node:test");

import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { isSessionExpiringSoon, resolveFreshSession } from "../lib/auth-session";

function makeSession(expiresAt: number, overrides: Partial<Session> = {}) {
  return {
    access_token: "access-token",
    expires_at: expiresAt,
    token_type: "bearer",
    user: { id: "user-1" },
    ...overrides,
  } as Session;
}

function withMockedNow<T>(now: number, fn: () => T): T {
  const originalNow = Date.now;
  Date.now = () => now;

  try {
    return fn();
  } finally {
    Date.now = originalNow;
  }
}

async function withMockedNowAsync<T>(now: number, fn: () => Promise<T> | T): Promise<T> {
  const originalNow = Date.now;
  Date.now = () => now;

  try {
    return await fn();
  } finally {
    Date.now = originalNow;
  }
}

test("isSessionExpiringSoon respects the expiry skew", () => {
  withMockedNow(1_000_000, () => {
    assert.equal(isSessionExpiringSoon(makeSession(1_030)), true);
    assert.equal(isSessionExpiringSoon(makeSession(2_000)), false);
    assert.equal(isSessionExpiringSoon(null), false);
  });
});

test("resolveFreshSession returns a fresh session without refreshing", async () => {
  const session = makeSession(2_000_000);
  const refreshSession = mock.fn(async () => {
    throw new Error("refreshSession should not be called");
  });

  const client = {
    auth: {
      getSession: async () => ({ data: { session }, error: null }),
      refreshSession,
    },
  } as unknown as SupabaseClient;

  await withMockedNowAsync(1_000_000, async () => {
    const resolved = await resolveFreshSession(client);
    assert.equal(resolved, session);
  });

  assert.equal(refreshSession.mock.callCount(), 0);
});

test("resolveFreshSession refreshes sessions that are near expiry", async () => {
  const staleSession = makeSession(1_020);
  const refreshedSession = makeSession(2_000_000, { access_token: "refreshed-token" });
  const refreshSession = mock.fn(async () => ({ data: { session: refreshedSession }, error: null }));

  const client = {
    auth: {
      getSession: async () => ({ data: { session: staleSession }, error: null }),
      refreshSession,
    },
  } as unknown as SupabaseClient;

  await withMockedNowAsync(1_000_000, async () => {
    const resolved = await resolveFreshSession(client);
    assert.equal(resolved, refreshedSession);
  });

  assert.equal(refreshSession.mock.callCount(), 1);
});

test("resolveFreshSession falls back to the session from getSession when refresh fails", async () => {
  const staleSession = makeSession(1_020);
  const client = {
    auth: {
      getSession: async () => ({ data: { session: staleSession }, error: null }),
      refreshSession: async () => ({
        data: { session: null },
        error: new Error("refresh failed"),
      }),
    },
  } as unknown as SupabaseClient;

  await withMockedNowAsync(1_000_000, async () => {
    const resolved = await resolveFreshSession(client);
    assert.equal(resolved, staleSession);
  });
});

test("resolveFreshSession returns null when no session can be recovered", async () => {
  const client = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      refreshSession: async () => ({
        data: { session: null },
        error: new Error("refresh failed"),
      }),
    },
  } as unknown as SupabaseClient;

  await withMockedNowAsync(1_000_000, async () => {
    const resolved = await resolveFreshSession(client);
    assert.equal(resolved, null);
  });
});
