import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProjectColumn {
  id: string;
  project_id: string;
  name: string;
  color: string;
  position: number;
  is_final: boolean;
  created_at: string;
}

export function useProjectColumns(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_columns", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_columns" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProjectColumn[];
    },
    enabled: !!projectId,
  });
}

export function useCreateColumn() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { project_id: string; name: string; color: string; position: number; finalColumnId?: string }) => {
      const { finalColumnId, ...insertData } = input;
      const { error } = await supabase.from("project_columns" as any).insert(insertData);
      if (error) throw error;
      if (finalColumnId) {
        const { error: err2 } = await supabase.from("project_columns" as any).update({ position: input.position + 1 }).eq("id", finalColumnId);
        if (err2) throw err2;
      }
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["project_columns", v.project_id] });
      toast({ title: "Columna creada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateColumn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; project_id: string; name?: string; color?: string; position?: number }) => {
      const { id, project_id, ...updates } = input;
      const { error } = await supabase.from("project_columns" as any).update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["project_columns", v.project_id] }),
  });
}

export function useReorderColumns() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { project_id: string; columns: { id: string; position: number }[] }) => {
      for (const col of input.columns) {
        const { error } = await supabase.from("project_columns" as any).update({ position: col.position }).eq("id", col.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, v) => qc.invalidateQueries({ queryKey: ["project_columns", v.project_id] }),
  });
}

export function useDeleteColumn() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }) => {
      const { error } = await supabase.from("project_columns" as any).delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["project_columns", v.project_id] });
      toast({ title: "Columna eliminada" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
