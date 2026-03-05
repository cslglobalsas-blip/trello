import { useState, useMemo } from "react";
import type { Task } from "@/hooks/useTasks";
import type { ProjectColumn } from "@/hooks/useProjectColumns";
import { useUpdateTask, useDeleteTask } from "@/hooks/useTasks";
import { useCommentCounts } from "@/hooks/useCommentCounts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronRight, Flag, MessageSquare, Check, Pencil, Trash2, Plus, RefreshCw } from "lucide-react";
import { format, isBefore, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

const priorityConfig: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgente", color: "text-destructive" },
  high: { label: "Alta", color: "text-yellow-500" },
  medium: { label: "Normal", color: "text-blue-500" },
  low: { label: "Baja", color: "text-muted-foreground" },
};

interface ListViewProps {
  tasks: Task[];
  columns: ProjectColumn[];
  projectId: string;
  onTaskClick?: (task: Task) => void;
  isMember?: boolean;
  onAddTask?: (status: string) => void;
  projectOwnerId?: string;
  currentUserId?: string;
}

export function ListView({
  tasks,
  columns,
  projectId,
  onTaskClick,
  isMember,
  onAddTask,
  projectOwnerId,
  currentUserId,
}: ListViewProps) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const { data: commentCounts = {} } = useCommentCounts(projectId);
  const [collapsedPhases, setCollapsedPhases] = useState<Set<string>>(new Set());

  const finalColumn = useMemo(() => columns.find((c) => c.is_final), [columns]);

  const grouped = useMemo(() => {
    return columns.map((col) => ({
      column: col,
      tasks: tasks
        .filter((t) => t.status === col.name)
        .sort((a, b) => a.position - b.position),
    }));
  }, [tasks, columns]);

  function togglePhase(colId: string) {
    setCollapsedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  }

  function handleComplete(task: Task) {
    if (!finalColumn) return;
    updateTask.mutate({ id: task.id, project_id: projectId, status: finalColumn.name });
  }

  function handleDelete(task: Task) {
    deleteTask.mutate({ id: task.id, project_id: projectId });
  }

  function canDelete(task: Task) {
    if (!currentUserId) return false;
    return task.created_by === currentUserId || projectOwnerId === currentUserId;
  }

  return (
    <div className="space-y-2">
      {grouped.map(({ column: col, tasks: phaseTasks }) => {
        const isOpen = !collapsedPhases.has(col.id);
        const isFinal = col.is_final;

        return (
          <Collapsible key={col.id} open={isOpen} onOpenChange={() => togglePhase(col.id)}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 w-full px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-left">
                <ChevronRight
                  className={cn(
                    "h-4 w-4 shrink-0 transition-transform",
                    isOpen && "rotate-90"
                  )}
                />
                <span
                  className="h-3 w-3 rounded-sm shrink-0"
                  style={{ backgroundColor: col.color }}
                />
                <span className="font-semibold text-sm">{col.name}</span>
                <span className="text-xs text-muted-foreground">({phaseTasks.length})</span>
              </button>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="rounded-lg border ml-4 mt-1 mb-2 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[280px]">Nombre</TableHead>
                      <TableHead className="w-[140px]">Fecha límite</TableHead>
                      <TableHead className="w-[120px]">Prioridad</TableHead>
                      <TableHead className="w-[130px]">Creación</TableHead>
                      <TableHead className="w-[160px]">Asignado</TableHead>
                      <TableHead className="w-[70px]">
                        <MessageSquare className="h-3.5 w-3.5" />
                      </TableHead>
                      <TableHead className="w-[100px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {phaseTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-6 text-sm">
                          Sin tareas en esta fase
                        </TableCell>
                      </TableRow>
                    ) : (
                      phaseTasks.map((t) => {
                        const prio = priorityConfig[t.priority] || priorityConfig.medium;
                        const initials = (t.assignee?.full_name || "?")
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();
                        const isOverdue =
                          t.due_date &&
                          isBefore(
                            new Date(t.due_date + "T00:00:00"),
                            startOfDay(new Date())
                          );
                        const mutedRow = isFinal;

                        return (
                          <TableRow key={t.id} className="group">
                            {/* Nombre */}
                            <TableCell
                              className={cn(
                                "font-medium cursor-pointer hover:underline",
                                mutedRow && "text-muted-foreground"
                              )}
                              onClick={() => onTaskClick?.(t)}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: col.color }}
                                />
                                {t.title}
                              </div>
                            </TableCell>

                            {/* Fecha límite */}
                            <TableCell
                              className={cn(
                                "text-xs",
                                mutedRow
                                  ? "text-muted-foreground"
                                  : isOverdue
                                  ? "text-destructive font-medium"
                                  : ""
                              )}
                            >
                              {t.due_date ? (
                                <span className="flex items-center gap-1">
                                  {format(new Date(t.due_date + "T00:00:00"), "d MMM yyyy", { locale: es })}
                                  {t.recurrence_type && <RefreshCw className="h-3 w-3 text-purple-400" />}
                                </span>
                              ) : "—"}
                            </TableCell>

                            {/* Prioridad */}
                            <TableCell>
                              <div
                                className={cn(
                                  "flex items-center gap-1 text-xs",
                                  mutedRow ? "text-muted-foreground" : prio.color
                                )}
                              >
                                <Flag className="h-3 w-3" />
                                {prio.label}
                              </div>
                            </TableCell>

                            {/* Fecha creación */}
                            <TableCell
                              className={cn(
                                "text-xs",
                                mutedRow && "text-muted-foreground"
                              )}
                            >
                              {format(
                                new Date(t.created_at),
                                "d MMM yyyy",
                                { locale: es }
                              )}
                            </TableCell>

                            {/* Asignado */}
                            <TableCell>
                              {t.assignee_id ? (
                                <div className="flex items-center gap-1.5">
                                  <Avatar className="h-5 w-5">
                                    {t.assignee?.avatar_url && (
                                      <AvatarImage
                                        src={t.assignee.avatar_url}
                                        alt={t.assignee?.full_name || ""}
                                      />
                                    )}
                                    <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                                      {initials}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span
                                    className={cn(
                                      "text-xs",
                                      mutedRow && "text-muted-foreground"
                                    )}
                                  >
                                    {t.assignee?.full_name || "—"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>

                            {/* Comentarios */}
                            <TableCell className="text-xs text-muted-foreground">
                              {commentCounts[t.id] ? (
                                <span className="flex items-center gap-0.5">
                                  <MessageSquare className="h-3 w-3" />
                                  {commentCounts[t.id]}
                                </span>
                              ) : null}
                            </TableCell>

                            {/* Acciones hover */}
                            <TableCell>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!isFinal && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    title="Completar"
                                    onClick={() => handleComplete(t)}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  title="Editar"
                                  onClick={() => onTaskClick?.(t)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {canDelete(t) && (
                                  <DeleteConfirm onConfirm={() => handleDelete(t)} />
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>

                {isMember && onAddTask && (
                  <button
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-4 py-2 w-full border-t transition-colors"
                    onClick={() => onAddTask(col.name)}
                  >
                    <Plus className="h-3 w-3" />
                    Agregar Tarea
                  </button>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}

function DeleteConfirm({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" title="Eliminar">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" side="left">
        <p className="text-sm mb-2">¿Eliminar esta tarea?</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            Eliminar
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
