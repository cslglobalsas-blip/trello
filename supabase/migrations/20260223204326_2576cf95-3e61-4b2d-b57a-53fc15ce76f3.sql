-- Fix 1: Update cron job to include CRON_SECRET in Authorization header
SELECT cron.unschedule('daily-task-email');

SELECT cron.schedule(
  'daily-task-email',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := 'https://kdotaqphltpzwigkvike.supabase.co/functions/v1/daily-task-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.cron_secret', true)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- Fix 2: Restrict profiles SELECT policy
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

-- Users can read their own profile
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (user_id = auth.uid());

-- Users can read profiles of people who share a project with them
CREATE POLICY "profiles_select_shared_projects" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_members pm1
      JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
      WHERE pm1.user_id = auth.uid()
        AND pm2.user_id = profiles.user_id
    )
  );

-- Admins can read all profiles
CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
  );