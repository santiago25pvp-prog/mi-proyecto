"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { WorkspaceLoader } from "@/components/workspace-loader";

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || user) {
      return;
    }

    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [loading, pathname, router, user]);

  if (loading || !user) {
    return <WorkspaceLoader label="Verificando acceso..." />;
  }

  return <>{children}</>;
}
