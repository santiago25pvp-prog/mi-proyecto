"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await signUp(email, password);

      if (result.requiresEmailVerification) {
        toast.success("Registro creado. Revisa tu correo para confirmar.");
        router.replace("/login");
        return;
      }

      toast.success("Cuenta creada");
      router.replace("/chat");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo crear la cuenta";

      setError(message);
      toast.error(
        message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div className="space-y-2">
        <label className="text-sm text-white/70" htmlFor="email">
          Correo
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="tu@empresa.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-white/70" htmlFor="password">
          Contraseña
        </label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 6 caracteres"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={6}
          required
        />
      </div>

      <Button className="w-full" disabled={submitting} type="submit">
        {submitting ? "Creando..." : "Crear cuenta"}
      </Button>

      <p className="text-muted text-xs" role="status" aria-live="polite">
        {submitting ? "Creando cuenta..." : ""}
      </p>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <p className="text-muted text-sm">
        ¿Ya tienes acceso?{" "}
        <Link className="text-white hover:text-[var(--accent)]" href="/login">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
