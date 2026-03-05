-- Fix pm_insert: use SECURITY DEFINER function to avoid indirect recursion
DROP POLICY IF EXISTS "pm_insert" ON public.project_members;
CREATE POLICY "pm_insert" ON public.project_members
FOR INSERT TO authenticated
WITH CHECK (public.is_project_owner(project_id, auth.uid()));

-- Fix pm_delete: use SECURITY DEFINER function to avoid indirect recursion
DROP POLICY IF EXISTS "pm_delete" ON public.project_members;
CREATE POLICY "pm_delete" ON public.project_members
FOR DELETE TO authenticated
USING (public.is_project_owner(project_id, auth.uid()));

-- Clean up orphaned project
DELETE FROM public.projects
WHERE id = '0ea5b89e-6243-4798-93f7-cc753058cee8';