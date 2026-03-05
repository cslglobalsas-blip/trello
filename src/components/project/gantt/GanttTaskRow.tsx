import type { Task } from "@/hooks/useTasks";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Diamond } from "lucide-react";

const PRIORITY_COLORS: Record<string, string> = {
  alta: "#F59E0B",
  normal: "#0052CC",
  baja: "#94A3B8",
};

interface Props {
  task: Task;
  timelineStart: Date;
  cellWidth: number;
  onTaskClick: (task: Task) => void;
}

export function GanttTaskRow({ task, timelineStart, cellWidth, onTaskClick }: Props) {
  const parseDate = (d: string) => {
    if (d.includes("T")) return new Date(d);
    return new Date(d + "T00:00:00");
  };
  const startDate = parseDate(task.start_date || task.created_at);
  const hasDue = !!task.due_date;
  const endDate = hasDue ? parseDate(task.due_date!) : startDate;

  const daysDiff = (d: Date) =>
    Math.floor((d.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));

  const leftDays = daysDiff(startDate);
  const durationDays = hasDue ? Math.max(daysDiff(endDate) - leftDays + 1, 1) : 0;

  const left = leftDays * cellWidth;
  const width = durationDays * cellWidth;
  const color = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.normal;

  const tooltipContent = (
    <div className="space-y-1 text-xs max-w-[220px]">
      <p className="font-semibold truncate">{task.title}</p>
      {task.assignee && (
        <div className="flex items-center gap-1.5">
          <Avatar className="h-4 w-4">
            <AvatarImage src={task.assignee.avatar_url || undefined} />
            <AvatarFallback className="text-[8px]">
              {(task.assignee.full_name || "?")[0]}
            </AvatarFallback>
          </Avatar>
          <span>{task.assignee.full_name || "Sin asignar"}</span>
        </div>
      )}
      <p>Inicio: {format(startDate, "dd MMM yyyy", { locale: es })}</p>
      {hasDue && <p>Fin: {format(endDate, "dd MMM yyyy", { locale: es })}</p>}
      <p className="capitalize">Prioridad: {task.priority}</p>
    </div>
  );

  return (
    <div className="h-9 relative flex items-center">
      <Tooltip>
        <TooltipTrigger asChild>
          {hasDue ? (
            <div
              className="absolute h-6 rounded cursor-pointer hover:opacity-80 transition-opacity flex items-center px-1.5 overflow-hidden"
              style={{ left, width: Math.max(width, 8), backgroundColor: color }}
              onClick={() => onTaskClick(task)}
            >
              {width > 60 && (
                <span className="text-white text-[10px] font-medium truncate">
                  {task.title}
                </span>
              )}
            </div>
          ) : (
            <div
              className="absolute cursor-pointer hover:opacity-80 transition-opacity"
              style={{ left: left - 6 }}
              onClick={() => onTaskClick(task)}
            >
              <Diamond className="h-5 w-5" style={{ color, fill: color }} />
            </div>
          )}
        </TooltipTrigger>
        <TooltipContent side="top">{tooltipContent}</TooltipContent>
      </Tooltip>
    </div>
  );
}
