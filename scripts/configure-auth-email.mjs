import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRef = process.env.SUPABASE_PROJECT_REF;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN;
const sender = process.env.SMTP_FROM_EMAIL || "roleway@vanajvanguardia.tech";
const siteUrl = "https://roleway.vanajvanguardia.tech";
const apply = process.argv.includes("--apply");
if (!projectRef || !accessToken) throw new Error("Set SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN in the setup environment.");
if (apply && !process.env.RESEND_API_KEY) throw new Error("Set the Roleway sending-only RESEND_API_KEY before applying.");
if (projectRef !== "bqcsztvfbokmccgmnyhl") throw new Error("This setup script targets only the Roleway project.");
if (sender !== "roleway@vanajvanguardia.tech") throw new Error("Use the approved, verified Roleway sender.");

const templates = [
  ["confirmation", "confirmation", "Confirm your Roleway email"],
  ["recovery", "recovery", "Reset your Roleway password"],
  ["invite", "invite", "You are invited to Roleway"],
  ["magic_link", "magic-link", "Your Roleway sign-in link"],
  ["email_change", "email-change", "Confirm your Roleway email change"],
  ["reauthentication", "reauthentication", "Your Roleway verification code"],
  ["password_changed_notification", "password-changed", "Your Roleway password changed"],
  ["email_changed_notification", "email-changed", "Your Roleway email changed"],
];
const desired = {
  site_url: siteUrl,
  uri_allow_list: `${siteUrl}/auth/callback,http://localhost:3003/auth/callback`,
  mailer_autoconfirm: false,
  mailer_secure_email_change_enabled: true,
  security_update_password_require_reauthentication: true,
  smtp_host: "smtp.resend.com", smtp_port: "465", smtp_user: "resend",
  smtp_admin_email: sender, smtp_sender_name: "Roleway",
  rate_limit_email_sent: 30, smtp_max_frequency: 60,
  mailer_otp_exp: 3600, mailer_otp_length: 8,
  mailer_notifications_password_changed_enabled: true,
  mailer_notifications_email_changed_enabled: true,
};
for (const [key, file, subject] of templates) {
  desired[`mailer_subjects_${key}`] = subject;
  desired[`mailer_templates_${key}_content`] = await readFile(fileURLToPath(new URL(`../supabase/templates/${file}.html`, import.meta.url)), "utf8");
}
const endpoint = `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;
async function request(method, body) {
  const response = await fetch(endpoint, {
    method, headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Supabase auth configuration request failed (${response.status}).`);
  return response.json();
}
const before = await request("GET");
const differs = current => Object.keys(desired).filter(key => String(current[key]) !== String(desired[key]));
console.log(JSON.stringify({ projectRef, sender, apply, changedFields: differs(before), captchaEnabled: before.security_captcha_enabled }));
if (apply) {
  // PATCH only the email settings above. Never overwrite CAPTCHA, hooks, or OAuth providers.
  await request("PATCH", { ...desired, smtp_pass: process.env.RESEND_API_KEY });
  const after = await request("GET");
  const remaining = differs(after);
  if (remaining.length || after.security_captcha_enabled !== before.security_captcha_enabled) {
    throw new Error(`Configuration verification failed for: ${remaining.join(", ") || "CAPTCHA preservation"}`);
  }
  console.log(JSON.stringify({ verified: true, confirmationRequired: !after.mailer_autoconfirm, smtpHost: after.smtp_host, sender: after.smtp_admin_email, templates: templates.length }));
}
