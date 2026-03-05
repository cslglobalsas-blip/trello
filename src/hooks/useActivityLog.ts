import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export interface ActivityLogEntry {
  id: string;
  task_id: string | null;
  project_id: string;
  user_id: string;
  action: string;
  details: Json;
  created_at: string;
}

export function useActivityLog(taskId: string | undefined) {
  return useQuery({
    queryKey: ["activity-log", taskId],
    queryFn: async (): Promise<ActivityLogEntry[]> => {
      const { data, error } = await supabase
        .from("activity_log")
        .select("*")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!taskId,
  });
}
