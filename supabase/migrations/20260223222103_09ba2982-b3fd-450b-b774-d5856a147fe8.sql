
-- Add updated_at to comments for edit tracking
ALTER TABLE public.comments ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

-- Create comment_reactions table
CREATE TABLE public.comment_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id, emoji)
);

-- Enable RLS on comment_reactions
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS for comment_reactions: same access pattern as comments (via task -> project_members)
CREATE POLICY "reactions_select" ON public.comment_reactions FOR SELECT
USING (
  comment_id IN (
    SELECT c.id FROM comments c
    WHERE c.task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (
        SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid()
      ) OR t.assignee_id = auth.uid()
    )
  )
);

CREATE POLICY "reactions_insert" ON public.comment_reactions FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  comment_id IN (
    SELECT c.id FROM comments c
    WHERE c.task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.project_id IN (
        SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid()
      ) OR t.assignee_id = auth.uid()
    )
  )
);

CREATE POLICY "reactions_delete" ON public.comment_reactions FOR DELETE
USING (user_id = auth.uid());

-- Add UPDATE policy for comments: only author can edit
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE
USING (user_id = auth.uid());

-- Add DELETE policy for comments: only author can delete
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE
USING (user_id = auth.uid());

-- Add INSERT policy for comments: authenticated users who are project members
CREATE POLICY "comments_insert" ON public.comments FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  task_id IN (
    SELECT t.id FROM tasks t
    WHERE t.project_id IN (
      SELECT pm.project_id FROM project_members pm WHERE pm.user_id = auth.uid()
    ) OR t.assignee_id = auth.uid()
  )
);
