
CREATE OR REPLACE FUNCTION public.handle_task_recurrence()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  final_column_name text;
  first_column_name text;
  new_due timestamp with time zone;
  occurrence_count int;
BEGIN
  -- Find the final column for this project
  SELECT name INTO final_column_name
  FROM project_columns
  WHERE project_id = NEW.project_id AND is_final = true
  LIMIT 1;

  -- Guard: only proceed when task moves TO the final column
  IF final_column_name IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IS DISTINCT FROM final_column_name OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only proceed if task has recurrence
  IF NEW.recurrence_type IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate new due date
  IF NEW.due_date IS NULL THEN
    RETURN NEW;
  END IF;

  new_due := CASE NEW.recurrence_type
    WHEN 'daily'   THEN NEW.due_date + interval '1 day'
    WHEN 'weekly'  THEN NEW.due_date + interval '7 days'
    WHEN 'monthly' THEN NEW.due_date + interval '1 month'
    WHEN 'yearly'  THEN NEW.due_date + interval '1 year'
    WHEN 'custom'  THEN NEW.due_date + ((COALESCE(NEW.recurrence_interval, 1)::text || ' ' || COALESCE(NEW.recurrence_unit, 'days'))::interval)
    ELSE NULL
  END;

  IF new_due IS NULL THEN
    RETURN NEW;
  END IF;

  -- Check recurrence_ends_after for custom type
  IF NEW.recurrence_ends_after IS NOT NULL THEN
    SELECT COUNT(*) INTO occurrence_count
    FROM tasks
    WHERE project_id = NEW.project_id
      AND title = NEW.title
      AND recurrence_type = NEW.recurrence_type
      AND created_at > (
        SELECT MIN(created_at) FROM tasks
        WHERE project_id = NEW.project_id AND title = NEW.title AND recurrence_type = NEW.recurrence_type
      );
    IF occurrence_count >= NEW.recurrence_ends_after THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Check recurrence_end_date
  IF NEW.recurrence_end_date IS NOT NULL AND new_due > NEW.recurrence_end_date::timestamp with time zone THEN
    RETURN NEW;
  END IF;

  -- Get first non-final column
  SELECT name INTO first_column_name
  FROM project_columns
  WHERE project_id = NEW.project_id AND is_final = false
  ORDER BY position ASC
  LIMIT 1;

  IF first_column_name IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insert new recurring task
  INSERT INTO tasks (
    title, description, project_id, status, priority, assignee_id,
    due_date, labels, checklist, created_by, position,
    recurrence_type, recurrence_end_date, recurrence_interval,
    recurrence_unit, recurrence_days, recurrence_ends_after,
    start_date
  ) VALUES (
    NEW.title, NEW.description, NEW.project_id, first_column_name, NEW.priority, NEW.assignee_id,
    new_due, NEW.labels, NEW.checklist, NEW.created_by, NEW.position,
    NEW.recurrence_type, NEW.recurrence_end_date, NEW.recurrence_interval,
    NEW.recurrence_unit, NEW.recurrence_days, NEW.recurrence_ends_after,
    CASE WHEN NEW.start_date IS NOT NULL THEN new_due - (NEW.due_date - NEW.start_date) ELSE NULL END
  );

  RETURN NEW;
END;
$$;

-- Re-create trigger
DROP TRIGGER IF EXISTS on_task_completed_recurrence ON tasks;
CREATE TRIGGER on_task_completed_recurrence
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_recurrence();
