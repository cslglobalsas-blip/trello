import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TaskAttachment {
  name: string;
  id: string | undefined;
  size: number;
  type: string;
  created_at: string;
  fullPath: string;
}

function storagePath(projectId: string, taskId: string) {
  return `${projectId}/${taskId}`;
}

export function useTaskAttachments(taskId: string | undefined, projectId: string | undefined) {
  return useQuery({
    queryKey: ["task-attachments", taskId],
    queryFn: async () => {
      const path = storagePath(projectId!, taskId!);
      const { data, error } = await supabase.storage.from("task-attachments").list(path);
      if (error) throw error;
      return (data ?? []).map((f) => ({
        name: f.name,
        id: f.id,
        size: f.metadata?.size ?? 0,
        type: f.metadata?.mimetype ?? "",
        created_at: f.created_at ?? "",
        fullPath: `${path}/${f.name}`,
      })) as TaskAttachment[];
    },
    enabled: !!taskId && !!projectId,
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { projectId: string; taskId: string; file: File }) => {
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

      const ALLOWED_EXTENSIONS = [
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg',
        'txt', 'csv', 'zip', 'rar',
      ];

      if (input.file.size > MAX_FILE_SIZE) {
        throw new Error("El archivo excede el límite de 10MB");
      }

      const ext = input.file.name.split('.').pop()?.toLowerCase();
      if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
        throw new Error(`Tipo de archivo no permitido (.${ext || '?'}). Solo documentos, imágenes y archivos comprimidos.`);
      }

      const safeName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${storagePath(input.projectId, input.taskId)}/${safeName}`;
      const { error } = await supabase.storage.from("task-attachments").upload(path, input.file, { upsert: true });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["task-attachments", v.taskId] });
      toast({ title: "Archivo subido" });
    },
    onError: (e: any) => toast({ title: "Error al subir", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: { taskId: string; fullPath: string }) => {
      const { error } = await supabase.storage.from("task-attachments").remove([input.fullPath]);
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries({ queryKey: ["task-attachments", v.taskId] });
      toast({ title: "Archivo eliminado" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
}

export function getSignedUrl(fullPath: string) {
  return supabase.storage.from("task-attachments").createSignedUrl(fullPath, 3600);
}
