-- ============================================
-- Sessions table
-- ============================================
create table sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'New Session',
  status text not null default 'active' check (status in ('active', 'ended', 'analyzed')),
  source_language text not null default 'en',
  target_language text not null default 'es-MX',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================
-- Messages table
-- ============================================
create table messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  original_audio_url text,
  language text check (language in ('en', 'es', 'mixed', null)),
  created_at timestamptz not null default now()
);

create index idx_messages_session_id on messages(session_id);
create index idx_messages_created_at on messages(created_at);

-- ============================================
-- Feedback table (post-session analysis)
-- ============================================
create table feedback (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  summary text not null,
  grammar_errors jsonb not null default '[]',
  vocabulary_suggestions jsonb not null default '[]',
  pronunciation_notes jsonb not null default '[]',
  proficiency_assessment text,
  score integer check (score >= 0 and score <= 100),
  created_at timestamptz not null default now(),
  unique(session_id)
);

-- ============================================
-- Auto-update updated_at trigger
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger sessions_updated_at
  before update on sessions
  for each row execute function update_updated_at();

-- ============================================
-- RLS Policies (single-user: open read, server writes)
-- ============================================
alter table sessions enable row level security;
alter table messages enable row level security;
alter table feedback enable row level security;

-- Frontend (anon key) can read everything
create policy "Public read" on sessions for select to anon using (true);
create policy "Public read" on messages for select to anon using (true);
create policy "Public read" on feedback for select to anon using (true);

-- Server (service_role key) bypasses RLS for writes

-- ============================================
-- Enable Realtime
-- ============================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table sessions;
