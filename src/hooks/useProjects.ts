import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Project {
  id: string;
  name: string;
  description: string | null;
  color: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function useProjects() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`member-projects-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'project_members',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['projects', user.id] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return useQuery({
    queryKey: ["projects", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, color, created_by, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Project[];
    },
    enabled: !!user,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { name: string; description?: string; color: string }) => {
      // 1. Insert project
      const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({ name: input.name, description: input.description || null, color: input.color, created_by: user!.id })
        .select()
        .single();

      if (projectError) throw projectError;

      // 2. Add creator as member
      const { error: memberError } = await supabase
        .from("project_members")
        .insert({ project_id: project.id, user_id: user!.id });

      if (memberError) {
        // Rollback: delete the orphaned project (best-effort)
        await supabase.from("projects").delete().eq("id", project.id);
        throw memberError;
      }

      return project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Proyecto creado", description: "El proyecto se creó exitosamente." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error?.message || "No se pudo crear el proyecto.", variant: "destructive" });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: { id: string; name: string; description?: string; color: string }) => {
      const { error } = await supabase
        .from("projects")
        .update({ name: input.name, description: input.description || null, color: input.color })
        .eq("id", input.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Proyecto actualizado" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el proyecto.", variant: "destructive" });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Proyecto eliminado" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo eliminar el proyecto.", variant: "destructive" });
    },
  });
}
