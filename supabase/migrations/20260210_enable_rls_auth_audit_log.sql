-- Security hardening for exposed public table.
-- Fixes Supabase warning: "RLS Disabled in Public" on public.auth_audit_log.

do $$
begin
	if to_regclass('public.auth_audit_log') is not null then
		execute 'alter table public.auth_audit_log enable row level security';
		execute 'alter table public.auth_audit_log force row level security';

		-- Prevent client roles from reading/writing this table through PostgREST.
		execute 'revoke all on table public.auth_audit_log from anon';
		execute 'revoke all on table public.auth_audit_log from authenticated';
	end if;
end $$;
