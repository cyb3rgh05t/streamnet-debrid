-- One row per cloud sync push: how big it was and whether it hit a revision conflict. Only for measuring how the
-- snapshot sync behaves (see scripts/sync-stats.js); old rows are removed by the server after 14 days.
create table if not exists sync_push_log (
  id bigserial primary key,
  account_id uuid not null references accounts(id) on delete cascade,
  outcome text not null check (outcome in ('accepted', 'conflict')),
  payload_bytes integer not null,
  created_at timestamptz not null default now()
);

create index if not exists sync_push_log_created_idx on sync_push_log (created_at desc);
