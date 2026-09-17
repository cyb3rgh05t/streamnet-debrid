update accounts
set password_hash_scheme = 'scrypt_v1'
where password_hash_scheme = 'netlify_scrypt';

alter table accounts
  drop column if exists legacy_supabase_user_id;