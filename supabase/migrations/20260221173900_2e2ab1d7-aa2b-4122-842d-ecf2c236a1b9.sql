
-- 1. Add checklist column to tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS checklist jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 2. Add assignee_id and due_date to subtasks
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS assignee_id uuid;
ALTER TABLE public.subtasks ADD COLUMN IF NOT EXISTS due_date date;

-- 3. Create private storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS policies for task-attachments bucket
-- Members can upload files
CREATE POLICY "Project members can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments'
  AND auth.role() = 'authenticated'
);

-- Members can view/download files
CREATE POLICY "Project members can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-attachments'
  AND auth.role() = 'authenticated'
);

-- Members can delete their uploads
CREATE POLICY "Authenticated users can delete attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments'
  AND auth.role() = 'authenticated'
);
