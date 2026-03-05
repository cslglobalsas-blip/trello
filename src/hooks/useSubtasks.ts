import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Subtask {
  id: string;
  task_id: string;
  title: string;
  completed: boolean;
  position: number;
  assignee_id: string | null;
  due_date: string | null;
  created_at: string;
}

export function useSubtasks(taskId: string | undefined) {
  return useQuery({
    queryKey: ["subtasks", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subtasks")
        .select("*")
        .eq("task_id", taskId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Subtask[];
    },
    enabled: !!taskId,
  });
}

export function useCreateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { task_id: string; title: string; position: number }) => {
      const { error } = await supabase.from("subtasks").insert(input);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["subtasks", v.task_id] }),
  });
}

export function useUpdateSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; task_id: string; [key: string]: any }) => {
      const { id, task_id, ...updates } = input;
      const { error } = await supabase.from("subtasks").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["subtasks", v.task_id] }),
  });
}

export function useDeleteSubtask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; task_id: string }) => {
      const { error } = await supabase.from("subtasks").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["subtasks", v.task_id] }),
  });
}
