
-- Fix 1: Replace overly permissive projects_insert policy
DROP POLICY IF EXISTS "projects_insert" ON public.projects;
CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- Fix 2: Set search_path on auto_add_assignee_to_project to prevent search path hijacking
CREATE OR REPLACE FUNCTION public.auto_add_assignee_to_project()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.assignee_id IS NOT NULL THEN
    INSERT INTO public.project_members (project_id, user_id)
    VALUES (NEW.project_id, NEW.assignee_id)
    ON CONFLICT (project_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;
