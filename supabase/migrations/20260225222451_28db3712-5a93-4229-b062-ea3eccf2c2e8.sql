
CREATE OR REPLACE FUNCTION public.handle_task_recurrence()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  final_column_name text;
  first_column_name text;
  new_due timestamp with time zone;
  new_start timestamp with time zone;
  occurrence_count int;
  day_diff int;
  target_status text;
BEGIN
  SELECT name INTO final_column_name
  FROM project_columns
  WHERE project_id = NEW.project_id AND is_final = true
  LIMIT 1;

  IF final_column_name IS NULL THEN RETURN NEW; END IF;

  IF NEW.status IS DISTINCT FROM final_column_name OR OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.recurrence_type IS NULL THEN RETURN NEW; END IF;
  IF NEW.due_date IS NULL THEN RETURN NEW; END IF;

  new_due := CASE NEW.recurrence_type
    WHEN 'daily'   THEN NEW.due_date + interval '1 day'
    WHEN 'weekly'  THEN NEW.due_date + interval '7 days'
    WHEN 'monthly' THEN NEW.due_date + interval '1 month'
    WHEN 'yearly'  THEN NEW.due_date + interval '1 year'
    WHEN 'custom'  THEN NEW.due_date + ((COALESCE(NEW.recurrence_interval, 1)::text || ' ' || COALESCE(NEW.recurrence_unit, 'days'))::interval)
    ELSE NULL
  END;

  IF new_due IS NULL THEN RETURN NEW; END IF;

  -- Skip weekends: Saturday (6) → Monday (+2), Sunday (0) → Monday (+1)
  IF EXTRACT(DOW FROM new_due) = 6 THEN
    new_due := new_due + interval '2 days';
  ELSIF EXTRACT(DOW FROM new_due) = 0 THEN
    new_due := new_due + interval '1 day';
  END IF;

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
    IF occurrence_count >= NEW.recurrence_ends_after THEN RETURN NEW; END IF;
  END IF;

  IF NEW.recurrence_end_date IS NOT NULL AND new_due > NEW.recurrence_end_date::timestamp with time zone THEN
    RETURN NEW;
  END IF;

  SELECT name INTO first_column_name
  FROM project_columns
  WHERE project_id = NEW.project_id AND is_final = false
  ORDER BY position ASC
  LIMIT 1;

  IF first_column_name IS NULL THEN RETURN NEW; END IF;

  target_status := COALESCE(NEW.recurrence_restart_column, first_column_name);

  -- Calculate day_diff and new_start safely
  IF NEW.start_date IS NOT NULL THEN
    day_diff := NEW.due_date - NEW.start_date;
    new_start := new_due - (day_diff || ' days')::interval;
    -- Skip weekends for start_date too
    IF EXTRACT(DOW FROM new_start) = 6 THEN
      new_start := new_start + interval '2 days';
    ELSIF EXTRACT(DOW FROM new_start) = 0 THEN
      new_start := new_start + interval '1 day';
    END IF;
  ELSE
    day_diff := NULL;
    new_start := NULL;
  END IF;

  INSERT INTO tasks (
    title, description, project_id, status, priority, assignee_id,
    due_date, labels, checklist, created_by, position,
    recurrence_type, recurrence_end_date, recurrence_interval,
    recurrence_unit, recurrence_days, recurrence_ends_after,
    start_date, recurrence_restart_column
  ) VALUES (
    NEW.title, NEW.description, NEW.project_id, target_status, NEW.priority, NEW.assignee_id,
    new_due, NEW.labels, NEW.checklist, NEW.created_by, NEW.position,
    NEW.recurrence_type, NEW.recurrence_end_date, NEW.recurrence_interval,
    NEW.recurrence_unit, NEW.recurrence_days, NEW.recurrence_ends_after,
    new_start,
    NEW.recurrence_restart_column
  );

  RETURN NEW;
END;
$function$;
