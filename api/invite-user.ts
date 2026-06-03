import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceKey) {
    return json({ error: "Server misconfiguration" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify the requesting user is super_admin
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authErr,
  } = await admin.auth.getUser(token);
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "super_admin" || callerProfile?.status !== "active") {
    return json({ error: "Forbidden" }, 403);
  }

  const { email, full_name, role } = await req.json();
  if (!email) return json({ error: "email is required" }, 400);

  // Validate the assigned role; default to the safest field role if missing/invalid.
  const ALLOWED_ROLES = ["cho", "co", "mad_employee"];
  const inviteRole = ALLOWED_ROLES.includes(role) ? role : "mad_employee";

  // Derive the redirect from the caller's origin (so it works on any domain, incl.
  // a future custom domain), falling back to APP_URL then the known deployment. (B7)
  const origin =
    req.headers.get("origin") ?? process.env.APP_URL ?? "https://mad-care-camps.vercel.app";

  const { data: inviteData, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: full_name ?? "", role: inviteRole, status: "active" },
    redirectTo: `${origin}/auth/callback`,
  });

  if (error) return json({ error: error.message }, 400);

  // Upsert profile so the invited user appears in the users list immediately
  if (inviteData?.user) {
    await admin.from("profiles").upsert(
      {
        id: inviteData.user.id,
        full_name: full_name ?? "",
        email,
        role: inviteRole,
        status: "invited",
      },
      { onConflict: "id" },
    );
  }

  return json({ success: true }, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
