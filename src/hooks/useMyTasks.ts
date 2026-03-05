import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface MyTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  position: number;
  start_date: string | null;
  due_date: string | null;
  assignee_id: string | null;
  created_by: string;
  project_id: string;
  labels: string[];
  created_at: string;
  updated_at: string;
  assignee?: { full_name: string | null; avatar_url: string | null } | null;
  project?: { name: string; color: string } | null;
}

export interface ColumnInfo {
  name: string;
  color: string;
  position: number;
}

export interface ProjectColumnsMap {
  [projectId: string]: {
    columns: Record<string, string>; // columnName -> color
    doneColumnName: string;
  };
}

export function useMyTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel("my-tasks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["my_tasks", user.id] });
        queryClient.invalidateQueries({ queryKey: ["delegated_tasks", user.id] });
        queryClient.invalidateQueries({ queryKey: ["all_project_columns"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const myTasksQuery = useQuery({
    queryKey: ["my_tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assignee_id_profiles_fkey(full_name, avatar_url), project:projects(name, color)")
        .eq("assignee_id", user!.id)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MyTask[];
    },
    enabled: !!user?.id,
    refetchOnMount: "always",
  });

  const delegatedQuery = useQuery({
    queryKey: ["delegated_tasks", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assignee_id_profiles_fkey(full_name, avatar_url), project:projects(name, color)")
        .eq("created_by", user!.id)
        .neq("assignee_id", user!.id)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MyTask[];
    },
    enabled: !!user?.id,
    refetchOnMount: "always",
  });

  const columnsQuery = useQuery({
    queryKey: ["all_project_columns", user?.id, myTasksQuery.data],
    queryFn: async () => {
      // Get projects the user is a member of
      const { data: memberships, error: memErr } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("user_id", user!.id);
      if (memErr) throw memErr;

      const memberProjectIds = (memberships ?? []).map((m) => m.project_id);

      // Also include project IDs from tasks assigned to user (may not be a member)
      const taskProjectIds = (myTasksQuery.data ?? []).map((t) => t.project_id);
      const allProjectIds = [...new Set([...memberProjectIds, ...taskProjectIds])];

      if (!allProjectIds.length) return {} as ProjectColumnsMap;

      const { data: cols, error: colErr } = await supabase
        .from("project_columns" as any)
        .select("*")
        .in("project_id", allProjectIds)
        .order("position", { ascending: true });
      if (colErr) throw colErr;

      const map: ProjectColumnsMap = {};
      for (const col of (cols ?? []) as any[]) {
        if (!map[col.project_id]) {
          map[col.project_id] = { columns: {}, doneColumnName: "" };
        }
        map[col.project_id].columns[col.name] = col.color;
        if ((col as any).is_final) {
          map[col.project_id].doneColumnName = col.name;
        }
      }
      return map;
    },
    enabled: !!user?.id && !myTasksQuery.isLoading,
    refetchOnMount: "always",
  });

  return {
    myTasks: myTasksQuery.data ?? [],
    delegatedTasks: delegatedQuery.data ?? [],
    columnsMap: columnsQuery.data ?? ({} as ProjectColumnsMap),
    isLoading: myTasksQuery.isLoading || delegatedQuery.isLoading || columnsQuery.isLoading,
  };
}
