import { useState, useRef, useCallback } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Plus, Trash2, GripVertical } from "lucide-react";

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

interface Props {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
}

export function ChecklistSection({ items, onChange }: Props) {
  const [open, setOpen] = useState(true);
  const newInputRef = useRef<HTMLInputElement>(null);

  const completed = items.filter((i) => i.checked).length;
  const total = items.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  const update = useCallback(
    (id: string, patch: Partial<ChecklistItem>) => {
      onChange(items.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    },
    [items, onChange]
  );

  function addItem() {
    const newItem: ChecklistItem = { id: crypto.randomUUID(), text: "", checked: false };
    onChange([...items, newItem]);
    setTimeout(() => newInputRef.current?.focus(), 100);
  }

  function removeItem(id: string) {
    onChange(items.filter((i) => i.id !== id));
  }

  function moveItem(index: number, dir: -1 | 1) {
    const newIndex = index + dir;
    if (newIndex < 0 || newIndex >= items.length) return;
    const copy = [...items];
    [copy[index], copy[newIndex]] = [copy[newIndex], copy[index]];
    onChange(copy);
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium hover:text-foreground text-muted-foreground">
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} />
        Lista de control
        {total > 0 && (
          <span className="text-xs ml-auto">{completed}/{total}</span>
        )}
      </CollapsibleTrigger>
      {total > 0 && <Progress value={pct} className="h-1.5 mt-1.5" />}
      <CollapsibleContent className="mt-2 space-y-1">
        {items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-1.5 group">
            <button
              className="cursor-grab opacity-0 group-hover:opacity-50 hover:!opacity-100"
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => moveItem(i, -1)}
              title="Mover arriba"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </button>
            <Checkbox
              checked={item.checked}
              onCheckedChange={(v) => update(item.id, { checked: !!v })}
            />
            <Input
              ref={i === items.length - 1 ? newInputRef : undefined}
              defaultValue={item.text}
              placeholder="Elemento..."
              className="h-7 text-xs border-0 px-1 shadow-none focus-visible:ring-1"
              onBlur={(e) => {
                if (e.target.value !== item.text) update(item.id, { text: e.target.value });
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={addItem}>
          <Plus className="h-3 w-3" /> Agregar elemento
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
