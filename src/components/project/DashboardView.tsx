import { useMemo } from "react";
import type { Task } from "@/hooks/useTasks";
import type { ProjectColumn } from "@/hooks/useProjectColumns";
import type { ProjectMember } from "@/hooks/useProjectMembers";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const PRIORITY_COLORS: Record<string, string> = {
  low: "hsl(var(--muted-foreground))",
  medium: "hsl(var(--warning))",
  high: "hsl(var(--destructive))",
  urgent: "hsl(var(--destructive))",
};

export function DashboardView({ tasks, columns, members }: { tasks: Task[]; columns: ProjectColumn[]; members: ProjectMember[] }) {
  const statusData = useMemo(() =>
    columns.map((c) => ({ name: c.name, value: tasks.filter((t) => t.status === c.name).length, color: c.color })),
    [tasks, columns]
  );

  const priorityData = useMemo(() => {
    const pMap: Record<string, number> = { low: 0, medium: 0, high: 0, urgent: 0 };
    tasks.forEach((t) => { pMap[t.priority] = (pMap[t.priority] || 0) + 1; });
    return Object.entries(pMap).map(([k, v]) => ({ name: k === "low" ? "Baja" : k === "medium" ? "Media" : k === "high" ? "Alta" : "Urgente", value: v, fill: PRIORITY_COLORS[k] }));
  }, [tasks]);

  const completedCol = columns.find((c) => c.is_final === true);
  const completedCount = completedCol ? tasks.filter((t) => t.status === completedCol.name).length : 0;
  const completionPct = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const assigneeData = useMemo(() => {
    const map: Record<string, { name: string; count: number }> = {};
    tasks.forEach((t) => {
      const uid = t.assignee_id || "unassigned";
      if (!map[uid]) {
        const member = members.find((m) => m.user_id === uid);
        map[uid] = { name: member?.profile?.full_name || (uid === "unassigned" ? "Sin asignar" : "Desconocido"), count: 0 };
      }
      map[uid].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [tasks, members]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Completion */}
      <div className="rounded-xl border bg-card p-5 col-span-full">
        <p className="text-sm text-muted-foreground mb-2">Progreso general</p>
        <div className="flex items-center gap-4">
          <div className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${completionPct}%` }} />
          </div>
          <span className="text-2xl font-bold">{completionPct}%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1">{completedCount} de {tasks.length} tareas completadas</p>
      </div>

      {/* Status Donut */}
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-medium mb-4">Tareas por estado</p>
        {tasks.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p> : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="flex flex-wrap gap-3 mt-2">
          {statusData.map((d) => (
            <div key={d.name} className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name} ({d.value})
            </div>
          ))}
        </div>
      </div>

      {/* Priority Bar */}
      <div className="rounded-xl border bg-card p-5">
        <p className="text-sm font-medium mb-4">Tareas por prioridad</p>
        {tasks.length === 0 ? <p className="text-xs text-muted-foreground text-center py-8">Sin datos</p> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={priorityData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {priorityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Assignees */}
      <div className="rounded-xl border bg-card p-5 col-span-full">
        <p className="text-sm font-medium mb-4">Tareas por asignado</p>
        <div className="space-y-3">
          {assigneeData.map((a) => {
            const initials = a.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            return (
              <div key={a.name} className="flex items-center gap-3">
                <Avatar className="h-7 w-7"><AvatarFallback className="bg-primary/10 text-primary text-[10px]">{initials}</AvatarFallback></Avatar>
                <span className="text-sm flex-1">{a.name}</span>
                <span className="text-sm font-semibold">{a.count}</span>
              </div>
            );
          })}
          {assigneeData.length === 0 && <p className="text-xs text-muted-foreground">Sin tareas</p>}
        </div>
      </div>
    </div>
  );
}
