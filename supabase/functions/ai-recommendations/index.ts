import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // ---- Server-side data fetching filtered by user ----

    // 1. Get user's project IDs
    const { data: memberships } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", userId);

    const projectIds = (memberships ?? []).map((m: any) => m.project_id);

    if (projectIds.length === 0) {
      // No projects – return empty recommendations
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get project names
    const { data: projects } = await supabase
      .from("projects")
      .select("id, name")
      .in("id", projectIds);

    const projectNameMap: Record<string, string> = {};
    for (const p of projects ?? []) {
      projectNameMap[p.id] = p.name;
    }

    // 3. Get final columns for those projects
    const { data: columns } = await supabase
      .from("project_columns")
      .select("id, project_id, is_final")
      .in("project_id", projectIds);

    const finalColumnIds = new Set(
      (columns ?? []).filter((c: any) => c.is_final).map((c: any) => c.id)
    );

    // 4. Get all tasks in user's projects
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, assignee_id, status, due_date, project_id, updated_at")
      .in("project_id", projectIds);

    const allTasks = tasks ?? [];

    // 5. Compute KPIs
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const weekLater = new Date(now);
    weekLater.setDate(weekLater.getDate() + 7);
    const weekLaterStr = weekLater.toISOString().slice(0, 10);
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    let overdueTasks = 0;
    let tasksDueToday = 0;
    let tasksDueThisWeek = 0;
    let completedThisWeek = 0;
    let unassignedTasks = 0;

    // Per-project stats
    const projectStats: Record<string, { completed: number; total: number }> = {};
    // Per-assignee pending count (workload)
    const assigneePending: Record<string, number> = {};

    let activeTasks = 0;

    for (const t of allTasks) {
      const isFinal = finalColumnIds.has(t.status);
      if (!isFinal) activeTasks++;
      const isMyTask = t.assignee_id === userId;

      // Project stats
      if (!projectStats[t.project_id]) {
        projectStats[t.project_id] = { completed: 0, total: 0 };
      }
      projectStats[t.project_id].total++;
      if (isFinal) projectStats[t.project_id].completed++;

      // Unassigned
      if (!t.assignee_id && !isFinal) unassignedTasks++;

      // Workload (pending tasks per assignee, non-final)
      if (t.assignee_id && !isFinal) {
        assigneePending[t.assignee_id] = (assigneePending[t.assignee_id] || 0) + 1;
      }

      // User-specific KPIs
      if (isMyTask && !isFinal && t.due_date) {
        if (t.due_date < todayStr) overdueTasks++;
        if (t.due_date === todayStr) tasksDueToday++;
        if (t.due_date >= todayStr && t.due_date <= weekLaterStr) tasksDueThisWeek++;
      }

      // Completed this week by user
      if (isMyTask && isFinal && t.updated_at) {
        const updatedDate = new Date(t.updated_at);
        if (updatedDate >= weekAgo) completedThisWeek++;
      }
    }

    // 6. Build projectsAtRisk
    const projectsAtRisk = Object.entries(projectStats)
      .filter(([, s]) => s.total > 0 && s.completed < s.total)
      .slice(0, 5)
      .map(([pid, s]) => ({
        name: projectNameMap[pid] || pid,
        completed: s.completed,
        total: s.total,
      }));

    // 7. Build workload (get profile names for assignees)
    const assigneeIds = Object.keys(assigneePending);
    let workload: { name: string; pending: number }[] = [];
    if (assigneeIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", assigneeIds);

      const nameMap: Record<string, string> = {};
      for (const p of profiles ?? []) {
        nameMap[p.user_id] = p.full_name || "Sin nombre";
      }

      workload = assigneeIds
        .map((id) => ({ name: nameMap[id] || "Sin nombre", pending: assigneePending[id] }))
        .sort((a, b) => b.pending - a.pending)
        .slice(0, 10);
    }

    const totalTasks = activeTasks;

    const payload = {
      overdueTasks,
      tasksDueToday,
      tasksDueThisWeek,
      completedThisWeek,
      totalTasks,
      projectsAtRisk,
      workload,
      unassignedTasks,
    };

    // ---- Call OpenAI ----

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const systemPrompt = `Eres un asistente de productividad para una app de gestión de proyectos llamada TaskFlow. Analiza los datos del usuario y genera entre 3 y 5 recomendaciones concretas, priorizadas y accionables. Responde en español. Usa la herramienta generate_recommendations para devolver las recomendaciones.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(payload) },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_recommendations",
              description: "Genera recomendaciones de productividad basadas en los datos del usuario.",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["urgent", "warning", "positive"] },
                        message: { type: "string" },
                      },
                      required: ["type", "message"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_recommendations" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Límite de solicitudes excedido. Intenta de nuevo más tarde." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos agotados. Agrega fondos en tu workspace de Lovable." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(JSON.stringify({ error: "Error al generar recomendaciones" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      const content = result.choices?.[0]?.message?.content;
      if (content) {
        try {
          const parsed = JSON.parse(content);
          return new Response(JSON.stringify({ recommendations: parsed.recommendations || parsed }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } catch {
          // ignore
        }
      }
      return new Response(JSON.stringify({ error: "No se pudieron generar recomendaciones" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ recommendations: args.recommendations }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-recommendations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
