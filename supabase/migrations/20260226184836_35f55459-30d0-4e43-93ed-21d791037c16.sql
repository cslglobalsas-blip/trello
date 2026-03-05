
-- labels table
CREATE TABLE public.labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  color text NOT NULL DEFAULT '#94A3B8',
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- task_labels junction table
CREATE TABLE public.task_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, label_id)
);

ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;

-- Labels RLS
CREATE POLICY "labels_select" ON public.labels FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "labels_insert" ON public.labels FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid()) AND created_by = auth.uid());

CREATE POLICY "labels_update" ON public.labels FOR UPDATE
  USING (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "labels_delete" ON public.labels FOR DELETE
  USING (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- Task labels RLS
CREATE POLICY "task_labels_select" ON public.task_labels FOR SELECT
  USING (task_id IN (SELECT id FROM tasks WHERE is_project_member(project_id, auth.uid())));

CREATE POLICY "task_labels_insert" ON public.task_labels FOR INSERT
  WITH CHECK (task_id IN (SELECT id FROM tasks WHERE is_project_member(project_id, auth.uid())));

CREATE POLICY "task_labels_delete" ON public.task_labels FOR DELETE
  USING (task_id IN (SELECT id FROM tasks WHERE is_project_member(project_id, auth.uid())));

-- Trigger to auto-create default labels for new projects
CREATE OR REPLACE FUNCTION public.create_default_project_labels()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.labels (project_id, name, color, created_by) VALUES
    (NEW.id, 'Bug',     '#EF4444', NEW.created_by),
    (NEW.id, 'Feature', '#3B82F6', NEW.created_by),
    (NEW.id, 'Mejora',  '#22C55E', NEW.created_by),
    (NEW.id, 'Docs',    '#EAB308', NEW.created_by),
    (NEW.id, 'Urgente', '#F97316', NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_default_labels
AFTER INSERT ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.create_default_project_labels();

-- Seed default labels for all existing projects
INSERT INTO public.labels (name, color, project_id, created_by)
SELECT l.name, l.color, p.id, p.created_by
FROM public.projects p
CROSS JOIN (VALUES
  ('Bug', '#EF4444'),
  ('Feature', '#3B82F6'),
  ('Mejora', '#22C55E'),
  ('Docs', '#EAB308'),
  ('Urgente', '#F97316')
) AS l(name, color);

-- Migrate existing tasks.labels[] into task_labels rows
INSERT INTO public.task_labels (task_id, label_id)
SELECT t.id, lb.id
FROM public.tasks t
CROSS JOIN LATERAL unnest(t.labels) AS label_name
JOIN public.labels lb ON lb.name = label_name AND lb.project_id = t.project_id
ON CONFLICT DO NOTHING;
