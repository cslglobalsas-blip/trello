import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";

export interface AssistantAction {
  type: "update_due_date" | "update_assignee" | "update_priority";
  task_id: string;
  task_title: string;
  current_value: string;
  new_value: string;
  reason: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: AssistantAction[];
  actionsHandled?: boolean;
}

function parseActions(text: string): { cleanText: string; actions: AssistantAction[] | null } {
  const match = text.match(/\[ACTIONS\]([\s\S]*?)\[\/ACTIONS\]/);
  if (!match) return { cleanText: text, actions: null };

  const cleanText = text.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]\s*/g, "").trim();
  try {
    const parsed = JSON.parse(match[1].trim());
    return { cleanText, actions: parsed.actions || null };
  } catch {
    return { cleanText: text, actions: null };
  }
}

export function useAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const { user } = useAuth();
  const qc = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const conversationHistory = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));

    const CHAT_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-assistant`;
    const session = (await supabase.auth.getSession()).data.session;

    try {
      abortRef.current = new AbortController();
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ message: text.trim(), conversationHistory }),
        signal: abortRef.current.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Error del asistente" }));
        throw new Error(err.error || `Error ${resp.status}`);
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let fullContent = "";
      const assistantId = crypto.randomUUID();

      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              fullContent += content;
              const display = fullContent.replace(/\[ACTIONS\][\s\S]*?\[\/ACTIONS\]\s*/g, "").trim();
              setMessages((prev) =>
                prev.map((m) => (m.id === assistantId ? { ...m, content: display } : m))
              );
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Flush remaining
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) fullContent += content;
          } catch { /* ignore */ }
        }
      }

      const { cleanText, actions } = parseActions(fullContent);
      setMessages((prev) =>
        prev.map((m) => (m.id === assistantId ? { ...m, content: cleanText, actions: actions || undefined } : m))
      );

      if (!isOpen) setHasUnread(true);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: `❌ ${e.message || "Error al contactar al asistente"}` },
        ]);
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [messages, isLoading, isOpen]);

  const executeActions = useCallback(async (actions: AssistantAction[]) => {
    const convertDateToISO = (value: string): string => {
      const ddmmyyyy = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (ddmmyyyy) return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
      return value;
    };
    const results: string[] = [];
    for (const action of actions) {
      const updateData: Record<string, string> = {};
      if (action.type === "update_due_date") updateData.due_date = convertDateToISO(action.new_value);
      else if (action.type === "update_assignee") updateData.assignee_id = action.new_value;
      else if (action.type === "update_priority") updateData.priority = action.new_value;

      const { error } = await supabase.from("tasks").update(updateData).eq("id", action.task_id);
      if (error) {
        results.push(`❌ Error al actualizar "${action.task_title}": ${error.message}`);
      } else {
        results.push(`✅ "${action.task_title}" actualizada correctamente`);
      }
    }

    qc.invalidateQueries({ queryKey: ["tasks"] });
    qc.invalidateQueries({ queryKey: ["dashboard_my_tasks"] });
    qc.invalidateQueries({ queryKey: ["dashboard_all_tasks"] });

    return results;
  }, [qc]);

  const handleConfirmActions = useCallback(async (messageId: string) => {
    const msg = messages.find((m) => m.id === messageId);
    if (!msg?.actions) return;

    const results = await executeActions(msg.actions);
    setMessages((prev) => [
      ...prev.map((m) => (m.id === messageId ? { ...m, actionsHandled: true } : m)),
      { id: crypto.randomUUID(), role: "assistant", content: results.join("\n") },
    ]);
  }, [messages, executeActions]);

  const handleCancelActions = useCallback((messageId: string) => {
    setMessages((prev) => [
      ...prev.map((m) => (m.id === messageId ? { ...m, actionsHandled: true } : m)),
      { id: crypto.randomUUID(), role: "assistant", content: "Acciones canceladas. ¿Hay algo más en lo que pueda ayudarte?" },
    ]);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (!prev) setHasUnread(false);
      return !prev;
    });
  }, []);

  return {
    messages, isLoading, isOpen, hasUnread,
    sendMessage, toggle, handleConfirmActions, handleCancelActions,
  };
}
