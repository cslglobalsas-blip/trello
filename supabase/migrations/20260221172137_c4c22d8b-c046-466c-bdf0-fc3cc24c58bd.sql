
-- Add missing foreign keys to enable Supabase joins

-- project_members -> profiles (user_id)
DO $$ BEGIN
  ALTER TABLE public.project_members ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- project_members -> projects (project_id)
DO $$ BEGIN
  ALTER TABLE public.project_members ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- tasks -> profiles (assignee_id)
DO $$ BEGIN
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.profiles(user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- tasks -> profiles (created_by)
DO $$ BEGIN
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- tasks -> projects (project_id)
DO $$ BEGIN
  ALTER TABLE public.tasks ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- comments -> profiles (user_id)
DO $$ BEGIN
  ALTER TABLE public.comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- comments -> tasks (task_id)
DO $$ BEGIN
  ALTER TABLE public.comments ADD CONSTRAINT comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- subtasks -> tasks (task_id)
DO $$ BEGIN
  ALTER TABLE public.subtasks ADD CONSTRAINT subtasks_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- activity_log -> profiles (user_id)
DO $$ BEGIN
  ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- activity_log -> tasks (task_id)
DO $$ BEGIN
  ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- activity_log -> projects (project_id)
DO $$ BEGIN
  ALTER TABLE public.activity_log ADD CONSTRAINT activity_log_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- project_columns -> projects (project_id)
DO $$ BEGIN
  ALTER TABLE public.project_columns ADD CONSTRAINT project_columns_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
