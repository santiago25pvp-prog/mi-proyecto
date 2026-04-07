import { AdminGuard } from "@/components/auth/admin-guard";
import { AppShell } from "@/components/app-shell";
import { AdminShell } from "@/components/admin/admin-shell";

export default function AdminPage() {
  return (
    <AdminGuard>
      <AppShell>
        <AdminShell />
      </AppShell>
    </AdminGuard>
  );
}

