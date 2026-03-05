import { useState, useMemo } from "react";
import { useLabels, useTaskLabelsForProject, useAddTaskLabel, useRemoveTaskLabel, type Label } from "@/hooks/useLabels";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Plus, X, Settings } from "lucide-react";

interface Props {
  taskId: string;
  projectId: string;
  onManageLabels?: () => void;
}

export function TaskLabelsPicker({ taskId, projectId, onManageLabels }: Props) {
  const { data: labels = [] } = useLabels(projectId);
  const { data: allTaskLabels = [] } = useTaskLabelsForProject(projectId);
  const addTaskLabel = useAddTaskLabel();
  const removeTaskLabel = useRemoveTaskLabel();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const selectedLabelIds = useMemo(
    () => new Set(allTaskLabels.filter((tl) => tl.task_id === taskId).map((tl) => tl.label_id)),
    [allTaskLabels, taskId]
  );

  const selectedLabels = useMemo(
    () => labels.filter((l) => selectedLabelIds.has(l.id)),
    [labels, selectedLabelIds]
  );

  const filtered = useMemo(
    () => labels.filter((l) => l.name.toLowerCase().includes(search.toLowerCase())),
    [labels, search]
  );

  function toggle(label: Label) {
    if (selectedLabelIds.has(label.id)) {
      removeTaskLabel.mutate({ task_id: taskId, label_id: label.id, project_id: projectId });
    } else {
      addTaskLabel.mutate({ task_id: taskId, label_id: label.id, project_id: projectId });
    }
  }

  function removeLabel(labelId: string) {
    removeTaskLabel.mutate({ task_id: taskId, label_id: labelId, project_id: projectId });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {selectedLabels.map((l) => (
          <Badge
            key={l.id}
            className="text-[11px] px-2 py-0.5 border-0 gap-1 cursor-default"
            style={{ backgroundColor: l.color, color: "white" }}
          >
            {l.name}
            <button onClick={() => removeLabel(l.id)} className="ml-0.5 hover:opacity-70">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded border border-dashed border-muted-foreground/30 hover:border-muted-foreground/60">
              <Plus className="h-3 w-3" /> Etiqueta
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar etiqueta..."
              className="h-7 text-xs mb-2"
            />
            <div className="max-h-[200px] overflow-y-auto space-y-0.5">
              {filtered.map((l) => (
                <div
                  key={l.id}
                  role="button"
                  tabIndex={0}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-muted/50 transition-colors text-left cursor-pointer"
                  onClick={() => toggle(l)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(l); } }}
                >
                  <Checkbox checked={selectedLabelIds.has(l.id)} className="h-3.5 w-3.5 pointer-events-none" />
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                  <span className="text-xs truncate">{l.name}</span>
                </div>
              ))}
              {filtered.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">Sin resultados</p>
              )}
            </div>
            {onManageLabels && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-2 h-7 text-xs gap-1.5 text-muted-foreground"
                onClick={() => { setOpen(false); onManageLabels(); }}
              >
                <Settings className="h-3 w-3" /> Gestionar etiquetas
              </Button>
            )}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

/** Compact label pills for TaskCard */
export function TaskCardLabels({ taskId, labels, taskLabels }: { taskId: string; labels: Label[]; taskLabels: Array<{ task_id: string; label_id: string }> }) {
  const selected = useMemo(() => {
    const ids = new Set(taskLabels.filter((tl) => tl.task_id === taskId).map((tl) => tl.label_id));
    return labels.filter((l) => ids.has(l.id));
  }, [taskId, labels, taskLabels]);

  if (selected.length === 0) return null;

  const visible = selected.slice(0, 3);
  const extra = selected.length - 3;

  return (
    <div className="flex flex-wrap gap-1 mb-1.5">
      {visible.map((l) => (
        <span
          key={l.id}
          className="text-[10px] px-1.5 py-0 rounded-sm text-white font-medium leading-[18px]"
          style={{ backgroundColor: l.color }}
        >
          {l.name}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] px-1 py-0 rounded-sm bg-muted text-muted-foreground font-medium leading-[18px]">
          +{extra}
        </span>
      )}
    </div>
  );
}
