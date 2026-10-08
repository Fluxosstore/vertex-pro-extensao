create table if not exists public.vertex_agent_jobs (
  id uuid primary key,
  license_id uuid not null references public.licenses(id) on delete cascade,
  device_id text not null,
  project_key text not null,
  repo text not null,
  branch text not null,
  request_hash text not null,
  status text not null check (status in ('queued','running','ready','failed','cancelled')),
  stage text not null default 'queued',
  events jsonb not null default '[]'::jsonb,
  result jsonb,
  error_code text,
  error_message text,
  quota_charged boolean not null default false,
  daily_used integer,
  usage_day date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deadline_at timestamptz not null default (now() + interval '140 seconds'),
  expires_at timestamptz not null default (now() + interval '24 hours')
);
alter table public.vertex_agent_jobs enable row level security;
alter table public.vertex_agent_jobs force row level security;
revoke all on public.vertex_agent_jobs from public, anon, authenticated;
grant select, insert, update, delete on public.vertex_agent_jobs to service_role;
create index if not exists vertex_jobs_owner_idx on public.vertex_agent_jobs(license_id,device_id,created_at desc);
create index if not exists vertex_jobs_expiry_idx on public.vertex_agent_jobs(expires_at);
create unique index if not exists vertex_jobs_one_active_idx on public.vertex_agent_jobs(license_id,device_id)
  where status in ('queued','running');
comment on table public.vertex_agent_jobs is 'Server-only agent jobs. No API keys, prompts or attachment inputs are persisted. Results may contain proposed repository code; expire after 24h.';
