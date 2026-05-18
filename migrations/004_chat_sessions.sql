create extension if not exists pgcrypto;

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Nueva conversacion',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  sequence integer not null,
  created_at timestamptz not null default now(),
  unique (session_id, sequence)
);

create index if not exists idx_chat_sessions_user_updated
  on chat_sessions (user_id, updated_at desc);

create index if not exists idx_chat_messages_session_sequence
  on chat_messages (session_id, sequence);

create index if not exists idx_chat_messages_user_session
  on chat_messages (user_id, session_id);

alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;

drop policy if exists "Users can select own chat sessions" on chat_sessions;
create policy "Users can select own chat sessions"
  on chat_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own chat sessions" on chat_sessions;
create policy "Users can insert own chat sessions"
  on chat_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own chat sessions" on chat_sessions;
create policy "Users can update own chat sessions"
  on chat_sessions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own chat sessions" on chat_sessions;
create policy "Users can delete own chat sessions"
  on chat_sessions for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can select own chat messages" on chat_messages;
create policy "Users can select own chat messages"
  on chat_messages for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own chat messages" on chat_messages;
create policy "Users can insert own chat messages"
  on chat_messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own chat messages" on chat_messages;
create policy "Users can delete own chat messages"
  on chat_messages for delete
  using (auth.uid() = user_id);

create or replace function update_chat_sessions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists chat_sessions_set_updated_at on chat_sessions;
create trigger chat_sessions_set_updated_at
  before update on chat_sessions
  for each row
  execute function update_chat_sessions_updated_at();
