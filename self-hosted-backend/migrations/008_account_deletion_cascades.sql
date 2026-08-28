alter table tv_device_auth_sessions
  drop constraint if exists tv_device_auth_sessions_account_id_fkey,
  add constraint tv_device_auth_sessions_account_id_fkey
    foreign key (account_id) references accounts(id) on delete cascade;

alter table app_usage_events
  drop constraint if exists app_usage_events_account_id_fkey,
  add constraint app_usage_events_account_id_fkey
    foreign key (account_id) references accounts(id) on delete cascade;