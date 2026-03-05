
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_shared_projects" ON profiles;

CREATE OR REPLACE FUNCTION public.get_shared_project_user_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT DISTINCT pm.user_id
  FROM project_members pm
  WHERE pm.project_id IN (
    SELECT project_id FROM project_members WHERE user_id = _user_id
  )
$$;

CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "profiles_select_shared_projects" ON profiles
FOR SELECT TO authenticated
USING (user_id IN (SELECT get_shared_project_user_ids(auth.uid())));
