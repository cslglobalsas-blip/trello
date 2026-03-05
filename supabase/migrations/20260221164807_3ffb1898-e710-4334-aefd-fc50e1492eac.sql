
-- 1. Helper function: is_project_owner
CREATE OR REPLACE FUNCTION public.is_project_owner(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = _project_id AND created_by = _user_id
  )
$$;

-- 2. Create project_columns table
CREATE TABLE public.project_columns (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#94A3B8',
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.project_columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view project columns"
  ON public.project_columns FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Owner or admin can insert columns"
  ON public.project_columns FOR INSERT
  WITH CHECK (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can update columns"
  ON public.project_columns FOR UPDATE
  USING (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can delete columns"
  ON public.project_columns FOR DELETE
  USING (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Trigger to create default columns on project creation
CREATE OR REPLACE FUNCTION public.create_default_project_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.project_columns (project_id, name, color, position) VALUES
    (NEW.id, 'Por Hacer', '#94A3B8', 0),
    (NEW.id, 'En Progreso', '#3B82F6', 1),
    (NEW.id, 'En Revisión', '#F59E0B', 2),
    (NEW.id, 'Completado', '#10B981', 3);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_default_columns
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.create_default_project_columns();

-- 4. Remove CHECK constraint on tasks.status (if exists)
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT c.conname INTO constraint_name
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_namespace n ON t.relnamespace = n.oid
  WHERE t.relname = 'tasks' AND n.nspname = 'public' AND c.contype = 'c'
  AND pg_get_constraintdef(c.oid) LIKE '%status%'
  LIMIT 1;
  
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.tasks DROP CONSTRAINT %I', constraint_name);
  END IF;
END;
$$;

-- 5. Update projects RLS: allow any authenticated user to INSERT
DROP POLICY IF EXISTS "Admins can insert projects" ON public.projects;
CREATE POLICY "Authenticated users can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Admins can update projects" ON public.projects;
CREATE POLICY "Owner or admin can update projects"
  ON public.projects FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete projects" ON public.projects;
CREATE POLICY "Owner or admin can delete projects"
  ON public.projects FOR DELETE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 6. Update project_members RLS: owner or admin can manage
DROP POLICY IF EXISTS "Admins can insert project members" ON public.project_members;
CREATE POLICY "Owner or admin can insert members"
  ON public.project_members FOR INSERT
  WITH CHECK (
    is_project_owner(project_id, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
    OR (auth.uid() = user_id AND is_project_owner(project_id, auth.uid()) = false AND project_id IN (SELECT id FROM public.projects WHERE created_by = auth.uid()))
  );

DROP POLICY IF EXISTS "Admins can update project members" ON public.project_members;
CREATE POLICY "Owner or admin can update members"
  ON public.project_members FOR UPDATE
  USING (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete project members" ON public.project_members;
CREATE POLICY "Owner or admin can delete members"
  ON public.project_members FOR DELETE
  USING (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
