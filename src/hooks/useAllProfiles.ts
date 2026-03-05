import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProfileOption {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
}

export function useAllProfiles(enabled: boolean) {
  return useQuery({
    queryKey: ["all-profiles"],
    queryFn: async (): Promise<ProfileOption[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url, email")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data ?? [];
    },
    enabled,
  });
}
