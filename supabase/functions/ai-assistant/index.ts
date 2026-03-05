import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SPANISH_DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const SPANISH_MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

function formatDateES(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

function dayNameES(d: Date): string {
  return SPANISH_DAYS[d.getDay()];
}

function shortDateES(d: Date): string {
  return `${d.getDate()} ${SPANISH_MONTHS[d.getMonth()]}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { message, conversationHistory } = await req.json();

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // ── Gather context server-side ──────────────────────────────────────

    const [profileRes, membershipsRes] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("user_id", userId).single(),
      supabase.from("project_members").select("project_id").eq("user_id", userId),
    ]);

    const userName = profileRes.data?.full_name || profileRes.data?.email || "Usuario";
    const projectIds = (membershipsRes.data || []).map((m: any) => m.project_id);

    if (projectIds.length === 0) {
      // User has no projects – provide minimal context
      const taskContext = { userName, message: "No tienes proyectos asignados aún." };
      return streamAI(OPENAI_API_KEY, taskContext, message, conversationHistory);
    }

    // Parallel queries – RLS ensures user-scoped access
    const [projectsRes, columnsRes, tasksRes, subtasksRes, allMembersRes] = await Promise.all([
      supabase.from("projects").select("id, name, color").in("id", projectIds),
      supabase.from("project_columns").select("project_id, name, is_final").in("project_id", projectIds),
      supabase
        .from("tasks")
        .select("id, title, status, priority, start_date, due_date, project_id, assignee_id, created_by, updated_at, project:projects(name), assignee:profiles!tasks_assignee_id_profiles_fkey(full_name)")
        .in("project_id", projectIds)
        .order("due_date", { ascending: true }),
      supabase.from("subtasks").select("id, task_id, completed"),
      supabase
        .from("project_members")
        .select("project_id, user_id, profile:profiles!project_members_user_id_fkey(full_name)")
        .in("project_id", projectIds),
    ]);

    const projects = projectsRes.data || [];
    const columns = columnsRes.data || [];
    const allTasks = tasksRes.data || [];
    const subtasks = subtasksRes.data || [];
    const allMembers = (allMembersRes.data || []) as any[];

    // Build final-column map per project
    const finalColMap = new Map<string, Set<string>>();
    for (const col of columns) {
      if (col.is_final) {
        if (!finalColMap.has(col.project_id)) finalColMap.set(col.project_id, new Set());
        finalColMap.get(col.project_id)!.add(col.name);
      }
    }

    const isFinal = (t: any) => finalColMap.get(t.project_id)?.has(t.status) || false;

    // Subtask counts per task
    const subtaskMap = new Map<string, { total: number; completed: number }>();
    for (const s of subtasks) {
      if (!subtaskMap.has(s.task_id)) subtaskMap.set(s.task_id, { total: 0, completed: 0 });
      const entry = subtaskMap.get(s.task_id)!;
      entry.total++;
      if (s.completed) entry.completed++;
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];

    // Separate active vs completed
    const activeTasks: any[] = [];
    const completedRecent: any[] = [];

    for (const t of allTasks) {
      const sub = subtaskMap.get(t.id);
      const enriched = {
        id: t.id,
        title: t.title,
        priority: t.priority,
        start_date: t.start_date,
        due_date: t.due_date,
        status: t.status,
        project_name: (t.project as any)?.name,
        assignee_name: (t.assignee as any)?.full_name || null,
        assignee_id: t.assignee_id,
        created_by: t.created_by,
        project_id: t.project_id,
        subtasks_total: sub?.total || 0,
        subtasks_completed: sub?.completed || 0,
      };

      if (isFinal(t)) {
        if (t.updated_at && t.updated_at >= thirtyDaysAgoStr) {
          completedRecent.push({ id: t.id, title: t.title, project_name: enriched.project_name, due_date: t.due_date });
        }
      } else {
        activeTasks.push(enriched);
      }
    }

    // User's own tasks (assignee or creator)
    const myActiveTasks = activeTasks.filter((t) => t.assignee_id === userId || t.created_by === userId);
    const overdueTasks = myActiveTasks.filter((t) => t.due_date && t.due_date < todayStr);
    const tasksDueToday = myActiveTasks.filter((t) => t.due_date === todayStr);

    // Week tasks grouped by day
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    const endOfWeekStr = endOfWeek.toISOString().split("T")[0];
    const thisWeekTasks = myActiveTasks.filter((t) => t.due_date && t.due_date >= todayStr && t.due_date <= endOfWeekStr);
    const weekByDay: Record<string, any[]> = {};
    for (const t of thisWeekTasks) {
      const d = new Date(t.due_date + "T00:00:00");
      const key = `${dayNameES(d)} ${shortDateES(d)}`;
      if (!weekByDay[key]) weekByDay[key] = [];
      weekByDay[key].push({ title: t.title, project: t.project_name, priority: t.priority });
    }

    // 14-day calendar
    const calendar: any[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dStr = d.toISOString().split("T")[0];
      const dayTasks = myActiveTasks.filter((t) => t.due_date === dStr);
      calendar.push({
        date: formatDateES(d),
        day_name: dayNameES(d),
        tasks_due: dayTasks.length,
        is_critical: dayTasks.length >= 3,
        tasks: dayTasks.map((t: any) => ({ title: t.title, project: t.project_name, priority: t.priority })),
      });
    }

    // Project stats
    const memberCountMap = new Map<string, number>();
    const seenMembers = new Map<string, Set<string>>();
    for (const m of allMembers) {
      if (!seenMembers.has(m.project_id)) seenMembers.set(m.project_id, new Set());
      seenMembers.get(m.project_id)!.add(m.user_id);
    }
    for (const [pid, members] of seenMembers) memberCountMap.set(pid, members.size);

    const projectStats = projects.map((p: any) => {
      const pActive = activeTasks.filter((t) => t.project_id === p.id);
      const pCompleted = completedRecent.filter((t: any) => {
        const task = allTasks.find((at: any) => at.id === t.id);
        return task?.project_id === p.id;
      });
      const pOverdue = pActive.filter((t) => t.due_date && t.due_date < todayStr);
      return {
        id: p.id,
        name: p.name,
        total_active: pActive.length,
        completed_last_30d: pCompleted.length,
        overdue: pOverdue.length,
        members_count: memberCountMap.get(p.id) || 0,
      };
    });

    // Team workload
    const teamMap = new Map<string, { full_name: string; pending: number; overdue: number }>();
    for (const m of allMembers) {
      if (m.user_id === userId) continue;
      if (!teamMap.has(m.user_id)) {
        teamMap.set(m.user_id, {
          full_name: (m.profile as any)?.full_name || "Sin nombre",
          pending: 0,
          overdue: 0,
        });
      }
    }
    for (const t of activeTasks) {
      if (t.assignee_id && teamMap.has(t.assignee_id)) {
        teamMap.get(t.assignee_id)!.pending++;
        if (t.due_date && t.due_date < todayStr) teamMap.get(t.assignee_id)!.overdue++;
      }
    }

    const taskContext = {
      userName,
      todayDate: formatDateES(today),
      todayDayName: dayNameES(today),
      myActiveTasks: myActiveTasks.map((t) => ({
        id: t.id, title: t.title, priority: t.priority, start_date: t.start_date,
        due_date: t.due_date, project_name: t.project_name, assignee_name: t.assignee_name,
        subtasks_total: t.subtasks_total, subtasks_completed: t.subtasks_completed,
      })),
      completedLast30Days: completedRecent,
      overdueTasks: overdueTasks.map((t) => ({
        id: t.id, title: t.title, due_date: t.due_date, project_name: t.project_name, priority: t.priority,
      })),
      tasksDueToday: tasksDueToday.map((t) => ({
        id: t.id, title: t.title, project_name: t.project_name, priority: t.priority, assignee_name: t.assignee_name,
      })),
      thisWeekByDay: weekByDay,
      calendar14Days: calendar,
      projectStats,
      teamWorkload: Array.from(teamMap.values()),
    };

    return streamAI(OPENAI_API_KEY, taskContext, message, conversationHistory);
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function streamAI(apiKey: string, taskContext: any, message: string, conversationHistory: any[]) {
  const systemPrompt = `Eres un asistente de productividad exclusivo de TaskFlow para el usuario logueado. Solo tienes acceso a SUS tareas y proyectos, nunca a datos de otros usuarios.

Reglas estrictas:
- Usa SIEMPRE los datos del contexto para responder
- Nunca digas que no hay tareas si el contexto las incluye
- Cuando pregunten por un día, busca en el calendario de 14 días
- Identifica días críticos (3 o más tareas vencen ese día)
- Analiza cargas de trabajo y sugiere redistribución si es necesario
- Responde CUALQUIER pregunta relacionada con tareas, fechas, proyectos y productividad del usuario
- Si te preguntan algo fuera de TaskFlow responde: 'Solo puedo ayudarte con la gestión de tus tareas en TaskFlow'
- Responde siempre en español con fechas en formato DD/MM/YYYY
- Hoy es: ${taskContext.todayDate} (${taskContext.todayDayName})

Cuando el usuario pide reprogramar, reasignar o cambiar prioridad de tareas, SIEMPRE responde con un bloque de acciones antes de tu mensaje explicativo, usando exactamente este formato:

[ACTIONS]
{"actions":[{"type":"update_due_date","task_id":"uuid","task_title":"nombre","current_value":"valor_actual","new_value":"nuevo_valor","reason":"razón"}]}
[/ACTIONS]

Tipos de acción soportados:
- update_due_date: cambiar fecha de vencimiento (formato YYYY-MM-DD)
- update_assignee: cambiar responsable (usar user_id)
- update_priority: cambiar prioridad (low, medium, high, urgent)

Después del bloque [ACTIONS], escribe un mensaje explicando los cambios propuestos y pide confirmación al usuario.
Si el usuario NO pide acciones, responde normalmente sin el bloque [ACTIONS].

CONTEXTO ACTUAL DEL USUARIO:
${JSON.stringify(taskContext)}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(conversationHistory || []).slice(-10),
    { role: "user", content: message },
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      stream: true,
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
    return new Response(JSON.stringify({ error: "Error del asistente IA" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(response.body, {
    headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
  });
}
