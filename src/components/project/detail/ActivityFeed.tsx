import { useState, useMemo } from "react";
import { useComments, useAddComment, useUpdateComment, useDeleteComment } from "@/hooks/useComments";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useCommentReactions, useToggleReaction } from "@/hooks/useCommentReactions";
import { useAllProfiles } from "@/hooks/useAllProfiles";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  ThumbsUp, Check, Eye, Pencil, Trash2, Send,
  ArrowRightLeft, UserPlus, UserMinus, Plus, AlertTriangle, Activity,
  MessageSquare, ListFilter,
} from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import type { Json } from "@/integrations/supabase/types";

interface Props {
  taskId: string;
  projectId: string;
}

type FeedItem =
  | { type: "comment"; id: string; created_at: string; user_id: string; content: string; updated_at: string }
  | { type: "activity"; id: string; created_at: string; user_id: string; action: string; details: Json };

type TabValue = "all" | "comments" | "activity";

const EMOJI_MAP: Record<string, { icon: React.ElementType; label: string }> = {
  thumbs_up: { icon: ThumbsUp, label: "👍" },
  check: { icon: Check, label: "✅" },
  eyes: { icon: Eye, label: "👀" },
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function relativeTime(date: string) {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es });
}

function getActionIcon(action: string) {
  switch (action) {
    case "status_changed": return ArrowRightLeft;
    case "assigned": return UserPlus;
    case "unassigned": return UserMinus;
    case "created": return Plus;
    case "priority_changed": return AlertTriangle;
    case "comment_added": return MessageSquare;
    default: return Activity;
  }
}

function getActionText(action: string, details: Record<string, any>, userName: string): string {
  switch (action) {
    case "status_changed":
      return `${userName} cambió el estado a ${details.new_status || "?"}`;
    case "assigned":
      return `${details.assignee_name || "Alguien"} fue asignado a esta tarea`;
    case "unassigned":
      return `${details.assignee_name || "Alguien"} fue removido de esta tarea`;
    case "created":
      return `${userName} creó esta tarea`;
    case "priority_changed":
      return `${userName} cambió la prioridad a ${details.new_priority || "?"}`;
    case "comment_added":
      return `${userName} agregó un comentario`;
    default:
      return `${userName} realizó: ${action}`;
  }
}

