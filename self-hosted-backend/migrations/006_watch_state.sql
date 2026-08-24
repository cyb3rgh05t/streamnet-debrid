create table if not exists watch_state (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  state_type text not null,
  state_key text not null,
  profile_id text,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  unique (account_id, state_type, state_key)
);

create index if not exists watch_state_account_type_idx
  on watch_state (account_id, state_type, updated_at desc);