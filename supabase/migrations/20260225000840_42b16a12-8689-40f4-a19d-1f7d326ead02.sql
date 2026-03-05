-- Add DELETE policy on user_roles for admins (used by manage-user edge function when deleting users)
CREATE POLICY "user_roles_delete_admin"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));