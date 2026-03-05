
-- =============================================
-- 1. Tables (created first so function can reference them)
-- =============================================

CREATE TABLE public.projects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#0052CC',
  description text,
  created_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.project_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','in_review','done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date date,
  assignee_id uuid REFERENCES auth.users ON DELETE SET NULL,
  created_by uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  labels text[] NOT NULL DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.subtasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id uuid NOT NULL REFERENCES public.tasks ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects ON DELETE CASCADE,
  task_id uuid REFERENCES public.tasks ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =============================================
-- 2. Helper function (after tables exist)
-- =============================================
CREATE OR REPLACE FUNCTION public.is_project_member(_project_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_id = _project_id AND user_id = _user_id
    )
$$;

-- =============================================
-- 3. Indexes
-- =============================================
CREATE INDEX idx_project_members_user ON public.project_members(user_id);
CREATE INDEX idx_project_members_project ON public.project_members(project_id);
CREATE INDEX idx_tasks_project ON public.tasks(project_id);
CREATE INDEX idx_tasks_assignee ON public.tasks(assignee_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_subtasks_task ON public.subtasks(task_id);
CREATE INDEX idx_comments_task ON public.comments(task_id);
CREATE INDEX idx_activity_log_project ON public.activity_log(project_id);

-- =============================================
-- 4. Triggers (updated_at)
-- =============================================
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 5. Enable RLS
-- =============================================
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 6. RLS Policies — projects
-- =============================================
CREATE POLICY "Members can view their projects"
  ON public.projects FOR SELECT
  USING (public.is_project_member(id, auth.uid()));

CREATE POLICY "Admins can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update projects"
  ON public.projects FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 7. RLS Policies — project_members
-- =============================================
CREATE POLICY "Members can view project members"
  ON public.project_members FOR SELECT
  USING (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Admins can insert project members"
  ON public.project_members FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update project members"
  ON public.project_members FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete project members"
  ON public.project_members FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 8. RLS Policies — tasks
-- =============================================
CREATE POLICY "Members can view tasks"
  ON public.tasks FOR SELECT
  USING (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can update tasks"
  ON public.tasks FOR UPDATE
  USING (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Admins or creator can delete tasks"
  ON public.tasks FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR created_by = auth.uid()
  );

-- =============================================
-- 9. RLS Policies — subtasks
-- =============================================
CREATE POLICY "Members can view subtasks"
  ON public.subtasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.is_project_member(t.project_id, auth.uid())
  ));

CREATE POLICY "Members can insert subtasks"
  ON public.subtasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.is_project_member(t.project_id, auth.uid())
  ));

CREATE POLICY "Members can update subtasks"
  ON public.subtasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.is_project_member(t.project_id, auth.uid())
  ));

CREATE POLICY "Members can delete subtasks"
  ON public.subtasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.is_project_member(t.project_id, auth.uid())
  ));

-- =============================================
-- 10. RLS Policies — comments
-- =============================================
CREATE POLICY "Members can view comments"
  ON public.comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_id AND public.is_project_member(t.project_id, auth.uid())
  ));

CREATE POLICY "Members can insert comments"
  ON public.comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_id AND public.is_project_member(t.project_id, auth.uid())
    )
  );

CREATE POLICY "Author can update comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Author or admin can delete comments"
  ON public.comments FOR DELETE
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- =============================================
-- 11. RLS Policies — activity_log
-- =============================================
CREATE POLICY "Members can view activity"
  ON public.activity_log FOR SELECT
  USING (public.is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can insert activity"
  ON public.activity_log FOR INSERT
  WITH CHECK (public.is_project_member(project_id, auth.uid()));
