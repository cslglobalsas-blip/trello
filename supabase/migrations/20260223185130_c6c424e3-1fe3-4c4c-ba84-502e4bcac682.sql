
-- Drop the existing cron job that contains the hardcoded anon key
SELECT cron.unschedule('daily-task-email');

-- Recreate without the Authorization header
SELECT cron.schedule(
  'daily-task-email',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kdotaqphltpzwigkvike.supabase.co/functions/v1/daily-task-email',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
