import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null; email: string | null } | null;
}

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: ["project_members", projectId],
    queryFn: async () => {
      const { data: members, error } = await supabase
        .from("project_members")
        .select("*")
        .eq("project_id", projectId!);
      if (error) throw error;

      const userIds = (members ?? []).map((m) => m.user_id);
      if (userIds.length === 0) return [] as ProjectMember[];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, email")
        .in("user_id", userIds);

      return (members ?? []).map((m) => ({
        ...m,
        profile: profiles?.find((p) => p.user_id === m.user_id) || null,
      })) as ProjectMember[];
    },
    enabled: !!projectId,
  });
}

export function useAddMember() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { project_id: string; user_id: string }) => {
      const { error } = await supabase.from("project_members").insert(input);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["project_members", v.project_id] });
      toast({ title: "Miembro agregado" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { id: string; project_id: string }) => {
      const { error } = await supabase.from("project_members").delete().eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["project_members", v.project_id] });
      toast({ title: "Miembro eliminado" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}
