import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/hooks/useTasks";
import type { ProjectColumn } from "@/hooks/useProjectColumns";
import type { Label } from "@/hooks/useLabels";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { TaskCardLabels } from "./TaskLabelsPicker";
import { Calendar, Flag, ListChecks, Check, Trash2, RefreshCw, AlertTriangle } from "lucide-react";
import { format, isToday, isBefore, addDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";

function getDueDateDisplay(due_date: string) {
  const d = startOfDay(new Date(due_date + "T00:00:00"));
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  if (isBefore(d, today)) return { label: format(d, "d MMM", { locale: es }), className: "text-[#EF4444] bg-[#FEE2E2] rounded px-1.5 py-0.5", showWarning: false };
  if (isToday(d)) return { label: "Hoy", className: "text-[#2563EB] bg-[#DBEAFE] font-semibold rounded px-1.5 py-0.5", showWarning: false };
  if (d.getTime() === tomorrow.getTime()) return { label: "Mañana", className: "text-[#F59E0B] bg-[#FEF3C7] rounded px-1.5 py-0.5", showWarning: false };
  return { label: format(d, "d MMM", { locale: es }), className: "text-[#6B7280]", showWarning: false };
}

const priorityColor: Record<string, string> = {
  urgent: "text-red-500",
  high: "text-amber-500",
  medium: "text-blue-500",
  low: "text-gray-400",
};

const priorityLabel: Record<string, string> = {
  urgent: "Urgente",
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

interface TaskCardProps {
  task: Task;
  onTaskClick?: (task: Task) => void;
  subtaskCounts?: { completed: number; total: number };
  columns?: ProjectColumn[];
  projectOwnerId?: string;
  currentUserId?: string;
  onCompleteTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  labels?: Label[];
  taskLabels?: Array<{ task_id: string; label_id: string }>;
}

export const TaskCard = React.forwardRef<HTMLDivElement, TaskCardProps>(
  ({ task, onTaskClick, subtaskCounts, columns, projectOwnerId, currentUserId, onCompleteTask, onDeleteTask, labels, taskLabels }, forwardedRef) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: task.id,
      data: { type: "task", task },
    });

    const [completing, setCompleting] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    const finalColumn = columns?.find((c) => c.is_final);
    const isAlreadyFinal = finalColumn && task.status === finalColumn.name;
    const canDelete = currentUserId === task.created_by || currentUserId === projectOwnerId;

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    const mergedRef = (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    };

    const initials = (task.assignee?.full_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
    const allComplete = subtaskCounts && subtaskCounts.total > 0 && subtaskCounts.completed === subtaskCounts.total;

    const handleComplete = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isAlreadyFinal || !onCompleteTask) return;
      setCompleting(true);
      setTimeout(() => {
        onCompleteTask(task);
        setCompleting(false);
      }, 500);
    };

    const handleDeleteConfirm = (e: React.MouseEvent) => {
      e.stopPropagation();
      setDeleteOpen(false);
      onDeleteTask?.(task);
    };

    return (
      <div
        ref={mergedRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={() => { if (!isDragging) onTaskClick?.(task); }}
        className={`group relative rounded-lg bg-white border border-gray-100 p-3 shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing ${completing ? "animate-complete-flash" : ""}`}
      >
        {/* Hover action buttons */}
        {(onCompleteTask || onDeleteTask) && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
            {onCompleteTask && !isAlreadyFinal && (
              <button
                onClick={handleComplete}
                className="h-6 w-6 rounded-full flex items-center justify-center bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success))]/90 shadow-sm transition-colors"
                title="Completar tarea"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            )}
            {canDelete && onDeleteTask && (
              <Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
                <PopoverTrigger asChild>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleteOpen(true); }}
                    className="h-6 w-6 rounded-full flex items-center justify-center bg-white border border-gray-200 text-destructive hover:bg-destructive/10 shadow-sm transition-colors"
                    title="Eliminar tarea"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-3" side="top" align="end" onClick={(e) => e.stopPropagation()}>
                  <p className="text-sm font-medium mb-2">¿Eliminar esta tarea?</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setDeleteOpen(false); }}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteConfirm}>
                      Eliminar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
        )}

        {labels && taskLabels && (
          <TaskCardLabels taskId={task.id} labels={labels} taskLabels={taskLabels} />
        )}
        <p className="text-sm font-semibold leading-tight mb-2 pr-14">{task.title}</p>

        <div className="flex items-center gap-2">
          {task.assignee_id && task.assignee && (
            <Avatar className="h-6 w-6">
              {task.assignee.avatar_url ? (
                <AvatarImage src={task.assignee.avatar_url} alt={task.assignee.full_name || ""} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{initials}</AvatarFallback>
            </Avatar>
          )}

          {task.due_date && (() => {
            const dd = getDueDateDisplay(task.due_date);
            const finalDd = isAlreadyFinal
              ? { ...dd, className: "text-[#16A34A] bg-[#DCFCE7] rounded px-1.5 py-0.5" }
              : dd;
            return (
              <span className={`flex items-center gap-1 text-[11px] ${finalDd.className}`}>
                {finalDd.showWarning ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                {finalDd.label}
              </span>
            );
          })()}

          {subtaskCounts && subtaskCounts.total > 0 && (
            <span className={`flex items-center gap-1 text-[11px] ${allComplete ? "text-green-600" : "text-gray-400"}`}>
              <ListChecks className="h-3 w-3" />
              {subtaskCounts.completed}/{subtaskCounts.total}
            </span>
          )}

          {task.recurrence_type && <RefreshCw className="h-3 w-3 text-purple-400" />}
          <span className={`flex items-center gap-1 ml-auto text-[11px] ${priorityColor[task.priority] || priorityColor.medium}`}>
            <Flag className="h-3.5 w-3.5" fill="currentColor" />
            {priorityLabel[task.priority] || "Media"}
          </span>
        </div>
      </div>
    );
  }
);

TaskCard.displayName = "TaskCard";
