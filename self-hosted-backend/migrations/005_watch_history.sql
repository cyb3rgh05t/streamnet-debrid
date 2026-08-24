create table if not exists watch_history (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  history_key text not null,
  profile_id text,
  media_type text not null,
  show_tmdb_id integer not null,
  season integer,
  episode integer,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, history_key)
);

create index if not exists watch_history_account_updated_idx
  on watch_history (account_id, updated_at desc);

create index if not exists watch_history_account_item_idx
  on watch_history (account_id, profile_id, media_type, show_tmdb_id, season, episode);