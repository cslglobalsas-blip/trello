'use client'

import { useMemo, useState } from "react";
import { Settings, Flag, ChevronRight, CheckCircle2 } from "lucide-react";
import { format, isToday, isTomorrow, isBefore, isAfter, addDays, startOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { useMyTasks, type MyTask, type ProjectColumnsMap } from "@/hooks/useMyTasks";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: "Baja", color: "hsl(var(--muted-foreground))" },
  medium: { label: "Media", color: "hsl(45, 93%, 47%)" },
  high: { label: "Alta", color: "hsl(0, 84%, 60%)" },
  urgent: { label: "Urgente", color: "hsl(0, 72%, 51%)" },
};

function groupByTime(tasks: MyTask[]) {
  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);

  const groups = {
    overdue: [] as MyTask[],
    today: [] as MyTask[],
    next: [] as MyTask[],
    unscheduled: [] as MyTask[],
  };

  for (const task of tasks) {
    if (!task.due_date) {
      groups.unscheduled.push(task);
    } else {
      const d = startOfDay(new Date(task.due_date + "T00:00:00"));
      if (isBefore(d, today)) groups.overdue.push(task);
      else if (isToday(d)) groups.today.push(task);
      else if (isBefore(d, nextWeek)) groups.next.push(task);
      else groups.next.push(task);
    }
  }

  const sortByDate = (a: MyTask, b: MyTask) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date + "T00:00:00").getTime() - new Date(b.due_date + "T00:00:00").getTime();
  };

  groups.overdue.sort(sortByDate);
  groups.today.sort(sortByDate);
  groups.next.sort(sortByDate);

  return groups;
}

function filterTasks(
  tasks: MyTask[],
  columnsMap: ProjectColumnsMap,
  tab: string,
  filter: string,
  delegatedTasks: MyTask[]
) {
  let filtered: MyTask[];

  if (tab === "delegado") {
    filtered = delegatedTasks;
  } else {
    filtered = tasks.filter((t) => {
      const projectCols = columnsMap[t.project_id];
      const isDone = projectCols?.doneColumnName === t.status;
      return tab === "listo" ? isDone : !isDone;
    });
  }

  if (filter === "today") {
    const today = startOfDay(new Date());
    filtered = filtered.filter((t) => {
      if (!t.due_date) return false;
      const d = startOfDay(new Date(t.due_date + "T00:00:00"));
      return isToday(d) || isBefore(d, today);
    });
  }

  return filtered;
}

interface TaskRowProps {
  task: MyTask;
  columnsMap: ProjectColumnsMap;
  isDone?: boolean;
  onClick: () => void;
}

function TaskRow({ task, columnsMap, isDone, onClick }: TaskRowProps) {
  const statusColor = columnsMap[task.project_id]?.columns[task.status] || "hsl(var(--muted-foreground))";
  const p = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-2.5 border-b border-border hover:bg-accent/50 cursor-pointer transition-colors group"
    >
      {isDone ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
      ) : (
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: statusColor }}
        />
      )}
      <span className={`text-sm font-medium truncate flex-1 min-w-0 ${isDone ? "line-through text-muted-foreground" : ""}`}>{task.title}</span>

      {task.project && (
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: task.project.color }}
          />
          <span className="max-w-[120px] truncate">{task.project.name}</span>
        </span>
      )}

      {task.due_date && (
        <span className="text-xs text-muted-foreground shrink-0">
          {format(new Date(task.due_date + "T00:00:00"), "d MMM", { locale: es })}
        </span>
      )}

      <Flag className="h-3.5 w-3.5 shrink-0" style={{ color: p.color }} />
    </div>
  );
}

interface DateSubGroup {
  label: string;
  tasks: MyTask[];
}

function groupByDate(tasks: MyTask[]): DateSubGroup[] {
  const map = new Map<string, MyTask[]>();
  for (const task of tasks) {
    const key = task.due_date || "__none__";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(task);
  }

  return Array.from(map.entries()).map(([key, items]) => {
    let label: string;
    if (key === "__none__") {
      label = "Sin fecha";
    } else {
      const d = new Date(key + "T00:00:00");
      if (isTomorrow(d)) {
        label = "Mañana";
      } else {
        label = format(d, "EEEE d MMM", { locale: es });
        label = label.charAt(0).toUpperCase() + label.slice(1);
      }
    }
    return { label, tasks: items };
  });
}

