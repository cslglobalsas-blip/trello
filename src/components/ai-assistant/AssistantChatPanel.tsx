import { useRef, useEffect, useState } from "react";
import { X, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActionConfirmationCard } from "./ActionConfirmationCard";
import type { ChatMessage } from "@/hooks/useAssistantChat";

const quickActions = [
  "¿Qué tareas debo priorizar hoy?",
  "Reprograma mis tareas vencidas",
  "¿Quién tiene más carga de trabajo?",
  "Resumen de proyectos en riesgo",
];

interface Props {
  messages: ChatMessage[];
  isLoading: boolean;
  onSend: (text: string) => void;
  onClose: () => void;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}

export function AssistantChatPanel({ messages, isLoading, onSend, onClose, onConfirm, onCancel }: Props) {
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="fixed bottom-24 right-6 z-50 w-[380px] flex flex-col rounded-xl border bg-background shadow-2xl"
      style={{ height: "calc(100vh - 120px)", maxHeight: "700px" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-[#0052CC] rounded-t-xl">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="h-4 w-4" />
          <span className="font-semibold text-sm">Asistente TaskFlow</span>
        </div>
        <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3">
        {messages.length === 0 && !isLoading && (
          <div className="space-y-2 mt-4">
            <p className="text-xs text-muted-foreground text-center mb-3">¿En qué puedo ayudarte?</p>
            {quickActions.map((qa) => (
              <button
                key={qa}
                onClick={() => onSend(qa)}
                className="w-full text-left text-xs px-3 py-2 rounded-lg border bg-muted/50 hover:bg-muted transition-colors"
              >
                {qa}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-[#0052CC] text-white whitespace-pre-wrap"
                  : "bg-muted text-foreground prose prose-sm dark:prose-invert [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>li]:my-0.5"
              }`}>
                {msg.role === "assistant" ? <ReactMarkdown>{msg.content}</ReactMarkdown> : msg.content}
                {msg.actions && msg.actions.length > 0 && (
                  <ActionConfirmationCard
                    actions={msg.actions}
                    onConfirm={() => onConfirm(msg.id)}
                    onCancel={() => onCancel(msg.id)}
                    handled={msg.actionsHandled}
                  />
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-3 flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>
        <div ref={bottomRef} />
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 border-t">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={isLoading || !input.trim()}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  );
}
