
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "profiles_select_authenticated" ON profiles;

-- Users can view their own profile
CREATE POLICY "profiles_select_own" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Users can view profiles of members in shared projects
CREATE POLICY "profiles_select_shared_projects" ON profiles
FOR SELECT TO authenticated
USING (
  user_id IN (
    SELECT pm.user_id 
    FROM project_members pm
    WHERE pm.project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
  )
);

-- Admins can view all profiles
CREATE POLICY "profiles_select_admin" ON profiles
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));
