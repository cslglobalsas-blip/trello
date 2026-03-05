import { useState } from "react";
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAIRecommendations, type Recommendation } from "@/hooks/useAIRecommendations";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

const typeConfig: Record<Recommendation["type"], { icon: typeof AlertTriangle; iconClass: string; bgClass: string }> = {
  urgent: { icon: AlertTriangle, iconClass: "text-destructive", bgClass: "bg-destructive/10" },
  warning: { icon: AlertTriangle, iconClass: "text-orange-600", bgClass: "bg-orange-500/10" },
  positive: { icon: CheckCircle, iconClass: "text-emerald-600", bgClass: "bg-emerald-500/10" },
};

export function AIRecommendationsCard() {
  const { recommendations, isLoading, lastUpdated, error, refresh } = useAIRecommendations();
  const [visible, setVisible] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("ai_recommendations_visible") !== "false" : true
  );

  const handleToggle = (checked: boolean) => {
    setVisible(checked);
    if (typeof window !== "undefined") localStorage.setItem("ai_recommendations_visible", String(checked));
  };

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Recomendaciones IA</h2>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={visible} onCheckedChange={handleToggle} />
          <Button variant="ghost" size="sm" onClick={refresh} disabled={isLoading || !visible}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span className="ml-1 hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {visible && (
        <>
          {isLoading && !recommendations.length ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : error && !recommendations.length ? (
            <p className="text-sm text-muted-foreground">{error}</p>
          ) : recommendations.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay recomendaciones disponibles aún.</p>
          ) : (
            <div className="space-y-2">
              {recommendations.map((rec, i) => {
                const config = typeConfig[rec.type] || typeConfig.positive;
                const Icon = config.icon;
                return (
                  <div key={i} className={`flex items-start gap-3 rounded-lg p-3 ${config.bgClass}`}>
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.iconClass}`} />
                    <p className="text-sm">{rec.message}</p>
                  </div>
                );
              })}
            </div>
          )}

          {lastUpdated && (
            <p className="text-xs text-muted-foreground mt-3">
              Actualizado {formatDistanceToNow(lastUpdated, { addSuffix: true, locale: es })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
