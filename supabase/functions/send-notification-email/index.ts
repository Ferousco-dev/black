// supabase/functions/send-notification-email/index.ts
// Deploy with: supabase functions deploy send-notification-email
//
// This Edge Function is triggered by a database webhook on the notifications table.
// Set up the webhook in Supabase Dashboard → Database → Webhooks:
//   Table: notifications, Event: INSERT, URL: your-function-url

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/smtp/mod.ts";

const SMTP_HOST = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
const SMTP_PORT = Number(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USERNAME = Deno.env.get("SMTP_USERNAME") || "";
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD") || "";
const FROM_EMAIL = Deno.env.get("SMTP_FROM") || SMTP_USERNAME || "feranmioresajo@gmail.com";
const APP_NAME = "Chronicles";
const APP_URL = Deno.env.get("APP_URL") || "https://yourapp.com";
const BROADCAST_TYPES = new Set(["admin_broadcast", "admin_warning", "admin_update"]);

serve(async (req) => {
  const { record } = await req.json();

  if (!record || !BROADCAST_TYPES.has(record.type)) {
    return new Response("skipped", { status: 200 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Get the recipient's profile and email
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", record.user_id)
    .single();

  const { data: authUser } = await supabase.auth.admin.getUserById(
    record.user_id,
  );
  const email = authUser?.user?.email;

  if (!email || !profile) return new Response("no email", { status: 200 });

  if (!SMTP_USERNAME || !SMTP_PASSWORD) {
    return new Response("missing smtp credentials", { status: 200 });
  }

  const link = record.link
    ? record.link.startsWith("http")
      ? record.link
      : `${APP_URL}${record.link}`
    : null;

  const subjectPrefix = record.type === "admin_warning" ? "[Warning]" : record.type === "admin_update" ? "[Update]" : "[Announcement]";
  const subject = `${subjectPrefix} ${record.title}`;

  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
      <p style="font-size:12px; text-transform:uppercase; letter-spacing:0.12em; color:#94a3b8; margin:0 0 10px;">
        ${subjectPrefix.replace("[", "").replace("]", "")}
      </p>
      <h2 style="color: #0a1628; margin: 0 0 12px;">${record.title}</h2>
      ${record.body ? `<p style="color: #4a5568; line-height: 1.6;">${record.body}</p>` : ""}
      ${link ? `<a href="${link}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0a1628;color:white;border-radius:6px;text-decoration:none;">View details</a>` : ""}
      <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 12px; color: #999;">
        You're receiving this because you subscribed on ${APP_NAME}.
        <a href="${APP_URL}/settings" style="color: #999;">Manage preferences</a>
      </p>
    </div>
  `;

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: true,
      auth: {
        username: SMTP_USERNAME,
        password: SMTP_PASSWORD,
      },
    },
  });

  await client.send({
    from: `${APP_NAME} <${FROM_EMAIL}>`,
    to: email,
    subject,
    content: `${record.title}\n\n${record.body || ""}${link ? `\n\nRead more: ${link}` : ""}\n\nManage preferences: ${APP_URL}/settings`,
    html,
  });
  await client.close();

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