interface TimeGroupProps {
  label: string;
  tasks: MyTask[];
  columnsMap: ProjectColumnsMap;
  defaultOpen?: boolean;
  isDone?: boolean;
  subGroupByDate?: boolean;
  onTaskClick: (task: MyTask) => void;
}

function TimeGroup({ label, tasks, columnsMap, defaultOpen = true, isDone, subGroupByDate, onTaskClick }: TimeGroupProps) {
  if (tasks.length === 0) return null;

  const dateGroups = subGroupByDate ? groupByDate(tasks) : null;

  return (
    <Collapsible defaultOpen={defaultOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-accent/30 transition-colors">
        <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-data-[state=open]:rotate-90 [&[data-state=open]>svg]:rotate-90" />
        <span>{label}</span>
        <span className="ml-1 text-[10px] bg-muted px-1.5 py-0.5 rounded-full">{tasks.length}</span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        {dateGroups ? (
          dateGroups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center gap-2 px-4 py-1.5">
                <div className="h-[1px] flex-1 bg-border" />
                <span className="text-[11px] font-medium text-muted-foreground/70 shrink-0">{group.label}</span>
                <div className="h-[1px] flex-1 bg-border" />
              </div>
              {group.tasks.map((task) => (
                <TaskRow key={task.id} task={task} columnsMap={columnsMap} isDone={isDone} onClick={() => onTaskClick(task)} />
              ))}
            </div>
          ))
        ) : (
          tasks.map((task) => (
            <TaskRow key={task.id} task={task} columnsMap={columnsMap} isDone={isDone} onClick={() => onTaskClick(task)} />
          ))
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default function MyWorkPage() {
  const { myTasks, delegatedTasks, columnsMap, isLoading } = useMyTasks();
  const [mainTab, setMainTab] = useState("pendiente");
  const [filter, setFilter] = useState("all");
  const router = useRouter();

  const filtered = useMemo(
    () => filterTasks(myTasks, columnsMap, mainTab, filter, delegatedTasks),
    [myTasks, delegatedTasks, columnsMap, mainTab, filter]
  );

  const groups = useMemo(() => groupByTime(filtered), [filtered]);

  const handleTaskClick = (task: MyTask) => {
    router.push(`/projects/${task.project_id}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Mi trabajo</h1>
        <Settings className="h-5 w-5 text-muted-foreground" />
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="pendiente">Pendiente</TabsTrigger>
          <TabsTrigger value="listo">Completado</TabsTrigger>
          <TabsTrigger value="delegado">Delegado</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex gap-2">
        <button
          onClick={() => setFilter("all")}
          className={`text-sm px-3 py-1 rounded-md transition-colors ${
            filter === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Asignadas a mí
        </button>
        <button
          onClick={() => setFilter("today")}
          className={`text-sm px-3 py-1 rounded-md transition-colors ${
            filter === "today"
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Hoy y vencido
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            No hay tareas en esta vista
          </div>
        ) : (
          <>
            <TimeGroup label="Atrasado" tasks={groups.overdue} columnsMap={columnsMap} isDone={mainTab === "listo"} onTaskClick={handleTaskClick} />
            <TimeGroup label="Hoy" tasks={groups.today} columnsMap={columnsMap} isDone={mainTab === "listo"} onTaskClick={handleTaskClick} />
            <TimeGroup label="Siguiente" tasks={groups.next} columnsMap={columnsMap} isDone={mainTab === "listo"} subGroupByDate onTaskClick={handleTaskClick} />
            <TimeGroup label="Sin programar" tasks={groups.unscheduled} columnsMap={columnsMap} isDone={mainTab === "listo"} onTaskClick={handleTaskClick} />
          </>
        )}
      </div>
    </div>
  );
}
