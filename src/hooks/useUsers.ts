import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface UserWithDetails {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  created_at: string;
  is_active: boolean;
  last_seen: string | null;
  role: "admin" | "member";
  project_count: number;
  project_names: string[];
}

export function useUsers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<UserWithDetails[]> => {
      const [profilesRes, rolesRes, membersRes] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
        supabase
          .from("project_members")
          .select("user_id, project:projects(name)") as any,
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      const rolesMap = new Map<string, "admin" | "member">();
      for (const r of rolesRes.data) {
        rolesMap.set(r.user_id, r.role as "admin" | "member");
      }

      const projectsByUser = new Map<string, string[]>();
      if (membersRes.data) {
        for (const m of membersRes.data as any[]) {
          const names = projectsByUser.get(m.user_id) || [];
          if (m.project?.name) names.push(m.project.name);
          projectsByUser.set(m.user_id, names);
        }
      }

      return profilesRes.data.map((p: any) => ({
        user_id: p.user_id,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        email: p.email,
        created_at: p.created_at,
        is_active: p.is_active ?? true,
        last_seen: p.last_seen,
        role: rolesMap.get(p.user_id) || "member",
        project_count: projectsByUser.get(p.user_id)?.length || 0,
        project_names: projectsByUser.get(p.user_id) || [],
      }));
    },
    enabled: !!user,
  });

  const updateRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: "admin" | "member" }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Rol actualizado" });
    },
    onError: () => {
      toast({ title: "Error al cambiar rol", description: "No se pudo actualizar el rol.", variant: "destructive" });
    },
  });

  const inviteUser = useMutation({
    mutationFn: async ({ email, role, full_name }: { email: string; role: string; full_name?: string }) => {
      const { data, error } = await supabase.functions.invoke("invite-user", {
        body: { email, role, full_name },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Invitación enviada" });
    },
    onError: () => {
      toast({ title: "Error al invitar", description: "No se pudo enviar la invitación.", variant: "destructive" });
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ userId, activate }: { userId: string; activate: boolean }) => {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { user_id: userId, action: activate ? "activate" : "deactivate" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Estado actualizado" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo cambiar el estado del usuario.", variant: "destructive" });
    },
  });

  const deleteUser = useMutation({
    mutationFn: async ({ userId }: { userId: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { user_id: userId, action: "delete" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Usuario eliminado" });
    },
    onError: () => {
      toast({ title: "Error al eliminar", description: "No se pudo eliminar el usuario.", variant: "destructive" });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ userId, full_name, avatar_url }: { userId: string; full_name?: string; avatar_url?: string }) => {
      const { data, error } = await supabase.functions.invoke("manage-user", {
        body: { user_id: userId, action: "update_profile", full_name, avatar_url },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "Perfil actualizado" });
    },
    onError: () => {
      toast({ title: "Error", description: "No se pudo actualizar el perfil.", variant: "destructive" });
    },
  });

  return { ...query, updateRole, inviteUser, toggleActive, deleteUser, updateProfile };
}
