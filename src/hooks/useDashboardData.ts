import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { startOfToday, subDays, addDays, format, parseISO } from "date-fns";

interface DashboardTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assignee_id: string | null;
  project_id: string;
  updated_at: string;
  project?: { name: string; color: string } | null;
  assignee?: { full_name: string | null } | null;
}

export interface ProjectProgress {
  projectId: string;
  name: string;
  color: string;
  total: number;
  completed: number;
  pct: number;
}

export interface WorkloadEntry {
  name: string;
  pending: number;
}

export function useDashboardData() {
  const { user } = useAuth();
  const { data: projects } = useProjects();
  const qc = useQueryClient();

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("dashboard-tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        qc.invalidateQueries({ queryKey: ["dashboard_my_tasks"] });
        qc.invalidateQueries({ queryKey: ["dashboard_all_tasks"] });
        qc.invalidateQueries({ queryKey: ["dashboard_columns"] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "project_members", filter: `user_id=eq.${user!.id}` }, () => {
        qc.invalidateQueries({ queryKey: ["dashboard_columns"] });
        qc.invalidateQueries({ queryKey: ["dashboard_all_tasks"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, qc]);

  // 1. My tasks (for counter + my KPIs)
  const myTasksQuery = useQuery({
    queryKey: ["dashboard_my_tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, assignee_id, project_id, updated_at, project:projects(name, color)")
        .eq("assignee_id", user!.id);
      if (error) throw error;
      return (data ?? []) as unknown as DashboardTask[];
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // 2. All accessible tasks (for project progress + workload)
  const allTasksQuery = useQuery({
    queryKey: ["dashboard_all_tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, status, priority, due_date, assignee_id, project_id, updated_at, assignee:profiles!tasks_assignee_id_profiles_fkey(full_name)");
      if (error) throw error;
      return (data ?? []) as unknown as DashboardTask[];
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  // 3. All project columns (for done detection)
  const columnsQuery = useQuery({
    queryKey: ["dashboard_columns", user?.id],
    staleTime: 0,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data: memberships, error: memErr } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user!.id);
      if (memErr) throw memErr;
      const pIds = (memberships ?? []).map((m) => m.project_id);
      if (!pIds.length) return [];
      const { data, error } = await supabase
        .from("project_columns" as any)
        .select("project_id, name, position, is_final")
        .in("project_id", pIds)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as { project_id: string; name: string; position: number; is_final: boolean }[];
    },
    enabled: !!user?.id,
  });

  // Build done column map
  const doneMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!columnsQuery.data) return map;
    const byProject: Record<string, { name: string; position: number; is_final: boolean }[]> = {};
    for (const c of columnsQuery.data) {
      if (!byProject[c.project_id]) byProject[c.project_id] = [];
      byProject[c.project_id].push(c);
    }
    for (const [pid, cols] of Object.entries(byProject)) {
      const final = cols.find((c) => c.is_final === true);
      if (final) map.set(pid, final.name);
      console.log("[Dashboard] project", pid, "doneColumn:", final?.name, "tasks in project:", allTasksQuery.data?.filter(t => t.project_id === pid).length);
    }
    return map;
  }, [columnsQuery.data]);

  const isDone = (t: DashboardTask) => doneMap.get(t.project_id) === t.status;

  // Computed KPIs from myTasks
  const kpis = useMemo(() => {
    const myTasks = myTasksQuery.data ?? [];
    const today = startOfToday();
    const todayStr = format(today, "yyyy-MM-dd");
    const weekAgo = subDays(today, 7);
    const weekLater = addDays(today, 7);
    const weekLaterStr = format(weekLater, "yyyy-MM-dd");

    let overdue = 0, completedThisWeek = 0, dueToday = 0, dueThisWeek = 0;

    for (const t of myTasks) {
      const done = isDone(t);
      if (done && parseISO(t.updated_at) >= weekAgo) {
        completedThisWeek++;
        console.log("[Dashboard] completedThisWeek task:", t.title, "updated_at:", t.updated_at);
      }
      if (!done && t.due_date) {
        if (t.due_date < todayStr) overdue++;
        if (t.due_date === todayStr) dueToday++;
        if (t.due_date >= todayStr && t.due_date <= weekLaterStr) dueThisWeek++;
      }
    }
    return { overdue, completedThisWeek, dueToday, dueThisWeek };
  }, [myTasksQuery.data, doneMap]);

  // Project progress
  const projectProgress = useMemo((): ProjectProgress[] => {
    const allTasks = allTasksQuery.data ?? [];
    if (!projects?.length) return [];
    return projects.map((p) => {
      const pTasks = allTasks.filter((t) => t.project_id === p.id);
      const completed = pTasks.filter((t) => isDone(t)).length;
      const total = pTasks.length;
      return { projectId: p.id, name: p.name, color: p.color, total, completed, pct: total > 0 ? Math.round((completed / total) * 100) : 0 };
    });
  }, [allTasksQuery.data, projects, doneMap]);

  // Workload per person
  const workload = useMemo((): WorkloadEntry[] => {
    const allTasks = allTasksQuery.data ?? [];
    const map: Record<string, { name: string; pending: number }> = {};
    for (const t of allTasks) {
      if (isDone(t) || !t.assignee_id) continue;
      if (!map[t.assignee_id]) {
        map[t.assignee_id] = { name: (t.assignee as any)?.full_name || "Sin nombre", pending: 0 };
      }
      map[t.assignee_id].pending++;
    }
    return Object.values(map).sort((a, b) => b.pending - a.pending);
  }, [allTasksQuery.data, doneMap]);

  return {
    myTaskCount: myTasksQuery.data?.length ?? 0,
    projectCount: projects?.length ?? 0,
    kpis,
    projectProgress,
    workload,
    isLoading: myTasksQuery.isLoading || allTasksQuery.isLoading || columnsQuery.isLoading,
  };
}
