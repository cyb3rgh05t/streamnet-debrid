create extension if not exists pgcrypto;

create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null unique,
  password_hash text,
  password_hash_scheme text not null default 'none',
  legacy_supabase_user_id uuid unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists account_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  refresh_token_hash text not null unique,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists account_sessions_active_idx
  on account_sessions (account_id, expires_at) where revoked_at is null;

create table if not exists account_sync_snapshots (
  account_id uuid primary key references accounts(id) on delete cascade,
  payload jsonb not null,
  revision bigint not null default 0,
  payload_updated_at timestamptz,
  source text not null default 'self_hosted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists schema_migrations (
  version text primary key,
  applied_at timestamptz not null default now()
);