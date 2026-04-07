import { AuthGuard } from "@/components/auth/auth-guard";
import { AppShell } from "@/components/app-shell";
import { ChatShell } from "@/components/chat/chat-shell";

export default function ChatPage() {
  return (
    <AuthGuard>
      <AppShell>
        <ChatShell />
      </AppShell>
    </AuthGuard>
  );
}

