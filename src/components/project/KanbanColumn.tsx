import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { ProjectColumn } from "@/hooks/useProjectColumns";
import { useUpdateColumn, useDeleteColumn } from "@/hooks/useProjectColumns";
import type { Task } from "@/hooks/useTasks";
import type { SubtaskCounts } from "@/hooks/useSubtaskCounts";
import type { Label } from "@/hooks/useLabels";
import { TaskCard } from "./TaskCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899", "#8b5cf6", "#64748b"];

interface Props {
  column: ProjectColumn;
  tasks: Task[];
  onAddTask: (status: string) => void;
  isMember: boolean;
  onTaskClick?: (task: Task) => void;
  subtaskCounts?: SubtaskCounts;
  projectId: string;
  columns?: ProjectColumn[];
  projectOwnerId?: string;
  currentUserId?: string;
  onCompleteTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  labels?: Label[];
  taskLabels?: Array<{ task_id: string; label_id: string }>;
}

export function KanbanColumn({ column, tasks, onAddTask, isMember, onTaskClick, subtaskCounts, projectId, columns, projectOwnerId, currentUserId, onCompleteTask, onDeleteTask, labels, taskLabels }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.name, data: { type: "column", column } });

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [editColor, setEditColor] = useState(column.color);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();

  const handleSave = () => {
    if (!editName.trim()) return;
    updateColumn.mutate({ id: column.id, project_id: projectId, name: editName.trim(), color: editColor });
    setEditOpen(false);
  };

  const handleDelete = () => {
    deleteColumn.mutate({ id: column.id, project_id: projectId });
    setDeleteOpen(false);
  };

  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] shrink-0 bg-[#F4F5F7] rounded-xl p-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: column.color }} />
        <h3 className="uppercase text-xs font-bold tracking-wide text-gray-600 truncate">{column.name}</h3>
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{tasks.length}</Badge>
        <div className="ml-auto flex items-center gap-0.5">
          {isMember && !column.is_final && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem onClick={() => { setEditName(column.name); setEditColor(column.color); setEditOpen(true); }}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {isMember && (
            <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-gray-600" onClick={() => onAddTask(column.name)}>
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 space-y-2.5 rounded-lg min-h-[120px] transition-colors ${isOver ? "bg-primary/5 ring-2 ring-primary/20" : ""}`}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} subtaskCounts={subtaskCounts?.[task.id]} columns={columns} projectOwnerId={projectOwnerId} currentUserId={currentUserId} onCompleteTask={onCompleteTask} onDeleteTask={onDeleteTask} labels={labels} taskLabels={taskLabels} />
          ))}
        </SortableContext>
        {isMember && (
          <Button variant="ghost" size="sm" className="w-full text-gray-400 text-xs mt-1 hover:text-gray-600" onClick={() => onAddTask(column.name)}>
            <Plus className="h-3 w-3 mr-1" /> Agregar tarea
          </Button>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar columna</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre de columna" />
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className={`h-6 w-6 rounded-full border-2 transition-all ${editColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setEditColor(c)}
                />
              ))}
            </div>
            <Button onClick={handleSave} className="w-full" disabled={!editName.trim()}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar columna "{column.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {tasks.length > 0
                ? `Esta columna tiene ${tasks.length} tarea(s). Se eliminarán o quedarán sin estado.`
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
