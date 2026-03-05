import { useRef, useState } from "react";
import { useTaskAttachments, useUploadAttachment, useDeleteAttachment, getSignedUrl } from "@/hooks/useTaskAttachments";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Upload, Trash2, FileText, Image, File, Download } from "lucide-react";

interface Props {
  taskId: string;
  projectId: string;
  onSaved?: () => void;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string }) {
  if (type.startsWith("image/")) return <Image className="h-5 w-5 text-blue-500" />;
  if (type === "application/pdf") return <FileText className="h-5 w-5 text-red-500" />;
  return <File className="h-5 w-5 text-muted-foreground" />;
}

export function AttachmentsSection({ taskId, projectId, onSaved }: Props) {
  const { data: files = [] } = useTaskAttachments(taskId, projectId);
  const upload = useUploadAttachment();
  const deleteFile = useDeleteAttachment();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(true);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const fileList = e.target.files;
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      await upload.mutateAsync({ projectId, taskId, file });
    }
    onSaved?.();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDownload(fullPath: string, name: string) {
    const { data } = await getSignedUrl(fullPath);
    if (data?.signedUrl) {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = name;
      a.target = "_blank";
      a.click();
    }
  }

  async function getThumbnail(fullPath: string) {
    if (thumbnails[fullPath]) return;
    const { data } = await getSignedUrl(fullPath);
    if (data?.signedUrl) setThumbnails((prev) => ({ ...prev, [fullPath]: data.signedUrl }));
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full text-sm font-medium hover:text-foreground text-muted-foreground">
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "" : "-rotate-90"}`} />
        Archivos adjuntos
        {files.length > 0 && <span className="text-xs ml-auto">{files.length}</span>}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {files.map((f) => {
          const isImage = f.type.startsWith("image/");
          if (isImage && !thumbnails[f.fullPath]) getThumbnail(f.fullPath);
          return (
            <div key={f.fullPath} className="flex items-center gap-2 p-2 rounded-md border bg-muted/30 group">
              {isImage && thumbnails[f.fullPath] ? (
                <img src={thumbnails[f.fullPath]} alt={f.name} className="h-10 w-10 rounded object-cover shrink-0" />
              ) : (
                <FileIcon type={f.type} />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{f.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(f.size)}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(f.fullPath, f.name)}>
                <Download className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100"
                onClick={() => { deleteFile.mutate({ taskId, fullPath: f.fullPath }); onSaved?.(); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          );
        })}
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1.5 h-8"
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.isPending}
        >
          <Upload className="h-3.5 w-3.5" /> {upload.isPending ? "Subiendo..." : "Subir archivo"}
        </Button>
      </CollapsibleContent>
    </Collapsible>
  );
}
