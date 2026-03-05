import { Bot } from "lucide-react";
import { useAssistantChat } from "@/hooks/useAssistantChat";
import { AssistantChatPanel } from "./AssistantChatPanel";

export function FloatingAssistantButton() {
  const { messages, isLoading, isOpen, hasUnread, sendMessage, toggle, handleConfirmActions, handleCancelActions } = useAssistantChat();

  return (
    <>
      {isOpen && (
        <AssistantChatPanel
          messages={messages}
          isLoading={isLoading}
          onSend={sendMessage}
          onClose={toggle}
          onConfirm={handleConfirmActions}
          onCancel={handleCancelActions}
        />
      )}

      <button
        onClick={toggle}
        className="fixed bottom-[88px] md:bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#0052CC] text-white shadow-lg hover:bg-[#003d99] transition-colors"
      >
        <Bot className="h-5 w-5" />
        {hasUnread && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold">
            !
          </span>
        )}
      </button>
    </>
  );
}
