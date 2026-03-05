
-- Fix 1: Secure storage policies with project membership check
CREATE OR REPLACE FUNCTION public.can_access_task_storage(object_path text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  project_uuid uuid;
BEGIN
  project_uuid := split_part(object_path, '/', 1)::uuid;
  RETURN public.is_project_member(project_uuid, auth.uid());
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

DROP POLICY IF EXISTS "Project members can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Project members can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete attachments" ON storage.objects;

CREATE POLICY "Project members can upload attachments"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'task-attachments'
  AND public.can_access_task_storage(name)
);

CREATE POLICY "Project members can view attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'task-attachments'
  AND public.can_access_task_storage(name)
);

CREATE POLICY "Project members can delete attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'task-attachments'
  AND public.can_access_task_storage(name)
);

-- Fix 3: Restore role assignment in handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    true
  )
  ON CONFLICT (user_id) DO NOTHING;

  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    _role := 'admin';
  ELSE
    _role := 'member';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Backfill any users missing roles
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'member'::app_role
FROM auth.users u
LEFT JOIN public.user_roles r ON u.id = r.user_id
WHERE r.user_id IS NULL
ON CONFLICT DO NOTHING;
