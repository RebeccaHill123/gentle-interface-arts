
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any prior schedule under this name so this migration is idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge-unpaid-accounts') THEN
    PERFORM cron.unschedule('purge-unpaid-accounts');
  END IF;
END $$;

SELECT cron.schedule(
  'purge-unpaid-accounts',
  '0 */6 * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--c0d0fdd1-6a49-47d4-acb7-092208251a0f.lovable.app/api/public/cron/purge-unpaid',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key'
      )
    ),
    body := '{}'::jsonb
  );
  $cron$
);
