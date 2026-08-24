create table if not exists discord_auth_sessions (
  device_code text primary key,
  client_id text not null,
  code_challenge text not null,
  status text not null default 'pending' check (status in ('pending', 'approved')),
  authorization_code text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists discord_auth_sessions_expiry_idx
  on discord_auth_sessions (expires_at);
