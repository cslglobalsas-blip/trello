import { useState } from "react";
import { useRemoveMember, type ProjectMember } from "@/hooks/useProjectMembers";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trash2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: ProjectMember[];
  projectId: string;
  ownerId: string;
}

export function ManageMembersDialog({ open, onOpenChange, members, projectId, ownerId }: Props) {
  const removeMember = useRemoveMember();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);

  async function handleAdd() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      // Search by email in profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .eq("email", search.trim().toLowerCase())
        .limit(1);

      if (error) throw error;
      if (!profiles?.length) {
        toast({ title: "No encontrado", description: "Usuario no encontrado. Debe registrarse primero.", variant: "destructive" });
        return;
      }

      const userId = profiles[0].user_id;
      if (members.some((m) => m.user_id === userId)) {
        toast({ title: "Ya es miembro", description: "Este usuario ya pertenece al proyecto." });
        return;
      }

      await supabase.from("project_members").upsert(
        { project_id: projectId, user_id: userId },
        { onConflict: "project_id,user_id", ignoreDuplicates: true }
      );
      qc.invalidateQueries({ queryKey: ["project_members", projectId] });
      toast({ title: "Miembro agregado" });
      setSearch("");
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[860px]">
        <DialogHeader><DialogTitle>Miembros del Proyecto</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {members.map((m) => {
            const initials = (m.profile?.full_name || "?").split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
            const isOwner = m.user_id === ownerId;
            return (
              <div key={m.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  {m.profile?.avatar_url && <AvatarImage src={m.profile.avatar_url} alt={m.profile?.full_name || ""} />}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.profile?.full_name || "Usuario"}</p>
                  {isOwner && <span className="text-[10px] text-muted-foreground">Propietario</span>}
                </div>
                {!isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeMember.mutate({ id: m.id, project_id: projectId })}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Email del usuario..."
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" onClick={handleAdd} disabled={searching || !search.trim()}>
            <UserPlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
