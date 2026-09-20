alter table account_sessions
  add column if not exists client_type text,
  add column if not exists device_type text,
  add column if not exists request_ip text,
  add column if not exists user_agent text;
