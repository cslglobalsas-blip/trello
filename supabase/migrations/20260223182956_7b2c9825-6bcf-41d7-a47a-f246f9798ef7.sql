
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule the daily task email at 11:00 UTC (6:00 AM Bogotá)
SELECT cron.schedule(
  'daily-task-email',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kdotaqphltpzwigkvike.supabase.co/functions/v1/daily-task-email',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtkb3RhcXBobHRwendpZ2t2aWtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2ODY0MzQsImV4cCI6MjA4NzI2MjQzNH0.dnH9eZnHMs1KPvCn2tqlv1MMaiClFzTa7I69Xik6egc"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
