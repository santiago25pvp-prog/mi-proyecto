-- Hybrid retrieval v1: combine vector similarity and lexical FTS ranking.
-- Keep legacy `match_documents` untouched for backward compatibility.

alter table if exists public.documents
  add column if not exists fts tsvector generated always as (
    to_tsvector('english', coalesce(content, ''))
  ) stored;

create index if not exists documents_fts_idx on public.documents using gin (fts);

create or replace function public.match_documents_hybrid (
  query_text text,
  query_embedding vector(3072),
  match_threshold float,
  match_count int,
  vector_weight float default 0.7,
  fts_weight float default 0.3,
  rrf_k int default 50
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  with lexical as (
    select
      d.id,
      row_number() over (
        order by ts_rank_cd(d.fts, websearch_to_tsquery('english', query_text)) desc
      ) as rank_ix
    from public.documents d
    where d.fts @@ websearch_to_tsquery('english', query_text)
    limit least(match_count, 200) * 2
  ),
  semantic as (
    select
      d.id,
      row_number() over (order by d.embedding <=> query_embedding asc) as rank_ix
    from public.documents d
    where d.embedding is not null
      and 1 - (d.embedding <=> query_embedding) > match_threshold
    limit least(match_count, 200) * 2
  ),
  fused as (
    select
      coalesce(lexical.id, semantic.id) as id,
      (
        coalesce(1.0 / (rrf_k + lexical.rank_ix), 0.0) * greatest(fts_weight, 0) +
        coalesce(1.0 / (rrf_k + semantic.rank_ix), 0.0) * greatest(vector_weight, 0)
      ) as score
    from lexical
    full outer join semantic on lexical.id = semantic.id
  )
  select
    d.id,
    d.content,
    d.metadata,
    fused.score as similarity
  from fused
  join public.documents d on d.id = fused.id
  order by fused.score desc
  limit least(match_count, 200);
$$;
