
-- ============================================================
-- TASKS
-- ============================================================
DROP POLICY IF EXISTS "tasks_select" ON tasks;
DROP POLICY IF EXISTS "tasks_insert" ON tasks;
DROP POLICY IF EXISTS "tasks_update" ON tasks;
DROP POLICY IF EXISTS "tasks_delete" ON tasks;
DROP POLICY IF EXISTS "Members can view tasks" ON tasks;
DROP POLICY IF EXISTS "Members can create tasks" ON tasks;
DROP POLICY IF EXISTS "Members can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admins and creators can delete tasks" ON tasks;

CREATE POLICY "tasks_select" ON tasks FOR SELECT USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
CREATE POLICY "tasks_insert" ON tasks FOR INSERT WITH CHECK (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
CREATE POLICY "tasks_update" ON tasks FOR UPDATE USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
CREATE POLICY "tasks_delete" ON tasks FOR DELETE USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);

-- ============================================================
-- PROJECT_COLUMNS
-- ============================================================
DROP POLICY IF EXISTS "project_columns_select" ON project_columns;
DROP POLICY IF EXISTS "project_columns_insert" ON project_columns;
DROP POLICY IF EXISTS "project_columns_update" ON project_columns;
DROP POLICY IF EXISTS "project_columns_delete" ON project_columns;
DROP POLICY IF EXISTS "Members can view columns" ON project_columns;
DROP POLICY IF EXISTS "Owner/admin can manage columns" ON project_columns;

CREATE POLICY "project_columns_select" ON project_columns FOR SELECT USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
CREATE POLICY "project_columns_insert" ON project_columns FOR INSERT WITH CHECK (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
CREATE POLICY "project_columns_update" ON project_columns FOR UPDATE USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
CREATE POLICY "project_columns_delete" ON project_columns FOR DELETE USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);

-- ============================================================
-- SUBTASKS
-- ============================================================
DROP POLICY IF EXISTS "subtasks_select" ON subtasks;
DROP POLICY IF EXISTS "subtasks_insert" ON subtasks;
DROP POLICY IF EXISTS "subtasks_update" ON subtasks;
DROP POLICY IF EXISTS "subtasks_delete" ON subtasks;
DROP POLICY IF EXISTS "Members can view subtasks" ON subtasks;
DROP POLICY IF EXISTS "Members can manage subtasks" ON subtasks;

CREATE POLICY "subtasks_select" ON subtasks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = subtasks.task_id AND pm.user_id = auth.uid()
  )
);
CREATE POLICY "subtasks_insert" ON subtasks FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = subtasks.task_id AND pm.user_id = auth.uid()
  )
);
CREATE POLICY "subtasks_update" ON subtasks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = subtasks.task_id AND pm.user_id = auth.uid()
  )
);
CREATE POLICY "subtasks_delete" ON subtasks FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = subtasks.task_id AND pm.user_id = auth.uid()
  )
);

-- ============================================================
-- COMMENTS
-- ============================================================
DROP POLICY IF EXISTS "comments_select" ON comments;
DROP POLICY IF EXISTS "comments_insert" ON comments;
DROP POLICY IF EXISTS "comments_update" ON comments;
DROP POLICY IF EXISTS "comments_delete" ON comments;
DROP POLICY IF EXISTS "Members can view comments" ON comments;
DROP POLICY IF EXISTS "Members can create comments" ON comments;
DROP POLICY IF EXISTS "Authors can update comments" ON comments;
DROP POLICY IF EXISTS "Authors and admins can delete comments" ON comments;

CREATE POLICY "comments_select" ON comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = comments.task_id AND pm.user_id = auth.uid()
  )
);
CREATE POLICY "comments_insert" ON comments FOR INSERT WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id
    WHERE t.id = comments.task_id AND pm.user_id = auth.uid()
  )
);
CREATE POLICY "comments_update" ON comments FOR UPDATE USING (
  user_id = auth.uid()
);
CREATE POLICY "comments_delete" ON comments FOR DELETE USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================
-- ACTIVITY_LOG
-- ============================================================
DROP POLICY IF EXISTS "activity_log_select" ON activity_log;
DROP POLICY IF EXISTS "activity_log_insert" ON activity_log;
DROP POLICY IF EXISTS "Members can view activity" ON activity_log;
DROP POLICY IF EXISTS "Members can log activity" ON activity_log;

CREATE POLICY "activity_log_select" ON activity_log FOR SELECT USING (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
CREATE POLICY "activity_log_insert" ON activity_log FOR INSERT WITH CHECK (
  project_id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
);
