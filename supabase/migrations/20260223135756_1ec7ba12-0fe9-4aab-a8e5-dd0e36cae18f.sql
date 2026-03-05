
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_type text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_end_date date;

CREATE OR REPLACE FUNCTION public.handle_task_recurrence()
RETURNS TRIGGER AS $$
DECLARE
  final_column_name text;
  first_column_name text;
  new_due date;
BEGIN
  SELECT name INTO final_column_name
  FROM project_columns
  WHERE project_id = NEW.project_id AND is_final = true
  LIMIT 1;

  IF NEW.status = final_column_name
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.recurrence_type IS NOT NULL
     AND NEW.due_date IS NOT NULL THEN

    new_due := CASE NEW.recurrence_type
      WHEN 'daily' THEN NEW.due_date + INTERVAL '1 day'
      WHEN 'weekly' THEN NEW.due_date + INTERVAL '7 days'
      WHEN 'monthly' THEN NEW.due_date + INTERVAL '1 month'
      WHEN 'yearly' THEN NEW.due_date + INTERVAL '1 year'
    END;

    IF NEW.recurrence_end_date IS NULL OR new_due <= NEW.recurrence_end_date THEN
      SELECT name INTO first_column_name
      FROM project_columns
      WHERE project_id = NEW.project_id AND is_final = false
      ORDER BY position ASC LIMIT 1;

      INSERT INTO tasks (
        title, description, project_id, assignee_id, created_by,
        priority, due_date, recurrence_type, recurrence_end_date,
        status, labels, position
      ) VALUES (
        NEW.title, NEW.description, NEW.project_id, NEW.assignee_id, NEW.created_by,
        NEW.priority, new_due, NEW.recurrence_type, NEW.recurrence_end_date,
        first_column_name, NEW.labels, 0
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS on_task_completed_recurrence ON tasks;
CREATE TRIGGER on_task_completed_recurrence
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_recurrence();
