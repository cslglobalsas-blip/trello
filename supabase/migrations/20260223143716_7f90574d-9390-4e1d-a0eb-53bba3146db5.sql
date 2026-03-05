
-- Add custom recurrence columns
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_interval int DEFAULT 1;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_unit text;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_days text[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_ends_after int;

-- Update handle_task_recurrence to support custom type
CREATE OR REPLACE FUNCTION public.handle_task_recurrence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  final_column_name text;
  first_column_name text;
  new_due date;
  occurrence_count int;
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
      WHEN 'custom' THEN NEW.due_date + ((COALESCE(NEW.recurrence_interval, 1)::text || ' ' || COALESCE(NEW.recurrence_unit, 'days'))::interval)
    END;

    -- Check recurrence_ends_after for custom type
    IF NEW.recurrence_type = 'custom' AND NEW.recurrence_ends_after IS NOT NULL THEN
      SELECT COUNT(*) INTO occurrence_count
      FROM tasks
      WHERE project_id = NEW.project_id
        AND title = NEW.title
        AND recurrence_type = 'custom'
        AND created_at > (
          SELECT MIN(created_at) FROM tasks
          WHERE project_id = NEW.project_id AND title = NEW.title AND recurrence_type = 'custom'
        );
      IF occurrence_count >= NEW.recurrence_ends_after THEN
        RETURN NEW;
      END IF;
    END IF;

    IF NEW.recurrence_end_date IS NULL OR new_due <= NEW.recurrence_end_date THEN
      SELECT name INTO first_column_name
      FROM project_columns
      WHERE project_id = NEW.project_id AND is_final = false
      ORDER BY position ASC LIMIT 1;

      INSERT INTO tasks (
        title, description, project_id, assignee_id, created_by,
        priority, due_date, recurrence_type, recurrence_end_date,
        recurrence_interval, recurrence_unit, recurrence_days, recurrence_ends_after,
        status, labels, position
      ) VALUES (
        NEW.title, NEW.description, NEW.project_id, NEW.assignee_id, NEW.created_by,
        NEW.priority, new_due, NEW.recurrence_type, NEW.recurrence_end_date,
        NEW.recurrence_interval, NEW.recurrence_unit, NEW.recurrence_days, NEW.recurrence_ends_after,
        first_column_name, NEW.labels, 0
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
