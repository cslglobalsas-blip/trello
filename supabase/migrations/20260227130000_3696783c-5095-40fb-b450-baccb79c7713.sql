
CREATE OR REPLACE FUNCTION public.get_my_project_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = 'public'
AS $$
  SELECT project_id FROM project_members WHERE user_id = _user_id;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_project_ids FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_project_ids TO authenticated;

DROP POLICY IF EXISTS "pm_select" ON project_members;

CREATE POLICY "pm_select" ON project_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR project_id IN (SELECT get_my_project_ids(auth.uid()))
);
