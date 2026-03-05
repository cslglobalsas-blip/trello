ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assignee_id_profiles_fkey
  FOREIGN KEY (assignee_id) REFERENCES public.profiles(user_id);