-- Which device sent a push, and pushes that changed nothing ('unchanged', no new revision). Measurement only.
alter table sync_push_log add column if not exists source_device_id text;

alter table sync_push_log drop constraint if exists sync_push_log_outcome_check;
alter table sync_push_log
  add constraint sync_push_log_outcome_check check (outcome in ('accepted', 'conflict', 'unchanged'));
