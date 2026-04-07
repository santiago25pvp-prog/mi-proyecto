import { AuthScaffold } from "@/components/auth/auth-scaffold";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{
    next?: string | string[];
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextValue =
    typeof params.next === "string" && params.next.startsWith("/")
      ? params.next
      : "/chat";

  return (
    <AuthScaffold
      title="Entrar al workspace"
      description="Autenticacion con Supabase y acceso directo al backend Express."
      eyebrow="Acceso"
    >
      <LoginForm nextPath={nextValue} />
    </AuthScaffold>
  );
}
