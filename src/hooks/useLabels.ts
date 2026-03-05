import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Label {
  id: string;
  name: string;
  color: string;
  project_id: string;
  created_by: string;
  created_at: string;
}

export interface TaskLabel {
  id: string;
  task_id: string;
  label_id: string;
  created_at: string;
}

export function useLabels(projectId: string | undefined) {
  return useQuery({
    queryKey: ["labels", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("labels")
        .select("*")
        .eq("project_id", projectId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Label[];
    },
    enabled: !!projectId,
  });
}

export function useTaskLabelsForProject(projectId: string | undefined) {
  return useQuery({
    queryKey: ["task_labels", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_labels")
        .select("*, tasks!inner(project_id)")
        .eq("tasks.project_id", projectId!);
      if (error) throw error;
      return (data ?? []) as TaskLabel[];
    },
    enabled: !!projectId,
  });
}

export function useCreateLabel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { name: string; color: string; project_id: string }) => {
      const { data, error } = await supabase.from("labels").insert(input).select().single();
      if (error) throw error;
      return data as Label;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["labels", v.project_id] });
      toast({ title: "Etiqueta creada" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo crear la etiqueta.", variant: "destructive" }),
  });
}

export function useUpdateLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; project_id: string; name: string; color: string }) => {
      const { error } = await supabase.from("labels").update({ name: input.name, color: input.color }).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["labels", v.project_id] });
    },
  });
}

export function useDeleteLabel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }) => {
      const { error } = await supabase.from("labels").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["labels", v.project_id] });
      qc.invalidateQueries({ queryKey: ["task_labels", v.project_id] });
      toast({ title: "Etiqueta eliminada" });
    },
    onError: () => toast({ title: "Error", description: "No se pudo eliminar la etiqueta.", variant: "destructive" }),
  });
}

export function useAddTaskLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { task_id: string; label_id: string; project_id: string }) => {
      const { error } = await supabase.from("task_labels").insert({ task_id: input.task_id, label_id: input.label_id });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["task_labels", v.project_id] });
    },
  });
}

export function useRemoveTaskLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { task_id: string; label_id: string; project_id: string }) => {
      const { error } = await supabase.from("task_labels").delete().eq("task_id", input.task_id).eq("label_id", input.label_id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["task_labels", v.project_id] });
    },
  });
}
