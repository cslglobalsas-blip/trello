import { useState } from "react";
import { useDocuments, useDeleteDocument, type Document } from "@/hooks/useDocuments";
import { useAllProfiles } from "@/hooks/useAllProfiles";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, FileText, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface Props {
  projectId: string;
  projectOwnerId: string;
  isMember: boolean;
  onOpenDoc: (doc: Document) => void;
  onNewDoc: () => void;
}

export function DocsListView({ projectId, projectOwnerId, isMember, onOpenDoc, onNewDoc }: Props) {
  const { user } = useAuth();
  const { data: docs = [], isLoading } = useDocuments(projectId);
  const { data: profiles = [] } = useAllProfiles(true);
  const deleteDoc = useDeleteDocument();
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);

  const isAdmin = false; // Could check user_roles if needed
  const canDelete = (doc: Document) =>
    doc.created_by === user?.id || projectOwnerId === user?.id || isAdmin;

  const getProfile = (userId: string) => profiles.find((p) => p.user_id === userId);

  function handleDelete() {
    if (!deleteTarget) return;
    deleteDoc.mutate(deleteTarget.id, {
      onSuccess: () => { toast.success("Documento eliminado"); setDeleteTarget(null); },
      onError: () => toast.error("Error al eliminar documento"),
    });
  }

  if (isLoading) {
    return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Documentos</h3>
        {isMember && (
          <Button size="sm" onClick={onNewDoc}>
            <Plus className="h-3.5 w-3.5 mr-1" />Nuevo documento
          </Button>
        )}
      </div>

      {docs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No hay documentos aún</p>
          {isMember && <p className="text-sm mt-1">Crea el primero con el botón de arriba</p>}
        </div>
      ) : (
        <div className="space-y-1">
          {docs.map((doc) => {
            const profile = getProfile(doc.created_by);
            return (
              <div
                key={doc.id}
                className="group flex items-center gap-3 px-3 py-3 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => onOpenDoc(doc)}
              >
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{doc.title}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={profile?.avatar_url || ""} />
                      <AvatarFallback className="text-[8px]">{(profile?.full_name || "?")[0]}</AvatarFallback>
                    </Avatar>
                    <span>{profile?.full_name || "Usuario"}</span>
                    <span>·</span>
                    <span>{format(new Date(doc.updated_at), "d MMM yyyy, HH:mm", { locale: es })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); onOpenDoc(doc); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {canDelete(doc) && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteTarget(doc); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar documento?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminará permanentemente "{deleteTarget?.title}". Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
