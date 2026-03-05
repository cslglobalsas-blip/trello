DROP POLICY "tasks_delete" ON public.tasks;
CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE TO authenticated
  USING (
    created_by = auth.uid()
    OR project_id IN (
      SELECT id FROM public.projects
      WHERE created_by = auth.uid()
    )
  );