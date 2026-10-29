create table if not exists device_presence (
  account_id uuid not null references accounts(id) on delete cascade,
  install_id text not null,
  profile_id text,
  platform text not null,
  device_type text not null,
  app_version text,
  app_version_code integer,
  distribution text,
  last_seen timestamptz not null default now(),
  primary key (account_id, install_id)
);

create index if not exists device_presence_last_seen_idx on device_presence (last_seen desc);
