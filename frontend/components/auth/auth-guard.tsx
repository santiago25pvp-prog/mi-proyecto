"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { WorkspaceLoader } from "@/components/workspace-loader";

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();
  const isRedirecting = !loading && !user;

  useEffect(() => {
    if (loading || user) {
      return;
    }

    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [loading, pathname, router, user]);

  if (loading) {
    return <WorkspaceLoader label="Verificando acceso..." />;
  }

  if (isRedirecting) {
    return (
      <WorkspaceLoader
        label="Redirigiendo al inicio de sesión..."
        hint="No hay una sesión activa para esta vista protegida."
      />
    );
  }

  return <>{children}</>;
}
