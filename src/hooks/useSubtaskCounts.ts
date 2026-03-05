import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SubtaskCounts = Record<string, { completed: number; total: number }>;

export function useSubtaskCounts(projectId: string | undefined) {
  return useQuery({
    queryKey: ["subtask-counts", projectId],
    queryFn: async (): Promise<SubtaskCounts> => {
      const { data, error } = await supabase
        .from("subtasks")
        .select("task_id, completed, id")
        .in(
          "task_id",
          (await supabase.from("tasks").select("id").eq("project_id", projectId!)).data?.map((t) => t.id) ?? []
        );

      if (error) throw error;

      const map: SubtaskCounts = {};
      (data ?? []).forEach((row) => {
        if (!map[row.task_id]) map[row.task_id] = { completed: 0, total: 0 };
        map[row.task_id].total++;
        if (row.completed) map[row.task_id].completed++;
      });
      return map;
    },
    enabled: !!projectId,
  });
}
