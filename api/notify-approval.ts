import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

// Node.js runtime — raw SMTP needs TCP sockets, which the Edge runtime can't open.
export const config = { maxDuration: 30 };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  // Brevo SMTP — same account that already powers Supabase magic-link / invite email.
  // Host + port default to Brevo's standard relay, so only the SMTP login + key are required.
  const smtpHost = process.env.BREVO_SMTP_HOST ?? "smtp-relay.brevo.com";
  const smtpPort = Number(process.env.BREVO_SMTP_PORT ?? "587");
  const smtpUser = process.env.BREVO_SMTP_USER;
  const smtpPass = process.env.BREVO_SMTP_PASS;
  const fromEmail = process.env.MAIL_FROM ?? "technology@makeadiff.in";
  const appUrl = process.env.APP_URL ?? "https://mad-care-camps.vercel.app";

  if (!supabaseUrl || !serviceKey || !smtpUser || !smtpPass) {
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify caller is an active super_admin or mad_employee
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authErr,
  } = await admin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: "Unauthorized" });

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
    return res.status(403).json({ error: "Forbidden" });
  }

  // Resolve the approved user's email + profile
  const { userId } = req.body ?? {};
  if (!userId) return res.status(400).json({ error: "userId required" });

  const {
    data: { user: approvedUser },
    error: userErr,
  } = await admin.auth.admin.getUserById(userId);
  if (userErr || !approvedUser?.email) return res.status(404).json({ error: "User not found" });

  const { data: approvedProfile } = await admin
    .from("profiles")
    .select("full_name, role")
    .eq("id", userId)
    .single();

  const name = approvedProfile?.full_name || "there";
  const role =
    approvedProfile?.role === "co" ? "Chapter Organizer (CO)" : "Community Health Organizer (CHO)";

  // Send via Brevo SMTP (same relay as Supabase auth email)
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // 465 = implicit TLS; 587 = STARTTLS
    auth: { user: smtpUser, pass: smtpPass },
  });

  try {
    await transporter.sendMail({
      from: `"Make A Difference" <${fromEmail}>`,
      to: approvedUser.email,
      subject: "Your MAD account has been approved",
      html: `
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
    });
  } catch (err) {
    console.error("SMTP send error:", err);
    return res.status(500).json({ error: "Failed to send email" });
  }

  return res.status(200).json({ success: true });
}
