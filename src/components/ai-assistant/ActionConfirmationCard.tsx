import { Calendar, UserRound, Flag, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AssistantAction } from "@/hooks/useAssistantChat";

interface Props {
  actions: AssistantAction[];
  onConfirm: () => void;
  onCancel: () => void;
  handled?: boolean;
}

function formatDateDisplay(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return value;
}

const actionIcons: Record<string, typeof Calendar> = {
  update_due_date: Calendar,
  update_assignee: UserRound,
  update_priority: Flag,
};

export function ActionConfirmationCard({ actions, onConfirm, onCancel, handled }: Props) {
  if (handled) {
    return (
      <div className="rounded-lg border bg-muted/50 p-3 text-xs text-muted-foreground italic">
        Acciones procesadas
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2 mt-2">
      <p className="text-sm font-medium flex items-center gap-1.5">📋 Cambios propuestos</p>
      <div className="space-y-1.5">
        {actions.map((a, i) => {
          const Icon = actionIcons[a.type] || Flag;
          return (
            <div key={i} className="flex items-start gap-2 text-xs">
              <Icon className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
              <div>
                <span className="font-medium">{a.task_title}</span>
                <span className="text-muted-foreground ml-1">
                  {a.type === "update_due_date"
                    ? `${formatDateDisplay(a.current_value)} → ${formatDateDisplay(a.new_value)}`
                    : `${a.current_value} → ${a.new_value}`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" className="h-7 text-xs gap-1" onClick={onConfirm}>
          <Check className="h-3 w-3" /> Confirmar
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onCancel}>
          <X className="h-3 w-3" /> Cancelar
        </Button>
      </div>
    </div>
  );
}
