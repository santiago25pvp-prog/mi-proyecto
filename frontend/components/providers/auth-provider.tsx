"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { SignUpResult } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabase, setSupabase] = useState<SupabaseClient | null>(() =>
    typeof window !== "undefined" ? getSupabaseBrowserClient() : null,
  );
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (supabase || typeof window === "undefined") {
      return;
    }

    setSupabase(getSupabaseBrowserClient());
  }, [supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    let mounted = true;

    async function hydrateSession() {
      const {
        data: { session: nextSession },
      } = await client.auth.getSession();

      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    }

    hydrateSession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  function requireSupabase() {
    if (!supabase) {
      throw new Error("Supabase client is not ready yet");
    }

    return supabase;
  }

  async function signIn(email: string, password: string) {
    const { error } = await requireSupabase().auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await requireSupabase().auth.signUp({
      email,
      password,
    });

    if (error) {
      throw error;
    }

    return {
      requiresEmailVerification: !data.session,
    };
  }

  async function signOut() {
    const { error } = await requireSupabase().auth.signOut();

    if (error) {
      throw error;
    }
  }

  async function getAccessToken() {
    if (session?.access_token) {
      return session.access_token;
    }

    const {
      data: { session: nextSession },
    } = await requireSupabase().auth.getSession();

    return nextSession?.access_token ?? null;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAdmin: user?.app_metadata?.role === "admin",
        signIn,
        signUp,
        signOut,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
