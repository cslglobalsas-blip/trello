-- Ensure pm_insert is INSERT-only (drop and recreate to be safe)
DROP POLICY IF EXISTS "pm_insert" ON project_members;

CREATE POLICY "pm_insert" ON project_members
FOR INSERT TO authenticated
WITH CHECK (
  project_id IN (
    SELECT projects.id FROM projects WHERE projects.created_by = auth.uid()
  )
);

-- Clean up orphaned "Vizac" projects
DELETE FROM projects WHERE id IN (
  '5a1419a2-105a-42e5-83e8-7b3d0738fa85',
  'f6c15b2a-1e98-43a5-9cb5-4cc1d76a094a',
  'bcf7cf82-350f-4686-bfde-28c15a44c5f8'
);