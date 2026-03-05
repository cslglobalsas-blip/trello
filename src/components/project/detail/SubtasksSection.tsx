import { useState, useRef } from "react";
import { useSubtasks, useCreateSubtask, useUpdateSubtask, useDeleteSubtask } from "@/hooks/useSubtasks";
import type { ProjectMember } from "@/hooks/useProjectMembers";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, Trash2 } from "lucide-react";

interface Props {
  taskId: string;
  members: ProjectMember[];
  onSaved?: () => void;
}

export function SubtasksSection({ taskId, members, onSaved }: Props) {
  const { data: subtasks = [] } = useSubtasks(taskId);
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();
  const [open, setOpen] = useState(true);
  const newInputRef = useRef<HTMLInputElement>(null);

  const completed = subtasks.filter((s) => s.completed).length;
  const total = subtasks.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  function addSubtask() {
    createSubtask.mutate(
      { task_id: taskId, title: "", position: subtasks.length },
      { onSuccess: () => setTimeout(() => newInputRef.current?.focus(), 100) }
    );
    onSaved?.();
  }

  function update(id: string, updates: Record<string, any>) {
    updateSubtask.mutate({ id, task_id: taskId, ...updates });
    onSaved?.();
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium hover:text-foreground text-muted-foreground">
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} />
        Subtareas
        {total > 0 && (
          <span className="text-xs ml-auto">{completed}/{total} completadas</span>
        )}
      </CollapsibleTrigger>
      {total > 0 && <Progress value={pct} className="h-1.5 mt-1.5" />}
      <CollapsibleContent className="mt-2 space-y-1">
        {subtasks.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2 group">
            <Checkbox
              checked={s.completed}
              onCheckedChange={(v) => update(s.id, { completed: !!v })}
            />
            <Input
              ref={i === subtasks.length - 1 ? newInputRef : undefined}
              defaultValue={s.title}
              placeholder="Título de subtarea..."
              className="h-7 text-xs border-0 px-1 shadow-none focus-visible:ring-1"
              onBlur={(e) => {
                if (e.target.value !== s.title) update(s.id, { title: e.target.value });
              }}
            />
            <Select
              value={s.assignee_id || "none"}
              onValueChange={(v) => update(s.id, { assignee_id: v === "none" ? null : v })}
            >
              <SelectTrigger className="h-7 text-[10px] w-24 shrink-0">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.user_id} value={m.user_id}>
                    {m.profile?.full_name || m.user_id.slice(0, 6)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={s.due_date || ""}
              onChange={(e) => update(s.id, { due_date: e.target.value || null })}
              className="h-7 text-[10px] w-28 shrink-0"
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
              onClick={() => { deleteSubtask.mutate({ id: s.id, task_id: taskId }); onSaved?.(); }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={addSubtask}>
          <Plus className="h-3 w-3" /> Agregar subtarea
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
