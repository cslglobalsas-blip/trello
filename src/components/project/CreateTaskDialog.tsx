import { useState } from "react";
import { useCreateTask } from "@/hooks/useTasks";
import type { ProjectColumn } from "@/hooks/useProjectColumns";
import type { ProjectMember } from "@/hooks/useProjectMembers";
import { useLabels, useAddTaskLabel, type Label } from "@/hooks/useLabels";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/project/detail/RichTextEditor";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label as FormLabel } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useAllProfiles } from "@/hooks/useAllProfiles";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  columns: ProjectColumn[];
  members: ProjectMember[];
  defaultStatus?: string;
  projectName?: string;
}

export function CreateTaskDialog({ open, onOpenChange, projectId, columns, members, defaultStatus, projectName }: Props) {
  const { user } = useAuth();
  const createTask = useCreateTask();
  const addTaskLabel = useAddTaskLabel();
  const { data: allProfiles } = useAllProfiles(open);
  const { data: projectLabels = [] } = useLabels(projectId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(defaultStatus || columns[0]?.name || "");
  const [priority, setPriority] = useState("medium");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [selectedLabelIds, setSelectedLabelIds] = useState<string[]>([]);
  const [labelSearch, setLabelSearch] = useState("");
  const [labelPickerOpen, setLabelPickerOpen] = useState(false);

  function toggleLabel(labelId: string) {
    setSelectedLabelIds((prev) => prev.includes(labelId) ? prev.filter((l) => l !== labelId) : [...prev, labelId]);
  }

  const filteredLabels = projectLabels.filter((l) => l.name.toLowerCase().includes(labelSearch.toLowerCase()));
  const selectedLabels = projectLabels.filter((l) => selectedLabelIds.includes(l.id));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    createTask.mutate(
      {
        project_id: projectId, title: title.trim(), description, status, priority,
        start_date: startDate || null, due_date: dueDate || null,
        assignee_id: assigneeId || null, labels: [],
      },
      {
        onSuccess: (_, vars) => {
          // Add labels to junction table
          if (selectedLabelIds.length > 0) {
            // We need to find the created task - query latest
            supabase.from("tasks").select("id").eq("project_id", projectId).eq("title", title.trim()).order("created_at", { ascending: false }).limit(1).then(({ data }: { data: { id: string }[] | null }) => {
              if (data?.[0]) {
                selectedLabelIds.forEach((labelId) => {
                  addTaskLabel.mutate({ task_id: data[0].id, label_id: labelId, project_id: projectId });
                });
              }
            });
          }
          // Fire-and-forget email notification
          if (assigneeId && assigneeId !== user?.id) {
            const assignerProfile = allProfiles?.find(p => p.user_id === user?.id);
            supabase.functions.invoke("notify-task-assigned", {
              body: {
                task_id: "",
                task_title: title.trim(),
                project_name: projectName || "",
                assigned_to_user_id: assigneeId,
                assigned_by_name: assignerProfile?.full_name || "Alguien",
                due_date: dueDate || null,
                priority,
              },
            });
          }
          onOpenChange(false);
          setTitle(""); setDescription(""); setStartDate(""); setDueDate(""); setAssigneeId(""); setSelectedLabelIds([]); setLabelSearch("");
        },
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px]">
        <DialogHeader><DialogTitle>Nueva Tarea</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <FormLabel>Título *</FormLabel>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nombre de la tarea" />
          </div>
          <div>
            <FormLabel>Descripción</FormLabel>
            <RichTextEditor content={description} onChange={setDescription} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel>Estado</FormLabel>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {columns.map((c) => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <FormLabel>Prioridad</FormLabel>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel>Fecha de inicio</FormLabel>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <FormLabel>Fecha de vencimiento</FormLabel>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <FormLabel>Etiquetas</FormLabel>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {selectedLabels.map((l) => (
                <Badge
                  key={l.id}
                  className="text-[11px] px-2 py-0.5 border-0 gap-1 cursor-default"
                  style={{ backgroundColor: l.color, color: "white" }}
                >
                  {l.name}
                  <button type="button" onClick={() => toggleLabel(l.id)} className="ml-0.5 hover:opacity-70">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <Popover open={labelPickerOpen} onOpenChange={setLabelPickerOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border border-dashed border-muted-foreground/30 hover:border-muted-foreground/60">
                    <Plus className="h-3 w-3" /> Etiqueta
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="start">
                  <Input
                    value={labelSearch}
                    onChange={(e) => setLabelSearch(e.target.value)}
                    placeholder="Buscar etiqueta..."
                    className="h-7 text-xs mb-2"
                  />
                  <div className="max-h-[200px] overflow-y-auto space-y-0.5">
                    {filteredLabels.map((l) => (
                      <div
                        key={l.id}
                        role="button"
                        tabIndex={0}
                        className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-left cursor-pointer"
                        onClick={() => toggleLabel(l.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleLabel(l.id); } }}
                      >
                        <Checkbox checked={selectedLabelIds.includes(l.id)} className="h-3.5 w-3.5 pointer-events-none" />
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                        <span className="text-xs truncate">{l.name}</span>
                      </div>
                    ))}
                    {filteredLabels.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">Sin resultados</p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <FormLabel>Asignado</FormLabel>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue placeholder="Sin asignar" /></SelectTrigger>
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
          </div>
          <Button type="submit" className="w-full" disabled={createTask.isPending}>
            {createTask.isPending ? "Creando..." : "Crear Tarea"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
