import { useState, useEffect, useRef, useCallback } from "react";
import type { Task, ChecklistItem } from "@/hooks/useTasks";
import { useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import type { ProjectColumn } from "@/hooks/useProjectColumns";
import type { ProjectMember } from "@/hooks/useProjectMembers";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Check, X, RefreshCw, Pencil } from "lucide-react";
import { DialogClose } from "@/components/ui/dialog";
import { TaskLabelsPicker } from "./TaskLabelsPicker";
import { CustomRecurrenceDialog, getRecurrenceSummary } from "./CustomRecurrenceDialog";
import type { CustomRecurrenceValues } from "./CustomRecurrenceDialog";
import { SubtasksSection } from "./detail/SubtasksSection";
import { ChecklistSection } from "./detail/ChecklistSection";
import { AttachmentsSection } from "./detail/AttachmentsSection";
import { ActivityFeed } from "./detail/ActivityFeed";
import { RichTextEditor } from "./detail/RichTextEditor";

import { useAuth } from "@/hooks/useAuth";
import { useAllProfiles } from "@/hooks/useAllProfiles";
import { supabase } from "@/integrations/supabase/client";

const priorityOptions = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const priorityLabelMap: Record<string, string> = {
  low: "Baja", medium: "Media", high: "Alta", urgent: "Urgente",
};

interface Props {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ProjectColumn[];
  members: ProjectMember[];
  projectOwnerId: string;
  projectName?: string;
  projectId: string;
  onManageLabels?: () => void;
}

