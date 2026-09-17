create table if not exists app_usage_events (
  id bigint generated always as identity primary key,
  event_name text not null,
  install_id text,
  account_id uuid references accounts(id) on delete set null,
  email text,
  profile_id text,
  platform text,
  device_type text,
  app_version text,
  app_version_code integer,
  distribution text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_usage_events_created_at_idx
  on app_usage_events (created_at desc);

create index if not exists app_usage_events_event_name_idx
  on app_usage_events (event_name, created_at desc);
