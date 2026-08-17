ALTER TABLE public.account_sync_snapshots
  ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 1;
