import { useMemo, useRef, useState } from "react";
import type { Task } from "@/hooks/useTasks";
import type { ProjectColumn } from "@/hooks/useProjectColumns";
import type { ProjectMember } from "@/hooks/useProjectMembers";
import { GanttTimeline, getCellWidth, getTotalDays, type ViewMode } from "./gantt/GanttTimeline";
import { GanttTaskRow } from "./gantt/GanttTaskRow";
import { GanttTodayLine } from "./gantt/GanttTodayLine";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { addDays, subDays, format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  tasks: Task[];
  columns: ProjectColumn[];
  members: ProjectMember[];
  onTaskClick: (task: Task) => void;
}

const ROW_H = 36;

export function GanttView({ tasks, columns, members, onTaskClick }: Props) {
  const [mode, setMode] = useState<ViewMode>("day");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { timelineStart, timelineEnd, grouped } = useMemo(() => {
    const parseDate = (d: string) => {
      if (d.includes("T")) return new Date(d);
      return new Date(d + "T00:00:00");
    };
    let minD = new Date();
    let maxD = new Date();
    let hasAny = false;

    tasks.forEach((t) => {
      const s = parseDate(t.start_date || t.created_at);
      const e = t.due_date ? parseDate(t.due_date) : s;
      if (!hasAny || s < minD) minD = s;
      if (!hasAny || e > maxD) maxD = e;
      hasAny = true;
    });

    const timelineStart = subDays(minD, 7);
    const timelineEnd = addDays(maxD, 7);

    const grouped: { column: ProjectColumn; tasks: Task[] }[] = columns.map((col) => ({
      column: col,
      tasks: tasks.filter((t) => t.status === col.name),
    }));

    return { timelineStart, timelineEnd, grouped };
  }, [tasks, columns]);

  const cellWidth = getCellWidth(mode);
  const totalDays = getTotalDays(timelineStart, timelineEnd);
  const totalWidth = mode === "day"
    ? totalDays * cellWidth
    : mode === "week"
    ? Math.ceil(totalDays / 7) * cellWidth
    : Math.ceil(totalDays / 30) * cellWidth;

  const todayOffset = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24));
    return diff * cellWidth;
  })();

  // Build flat list of rows for the left panel
  const rows: { type: "header"; column: ProjectColumn } | { type: "task"; task: Task }[] = [];
  grouped.forEach(({ column, tasks: gTasks }) => {
    rows.push({ type: "header", column } as any);
    gTasks.forEach((t) => rows.push({ type: "task", task: t } as any));
  });

  return (
    <TooltipProvider delayDuration={200}>
      <div className="border border-border rounded-lg overflow-hidden bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
          <span className="text-sm font-medium text-foreground capitalize">
            {format(new Date(), "MMMM yyyy", { locale: es })}
          </span>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => v && setMode(v as ViewMode)}
            size="sm"
          >
            <ToggleGroupItem value="day" className="text-xs">Día</ToggleGroupItem>
            <ToggleGroupItem value="week" className="text-xs">Semana</ToggleGroupItem>
            <ToggleGroupItem value="month" className="text-xs">Mes</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex overflow-hidden">
          {/* Left panel */}
          <div className="w-[250px] flex-shrink-0 border-r border-border overflow-y-auto">
            {/* Spacer for timeline header */}
            <div className="h-[42px] border-b border-border bg-muted/50 flex items-center px-3 text-[10px] font-medium text-muted-foreground">
              Tarea
            </div>
            {rows.map((row, i) => {
              if ((row as any).type === "header") {
                const col = (row as any).column as ProjectColumn;
                return (
                  <div
                    key={`h-${col.id}`}
                    className="h-7 flex items-center px-3 bg-muted/40 border-b border-border"
                  >
                    <div className="h-2.5 w-2.5 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: col.color }} />
                    <span className="text-[11px] font-semibold text-foreground truncate">{col.name}</span>
                  </div>
                );
              }
              const task = (row as any).task as Task;
              return (
                <div
                  key={task.id}
                  className="h-9 flex items-center px-3 gap-2 border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => onTaskClick(task)}
                >
                  <span className="text-xs text-foreground truncate flex-1">{task.title}</span>
                  {task.assignee && (
                    <Avatar className="h-5 w-5 flex-shrink-0">
                      <AvatarImage src={task.assignee.avatar_url || undefined} />
                      <AvatarFallback className="text-[8px]">
                        {(task.assignee.full_name || "?")[0]}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right panel - timeline */}
          <div className="flex-1 overflow-x-auto" ref={scrollRef}>
            <div style={{ width: totalWidth, minWidth: totalWidth }} className="relative">
              <GanttTimeline start={timelineStart} end={timelineEnd} mode={mode} />

              <div className="relative">
                {mode === "day" && todayOffset > 0 && (
                  <GanttTodayLine left={todayOffset} height={rows.length * ROW_H + grouped.length * 28} />
                )}

                {rows.map((row, i) => {
                  if ((row as any).type === "header") {
                    const col = (row as any).column as ProjectColumn;
                    return <div key={`rh-${col.id}`} className="h-7 border-b border-border bg-muted/40" />;
                  }
                  const task = (row as any).task as Task;
                  return (
                    <div key={task.id} className="border-b border-border/50">
                      <GanttTaskRow
                        task={task}
                        timelineStart={timelineStart}
                        cellWidth={cellWidth}
                        onTaskClick={onTaskClick}
                      />
                    </div>
                  );
                })}

                {/* Grid lines for day mode */}
                {mode === "day" && (
                  <div className="absolute inset-0 pointer-events-none" style={{ width: totalWidth }}>
                    {Array.from({ length: totalDays }).map((_, i) => (
                      <div
                        key={i}
                        className="absolute top-0 bottom-0 border-r border-border/20"
                        style={{ left: i * cellWidth }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {tasks.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            No hay tareas en este proyecto.
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
