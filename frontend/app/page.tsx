"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { WorkspaceLoader } from "@/components/workspace-loader";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) {
      return;
    }

    router.replace(user ? "/chat" : "/login");
  }, [loading, router, user]);

  return <WorkspaceLoader label="Preparando la consola..." />;
}

