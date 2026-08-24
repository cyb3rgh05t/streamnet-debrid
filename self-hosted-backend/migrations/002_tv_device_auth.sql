create table if not exists tv_device_auth_sessions (
  device_code text primary key,
  user_code text not null unique,
  status text not null default 'pending' check (status in ('pending', 'approved', 'consumed', 'expired')),
  account_id uuid references accounts(id) on delete set null,
  user_email text,
  access_token text,
  refresh_token text,
  expires_at timestamptz not null,
  approved_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tv_device_auth_sessions_expiry_idx
  on tv_device_auth_sessions (expires_at);