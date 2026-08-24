UPDATE public.catalog_packs
SET author = 'StreamNet Team'
WHERE id IN (
  'c0a37e5e-5b12-4eb0-a5ea-9d84c1737e51',
  'c0a37e5e-5b12-4eb0-a5ea-9d84c1737e52'
)
AND author = 'ARVIO Team';

UPDATE public.catalog_packs
SET normalized_url = lower(rtrim('https://auth.mystreamnet.club' || url, '/'))
WHERE url LIKE '/%'
AND normalized_url = lower(rtrim('https://arvio.app' || url, '/'));