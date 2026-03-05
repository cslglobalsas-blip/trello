
-- Fix 1: Add RLS policies to user_roles table
-- Users can read their own role
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Admins can read all roles
CREATE POLICY "user_roles_select_admin"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Replace overly broad activity_log policy with scoped ones
DROP POLICY IF EXISTS "activity_all" ON public.activity_log;

-- Users can see their own activity entries
CREATE POLICY "activity_select_own"
ON public.activity_log
FOR SELECT
USING (user_id = auth.uid());

-- Project owners can see all activity in their projects
CREATE POLICY "activity_select_project_owner"
ON public.activity_log
FOR SELECT
USING (project_id IN (
  SELECT id FROM projects WHERE created_by = auth.uid()
));

-- Admins can see all activity
CREATE POLICY "activity_select_admin"
ON public.activity_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Insert scoped to project members for their own actions
CREATE POLICY "activity_insert"
ON public.activity_log
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND project_id IN (
    SELECT project_id FROM project_members WHERE user_id = auth.uid()
  )
);
