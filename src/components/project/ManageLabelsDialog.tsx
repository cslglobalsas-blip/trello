import { useState } from "react";
import { useLabels, useCreateLabel, useUpdateLabel, useDeleteLabel, type Label } from "@/hooks/useLabels";
import { useTaskLabelsForProject } from "@/hooks/useLabels";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PRESET_COLORS = [
  "#EF4444", "#F97316", "#EAB308", "#22C55E",
  "#3B82F6", "#8B5CF6", "#EC4899", "#64748B",
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

export function ManageLabelsDialog({ open, onOpenChange, projectId }: Props) {
  const { data: labels = [] } = useLabels(projectId);
  const { data: taskLabels = [] } = useTaskLabelsForProject(projectId);
  const createLabel = useCreateLabel();
  const updateLabel = useUpdateLabel();
  const deleteLabel = useDeleteLabel();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState(PRESET_COLORS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [customHex, setCustomHex] = useState("");
  const [editCustomHex, setEditCustomHex] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Label | null>(null);

  function startEdit(label: Label) {
    setEditingId(label.id);
    setEditName(label.name);
    setEditColor(label.color);
    setEditCustomHex("");
    setIsCreating(false);
  }

  function saveEdit() {
    if (!editingId || !editName.trim()) return;
    const color = editCustomHex && /^#[0-9A-Fa-f]{6}$/.test(editCustomHex) ? editCustomHex : editColor;
    updateLabel.mutate({ id: editingId, project_id: projectId, name: editName.trim(), color });
    setEditingId(null);
  }

  function handleCreate() {
    if (!newName.trim()) return;
    const color = customHex && /^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : newColor;
    createLabel.mutate({ name: newName.trim(), color, project_id: projectId });
    setNewName("");
    setNewColor(PRESET_COLORS[0]);
    setCustomHex("");
    setIsCreating(false);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteLabel.mutate({ id: deleteTarget.id, project_id: projectId });
    setDeleteTarget(null);
  }

  function getUsageCount(labelId: string) {
    return taskLabels.filter((tl) => tl.label_id === labelId).length;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar etiquetas</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {labels.map((label) => (
              <div key={label.id}>
                {editingId === label.id ? (
                  <div className="space-y-2 p-2 rounded-lg border bg-muted/30">
                    <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre" className="h-8 text-sm" />
                    <div className="flex gap-1.5 flex-wrap items-center">
                      {PRESET_COLORS.map((c) => (
                        <button key={c} className={`h-6 w-6 rounded-full border-2 transition-all ${editColor === c && !editCustomHex ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} onClick={() => { setEditColor(c); setEditCustomHex(""); }} />
                      ))}
                      <Input value={editCustomHex} onChange={(e) => setEditCustomHex(e.target.value)} placeholder="#hex" className="h-6 w-20 text-xs px-1.5" />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={saveEdit}><Check className="h-3 w-3" />Guardar</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setEditingId(null)}><X className="h-3 w-3" />Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 group">
                    <span className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: label.color }} />
                    <span className="text-sm flex-1 truncate">{label.name}</span>
                    <span className="text-[10px] text-muted-foreground">{getUsageCount(label.id)} tareas</span>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-muted rounded" onClick={() => startEdit(label)}>
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded" onClick={() => setDeleteTarget(label)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isCreating ? (
            <div className="space-y-2 p-2 rounded-lg border bg-muted/30">
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre de etiqueta" className="h-8 text-sm" autoFocus />
              <div className="flex gap-1.5 flex-wrap items-center">
                {PRESET_COLORS.map((c) => (
                  <button key={c} className={`h-6 w-6 rounded-full border-2 transition-all ${newColor === c && !customHex ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} onClick={() => { setNewColor(c); setCustomHex(""); }} />
                ))}
                <Input value={customHex} onChange={(e) => setCustomHex(e.target.value)} placeholder="#hex" className="h-6 w-20 text-xs px-1.5" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="h-7 text-xs gap-1" onClick={handleCreate} disabled={!newName.trim()}><Check className="h-3 w-3" />Crear</Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={() => setIsCreating(false)}><X className="h-3 w-3" />Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => { setIsCreating(true); setEditingId(null); }}>
              <Plus className="h-3.5 w-3.5" /> Nueva etiqueta
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar etiqueta "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && getUsageCount(deleteTarget.id) > 0
                ? `Esta etiqueta está asignada a ${getUsageCount(deleteTarget.id)} tarea(s). Se eliminará de todas ellas.`
                : "Esta acción no se puede deshacer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
