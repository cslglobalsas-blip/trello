import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate: require CRON_SECRET bearer token
    const authHeader = req.headers.get("Authorization");
    const cronSecret = Deno.env.get("CRON_SECRET");
    if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Calculate today's date in UTC-5 (Bogotá/Lima)
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const bogotaMs = utcMs - 5 * 3600000;
    const bogotaDate = new Date(bogotaMs);
    const today = bogotaDate.toISOString().split("T")[0]; // YYYY-MM-DD

    console.log(`Fetching tasks due on ${today} (UTC-5)`);

    // Get all tasks due today that are NOT in a final column
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select(`
        id,
        title,
        priority,
        status,
        project_id,
        assignee_id,
        projects!inner(name),
        profiles!tasks_assignee_id_profiles_fkey!inner(email, full_name, user_id)
      `)
      .eq("due_date", today)
      .not("assignee_id", "is", null);

    if (tasksError) {
      throw tasksError;
    }

    if (!tasks || tasks.length === 0) {
      console.log("No tasks due today");
      return new Response(
        JSON.stringify({ message: "No tasks due today", emailsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all final columns to filter out completed tasks
    const projectIds = [...new Set(tasks.map((t: any) => t.project_id))];
    const { data: finalColumns, error: colError } = await supabase
      .from("project_columns")
      .select("project_id, name")
      .in("project_id", projectIds)
      .eq("is_final", true);

    if (colError) {
      throw colError;
    }

    const finalColumnMap = new Map<string, Set<string>>();
    for (const col of finalColumns || []) {
      if (!finalColumnMap.has(col.project_id)) {
        finalColumnMap.set(col.project_id, new Set());
      }
      finalColumnMap.get(col.project_id)!.add(col.name);
    }

    // Filter out tasks in final columns
    const activeTasks = tasks.filter((t: any) => {
      const finals = finalColumnMap.get(t.project_id);
      return !finals || !finals.has(t.status);
    });

    if (activeTasks.length === 0) {
      console.log("All tasks due today are in final columns");
      return new Response(
        JSON.stringify({ message: "All tasks completed", emailsSent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group tasks by user
    const tasksByUser = new Map<string, { email: string; fullName: string; tasks: any[] }>();

    for (const task of activeTasks) {
      const profile = task.profiles as any;
      const userId = profile.user_id;

      if (!tasksByUser.has(userId)) {
        tasksByUser.set(userId, {
          email: profile.email,
          fullName: profile.full_name || profile.email,
          tasks: [],
        });
      }

      tasksByUser.get(userId)!.tasks.push({
        title: task.title,
        priority: task.priority,
        projectName: (task.projects as any).name,
        projectId: task.project_id,
      });
    }

    const appUrl = "https://csl-trello.lovable.app";
    let emailsSent = 0;

    for (const [_userId, userData] of tasksByUser) {
      // Group tasks by project
      const tasksByProject = new Map<string, { projectName: string; projectId: string; tasks: any[] }>();
      for (const t of userData.tasks) {
        if (!tasksByProject.has(t.projectId)) {
          tasksByProject.set(t.projectId, { projectName: t.projectName, projectId: t.projectId, tasks: [] });
        }
        tasksByProject.get(t.projectId)!.tasks.push(t);
      }

      const priorityColors: Record<string, string> = {
        urgent: "#EF4444",
        high: "#F97316",
        medium: "#EAB308",
        low: "#22C55E",
        none: "#94A3B8",
      };

      const priorityLabels: Record<string, string> = {
        urgent: "Urgente",
        high: "Alta",
        medium: "Media",
        low: "Baja",
        none: "Sin prioridad",
      };

      let projectsHtml = "";
      for (const [, proj] of tasksByProject) {
        const tasksHtml = proj.tasks
          .map(
            (t: any) => `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;">
                ${t.title}
              </td>
              <td style="padding:8px 12px;border-bottom:1px solid #E5E7EB;text-align:center;">
                <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;color:#fff;background:${priorityColors[t.priority] || priorityColors.none};">
                  ${priorityLabels[t.priority] || priorityLabels.none}
                </span>
              </td>
            </tr>`
          )
          .join("");

        projectsHtml += `
          <div style="margin-bottom:20px;">
            <h3 style="margin:0 0 8px;font-size:16px;color:#1F2937;">
              📁 ${proj.projectName}
            </h3>
            <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #E5E7EB;">
              <thead>
                <tr style="background:#F9FAFB;">
                  <th style="padding:8px 12px;text-align:left;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Tarea</th>
                  <th style="padding:8px 12px;text-align:center;font-size:13px;color:#6B7280;border-bottom:1px solid #E5E7EB;">Prioridad</th>
                </tr>
              </thead>
              <tbody>
                ${tasksHtml}
              </tbody>
            </table>
            <a href="${appUrl}/projects/${proj.projectId}" style="display:inline-block;margin-top:8px;font-size:13px;color:#3B82F6;text-decoration:none;">
              Ver proyecto →
            </a>
          </div>`;
      }

      const html = `
        <!DOCTYPE html>
        <html>
        <body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
              <h1 style="margin:0 0 4px;font-size:22px;color:#111827;">
                📋 Tus tareas para hoy
              </h1>
              <p style="margin:0 0 24px;font-size:14px;color:#6B7280;">
                ${today} · ${userData.tasks.length} tarea${userData.tasks.length > 1 ? "s" : ""} pendiente${userData.tasks.length > 1 ? "s" : ""}
              </p>
              <p style="margin:0 0 20px;font-size:15px;color:#374151;">
                Hola <strong>${userData.fullName}</strong>, estas son las tareas que tienes asignadas para hoy:
              </p>
              ${projectsHtml}
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:24px 0;" />
              <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
                Este correo se envía automáticamente cada día a las 6:00 a.m.
              </p>
            </div>
          </div>
        </body>
        </html>`;

      const resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Tareas Diarias <onboarding@resend.dev>",
          to: [userData.email],
          subject: `Tus tareas para hoy - ${today}`,
          html,
        }),
      });

      if (!resendRes.ok) {
        const errBody = await resendRes.text();
        console.error(`Failed to send email to ${userData.email}: ${errBody}`);
      } else {
        emailsSent++;
        console.log(`Email sent to ${userData.email}`);
      }
    }

    return new Response(
      JSON.stringify({ message: `Emails sent: ${emailsSent}`, emailsSent }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
