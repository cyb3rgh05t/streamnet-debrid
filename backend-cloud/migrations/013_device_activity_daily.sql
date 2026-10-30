create table if not exists device_activity_daily (
  activity_date date not null,
  account_id uuid not null references accounts(id) on delete cascade,
  install_id text not null,
  primary key (activity_date, account_id, install_id)
);
