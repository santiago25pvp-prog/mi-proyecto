-- Preserve legacy schemas while converging on a canonical 3072-dimension
-- embedding column for gemini-embedding-001.
create extension if not exists vector;

alter table if exists public.documents
  add column if not exists created_at timestamptz not null default now();

do $$
declare
  embedding_type text;
  vector_type text;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'documents'
  ) then
    return;
  end if;

  select pg_catalog.format_type(a.atttypid, a.atttypmod)
    into embedding_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'documents'
    and a.attname = 'embedding'
    and a.attnum > 0
    and not a.attisdropped;

  select pg_catalog.format_type(a.atttypid, a.atttypmod)
    into vector_type
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = 'documents'
    and a.attname = 'vector'
    and a.attnum > 0
    and not a.attisdropped;

  if embedding_type = 'vector(768)' then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'documents'
        and column_name = 'embedding_legacy_768'
    ) then
      execute 'alter table public.documents rename column embedding to embedding_legacy_768';
      embedding_type := null;
    end if;
  end if;

  if vector_type = 'vector(3072)' and embedding_type is null then
    execute 'alter table public.documents rename column vector to embedding';
    embedding_type := 'vector(3072)';
  elsif embedding_type is null then
    execute 'alter table public.documents add column embedding vector(3072)';
    embedding_type := 'vector(3072)';
  elsif embedding_type <> 'vector(3072)' then
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'documents'
        and column_name = 'embedding_legacy'
    ) then
      execute 'alter table public.documents rename column embedding to embedding_legacy';
      execute 'alter table public.documents add column embedding vector(3072)';
      embedding_type := 'vector(3072)';
    end if;
  end if;
end $$;

create or replace function public.match_documents (
  query_embedding vector(3072),
  match_threshold float,
  match_count int
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
  select
    documents.id,
    documents.content,
    documents.metadata,
    1 - (documents.embedding <=> query_embedding) as similarity
  from public.documents
  where documents.embedding is not null
    and 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by documents.embedding <=> query_embedding asc
  limit least(match_count, 200);
$$;
