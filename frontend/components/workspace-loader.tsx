export function WorkspaceLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="surface-highlight halo-ring animate-fade w-full max-w-md rounded-[2rem] px-8 py-10 text-center">
        <p className="section-kicker eyebrow-dot justify-center">Atlas RAG</p>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight">
          {label}
        </h1>
        <p className="text-muted mt-3 text-sm">
          Sincronizando sesion, fuentes y contexto operativo.
        </p>
      </div>
    </div>
  );
}

