# mi-proyecto

`mi-proyecto` es un sistema RAG (Retrieval-Augmented Generation) para convertir contenido web en una base de conocimiento consultable. Resuelve el problema de tener documentacion, manuales o paginas dispersas en la web y necesitarlas como respuestas trazables dentro de una API y una interfaz web autenticada, con almacenamiento vectorial en Supabase y generacion de respuestas con Gemini.

## Caracteristicas principales

### Arquitectura RAG

- Ingesta una URL, limpia el HTML y extrae solo el texto util.
- Divide el contenido en chunks de 1000 caracteres con overlap de 200.
- Genera embeddings con `gemini-embedding-001` en dimension `3072`.
- Guarda contenido, metadatos y embeddings en Supabase con `pgvector`.
- Recupera documentos relevantes mediante la funcion SQL `match_documents`.
- Genera la respuesta final con `gemini-2.5-flash` usando el contexto recuperado.

### API unificada

- `POST /chat` y `POST /query` reciben `query` y devuelven el mismo formato JSON: `{ "answer": string, "sources": [] }`.
- `POST /ingest` expone el pipeline de carga de documentos y reporta inserciones exitosas y fallidas.
- Los endpoints administrativos permiten listar documentos, borrarlos y consultar estadisticas.

### Autenticacion y autorizacion

- La API usa JWT de Supabase en el header `Authorization: Bearer <token>`.
- `authMiddleware` valida el token contra Supabase antes de permitir acceso a rutas protegidas.
- `adminMiddleware` restringe `/admin/*` a usuarios con `app_metadata.role === "admin"`.
- El frontend usa Supabase Auth para login, registro y manejo de sesion.

### Tests

- El backend se valida con `node:test` en `tests/admin-auth.test.ts` y `tests/api-routes.test.ts`.
- Hay cobertura de autenticacion, autorizacion, rate limiting y respuestas de `/chat`, `/query` y `/ingest`.
- El workflow de GitHub Actions ejecuta tests y builds en PRs hacia `main` y `develop`.

## Instalacion

### 1. Seleccionar la version de Node

Este repo usa la version definida en `.nvmrc`.

```bash
nvm use
```

### 2. Configurar variables de entorno

Crea el archivo `.env` en la raiz del proyecto:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
GEMINI_API_KEY=tu_gemini_api_key
SUPABASE_ANON_KEY=tu_supabase_anon_key
PORT=3001
```

Notas:

- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` y `GEMINI_API_KEY` son necesarias para el backend.
- `SUPABASE_ANON_KEY` no aparece en `.env.example`, pero si es util para los scripts de autenticacion en `scripts/get-token.ts`.
- `PORT` es opcional; por defecto el backend escucha en `3001`.

Crea el archivo `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Instalar dependencias

Instala dependencias del backend en la raiz:

```bash
npm install
```

Instala dependencias del frontend:

```bash
cd frontend
npm install
```

### 4. Ejecutar el proyecto en local

Backend:

```bash
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Puertos por defecto:

- Backend: `http://localhost:3001`
- Frontend: `http://localhost:3000`

## Estructura del repositorio

```text
.
|-- controllers/
|-- middleware/
|-- migrations/
|-- routes/
|-- services/
|-- scripts/
|-- tests/
|-- frontend/
|-- server.ts
|-- package.json
|-- CHANGELOG.md
```

- `controllers/`
  Contiene los handlers HTTP del backend.
  - `rag.ts`: resuelve `/chat` y la funcion `ragQuery`.
  - `api.ts`: expone `/ingest` y `/query`.
  - `admin.ts`: expone operaciones administrativas sobre documentos y estadisticas.

- `services/`
  Implementa la logica de dominio del RAG y del panel administrativo.
  - `scraper.ts`: descarga y limpia HTML.
  - `splitter.ts`: parte el texto en chunks.
  - `embedding.ts`: crea embeddings con Gemini.
  - `retrieval.ts`: ejecuta la busqueda vectorial en Supabase.
  - `ingestion.ts`: orquesta scraping, splitting, embeddings e insercion.
  - `vector-db.ts`: crea el cliente de Supabase del backend.
  - `adminService.ts`: lista, borra y resume documentos.

- `migrations/`
  Contiene la definicion de la base vectorial.
  - `001_init_rag.sql`: crea la extension `vector` y la tabla `documents`.
  - `002_reconcile_document_embeddings.sql`: normaliza embeddings a `vector(3072)` y crea la funcion `match_documents`.

- `frontend/`
  Aplicacion Next.js que consume la API y Supabase Auth.
  - `app/`: paginas de `chat`, `admin`, `login` y `register`.
  - `components/`: UI, auth, chat, admin y providers.
  - `lib/backend.ts`: cliente fetch para la API del backend.
  - `lib/supabase-browser.ts`: cliente Supabase del browser.

