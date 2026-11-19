-- Central catalog configuration edited in the admin (see src/catalog-config.js): title lists of the built-in
-- Marvel / DC / Star Wars franchises, franchises created by the admin, and list overrides. No row = use what the
-- app ships.
create table if not exists catalog_config (
  id text primary key,
  payload jsonb not null,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
