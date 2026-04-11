import { AuthScaffold } from "@/components/auth/auth-scaffold";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <AuthScaffold
      title="Crear una cuenta"
      description="Alta rápida para probar el chat RAG y el panel administrativo."
      eyebrow="Registro"
    >
      <RegisterForm />
    </AuthScaffold>
  );
}
