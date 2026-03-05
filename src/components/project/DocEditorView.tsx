import { useState, useEffect, useRef, useCallback } from "react";
import { useUpdateDocument, type Document } from "@/hooks/useDocuments";
import { RichTextEditor } from "./detail/RichTextEditor";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
  document: Document;
  onBack: () => void;
}

export function DocEditorView({ document, onBack }: Props) {
  const updateDoc = useUpdateDocument();
  const [title, setTitle] = useState(document.title);
  const [lastSaved, setLastSaved] = useState(document.updated_at);
  const titleDebounce = useRef<ReturnType<typeof setTimeout>>();

  // Sync when switching docs
  useEffect(() => {
    setTitle(document.title);
    setLastSaved(document.updated_at);
  }, [document.id]);

  const saveTitle = useCallback(
    (newTitle: string) => {
      clearTimeout(titleDebounce.current);
      titleDebounce.current = setTimeout(() => {
        if (newTitle.trim()) {
          updateDoc.mutate({ id: document.id, title: newTitle.trim() }, {
            onSuccess: () => setLastSaved(new Date().toISOString()),
          });
        }
      }, 2000);
    },
    [document.id, updateDoc]
  );

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value);
    saveTitle(e.target.value);
  }

  const handleContentChange = useCallback(
    (html: string) => {
      updateDoc.mutate({ id: document.id, content: html }, {
        onSuccess: () => setLastSaved(new Date().toISOString()),
      });
    },
    [document.id, updateDoc]
  );

  // Content debounce is handled by RichTextEditor (600ms) — we wrap with extra delay
  const contentDebounce = useRef<ReturnType<typeof setTimeout>>();
  const debouncedContentChange = useCallback(
    (html: string) => {
      clearTimeout(contentDebounce.current);
      contentDebounce.current = setTimeout(() => handleContentChange(html), 1400);
    },
    [handleContentChange]
  );

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />Atrás
        </Button>
        <span className="text-xs text-muted-foreground ml-auto">
          Guardado: {format(new Date(lastSaved), "d MMM yyyy, HH:mm", { locale: es })}
        </span>
      </div>

      <input
        value={title}
        onChange={handleTitleChange}
        className="w-full text-2xl font-bold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground mb-4"
        placeholder="Sin título"
      />

      <RichTextEditor content={document.content || ""} onChange={debouncedContentChange} />
    </div>
  );
}
