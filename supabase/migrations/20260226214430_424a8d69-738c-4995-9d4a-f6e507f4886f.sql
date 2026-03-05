DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_shared_projects" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;

CREATE POLICY "profiles_select_authenticated" ON profiles
FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);