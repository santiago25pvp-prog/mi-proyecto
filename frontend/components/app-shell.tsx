import type { ReactNode } from "react";
import { AppSidebar } from "@/components/app-sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[290px_minmax(0,1fr)]">
      <AppSidebar />
      <main
        id="workspace-main-content"
        className="min-w-0 px-4 pb-6 pt-2 lg:px-8 lg:pb-8 lg:pt-6"
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}
