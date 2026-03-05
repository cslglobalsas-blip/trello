import { useState } from "react";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCreateColumn, useUpdateColumn, useDeleteColumn, useReorderColumns, type ProjectColumn } from "@/hooks/useProjectColumns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Trash2, GripVertical } from "lucide-react";

const COLORS = ["#94A3B8", "#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ProjectColumn[];
  projectId: string;
  taskCountByColumn: Record<string, number>;
}

function SortableColumnRow({ col, projectId, taskCountByColumn, updateCol, deleteCol }: {
  col: ProjectColumn;
  projectId: string;
  taskCountByColumn: Record<string, number>;
  updateCol: ReturnType<typeof useUpdateColumn>;
  deleteCol: ReturnType<typeof useDeleteColumn>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: col.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-2 ${isDragging ? "shadow-lg rounded-md bg-background z-10" : ""}`}>
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0 p-0.5"
        tabIndex={-1}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
      <Input
        defaultValue={col.name}
        className="h-8 text-sm"
        onBlur={(e) => {
          if (e.target.value !== col.name) updateCol.mutate({ id: col.id, project_id: projectId, name: e.target.value });
        }}
      />
      <select
        value={col.color}
        onChange={(e) => updateCol.mutate({ id: col.id, project_id: projectId, color: e.target.value })}
        className="h-8 w-8 p-0 border-0 bg-transparent cursor-pointer appearance-none"
        style={{ color: col.color }}
      >
        {COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar columna "{col.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {(taskCountByColumn[col.name] || 0) > 0
                ? `Esta columna tiene ${taskCountByColumn[col.name]} tarea(s). Se perderá la referencia de estado.`
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteCol.mutate({ id: col.id, project_id: projectId })}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export function ManageColumnsDialog({ open, onOpenChange, columns, projectId, taskCountByColumn }: Props) {
  const createCol = useCreateColumn();
  const updateCol = useUpdateColumn();
  const deleteCol = useDeleteColumn();
  const reorderCols = useReorderColumns();
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(COLORS[0]);

  const draggable = columns.filter((c) => !c.is_final);
  const fixed = columns.filter((c) => c.is_final);

  function handleAdd() {
    if (!newName.trim()) return;
    const finalCol = fixed[0];
    createCol.mutate({ project_id: projectId, name: newName.trim(), color: newColor, position: draggable.length, finalColumnId: finalCol?.id });
    setNewName("");
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = draggable.findIndex((c) => c.id === active.id);
    const newIndex = draggable.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(draggable, oldIndex, newIndex);
    reorderCols.mutate({
      project_id: projectId,
      columns: reordered.map((col, idx) => ({ id: col.id, position: idx })),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px]">
        <DialogHeader><DialogTitle>Gestionar Fases</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={draggable.map((c) => c.id)} strategy={verticalListSortingStrategy}>
              {draggable.map((col) => (
                <SortableColumnRow
                  key={col.id}
                  col={col}
                  projectId={projectId}
                  taskCountByColumn={taskCountByColumn}
                  updateCol={updateCol}
                  deleteCol={deleteCol}
                />
              ))}
            </SortableContext>
          </DndContext>
          {fixed.map((col) => (
            <div key={col.id} className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-muted-foreground opacity-30 cursor-not-allowed shrink-0" />
              <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: col.color }} />
              <Input defaultValue={col.name} className="h-8 text-sm opacity-60" readOnly />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nueva columna" className="h-8 text-sm" />
          <div className="flex gap-1 shrink-0">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`h-5 w-5 rounded-full border-2 transition-all ${newColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
                onClick={() => setNewColor(c)}
              />
            ))}
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!newName.trim()}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
