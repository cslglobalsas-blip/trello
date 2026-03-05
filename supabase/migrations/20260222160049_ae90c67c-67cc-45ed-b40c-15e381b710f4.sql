
-- =============================================
-- DROP ALL EXISTING POLICIES ON ALL TABLES
-- =============================================

-- project_members
DROP POLICY IF EXISTS "Members can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Owner or admin can delete members" ON public.project_members;
DROP POLICY IF EXISTS "Owner or admin can insert members" ON public.project_members;
DROP POLICY IF EXISTS "Owner or admin can update members" ON public.project_members;

-- projects
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;
DROP POLICY IF EXISTS "Members can view their projects" ON public.projects;
DROP POLICY IF EXISTS "Owner or admin can delete projects" ON public.projects;
DROP POLICY IF EXISTS "Owner or admin can update projects" ON public.projects;

-- profiles
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- tasks
DROP POLICY IF EXISTS "Admins or creator can delete tasks" ON public.tasks;
DROP POLICY IF EXISTS "Members can insert tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert" ON public.tasks;
DROP POLICY IF EXISTS "tasks_select" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update" ON public.tasks;

-- project_columns
DROP POLICY IF EXISTS "Members can view project columns" ON public.project_columns;
DROP POLICY IF EXISTS "Owner or admin can delete columns" ON public.project_columns;
DROP POLICY IF EXISTS "Owner or admin can insert columns" ON public.project_columns;
DROP POLICY IF EXISTS "Owner or admin can update columns" ON public.project_columns;
DROP POLICY IF EXISTS "project_columns_delete" ON public.project_columns;
DROP POLICY IF EXISTS "project_columns_insert" ON public.project_columns;
DROP POLICY IF EXISTS "project_columns_select" ON public.project_columns;
DROP POLICY IF EXISTS "project_columns_update" ON public.project_columns;

-- subtasks
DROP POLICY IF EXISTS "Members can delete subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Members can insert subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "Members can update subtasks" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_delete" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_insert" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_select" ON public.subtasks;
DROP POLICY IF EXISTS "subtasks_update" ON public.subtasks;

-- comments
DROP POLICY IF EXISTS "Author can update comments" ON public.comments;
DROP POLICY IF EXISTS "Author or admin can delete comments" ON public.comments;
DROP POLICY IF EXISTS "Members can insert comments" ON public.comments;
DROP POLICY IF EXISTS "comments_delete" ON public.comments;
DROP POLICY IF EXISTS "comments_insert" ON public.comments;
DROP POLICY IF EXISTS "comments_select" ON public.comments;
DROP POLICY IF EXISTS "comments_update" ON public.comments;

-- activity_log
DROP POLICY IF EXISTS "Members can insert activity" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_insert" ON public.activity_log;
DROP POLICY IF EXISTS "activity_log_select" ON public.activity_log;

-- user_roles
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can view all roles" ON public.user_roles;

-- =============================================
-- RECREATE ALL POLICIES AS PERMISSIVE
-- =============================================

-- project_members
CREATE POLICY "Members can view project members"
  ON public.project_members FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Owner or admin can insert members"
  ON public.project_members FOR INSERT
  WITH CHECK (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can update members"
  ON public.project_members FOR UPDATE
  USING (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can delete members"
  ON public.project_members FOR DELETE
  USING (is_project_owner(project_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

-- projects
CREATE POLICY "Members can view their projects"
  ON public.projects FOR SELECT
  USING (is_project_member(id, auth.uid()));

CREATE POLICY "Authenticated users can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner or admin can update projects"
  ON public.projects FOR UPDATE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner or admin can delete projects"
  ON public.projects FOR DELETE
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- profiles
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- tasks
CREATE POLICY "Members can view tasks"
  ON public.tasks FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can update tasks"
  ON public.tasks FOR UPDATE
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Admins or creator can delete tasks"
  ON public.tasks FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR created_by = auth.uid());

-- project_columns
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

-- subtasks
CREATE POLICY "Members can view subtasks"
  ON public.subtasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = subtasks.task_id AND is_project_member(t.project_id, auth.uid())
  ));

CREATE POLICY "Members can insert subtasks"
  ON public.subtasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = subtasks.task_id AND is_project_member(t.project_id, auth.uid())
  ));

CREATE POLICY "Members can update subtasks"
  ON public.subtasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = subtasks.task_id AND is_project_member(t.project_id, auth.uid())
  ));

CREATE POLICY "Members can delete subtasks"
  ON public.subtasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = subtasks.task_id AND is_project_member(t.project_id, auth.uid())
  ));

-- comments
CREATE POLICY "Members can view comments"
  ON public.comments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = comments.task_id AND is_project_member(t.project_id, auth.uid())
  ));

CREATE POLICY "Members can insert comments"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM tasks t WHERE t.id = comments.task_id AND is_project_member(t.project_id, auth.uid())
  ));

CREATE POLICY "Author can update comments"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Author or admin can delete comments"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- activity_log
CREATE POLICY "Members can view activity"
  ON public.activity_log FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Members can insert activity"
  ON public.activity_log FOR INSERT
  WITH CHECK (is_project_member(project_id, auth.uid()));

-- user_roles
CREATE POLICY "Authenticated users can view all roles"
  ON public.user_roles FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));
