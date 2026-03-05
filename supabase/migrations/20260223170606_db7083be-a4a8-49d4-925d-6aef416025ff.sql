
-- Trigger: recurrencia
DROP TRIGGER IF EXISTS on_task_completed_recurrence ON tasks;
CREATE TRIGGER on_task_completed_recurrence
  AFTER UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_task_recurrence();

-- Trigger: notificar asignacion
DROP TRIGGER IF EXISTS on_task_assigned ON tasks;
CREATE TRIGGER on_task_assigned
  AFTER INSERT OR UPDATE OF assignee_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_task_assigned();

-- Trigger: auto-agregar asignado a miembros del proyecto
DROP TRIGGER IF EXISTS on_task_auto_add_member ON tasks;
CREATE TRIGGER on_task_auto_add_member
  AFTER INSERT OR UPDATE OF assignee_id ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_add_assignee_to_project();
