import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface Task {
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
  checklist: ChecklistItem[];
  recurrence_type: string | null;
  recurrence_end_date: string | null;
  recurrence_interval: number | null;
  recurrence_unit: string | null;
  recurrence_days: string[] | null;
  recurrence_ends_after: number | null;
  recurrence_restart_column: string | null;
  created_at: string;
  updated_at: string;
  assignee?: { full_name: string | null; avatar_url: string | null } | null;
}

export function useTasks(projectId: string | undefined) {
  return useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assignee_id_profiles_fkey(full_name, avatar_url)")
        .eq("project_id", projectId!)
        .order("position", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as Task[];
    },
    enabled: !!projectId,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      project_id: string;
      title: string;
      description?: string;
      status: string;
      priority: string;
      start_date?: string | null;
      due_date?: string | null;
      assignee_id?: string | null;
      labels?: string[];
      position?: number;
    }) => {
      const { error } = await supabase.from("tasks").insert({
        ...input,
        created_by: user!.id,
        description: input.description || null,
        start_date: input.start_date || null,
        due_date: input.due_date || null,
        assignee_id: input.assignee_id || null,
        labels: input.labels || [],
      });
      if (error) throw error;

      // Auto-add assignee to project_members
      if (input.assignee_id) {
        await supabase.from("project_members").upsert(
          { project_id: input.project_id, user_id: input.assignee_id },
          { onConflict: "project_id,user_id", ignoreDuplicates: true }
        );
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["tasks", v.project_id] });
      qc.invalidateQueries({ queryKey: ["project_members", v.project_id] });
      toast({ title: "Tarea creada" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo crear la tarea.", variant: "destructive" }),
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; project_id: string; [key: string]: any }) => {
      const { id, project_id, ...updates } = input;
      const { error } = await supabase.from("tasks").update(updates).eq("id", id);
      if (error) throw error;

      // Auto-add assignee to project_members
      if (updates.assignee_id) {
        await supabase.from("project_members").upsert(
          { project_id, user_id: updates.assignee_id },
          { onConflict: "project_id,user_id", ignoreDuplicates: true }
        );
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["tasks", v.project_id] });
      qc.invalidateQueries({ queryKey: ["project_members", v.project_id] });
      qc.invalidateQueries({ queryKey: ["dashboard_my_tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard_all_tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard_columns"] });
      qc.invalidateQueries({ queryKey: ["my_tasks"] });
      qc.invalidateQueries({ queryKey: ["delegated_tasks"] });
      qc.invalidateQueries({ queryKey: ["all_project_columns"] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }) => {
      const { error } = await supabase.from("tasks").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["tasks", v.project_id] });
      qc.invalidateQueries({ queryKey: ["my_tasks"] });
      qc.invalidateQueries({ queryKey: ["delegated_tasks"] });
      qc.invalidateQueries({ queryKey: ["all_project_columns"] });
      toast({ title: "Tarea eliminada" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo eliminar la tarea.", variant: "destructive" }),
  });
}
