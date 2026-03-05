'use client'

import { useAuth } from "@/hooks/useAuth";
import { useDashboardData } from "@/hooks/useDashboardData";
import { CheckSquare, LayoutDashboard, AlertTriangle, CheckCircle, Clock, CalendarDays, Users } from "lucide-react";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Index() {
  const { profile } = useAuth();
  const { myTaskCount, projectCount, kpis, projectProgress, workload, isLoading } = useDashboardData();

  const summaryCards = [
    { label: "Mis Tareas", value: myTaskCount, icon: CheckSquare, color: "bg-primary/10 text-primary" },
    { label: "Proyectos", value: projectCount, icon: LayoutDashboard, color: "bg-emerald-500/10 text-emerald-600" },
  ];

  const kpiCards = [
    { label: "Tareas vencidas", value: kpis.overdue, icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
    { label: "Completadas esta semana", value: kpis.completedThisWeek, icon: CheckCircle, color: "bg-emerald-500/10 text-emerald-600" },
    { label: "Vencen hoy", value: kpis.dueToday, icon: Clock, color: "bg-orange-500/10 text-orange-600" },
    { label: "Vencen esta semana", value: kpis.dueThisWeek, icon: CalendarDays, color: "bg-blue-500/10 text-blue-600" },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          ¡Bienvenido, {profile?.full_name || ""}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">Aquí tienes un resumen de tu espacio de trabajo.</p>
      </div>


      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((c) => (
          <div key={c.label} className="rounded-xl border bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.color}`}>
                <c.icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-muted-foreground">{c.label}</span>
            </div>
            <p className="text-3xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Row 1: KPI overview */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Resumen de tareas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {kpiCards.map((c) => (
            <div key={c.label} className="rounded-xl border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${c.color}`}>
                  <c.icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{c.label}</span>
              </div>
              <p className="text-3xl font-bold">{c.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Project progress */}
      {projectProgress.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Progreso por proyecto</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectProgress.map((p) => (
              <div key={p.projectId} className="rounded-xl border bg-card p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="text-sm font-medium truncate">{p.name}</span>
                  <span className="ml-auto text-sm font-bold">{p.pct}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${p.pct}%` }} />
                </div>
                <p className="text-xs mt-1.5">
                  <span className="text-muted-foreground">{p.total} tareas · </span>
                  <span className={p.completed > 0 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                    {p.completed} completadas
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Row 3: Workload */}
      {workload.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" /> Carga por persona
          </h2>
          <div className="rounded-xl border bg-card p-5 shadow-sm">
            <div className="space-y-3">
              {workload.map((w) => {
                const initials = w.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                const maxPending = workload[0]?.pending || 1;
                return (
                  <div key={w.name} className="flex items-center gap-3">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="bg-primary/10 text-primary text-[10px]">{initials}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm w-32 truncate">{w.name}</span>
                    <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(w.pending / maxPending) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">{w.pending}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
