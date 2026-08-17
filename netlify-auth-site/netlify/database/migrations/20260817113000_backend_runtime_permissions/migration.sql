DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'netlifydb_readonly') THEN
    GRANT USAGE ON SCHEMA public TO netlifydb_readonly;

    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
      public.arvio_accounts,
      public.account_sync_snapshots,
      public.account_sync_items,
      public.account_sync_delta_events,
      public.legacy_supabase_users,
      public.legacy_supabase_snapshots,
      public.legacy_supabase_rows,
      public.app_usage_daily,
      public.catalog_packs,
      public.submission_rate_limits,
      public.simkl_proxy_rate_limits
    TO netlifydb_readonly;

    GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO netlifydb_readonly;
  END IF;
END
$$;