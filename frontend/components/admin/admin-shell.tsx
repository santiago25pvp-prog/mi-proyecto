"use client";

import { RefreshCw, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import {
  deleteDocument,
  fetchAdminStats,
  fetchDocuments,
  getBackendErrorInfo,
  ingestDocument,
} from "@/lib/backend";
import type { AdminDocument, AdminStats } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AdminShell() {
  const { getAccessToken } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ingestUrlValue, setIngestUrlValue] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorRequestId, setErrorRequestId] = useState<string | null>(null);
  const [ingestError, setIngestError] = useState<string | null>(null);
  const [ingestErrorRequestId, setIngestErrorRequestId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteErrorRequestId, setDeleteErrorRequestId] = useState<string | null>(null);

  async function loadDashboard(showRefreshingState = false) {
    const token = await getAccessToken();

    if (!token) {
      throw new Error("No hay una sesión válida para consultar el panel.");
    }

    if (showRefreshingState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);
    setErrorRequestId(null);

    try {
      const [nextStats, nextDocuments] = await Promise.all([
        fetchAdminStats(token),
        fetchDocuments(token),
      ]);

      setStats(nextStats);
      setDocuments(nextDocuments.data || []);
      setCount(nextDocuments.count || 0);
    } catch (loadError) {
      const { message, requestId } = getBackendErrorInfo(
        loadError,
        "No se pudo cargar el panel administrativo.",
      );

      setError(message);
      setErrorRequestId(requestId);
      toast.error(requestId ? `${message} (Reference ID: ${requestId})` : message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function handleIngest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!ingestUrlValue.trim()) {
      return;
    }

    setIngesting(true);
    setIngestError(null);
    setIngestErrorRequestId(null);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error("No hay una sesión válida para iniciar la ingesta.");
      }

      const result = await ingestDocument(token, ingestUrlValue.trim());
      const message =
        result.status === "partial_success"
          ? `Ingesta parcial. ${result.chunks_inserted} chunks insertados, ${result.chunks_failed} fallaron.`
          : `Ingesta completada. ${result.chunks_inserted} chunks insertados.`;

      toast.success(message);
      setIngestUrlValue("");
      await loadDashboard(true);
    } catch (ingestError) {
      const { message, requestId } = getBackendErrorInfo(
        ingestError,
        "No se pudo ingerir la URL.",
      );

      setIngestError(message);
      setIngestErrorRequestId(requestId);
      toast.error(requestId ? `${message} (Reference ID: ${requestId})` : message);
    } finally {
      setIngesting(false);
    }
  }

  async function handleDelete(id: number) {
    setDeletingId(id);
    setDeleteError(null);
    setDeleteErrorRequestId(null);

    try {
      const token = await getAccessToken();

      if (!token) {
        throw new Error("No hay una sesión válida para eliminar documentos.");
      }

      await deleteDocument(token, id);
      toast.success("Documento eliminado");
      await loadDashboard(true);
    } catch (deleteError) {
      const { message, requestId } = getBackendErrorInfo(
        deleteError,
        "No se pudo eliminar el documento.",
      );

      setDeleteError(message);
      setDeleteErrorRequestId(requestId);
      toast.error(requestId ? `${message} (Reference ID: ${requestId})` : message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="surface-highlight halo-ring rounded-[2rem] px-6 py-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-kicker eyebrow-dot">Admin</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight lg:text-4xl">
              Controla ingesta, conteos y limpieza documental.
            </h2>
            <p className="text-muted mt-4 max-w-2xl text-sm leading-6">
              Este panel habla directamente con `/admin` y `/ingest` del backend
              Express protegido por token.
            </p>
          </div>
          <Button
            disabled={refreshing}
            onClick={() => void loadDashboard(true)}
            variant="secondary"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="surface-panel rounded-[2rem] px-5 py-5">
          <p className="section-kicker">Documentos</p>
          <p className="mt-4 text-4xl font-semibold text-white">
            {stats?.docCount ?? 0}
          </p>
          <p className="text-muted mt-2 text-sm">Registros disponibles para consulta.</p>
        </div>
        <div className="surface-panel rounded-[2rem] px-5 py-5">
          <p className="section-kicker">Consultas</p>
          <p className="mt-4 text-4xl font-semibold text-white">
            {stats?.requestCount ?? 0}
          </p>
          <p className="text-muted mt-2 text-sm">
            El backend aún reporta este conteo en cero.
          </p>
        </div>
        <div className="surface-panel rounded-[2rem] px-5 py-5">
          <p className="section-kicker">Protección</p>
          <div className="mt-4 flex items-center gap-3 text-white">
            <ShieldCheck className="h-8 w-8 text-[var(--success)]" />
            <div>
              <p className="font-medium">Ruta autenticada</p>
              <p className="text-muted text-sm">Bearer token via Supabase.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <div className="surface-panel rounded-[2rem] p-5">
          <p className="section-kicker eyebrow-dot">Nueva ingesta</p>
          <h3 className="mt-4 text-2xl font-semibold">Cargar una URL</h3>
          <p className="text-muted mt-3 text-sm leading-6">
            Envía una URL al scraper existente. Si el backend necesita ajuste de
            esquema vectorial, aquí lo verás reflejado.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleIngest}>
            <Input
              onChange={(event) => setIngestUrlValue(event.target.value)}
              placeholder="https://ejemplo.com/documento"
              type="url"
              value={ingestUrlValue}
            />
            <Button className="w-full" disabled={ingesting} type="submit">
              <UploadCloud className="h-4 w-4" />
              {ingesting ? "Ingeriendo..." : "Ingerir documento"}
            </Button>

            {ingestError ? (
              <div className="text-sm text-[var(--danger)]" role="alert">
                <p>{ingestError}</p>
                {ingestErrorRequestId ? (
                  <p className="mt-1 text-xs text-white/65">
                    Reference ID: {ingestErrorRequestId}
                  </p>
                ) : null}
              </div>
            ) : null}
          </form>
        </div>

        <div className="surface-panel rounded-[2rem] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-kicker eyebrow-dot">Inventario</p>
              <h3 className="mt-4 text-2xl font-semibold">Documentos actuales</h3>
              <p className="text-muted mt-3 text-sm leading-6">
                Vista rápida del índice que expone el backend administrativo.
              </p>
            </div>
            <Badge variant="default">{count} total</Badge>
          </div>

          <Separator className="my-5" />

          {loading ? (
            <div className="text-muted py-8 text-sm" role="status" aria-live="polite">
              Cargando documentos...
            </div>
          ) : error ? (
            <div className="py-8 text-sm text-[var(--danger)]" role="alert">
              <p>{error}</p>
              {errorRequestId ? (
                <p className="mt-1 text-xs text-white/65">Reference ID: {errorRequestId}</p>
              ) : null}
            </div>
          ) : documents.length === 0 ? (
            <div className="surface-soft rounded-[1.5rem] px-4 py-5 text-sm text-white/75">
              No hay documentos registrados todavía.
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="surface-soft animate-rise flex flex-col gap-4 rounded-[1.5rem] px-4 py-4 lg:flex-row lg:items-start lg:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {document.name}
                    </p>
                    <p className="text-muted mt-2 text-sm leading-6">
                      {document.content?.slice(0, 160) || "Sin extracto disponible"}
                      {document.content && document.content.length > 160 ? "..." : ""}
                    </p>
                    <p className="text-muted mt-3 text-xs">
                      {formatDate(document.created_at)}
                    </p>
                  </div>

                  <Button
                    disabled={deletingId === document.id}
                    onClick={() => void handleDelete(document.id)}
                    size="sm"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4" />
                    {deletingId === document.id ? "Eliminando..." : "Eliminar"}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {deleteError ? (
            <div className="mt-4 text-sm text-[var(--danger)]" role="alert">
              <p>{deleteError}</p>
              {deleteErrorRequestId ? (
                <p className="mt-1 text-xs text-white/65">
                  Reference ID: {deleteErrorRequestId}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
