import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthScaffoldProps {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}

export function AuthScaffold({
  eyebrow,
  title,
  description,
  children,
}: AuthScaffoldProps) {
  return (
    <main className="min-h-screen px-4 py-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-white/8 bg-[rgba(8,14,15,0.72)] lg:grid-cols-[1.15fr_0.85fr]">
        <section className="surface-highlight relative flex flex-col justify-between px-6 py-8 lg:px-10 lg:py-10">
          <div>
            <p className="section-kicker eyebrow-dot">{eyebrow}</p>
            <h1 className="mt-6 max-w-xl text-5xl font-semibold tracking-tight lg:text-6xl">
              Atlas conecta sesiones, respuestas y fuentes en una sola consola.
            </h1>
            <p className="text-muted mt-6 max-w-lg text-base leading-7">
              El frontend nuevo conversa con el backend Express existente,
              reutiliza Supabase para autenticación y deja el foco en la
              operación diaria.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="surface-soft rounded-[1.75rem] p-5">
              <p className="section-kicker">01 / Chat</p>
              <p className="mt-3 text-lg font-medium text-white">
                Respuestas con contexto y panel de fuentes.
              </p>
            </div>
            <div className="surface-soft rounded-[1.75rem] p-5">
              <p className="section-kicker">02 / Admin</p>
              <p className="mt-3 text-lg font-medium text-white">
                Ingesta, estadísticas y limpieza de documentos.
              </p>
            </div>
          </div>
        </section>

        <section
          className="flex items-center justify-center px-4 py-8 lg:px-8"
          aria-labelledby="auth-card-title"
        >
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle id="auth-card-title">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {children}
              <div className="text-muted flex items-center justify-between text-sm">
                <span>Backend esperado en `http://localhost:3001`</span>
                <Link
                  className="inline-flex items-center gap-2 text-white transition-colors hover:text-[var(--accent)]"
                  href="/chat"
                >
                  Ir al chat
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}
