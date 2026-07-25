-- Backend EPG cache tables (Phase 1 scaffold)
-- Goal: serve pre-parsed guide windows from Postgres via edge function.

create table if not exists public.epg_source (
  source_key text primary key,
  kind text not null check (kind in ('xmltv', 'xtream')),
  owner_user uuid null references auth.users(id) on delete cascade,
  url text null,
  xtream_ref text null,
  wanted_channels jsonb not null default '[]'::jsonb,
  last_requested_at timestamptz not null default now(),
  fetched_at timestamptz null,
  expires_at timestamptz null,
  etag text null,
  last_modified text null,
  status text not null default 'pending' check (status in ('pending', 'ok', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_epg_source_refresh
  on public.epg_source (status, expires_at, last_requested_at);

create table if not exists public.epg_program (
  source_key text not null references public.epg_source(source_key) on delete cascade,
  epg_channel_id text not null,
  start_s bigint not null,
  end_s bigint not null,
  title text not null,
  descr text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (source_key, epg_channel_id, start_s, end_s, title)
);

create index if not exists idx_epg_program_window
  on public.epg_program (source_key, epg_channel_id, start_s, end_s);

alter table public.epg_source enable row level security;
alter table public.epg_program enable row level security;

drop policy if exists epg_source_select_visible on public.epg_source;
create policy epg_source_select_visible
  on public.epg_source
  for select
  to authenticated
  using (owner_user is null or owner_user = auth.uid());

drop policy if exists epg_source_insert_own on public.epg_source;
create policy epg_source_insert_own
  on public.epg_source
  for insert
  to authenticated
  with check (owner_user is null or owner_user = auth.uid());

drop policy if exists epg_source_update_own on public.epg_source;
create policy epg_source_update_own
  on public.epg_source
  for update
  to authenticated
  using (owner_user is null or owner_user = auth.uid())
  with check (owner_user is null or owner_user = auth.uid());

drop policy if exists epg_program_select_visible on public.epg_program;
create policy epg_program_select_visible
  on public.epg_program
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.epg_source s
      where s.source_key = epg_program.source_key
        and (s.owner_user is null or s.owner_user = auth.uid())
    )
  );

grant select, insert, update on public.epg_source to authenticated;
grant select on public.epg_program to authenticated;
