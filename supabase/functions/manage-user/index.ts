import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sanitizeError } from "../_shared/errors.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_ACTIONS = ["deactivate", "activate", "delete", "update_profile"];

Deno.serve(async (req) => {
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

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerUserId = claimsData.claims.sub as string;

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: roleCheck } = await serviceClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUserId)
      .single();

    if (roleCheck?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const user_id = typeof body.user_id === "string" ? body.user_id : "";
    const action = typeof body.action === "string" ? body.action : "";

    if (!UUID_RE.test(user_id) || !VALID_ACTIONS.includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid parameters" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Allow update_profile on any user (including self), block others on self
    if (user_id === callerUserId && action !== "update_profile") {
      return new Response(JSON.stringify({ error: "Cannot modify your own account" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "update_profile") {
      const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (typeof body.full_name === "string") updateData.full_name = body.full_name.trim();
      if (typeof body.avatar_url === "string") updateData.avatar_url = body.avatar_url;

      const { error: updateError } = await serviceClient
        .from("profiles")
        .update(updateData)
        .eq("user_id", user_id);
      if (updateError) throw updateError;
    } else if (action === "delete") {
      await serviceClient.from("user_roles").delete().eq("user_id", user_id);
      await serviceClient.from("project_members").delete().eq("user_id", user_id);
      await serviceClient.from("profiles").delete().eq("user_id", user_id);
      const { error: authError } = await serviceClient.auth.admin.deleteUser(user_id);
      if (authError) throw authError;
    } else if (action === "deactivate") {
      await serviceClient.auth.admin.updateUserById(user_id, {
        ban_duration: "876600h",
      });
      await serviceClient
        .from("profiles")
        .update({ is_active: false })
        .eq("user_id", user_id);
    } else {
      await serviceClient.auth.admin.updateUserById(user_id, {
        ban_duration: "none",
      });
      await serviceClient
        .from("profiles")
        .update({ is_active: true })
        .eq("user_id", user_id);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("manage-user error:", err);
    return new Response(JSON.stringify({ error: sanitizeError(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
