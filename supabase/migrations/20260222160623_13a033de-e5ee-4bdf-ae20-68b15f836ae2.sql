
-- =====================================================
-- DROP ALL EXISTING POLICIES (dynamic loop per table)
-- =====================================================

DO $$
DECLARE
  tbl TEXT;
  r RECORD;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['profiles','user_roles','projects','project_members','project_columns','tasks','subtasks','comments','activity_log']
  LOOP
    FOR r IN
      SELECT policyname FROM pg_policies WHERE tablename = tbl AND schemaname = 'public'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- =====================================================
-- PROFILES
-- =====================================================
CREATE POLICY "profiles_select" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- USER_ROLES
-- =====================================================
CREATE POLICY "user_roles_select" ON public.user_roles
  FOR SELECT USING (true);

CREATE POLICY "user_roles_insert" ON public.user_roles
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_update" ON public.user_roles
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "user_roles_delete" ON public.user_roles
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- PROJECTS
-- =====================================================
CREATE POLICY "projects_select" ON public.projects
  FOR SELECT USING (is_project_member(id, auth.uid()));

CREATE POLICY "projects_insert" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "projects_update" ON public.projects
  FOR UPDATE USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "projects_delete" ON public.projects
  FOR DELETE USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- PROJECT_MEMBERS
-- =====================================================
CREATE POLICY "project_members_select" ON public.project_members
  FOR SELECT USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "project_members_insert" ON public.project_members
  FOR INSERT WITH CHECK (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "project_members_delete" ON public.project_members
  FOR DELETE USING (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "project_members_update" ON public.project_members
  FOR UPDATE USING (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- PROJECT_COLUMNS
-- =====================================================
CREATE POLICY "project_columns_select" ON public.project_columns
  FOR SELECT USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "project_columns_insert" ON public.project_columns
  FOR INSERT WITH CHECK (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "project_columns_update" ON public.project_columns
  FOR UPDATE USING (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "project_columns_delete" ON public.project_columns
  FOR DELETE USING (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- TASKS (with assignee visibility)
-- =====================================================
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (
    assignee_id = auth.uid()
    OR project_id IN (SELECT project_id FROM public.project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (is_project_member(project_id, auth.uid()));

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

-- =====================================================
-- SUBTASKS
-- =====================================================
CREATE POLICY "subtasks_select" ON public.subtasks
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id AND is_project_member(t.project_id, auth.uid())));

CREATE POLICY "subtasks_insert" ON public.subtasks
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id AND is_project_member(t.project_id, auth.uid())));

CREATE POLICY "subtasks_update" ON public.subtasks
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id AND is_project_member(t.project_id, auth.uid())));

CREATE POLICY "subtasks_delete" ON public.subtasks
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = subtasks.task_id AND is_project_member(t.project_id, auth.uid())));

-- =====================================================
-- COMMENTS
-- =====================================================
CREATE POLICY "comments_select" ON public.comments
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = comments.task_id AND is_project_member(t.project_id, auth.uid())));

CREATE POLICY "comments_insert" ON public.comments
  FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = comments.task_id AND is_project_member(t.project_id, auth.uid())));

CREATE POLICY "comments_update" ON public.comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "comments_delete" ON public.comments
  FOR DELETE USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- =====================================================
-- ACTIVITY_LOG
-- =====================================================
CREATE POLICY "activity_log_select" ON public.activity_log
  FOR SELECT USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "activity_log_insert" ON public.activity_log
  FOR INSERT WITH CHECK (is_project_member(project_id, auth.uid()));
