
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Sin título',
  content text DEFAULT '',
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "docs_select" ON public.documents FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "docs_insert" ON public.documents FOR INSERT
  WITH CHECK (created_by = auth.uid() AND is_project_member(project_id, auth.uid()));

CREATE POLICY "docs_update" ON public.documents FOR UPDATE
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "docs_delete" ON public.documents FOR DELETE
  USING (
    created_by = auth.uid()
    OR is_project_owner(project_id, auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
