import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
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

    const userId = claimsData.claims.sub;

    const {
      task_id,
      task_title,
      project_name,
      assigned_to_user_id,
      assigned_by_name,
      due_date,
      priority,
    } = await req.json();

    // Guard: self-assign → no email
    if (!assigned_to_user_id || assigned_to_user_id === userId) {
      return new Response(
        JSON.stringify({ message: "No email needed (self-assign or no assignee)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    // Fetch assignee profile using service role
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("user_id", assigned_to_user_id)
      .single();

    if (profileError || !profile?.email) {
      console.error("Could not fetch assignee profile:", profileError);
      return new Response(
        JSON.stringify({ error: "Assignee profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const assigneeName = profile.full_name || profile.email;
    const appUrl = "https://csl-trello.lovable.app";

    const priorityLabels: Record<string, string> = {
      urgent: "Urgente",
      high: "Alta",
      medium: "Media",
      low: "Baja",
    };

    const priorityColors: Record<string, string> = {
      urgent: "#EF4444",
      high: "#F97316",
      medium: "#EAB308",
      low: "#22C55E",
    };

    const priorityLabel = priorityLabels[priority] || "Media";
    const priorityColor = priorityColors[priority] || "#EAB308";
    const dueDateDisplay = due_date || "Sin fecha";

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <div style="max-width:600px;margin:0 auto;padding:24px;">
          <div style="background:#0052CC;border-radius:12px 12px 0 0;padding:24px 32px;">
            <h1 style="margin:0;font-size:20px;color:#ffffff;font-weight:700;">📋 TaskFlow</h1>
          </div>
          <div style="background:#ffffff;border-radius:0 0 12px 12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
            <p style="margin:0 0 16px;font-size:16px;color:#111827;">
              Hola <strong>${assigneeName}</strong>,
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#374151;">
              <strong>${assigned_by_name}</strong> te ha asignado una nueva tarea:
            </p>
            <div style="border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-bottom:24px;background:#F9FAFB;">
              <h3 style="margin:0 0 12px;font-size:16px;color:#111827;">${task_title}</h3>
              <table style="width:100%;font-size:14px;color:#374151;">
                <tr>
                  <td style="padding:4px 0;color:#6B7280;">Proyecto</td>
                  <td style="padding:4px 0;font-weight:600;">${project_name || "—"}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#6B7280;">Fecha de vencimiento</td>
                  <td style="padding:4px 0;font-weight:600;">${dueDateDisplay}</td>
                </tr>
                <tr>
                  <td style="padding:4px 0;color:#6B7280;">Prioridad</td>
                  <td style="padding:4px 0;">
                    <span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;color:#fff;background:${priorityColor};font-weight:600;">
                      ${priorityLabel}
                    </span>
                  </td>
                </tr>
              </table>
            </div>
            <a href="${appUrl}" style="display:inline-block;padding:12px 28px;background:#0052CC;color:#ffffff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">
              Ver tarea
            </a>
            <hr style="border:none;border-top:1px solid #E5E7EB;margin:28px 0 16px;" />
            <p style="margin:0;font-size:12px;color:#9CA3AF;text-align:center;">
              TaskFlow · Notificación automática de asignación
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
        from: "TaskFlow <noreply@cslcrm.com>",
        to: [profile.email],
        subject: `Nueva tarea asignada: ${task_title}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error(`Failed to send email to ${profile.email}: ${errBody}`);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Assignment email sent to ${profile.email} for task "${task_title}"`);
    return new Response(
      JSON.stringify({ message: "Email sent", to: profile.email }),
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
