---
name: rag-patterns
description: >
  Patrones específicos del sistema RAG: ingesta, embeddings, búsqueda vectorial y generación.
  Trigger: Al trabajar en los servicios de ingesta, embeddings, o motores de búsqueda RAG.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use
- Trabajar en scraper, splitter o servicios de embedding.
- Modificar el flujo de recuperación y generación con Gemini.

## Critical Patterns
- **Embedding**: Siempre convertir query/chunk a vector usando el modelo configurado.
- **Dimensionality**: Verificar siempre que los vectores coincidan con la columna `vector(3072)`.
- **Retrieval**: Usar `match_documents` RPC para búsqueda semántica.
- **Prompting**: Basar respuestas únicamente en el contexto recuperado.

## Code Examples
```typescript
// Búsqueda RAG
const { data: documents } = await supabase.rpc('match_documents', { ... });
```