- `middleware/`
  Middleware de autenticacion, autorizacion admin y rate limiting.

- `routes/`
  Router de Express para el area administrativa.

- `tests/`
  Suite de pruebas del backend con foco en auth, admin y contratos JSON.

- `scripts/`
  Utilidades de soporte para admin, auth y pruebas manuales del flujo RAG.

## Referencia de API

### Convenciones generales

- Base URL backend local: `http://localhost:3001`
- Content-Type esperado en requests con body: `application/json`
- Auth protegida: `Authorization: Bearer <jwt_de_supabase>`
- Respuestas de error de auth:

```json
{ "error": "Unauthorized: Missing or invalid token" }
```

```json
{ "error": "Unauthorized: Invalid token" }
```

- Respuesta de error admin:

```json
{ "error": "Forbidden: Admins only" }
```

- Los rate limits usan mensaje plano, no JSON:
  - Publico: `Demasiadas solicitudes, intenta de nuevo mas tarde.`
  - Autenticado: `Demasiadas solicitudes autenticadas, intenta de nuevo mas tarde.`

### GET /health

- Metodo: `GET`
- Auth: no requerida
- Query params: ninguno
- Body: ninguno
- Respuesta `200 OK`:

```json
{ "status": "ok" }
```

### POST /chat

- Metodo: `POST`
- Auth: requerida
- Body JSON:

```json
{ "query": "Que dice la guia?" }
```

- Parametros:
  - `query` (string, obligatorio): pregunta del usuario.
- Respuesta `200 OK`:

```json
{
  "answer": "Respuesta generada",
  "sources": [
    {
      "name": "Guia",
      "content": "Contexto uno"
    },
    {
      "name": "Manual",
      "content": "Contexto dos"
    }
  ]
}
```

- Respuesta `400 Bad Request`:

```json
{ "error": "Query is required" }
```

- Respuesta `500 Internal Server Error`:

```json
{ "error": "Internal Server Error" }
```

### POST /query

- Metodo: `POST`
- Auth: requerida
- Body JSON:

```json
{ "query": "consulta" }
```

- Parametros:
  - `query` (string, obligatorio): consulta que se resolvera con RAG.
- Respuesta `200 OK`:

```json
{
  "answer": "Respuesta consolidada",
  "sources": [
    {
      "name": "Manual",
      "content": "Contenido"
    }
  ]
}
```

- Respuesta `400 Bad Request`:

```json
{ "error": "Query is required" }
```

- Respuesta `500 Internal Server Error`:

```json
{ "error": "Failed to process query" }
```

### POST /ingest

- Metodo: `POST`
- Auth: requerida
- Body JSON:

```json
{ "url": "https://example.com/docs" }
```

- Parametros:
  - `url` (string, obligatorio): URL a scrapear e indexar.
- Respuesta `200 OK` cuando toda la ingesta sale bien:

```json
{
  "status": "success",
  "chunks_inserted": 2,
  "chunks_failed": 0
}
```

- Respuesta `200 OK` cuando hay inserciones parciales:

```json
{
  "status": "partial_success",
  "chunks_inserted": 1,
  "chunks_failed": 1
}
```

- Respuesta `400 Bad Request`:

```json
{ "error": "URL is required" }
```

- Respuesta `500 Internal Server Error`:

```json
{ "error": "Failed to ingest URL" }
```

### GET /admin/documents

- Metodo: `GET`
- Auth: requerida
- Rol admin: requerido
- Query params:
  - `page` (number, opcional, default `1`)
  - `pageSize` (number, opcional, default `10`)
- Body: ninguno
- Respuesta `200 OK`:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Manual de prueba",
      "content": "Contenido indexado",
      "created_at": "2026-04-07T00:00:00.000Z",
      "metadata": {
        "url": "https://example.com"
      }
    }
  ],
  "count": 1
}
```

- Respuesta `500 Internal Server Error`:

```json
{ "error": "Failed to list documents" }
```

### DELETE /admin/documents/:id

- Metodo: `DELETE`
- Auth: requerida
- Rol admin: requerido
- Path params:
  - `id` (number, obligatorio): identificador del documento en la tabla `documents`.
- Body: ninguno
- Respuesta `200 OK`:

```json
{ "message": "Document deleted successfully" }
```

- Respuesta `500 Internal Server Error`:

```json
{ "error": "Failed to delete document" }
```

### GET /admin/stats

- Metodo: `GET`
- Auth: requerida
- Rol admin: requerido
- Query params: ninguno
- Body: ninguno
- Respuesta `200 OK`:

```json
{
  "docCount": 42,
  "requestCount": 0
}
```

- Respuesta `500 Internal Server Error`:

```json
{ "error": "Failed to get stats" }
```

## Historial de cambios

El historial de versiones y releases del proyecto esta en [`CHANGELOG.md`](./CHANGELOG.md).
