"use client";

import { Bot, CornerDownLeft, FileText, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent, type KeyboardEvent } from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { sendChatMessage } from "@/lib/backend";
import {
  getChatStorageKey,
  loadPersistedChatStateWithKey,
  savePersistedChatStateWithKey,
} from "@/lib/chat-storage";
import { removeMessageById } from "@/lib/chat-messages";
import type { ChatMessage } from "@/lib/types";
import { cn } from "@/lib/utils";

const starterPrompts = [
  "Resume los documentos cargados con foco en riesgos y decisiones.",
  "Encuentra la información más relevante para explicar este tema a un cliente.",
  "Extrae los puntos clave y cita las fuentes disponibles.",
];

export function ChatShell() {
  const { getAccessToken, user } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const storageKey = getChatStorageKey(user?.id);

  useEffect(() => {
    const storedState = loadPersistedChatStateWithKey(window.localStorage, storageKey);

    if (storedState) {
      setMessages(storedState.messages);
      setActiveMessageId(storedState.activeMessageId);
    }

    setHydrated(true);
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    savePersistedChatStateWithKey(window.localStorage, {
      messages,
      activeMessageId,
    }, storageKey);
  }, [activeMessageId, hydrated, messages, storageKey]);

  useEffect(() => {
    if (activeMessageId) {
      return;
    }

    const lastAssistantMessage = [...messages]
      .reverse()
      .find((message) => message.role === "assistant");

    if (lastAssistantMessage) {
      setActiveMessageId(lastAssistantMessage.id);
    }
  }, [activeMessageId, messages]);

  const activeSources =
    messages.find((message) => message.id === activeMessageId)?.sources || [];

  async function submitPrompt(nextPrompt?: string) {
    const prompt = (nextPrompt || input).trim();

    if (!prompt || pending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError(null);
    setPending(true);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
      }

      const response = await sendChatMessage(token, prompt);
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response.answer,
        sources: response.sources,
      };

      setMessages((current) => [...current, assistantMessage]);
      setActiveMessageId(assistantMessage.id);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "No se pudo completar la consulta.";

      setMessages((current) => removeMessageById(current, userMessage.id));
      setInput(prompt);
      setError(message);
      toast.error(message);
    } finally {
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitPrompt();
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitPrompt();
    }
  }

  const statusMessage = !hydrated
    ? "Restaurando conversación..."
    : pending
      ? "Consultando contexto y preparando respuesta..."
      : error
        ? `Error: ${error}`
        : "Listo para enviar una nueva pregunta.";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.75fr)_360px]">
      <section className="space-y-4">
        <div className="surface-highlight halo-ring rounded-[2rem] px-6 py-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker eyebrow-dot">Chat operativo</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight lg:text-4xl">
                Conversa con el backend existente sin capas intermedias.
              </h2>
              <p className="text-muted mt-4 max-w-2xl text-sm leading-6">
                El token de Supabase viaja directo a Express, y cada respuesta
                deja sus fuentes disponibles en el inspector lateral.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="success">Sesión activa</Badge>
              <Badge variant="accent">{user?.email || "usuario"}</Badge>
            </div>
          </div>
        </div>

        <div className="surface-panel flex min-h-[540px] flex-col rounded-[2rem] p-4 lg:p-5">
          <p className="sr-only" aria-live="polite" role="status">
            {statusMessage}
          </p>

          <div className="flex items-center justify-between gap-4 px-2 pb-4">
            <div>
              <p className="text-sm font-medium text-white">Transcript</p>
              <p className="text-muted mt-1 text-xs">
                Selecciona una respuesta para inspeccionar sus fuentes.
              </p>
            </div>
            <Badge variant="default">
              {messages.length} mensaje{messages.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-2 pb-4">
            {!hydrated ? (
              <div
                className="flex h-full items-center justify-center rounded-[1.75rem] border border-white/8 bg-white/[0.02] px-5 py-6 text-sm text-white/60"
                role="status"
                aria-live="polite"
              >
                Restaurando conversación...
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full flex-col justify-between gap-6 rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.02] px-5 py-6">
                <div>
                  <div className="inline-flex rounded-full bg-[rgba(240,179,106,0.12)] p-3 text-[var(--accent)]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-2xl font-medium text-white">
                    Arranca con una pregunta concreta.
                  </h3>
                  <p className="text-muted mt-3 max-w-xl text-sm leading-6">
                    Este workspace prioriza claridad operativa: pregunta,
                    recibe una respuesta y revisa las fuentes sin salir del
                    mismo flujo.
                  </p>
                </div>

                <div className="grid gap-3">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      className="surface-soft rounded-[1.5rem] px-4 py-4 text-left text-sm text-white/80 transition-colors hover:border-[var(--accent)] hover:text-white"
                      onClick={() => void submitPrompt(prompt)}
                      type="button"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => {
                const selectable = message.role === "assistant";
                const selected = activeMessageId === message.id;

                return (
                  <button
                    key={message.id}
                    aria-pressed={selectable ? selected : undefined}
                    aria-label={
                      selectable
                        ? selected
                          ? "Respuesta del asistente seleccionada"
                          : "Seleccionar respuesta del asistente"
                        : undefined
                    }
                    className={cn(
                      "animate-rise block w-full rounded-[1.75rem] border px-4 py-4 text-left transition-colors",
                      message.role === "user"
                        ? "ml-auto max-w-[82%] border-transparent bg-[rgba(240,179,106,0.14)] text-white"
                        : "max-w-[88%] border-white/8 bg-white/[0.03] text-white/90 hover:border-white/15",
                      selectable && selected
                        ? "border-[var(--accent)] bg-white/[0.05]"
                        : "",
                    )}
                    disabled={!selectable}
                    onClick={() => selectable && setActiveMessageId(message.id)}
                    type="button"
                  >
                    <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/45">
                      {message.role === "user" ? "Operador" : "Asistente"}
                    </div>
                    {message.role === "assistant" ? (
                      <div className="max-w-none text-sm leading-7 [&_ol]:ml-5 [&_ol]:list-decimal [&_p]:mb-4 [&_strong]:font-semibold [&_strong]:text-white [&_ul]:ml-5 [&_ul]:list-disc">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap text-sm leading-7">
                        {message.content}
                      </p>
                    )}
                  </button>
                );
              })
            )}

            {pending ? (
              <div
                className="animate-fade max-w-[88%] rounded-[1.75rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-white/70"
                role="status"
                aria-live="polite"
              >
                <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-white/45">
                  <Bot className="h-3.5 w-3.5" />
                  Asistente
                </div>
                Consultando contexto y preparando respuesta...
              </div>
            ) : null}
          </div>

          <Separator className="mb-4 mt-1" />

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Textarea
              maxLength={3000}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleComposerKeyDown}
              placeholder="Escribe una pregunta para el backend RAG..."
              value={input}
            />

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <p className="text-muted flex items-center gap-2 text-xs">
                <CornerDownLeft className="h-3.5 w-3.5" />
                Usa Enter para enviar y Shift + Enter para una nueva línea.
              </p>
              <Button disabled={pending || !input.trim()} type="submit">
                {pending ? "Consultando..." : "Enviar pregunta"}
              </Button>
            </div>
          </form>

          {error ? (
            <p className="mt-4 text-sm text-[var(--danger)]" role="alert">
              {error}
            </p>
          ) : null}

          {error ? (
            <Button
              className="mt-3"
              disabled={pending || !input.trim()}
              onClick={() => void submitPrompt()}
              type="button"
              variant="secondary"
            >
              Reintentar con el mismo borrador
            </Button>
          ) : null}
        </div>
      </section>

      <aside className="surface-panel rounded-[2rem] p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="section-kicker eyebrow-dot">Inspector</p>
            <h3 className="mt-4 text-2xl font-semibold">Fuentes</h3>
          </div>
          <Badge variant="default">
            {activeSources.length} resultado{activeSources.length === 1 ? "" : "s"}
          </Badge>
        </div>

        <p className="text-muted mt-4 text-sm leading-6">
          Cada respuesta puede abrir su rastro documental para validar contexto
          sin salir del flujo.
        </p>

        <div className="mt-6 space-y-4">
          {activeSources.length === 0 ? (
            <div className="surface-soft rounded-[1.75rem] px-4 py-5">
              <p className="text-sm text-white/75">
                Aún no hay fuentes seleccionadas. Envía una pregunta o toca una
                respuesta del asistente.
              </p>
            </div>
          ) : (
            activeSources.map((source, index) => (
              <div
                key={`${source.name}-${index}`}
                className="surface-soft animate-rise rounded-[1.5rem] px-4 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 rounded-full bg-[rgba(240,179,106,0.12)] p-2 text-[var(--accent)]">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {source.name}
                    </p>
                    <p className="text-muted mt-2 text-sm leading-6">
                      {source.content.slice(0, 260)}
                      {source.content.length > 260 ? "..." : ""}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}
