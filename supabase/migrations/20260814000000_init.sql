-- AGENT DECK — 初期スキーマ
-- projects → departments → agents の3階層。agents に紐づく activity_logs と、
-- Conductor のチャット入力を受ける conductor_requests を持つ。

create extension if not exists pgcrypto;

do $$
begin
  create type agent_status as enum ('online', 'idle', 'offline');
exception
  when duplicate_object then null;
end
$$;

-- ---------------------------------------------------------------- projects
create table if not exists public.projects (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  label            text not null,
  eyebrow          text not null default 'Command Deck',
  title            text not null,
  subtitle         text not null default '',
  conductor_sub    text not null default 'Orchestration Core',
  chat_placeholder text not null default 'Conductorにタスクを依頼する…',
  position         integer not null default 0,
  created_at       timestamptz not null default now()
);

-- ------------------------------------------------------------ departments
create table if not exists public.departments (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  key        text not null check (key in ('growth', 'tech', 'finance', 'support')),
  name       text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  unique (project_id, key)
);

create index if not exists departments_project_idx
  on public.departments (project_id, position);

-- ----------------------------------------------------------------- agents
create table if not exists public.agents (
  id            uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments (id) on delete cascade,
  name          text not null,
  tag           text not null default '',
  tools         text[] not null default '{}',
  status        agent_status not null default 'online',
  tasks_today   integer not null default 0 check (tasks_today >= 0),
  uptime        numeric(4, 1) not null default 99.0 check (uptime >= 0 and uptime <= 100),
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (department_id, name)
);

create index if not exists agents_department_idx
  on public.agents (department_id, position);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists agents_touch_updated_at on public.agents;
create trigger agents_touch_updated_at
  before update on public.agents
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------- activity_logs
create table if not exists public.activity_logs (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references public.agents (id) on delete cascade,
  message    text not null check (char_length(message) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_agent_idx
  on public.activity_logs (agent_id, created_at desc);

-- ----------------------------------------------------- conductor_requests
-- Conductor の入力欄から投げられた依頼のキュー。実行ワーカーは別途。
create table if not exists public.conductor_requests (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  message    text not null check (char_length(btrim(message)) between 1 and 2000),
  status     text not null default 'queued'
             check (status in ('queued', 'running', 'done', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists conductor_requests_project_idx
  on public.conductor_requests (project_id, created_at desc);

-- -------------------------------------------------------------------- RLS
alter table public.projects           enable row level security;
alter table public.departments        enable row level security;
alter table public.agents             enable row level security;
alter table public.activity_logs      enable row level security;
alter table public.conductor_requests enable row level security;

-- ダッシュボードは読み取り専用の公開ビューとして扱う。
-- 認証を入れる場合は projects に owner_id を足し、この using (true) を
-- (auth.uid() = owner_id) 相当の条件に差し替える。
drop policy if exists "projects are readable" on public.projects;
create policy "projects are readable"
  on public.projects for select to anon, authenticated using (true);

drop policy if exists "departments are readable" on public.departments;
create policy "departments are readable"
  on public.departments for select to anon, authenticated using (true);

drop policy if exists "agents are readable" on public.agents;
create policy "agents are readable"
  on public.agents for select to anon, authenticated using (true);

drop policy if exists "activity logs are readable" on public.activity_logs;
create policy "activity logs are readable"
  on public.activity_logs for select to anon, authenticated using (true);

-- 依頼は投函のみ許可（読み出しはサービスロール経由のワーカーだけ）。
drop policy if exists "anyone can queue a conductor request" on public.conductor_requests;
create policy "anyone can queue a conductor request"
  on public.conductor_requests for insert to anon, authenticated with check (true);

-- Supabase では public スキーマの新規テーブルに default privileges が効くが、
-- 自前の Postgres に流したときのために明示しておく。
grant usage on schema public to anon, authenticated;
grant select on public.projects, public.departments, public.agents, public.activity_logs
  to anon, authenticated;
grant insert on public.conductor_requests to anon, authenticated;

-- --------------------------------------------------------------- realtime
-- エージェントの状態変化を LIVE 表示に反映させる。
do $$
begin
  alter publication supabase_realtime add table public.agents;
exception
  when duplicate_object then null;
  when undefined_object then null;
end
$$;