export function ActivityFeed({ taskId, projectId }: Props) {
  const { user } = useAuth();
  const { data: comments = [] } = useComments(taskId);
  const { data: activities = [] } = useActivityLog(taskId);
  const { data: profiles = [] } = useAllProfiles(true);
  const commentIds = useMemo(() => comments.map((c) => c.id), [comments]);
  const { data: reactions = [] } = useCommentReactions(commentIds);
  const addComment = useAddComment();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const toggleReaction = useToggleReaction();

  const [tab, setTab] = useState<TabValue>("all");
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const profileMap = useMemo(() => {
    const m = new Map<string, { full_name: string | null; email: string | null }>();
    profiles.forEach((p) => m.set(p.user_id, p));
    return m;
  }, [profiles]);

  const getUserName = (uid: string) => {
    const p = profileMap.get(uid);
    return p?.full_name || p?.email || uid.slice(0, 6);
  };

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [];
    if (tab !== "activity") {
      comments.forEach((c) =>
        items.push({ type: "comment", id: c.id, created_at: c.created_at, user_id: c.user_id, content: c.content, updated_at: c.updated_at })
      );
    }
    if (tab !== "comments") {
      activities.forEach((a) =>
        items.push({ type: "activity", id: a.id, created_at: a.created_at, user_id: a.user_id, action: a.action, details: a.details })
      );
    }
    items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    return items;
  }, [comments, activities, tab]);

  function handleSendComment() {
    const trimmed = newComment.replace(/<[^>]*>/g, "").trim();
    if (!trimmed || !user) return;
    addComment.mutate({ task_id: taskId, user_id: user.id, content: newComment });
    setNewComment("");
  }

  function handleSaveEdit(commentId: string) {
    updateComment.mutate({ id: commentId, content: editContent, task_id: taskId });
    setEditingId(null);
  }

  const tabs: { value: TabValue; label: string }[] = [
    { value: "all", label: "Todo" },
    { value: "comments", label: "Comentarios" },
    { value: "activity", label: "Actividad" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b px-4 pt-3 shrink-0">
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors ${
              tab === t.value
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Feed - scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {feed.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Sin actividad aún</p>
        )}
        {feed.map((item) =>
          item.type === "comment" ? (
            <CommentBubble
              key={item.id}
              item={item}
              userName={getUserName(item.user_id)}
              initials={getInitials(getUserName(item.user_id))}
              isOwn={user?.id === item.user_id}
              reactions={reactions.filter((r) => r.comment_id === item.id)}
              currentUserId={user?.id}
              onToggleReaction={(emoji) =>
                user && toggleReaction.mutate({ comment_id: item.id, user_id: user.id, emoji })
              }
              isEditing={editingId === item.id}
              editContent={editContent}
              onStartEdit={() => {
                setEditingId(item.id);
                setEditContent(item.content);
              }}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={() => handleSaveEdit(item.id)}
              onEditContentChange={setEditContent}
              onDelete={() => deleteComment.mutate({ id: item.id, task_id: taskId })}
            />
          ) : (
            <ActivityEntry
              key={item.id}
              item={item}
              userName={getUserName(item.user_id)}
              initials={getInitials(getUserName(item.user_id))}
            />
          )
        )}
      </div>

      {/* New comment - sticky bottom */}
      {tab !== "activity" && (
        <div className="shrink-0 border-t px-4 py-3 space-y-2">
          <RichTextEditor content={newComment} onChange={setNewComment} />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleSendComment} disabled={addComment.isPending} className="gap-1.5">
              <Send className="h-3.5 w-3.5" /> Comentar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Sub-components ---------- */

function CommentBubble({
  item,
  userName,
  initials,
  isOwn,
  reactions,
  currentUserId,
  onToggleReaction,
  isEditing,
  editContent,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditContentChange,
  onDelete,
}: {
  item: FeedItem & { type: "comment" };
  userName: string;
  initials: string;
  isOwn: boolean;
  reactions: { id: string; emoji: string; user_id: string }[];
  currentUserId?: string;
  onToggleReaction: (emoji: string) => void;
  isEditing: boolean;
  editContent: string;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditContentChange: (v: string) => void;
  onDelete: () => void;
}) {
  const wasEdited = item.updated_at !== item.created_at;

  return (
    <div className="flex gap-2">
      <Avatar className="h-7 w-7 shrink-0 mt-0.5">
        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="rounded-lg border bg-background p-2.5 space-y-1">
          <div className="flex items-center gap-2 justify-between">
            <span className="text-xs font-medium truncate">{userName}</span>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[10px] text-muted-foreground">{relativeTime(item.created_at)}</span>
              {wasEdited && <span className="text-[10px] text-muted-foreground italic">(editado)</span>}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-1.5">
              <RichTextEditor content={editContent} onChange={onEditContentChange} />
              <div className="flex gap-1 justify-end">
                <Button size="sm" variant="ghost" onClick={onCancelEdit} className="h-6 text-[10px] px-2">
                  Cancelar
                </Button>
                <Button size="sm" onClick={onSaveEdit} className="h-6 text-[10px] px-2">
                  Guardar
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none text-xs [&>*]:m-0"
              dangerouslySetInnerHTML={{ __html: item.content }}
            />
          )}
        </div>

        {/* Reactions + actions */}
        <div className="flex items-center gap-1 mt-1">
          {Object.entries(EMOJI_MAP).map(([key, { label }]) => {
            const count = reactions.filter((r) => r.emoji === key).length;
            const active = reactions.some((r) => r.emoji === key && r.user_id === currentUserId);
            return (
              <button
                key={key}
                onClick={() => onToggleReaction(key)}
                className={`flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full border transition-colors ${
                  active ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/50 border-transparent text-muted-foreground hover:bg-muted"
                }`}
              >
                <span>{label}</span>
                {count > 0 && <span>{count}</span>}
              </button>
            );
          })}
          {isOwn && !isEditing && (
            <>
              <button onClick={onStartEdit} className="ml-auto text-muted-foreground hover:text-foreground p-0.5">
                <Pencil className="h-3 w-3" />
              </button>
              <button onClick={onDelete} className="text-muted-foreground hover:text-destructive p-0.5">
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityEntry({
  item,
  userName,
  initials,
}: {
  item: FeedItem & { type: "activity" };
  userName: string;
  initials: string;
}) {
  const Icon = getActionIcon(item.action);
  const details = (typeof item.details === "object" && item.details !== null && !Array.isArray(item.details))
    ? (item.details as Record<string, any>)
    : {};
  const text = getActionText(item.action, details, userName);

  return (
    <div className="flex items-center gap-2 py-1">
      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center shrink-0">
        <Icon className="h-3 w-3 text-muted-foreground" />
      </div>
      <span className="text-xs text-muted-foreground flex-1">{text}</span>
      <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(item.created_at)}</span>
    </div>
  );
}
