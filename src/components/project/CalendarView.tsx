import { useState, useMemo } from "react";
import { addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, getDay, format, isSameMonth, isSameDay } from "date-fns";
import { es } from "date-fns/locale";
import type { Task } from "@/hooks/useTasks";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const dayNames = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function CalendarView({ tasks }: { tasks: Task[] }) {
  const [current, setCurrent] = useState(new Date());
  const start = startOfMonth(current);
  const end = endOfMonth(current);
  const days = eachDayOfInterval({ start, end });

  // Pad start to Monday
  const startDay = getDay(start); // 0=Sun
  const padStart = startDay === 0 ? 6 : startDay - 1;

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (t.due_date) {
        const key = t.due_date;
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={() => setCurrent(subMonths(current, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold capitalize">{format(current, "MMMM yyyy", { locale: es })}</h3>
        <Button variant="ghost" size="icon" onClick={() => setCurrent(addMonths(current, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
        {dayNames.map((d) => (
          <div key={d} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
        ))}
        {Array.from({ length: padStart }).map((_, i) => (
          <div key={`pad-${i}`} className="bg-card p-2 min-h-[80px]" />
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDate[key] || [];
          const isToday = isSameDay(day, new Date());
          return (
            <div key={key} className={`bg-card p-2 min-h-[80px] ${isToday ? "ring-2 ring-primary/30 ring-inset" : ""}`}>
              <span className={`text-xs font-medium ${isToday ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</span>
              <div className="mt-1 space-y-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <div key={t.id} className="text-[10px] leading-tight truncate px-1 py-0.5 rounded bg-primary/10 text-primary">
                    {t.title}
                  </div>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">+{dayTasks.length - 3} más</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
