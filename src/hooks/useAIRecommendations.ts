import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/hooks/useAuth";
import { startOfToday, format, addDays } from "date-fns";

export interface Recommendation {
  type: "urgent" | "warning" | "positive";
  message: string;
}

interface CacheEntry {
  data: Recommendation[];
  timestamp: number;
}

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCacheKey(userId: string) {
  return `ai_recommendations_cache_${userId}`;
}

function readCache(userId: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(getCacheKey(userId));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeCache(userId: string, data: Recommendation[]) {
  localStorage.setItem(getCacheKey(userId), JSON.stringify({ data, timestamp: Date.now() }));
}

export function useAIRecommendations() {
  const { user } = useAuth();
  const { isLoading: dashLoading } = useDashboardData();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchRecommendations = useCallback(async (force = false) => {
    if (!user?.id) return;

    if (!force) {
      const cached = readCache(user.id);
      if (cached) {
        setRecommendations(cached.data);
        setLastUpdated(cached.timestamp);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("ai-recommendations", {
        body: {},
      });

      if (fnError) throw fnError;

      if (data?.error) {
        setError(data.error);
        return;
      }

      const recs: Recommendation[] = data?.recommendations ?? [];
      setRecommendations(recs);
      setLastUpdated(Date.now());
      writeCache(user.id, recs);
    } catch (err: any) {
      console.error("AI recommendations error:", err);
      setError("No se pudieron cargar las recomendaciones.");
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Auto-fetch once dashboard data is ready
  useEffect(() => {
    if (dashLoading || hasFetched.current || !user?.id) return;
    hasFetched.current = true;
    fetchRecommendations();
  }, [dashLoading, user?.id, fetchRecommendations]);

  const refresh = useCallback(() => {
    if (user?.id) {
      localStorage.removeItem(getCacheKey(user.id));
    }
    fetchRecommendations(true);
  }, [fetchRecommendations, user?.id]);

  return { recommendations, isLoading, lastUpdated, error, refresh };
}
