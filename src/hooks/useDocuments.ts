import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

export interface Document {
  id: string;
  project_id: string;
  title: string;
  content: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useDocuments(projectId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`documents-${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "documents", filter: `project_id=eq.${projectId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["documents", projectId] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, queryClient]);

  return useQuery({
    queryKey: ["documents", projectId],
    queryFn: async (): Promise<Document[]> => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as Document[];
    },
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, title }: { projectId: string; title?: string }) => {
      const { data, error } = await supabase
        .from("documents")
        .insert({ project_id: projectId, title: title || "Sin título" })
        .select()
        .single();
      if (error) throw error;
      return data as Document;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["documents", data.project_id] });
    },
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title, content }: { id: string; title?: string; content?: string }) => {
      const updates: Record<string, string> = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      const { error } = await supabase.from("documents").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}
