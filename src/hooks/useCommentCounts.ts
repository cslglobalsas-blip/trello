import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useCommentCounts(projectId: string | undefined) {
  return useQuery({
    queryKey: ["comment_counts", projectId],
    queryFn: async () => {
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id")
        .eq("project_id", projectId!);
      const taskIds = (tasks ?? []).map((t) => t.id);
      if (!taskIds.length) return {} as Record<string, number>;
      const { data } = await supabase
        .from("comments")
        .select("task_id")
        .in("task_id", taskIds);
      const counts: Record<string, number> = {};
      (data ?? []).forEach((c) => {
        counts[c.task_id] = (counts[c.task_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!projectId,
  });
}
