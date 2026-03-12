// supabase/functions/send-notification-email/index.ts
// Deploy with: supabase functions deploy send-notification-email
//
// This Edge Function is triggered by a database webhook on the notifications table.
// Set up the webhook in Supabase Dashboard → Database → Webhooks:
//   Table: notifications, Event: INSERT, URL: your-function-url

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const FROM_EMAIL = "noreply@yourdomain.com";
const APP_NAME = "Chronicles";
const APP_URL = Deno.env.get("APP_URL") || "https://yourapp.com";

serve(async (req) => {
  const { record } = await req.json();

  if (!record || record.type !== "new_post") {
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

  // Send email via Resend
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: email,
      subject: record.title,
      html: `
        <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #0a1628;">${record.title}</h2>
          ${record.body ? `<p style="color: #4a5568;">${record.body}</p>` : ""}
          ${record.link ? `<a href="${APP_URL}${record.link}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#0a1628;color:white;border-radius:6px;text-decoration:none;">Read now</a>` : ""}
          <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #999;">
            You're receiving this because you subscribed on ${APP_NAME}.
            <a href="${APP_URL}/settings" style="color: #999;">Manage preferences</a>
          </p>
        </div>
      `,
    }),
  });

  return new Response(JSON.stringify({ ok: res.ok }), { status: 200 });
});
