"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { WorkspaceLoader } from "@/components/workspace-loader";

export function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, loading, isAdmin } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace("/login?next=%2Fadmin");
      return;
    }

    if (!isAdmin) {
      toast.error("Esta vista requiere rol de administrador");
      router.replace("/chat");
    }
  }, [isAdmin, loading, router, user]);

  if (loading || !user || !isAdmin) {
    return <WorkspaceLoader label="Validando permisos..." />;
  }

  return <>{children}</>;
}