export function TaskDetailPanel({ task, open, onOpenChange, columns, members, projectOwnerId, projectName, projectId, onManageLabels }: Props) {
  const { user } = useAuth();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: allProfiles } = useAllProfiles(open);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [assigneeId, setAssigneeId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [recurrenceType, setRecurrenceType] = useState<string | null>(null);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | null>(null);
  const [recurrenceInterval, setRecurrenceInterval] = useState<number | null>(null);
  const [recurrenceUnit, setRecurrenceUnit] = useState<string | null>(null);
  const [recurrenceDays, setRecurrenceDays] = useState<string[] | null>(null);
  const [recurrenceEndsAfter, setRecurrenceEndsAfter] = useState<number | null>(null);
  const [recurrenceRestartColumn, setRecurrenceRestartColumn] = useState<string | null>(null);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setChecklist(task.checklist || []);
      setStartDate(task.start_date);
      setDueDate(task.due_date);
      setAssigneeId(task.assignee_id);
      setRecurrenceType(task.recurrence_type);
      setRecurrenceEndDate(task.recurrence_end_date);
      setRecurrenceInterval(task.recurrence_interval);
      setRecurrenceUnit(task.recurrence_unit);
      setRecurrenceDays(task.recurrence_days);
      setRecurrenceEndsAfter(task.recurrence_ends_after);
      setRecurrenceRestartColumn(task.recurrence_restart_column);
    }
  }, [task?.id]);

  const showSaved = useCallback(() => {
    setSaved(true);
    clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSaved(false), 2000);
  }, []);

  if (!task) return null;

  function save(updates: Record<string, any>) {
    updateTask.mutate(
      { id: task!.id, project_id: task!.project_id, ...updates },
      { onSuccess: showSaved }
    );
  }

  function debouncedSave(updates: Record<string, any>) {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(updates), 600);
  }

  function handleChecklistChange(items: ChecklistItem[]) {
    setChecklist(items);
    debouncedSave({ checklist: items });
  }

  function handleDelete() {
    deleteTask.mutate({ id: task!.id, project_id: task!.project_id });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-[1200px] h-[90vh] flex flex-col p-0 [&>button:last-child]:hidden">
        <DialogTitle className="sr-only">Detalle de tarea</DialogTitle>

        {/* Sticky header */}
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center gap-3">
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              debouncedSave({ title: e.target.value });
            }}
            className="text-lg font-semibold border-0 px-0 focus-visible:ring-0 shadow-none flex-1"
          />
          {saved && (
            <span className="flex items-center gap-1 text-xs text-green-600 animate-in fade-in duration-300 shrink-0">
              <Check className="h-3.5 w-3.5" /> Guardado
            </span>
          )}
          <DialogClose className="rounded-sm opacity-70 hover:opacity-100 transition-opacity shrink-0 ml-2">
            <X className="h-5 w-5" />
            <span className="sr-only">Cerrar</span>
          </DialogClose>
        </div>

        {/* Two-column body */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* Left column - Task fields */}
          <div className="w-full md:w-[70%] overflow-y-auto px-6 py-5 space-y-5 md:border-r">
            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Estado</Label>
                <Select value={task.status} onValueChange={(v) => save({ status: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Prioridad</Label>
                <Select value={task.priority} onValueChange={(v) => save({ priority: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Fecha de inicio</Label>
                <Input
                  type="date"
                  value={startDate || ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setStartDate(val);
                    save({ start_date: val });
                  }}
                  className="h-8 text-xs"
                />
                {recurrenceType && startDate && [0, 6].includes(new Date(startDate + 'T12:00:00').getDay()) && (
                  <p className="text-xs text-amber-600 mt-1">
                    Esta fecha cae en fin de semana. Se ajustará automáticamente al lunes siguiente.
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Fecha de vencimiento</Label>
                <Input
                  type="date"
                  value={dueDate || ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    setDueDate(val);
                    save({ due_date: val });
                  }}
                  className="h-8 text-xs"
                />
                {recurrenceType && dueDate && [0, 6].includes(new Date(dueDate + 'T12:00:00').getDay()) && (
                  <p className="text-xs text-amber-600 mt-1">
                    Esta fecha cae en fin de semana. Se ajustará automáticamente al lunes siguiente.
                  </p>
                )}
              </div>
            </div>

            {/* Recurrence */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Recurrencia
                </Label>
                <Select
                  value={recurrenceType || "none"}
                  onValueChange={(v) => {
                    if (v === "custom") {
                      setRecurrenceType("custom");
                      setCustomDialogOpen(true);
                    } else {
                      const val = v === "none" ? null : v;
                      setRecurrenceType(val);
                      setRecurrenceRestartColumn(null);
                      save({
                        recurrence_type: val,
                        recurrence_interval: null,
                        recurrence_unit: null,
                        recurrence_days: [],
                        recurrence_ends_after: null,
                        recurrence_restart_column: null,
                      });
                    }
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin recurrencia</SelectItem>
                    <SelectItem value="daily">Diaria</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensual</SelectItem>
                    <SelectItem value="yearly">Anual</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {recurrenceType && recurrenceType !== "custom" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Fecha fin de recurrencia</Label>
                  <Input
                    type="date"
                    value={recurrenceEndDate || ""}
                    onChange={(e) => {
                      const val = e.target.value || null;
                      setRecurrenceEndDate(val);
                      save({ recurrence_end_date: val });
                    }}
                    className="h-8 text-xs"
                  />
                </div>
              )}
              {recurrenceType === "custom" && (
                <div>
                  <Label className="text-xs text-muted-foreground">Configuración</Label>
                  <button
                    type="button"
                    onClick={() => setCustomDialogOpen(true)}
                    className="flex items-center gap-1.5 h-8 text-xs px-2 rounded-md border border-input bg-background hover:bg-accent w-full"
                  >
                    <span className="flex-1 text-left truncate">
                      {getRecurrenceSummary(recurrenceInterval, recurrenceUnit, recurrenceDays)}
                    </span>
                    <Pencil className="h-3 w-3 shrink-0 text-muted-foreground" />
                  </button>
                </div>
              )}
            </div>

            <CustomRecurrenceDialog
              open={customDialogOpen}
              onOpenChange={setCustomDialogOpen}
              initialValues={{
                recurrence_interval: recurrenceInterval || 1,
                recurrence_unit: recurrenceUnit || "days",
                recurrence_days: recurrenceDays || [],
                recurrence_end_date: recurrenceEndDate,
                recurrence_ends_after: recurrenceEndsAfter,
              }}
              onSave={(vals: CustomRecurrenceValues) => {
                setRecurrenceInterval(vals.recurrence_interval);
                setRecurrenceUnit(vals.recurrence_unit);
                setRecurrenceDays(vals.recurrence_days);
                setRecurrenceEndDate(vals.recurrence_end_date);
                setRecurrenceEndsAfter(vals.recurrence_ends_after);
                save({
                  recurrence_type: "custom",
                  recurrence_interval: vals.recurrence_interval,
                  recurrence_unit: vals.recurrence_unit,
                  recurrence_days: vals.recurrence_days,
                  recurrence_end_date: vals.recurrence_end_date,
                  recurrence_ends_after: vals.recurrence_ends_after,
                });
              }}
            />

            {/* Restart column for recurrence */}
            {recurrenceType && (
              <div>
                <Label className="text-xs text-muted-foreground">Reiniciar en fase</Label>
                <Select
                  value={recurrenceRestartColumn || columns.filter(c => !c.is_final).sort((a, b) => a.position - b.position)[0]?.name || ""}
                  onValueChange={(v) => {
                    setRecurrenceRestartColumn(v);
                    save({ recurrence_restart_column: v });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {columns.filter(c => !c.is_final).sort((a, b) => a.position - b.position).map((c) => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Assignee */}
            <div>
              <Label className="text-xs text-muted-foreground">Asignado</Label>
              <Select value={assigneeId || "none"} onValueChange={(v) => {
                const newId = v === "none" ? null : v;
                setAssigneeId(newId);
                save({ assignee_id: newId });
                // Fire-and-forget email notification
                if (newId && newId !== user?.id) {
                  const assignerProfile = allProfiles?.find(p => p.user_id === user?.id);
                  supabase.functions.invoke("notify-task-assigned", {
                    body: {
                      task_id: task!.id,
                      task_title: title,
                      project_name: projectName || "",
                      assigned_to_user_id: newId,
                      assigned_by_name: assignerProfile?.full_name || "Alguien",
                      due_date: dueDate,
                      priority: task!.priority,
                    },
                  });
                }
              }}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Sin asignar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {(allProfiles ?? []).map((p) => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.full_name && p.email
                        ? `${p.full_name} - ${p.email}`
                        : p.full_name || p.email || p.user_id.slice(0, 6)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Labels */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Etiquetas</Label>
              <TaskLabelsPicker taskId={task.id} projectId={projectId} onManageLabels={onManageLabels} />
            </div>

            {/* Description - Rich Text */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Descripción</Label>
              <RichTextEditor
                content={description}
                onChange={(html) => {
                  setDescription(html);
                  debouncedSave({ description: html || null });
                }}
              />
            </div>

            {/* Subtasks */}
            <SubtasksSection taskId={task.id} members={members} onSaved={showSaved} />

            {/* Checklist */}
            <ChecklistSection items={checklist} onChange={handleChecklistChange} />

            {/* Attachments */}
            <AttachmentsSection taskId={task.id} projectId={task.project_id} onSaved={showSaved} />

            {/* Delete */}
            {(user?.id === task.created_by || user?.id === projectOwnerId) && (
              <div className="pt-4 border-t">
                <Button variant="destructive" size="sm" onClick={handleDelete} className="gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar tarea
                </Button>
              </div>
            )}
          </div>

          {/* Right column - Activity & Comments */}
          <div className="w-full md:w-[30%] flex flex-col overflow-hidden bg-[hsl(210_17%_98%)] dark:bg-muted/30">
            <ActivityFeed taskId={task.id} projectId={task.project_id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
