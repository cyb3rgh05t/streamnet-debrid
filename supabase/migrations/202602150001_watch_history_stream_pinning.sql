-- Add optional stream pinning fields to watch_history.
-- Used to resume playback from the same stream source when possible.

do $$
begin
  if to_regclass('public.watch_history') is not null then
    execute 'alter table public.watch_history add column if not exists stream_key text';
    execute 'alter table public.watch_history add column if not exists stream_addon_id text';
    execute 'alter table public.watch_history add column if not exists stream_title text';
    execute 'create index if not exists watch_history_stream_key_idx on public.watch_history (user_id, stream_key)';
  end if;
end $$;

