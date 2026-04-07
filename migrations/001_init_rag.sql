-- Enable the pgvector extension to work with embeddings
create extension if not exists vector;

-- Create a table to store your documents
create table if not exists documents (
  id bigserial primary key,
  content text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  embedding vector(3072)
);
