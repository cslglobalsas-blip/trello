import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CommentReaction {
  id: string;
  comment_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export function useCommentReactions(commentIds: string[]) {
  return useQuery({
    queryKey: ["comment-reactions", commentIds],
    queryFn: async (): Promise<CommentReaction[]> => {
      if (commentIds.length === 0) return [];
      const { data, error } = await supabase
        .from("comment_reactions")
        .select("*")
        .in("comment_id", commentIds);
      if (error) throw error;
      return data ?? [];
    },
    enabled: commentIds.length > 0,
  });
}

export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ comment_id, user_id, emoji }: { comment_id: string; user_id: string; emoji: string }) => {
      // Check if reaction exists
      const { data: existing } = await supabase
        .from("comment_reactions")
        .select("id")
        .eq("comment_id", comment_id)
        .eq("user_id", user_id)
        .eq("emoji", emoji)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase.from("comment_reactions").delete().eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("comment_reactions").insert({ comment_id, user_id, emoji });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comment-reactions"] });
    },
  });
}
