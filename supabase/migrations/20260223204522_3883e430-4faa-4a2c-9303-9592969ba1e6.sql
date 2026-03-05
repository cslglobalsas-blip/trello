-- Create a private schema for internal config
CREATE SCHEMA IF NOT EXISTS private;

-- Create config table for cron secrets (not accessible via API)
CREATE TABLE IF NOT EXISTS private.config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Insert placeholder - user must update this via Supabase SQL Editor
INSERT INTO private.config (key, value) 
VALUES ('cron_secret', 'REPLACE_ME_WITH_ACTUAL_CRON_SECRET')
ON CONFLICT (key) DO NOTHING;

-- Recreate cron job to read from private config
SELECT cron.unschedule('daily-task-email');

SELECT cron.schedule(
  'daily-task-email',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kdotaqphltpzwigkvike.supabase.co/functions/v1/daily-task-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT value FROM private.config WHERE key = 'cron_secret')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);