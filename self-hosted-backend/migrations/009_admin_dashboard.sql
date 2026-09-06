create table if not exists admin_accounts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_normalized text not null unique,
  password_hash text not null,
  password_hash_scheme text not null default 'scrypt_v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz,
  disabled_at timestamptz
);

create table if not exists admin_audit_logs (
  id uuid primary key,
  admin_id uuid not null references admin_accounts(id),
  account_id uuid references accounts(id) on delete set null,
  operation text not null,
  profile_id text,
  reason text not null,
  details jsonb not null default '{}'::jsonb,
  revision_before bigint not null,
  revision_after bigint not null,
  request_ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_logs_account_created_idx
  on admin_audit_logs (account_id, created_at desc);

create index if not exists admin_audit_logs_admin_created_idx
  on admin_audit_logs (admin_id, created_at desc);
