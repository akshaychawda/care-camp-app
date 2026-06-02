import { createClient } from "@supabase/supabase-js";

export const config = { runtime: "edge" };

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const brevoApiKey = process.env.BREVO_API_KEY!;
  const appUrl = process.env.APP_URL ?? "https://mad-care-camps.vercel.app";

  if (!supabaseUrl || !serviceKey || !brevoApiKey) {
    return json({ error: "Server misconfiguration" }, 500);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify caller is super_admin or mad_employee
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

  if (
    !callerProfile ||
    callerProfile.status !== "active" ||
    !["super_admin", "mad_employee"].includes(callerProfile.role)
  ) {
    return json({ error: "Forbidden" }, 403);
  }

  // Get the approved user's details
  const { userId } = await req.json();
  if (!userId) return json({ error: "userId required" }, 400);

  const {
    data: { user: approvedUser },
    error: userErr,
  } = await admin.auth.admin.getUserById(userId);
  if (userErr || !approvedUser?.email) return json({ error: "User not found" }, 404);

  const { data: approvedProfile } = await admin
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single();

  const name = approvedProfile?.full_name || "there";
  const role =
    approvedProfile?.role === "co" ? "Chapter Organizer (CO)" : "Community Health Organizer (CHO)";

  // Send email via Brevo API
  const emailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": brevoApiKey,
    },
    body: JSON.stringify({
      sender: { name: "Make A Difference", email: "noreply@makeadiff.in" },
      to: [{ email: approvedUser.email, name: name }],
      subject: "Your MAD account has been approved",
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <p style="font-size: 18px; font-weight: bold; color: #C62828;">Make A Difference</p>
          <h2 style="color: #1a1a1a;">You're approved, ${name}!</h2>
          <p style="color: #555;">Your access request for the MAD Care Camps app has been approved. You've been granted <strong>${role}</strong> access.</p>
          <p style="color: #555;">Click the button below to sign in:</p>
          <a href="${appUrl}/login" style="display: inline-block; margin: 16px 0; padding: 12px 24px; background: #C62828; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Sign in to MAD Care Camps
          </a>
          <p style="color: #999; font-size: 13px;">If you didn't request this access, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!emailRes.ok) {
    const errBody = await emailRes.text();
    console.error("Brevo error:", errBody);
    return json({ error: "Failed to send email" }, 500);
  }

  return json({ success: true }, 200);
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
