"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(320),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password must be 128 characters or fewer."),
});

const captchaTokenSchema = z.string().min(10, "Complete the security verification.").max(4096);
const protectedCredentialsSchema = credentialsSchema.extend({ captchaToken: captchaTokenSchema });
const signupSchema = protectedCredentialsSchema;
const protectedEmailSchema = z.object({ email: z.string().trim().email("Enter a valid email address.").max(320), captchaToken: captchaTokenSchema });

function authUrl(route: "/login" | "/signup", type: "error" | "message", value: string, requestedNext?: FormDataEntryValue | null) {
  const safeNext = safeNextPath(requestedNext, "");
  const next = safeNext ? `&next=${encodeURIComponent(safeNext)}` : "";
  return `${route}?${type}=${encodeURIComponent(value)}${next}`;
}

export async function signIn(formData: FormData) {
  const parsed = protectedCredentialsSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(authUrl("/login", "error", parsed.error.issues[0]?.message ?? "Check your details.", formData.get("next")));

  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) redirect(authUrl("/login", "error", "Login is unavailable while security verification is being configured.", formData.get("next")));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password, options: { captchaToken: parsed.data.captchaToken } });
  if (error?.code === "email_not_confirmed") redirect("/verify-email?error=Confirm%20your%20email%20before%20logging%20in.%20You%20can%20request%20a%20new%20link%20below.");
  if (error || !data.user) redirect(authUrl("/login", "error", error && /captcha|verification/i.test(error.message) ? "Security verification expired or failed. Please try again." : "Email or password is incorrect.", formData.get("next")));
  const { data: profile } = await supabase.from("profiles").select("onboarding_completed").eq("user_id", data.user.id).maybeSingle();
  if (!profile?.onboarding_completed) redirect("/onboarding");
  const requestedNext = formData.get("next");
  const next = safeNextPath(requestedNext);
  redirect(next);
}

export async function signUp(formData: FormData) {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(authUrl("/signup", "error", parsed.error.issues[0]?.message ?? "Check your details."));
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    redirect(authUrl("/signup", "error", "Registration is unavailable while security verification is being configured."));
  }

  const supabase = await createClient();
  const { data: admission, error: admissionError } = await supabase.rpc("signup_admission_status");
  if (process.env.NODE_ENV === "production" && admissionError) {
    redirect(authUrl("/signup", "error", "Registration is temporarily unavailable. Try again later."));
  }
  if (admission && !admission.acceptingSignups) {
    const message = admission.registrationEnabled ? "Roleway has reached its current account limit." : "New registrations are temporarily paused.";
    redirect(authUrl("/signup", "error", message));
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) redirect(authUrl("/signup", "error", "Email verification is not configured. Try again later."));
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { captchaToken: parsed.data.captchaToken, emailRedirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback?next=/onboarding` },
  });
  if (error) {
    const message = /captcha|verification/i.test(error.message)
      ? "Security verification expired or failed. Please try again."
      : /limit|registration|database/i.test(error.message)
        ? "Registration is currently unavailable."
        : "Your account could not be created. Try again later.";
    redirect(authUrl("/signup", "error", message));
  }
  if (!data.session) redirect("/verify-email?sent=true");
  redirect("/onboarding");
}

export async function requestPasswordReset(formData: FormData) {
  const parsed = protectedEmailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/forgot-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your details.")}`);
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) redirect("/forgot-password?error=Password%20recovery%20is%20temporarily%20unavailable.");
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) redirect("/forgot-password?error=Password%20recovery%20is%20not%20configured.");
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, { redirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback?next=/reset-password`, captchaToken: parsed.data.captchaToken });
  if (error) {
    const message = error.code === "captcha_failed"
      ? "Security verification expired or failed. Please try again."
      : "The recovery request could not be sent. Wait a moment and try again.";
    redirect(`/forgot-password?error=${encodeURIComponent(message)}`);
  }
  redirect("/forgot-password?sent=true");
}

export async function resendConfirmation(formData: FormData) {
  const parsed = protectedEmailSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/verify-email?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check your email.")}`);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl || (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)) {
    redirect("/verify-email?error=Email%20verification%20is%20temporarily%20unavailable.");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data.email, options: {
    captchaToken: parsed.data.captchaToken, emailRedirectTo: `${siteUrl.replace(/\/$/, "")}/auth/callback?next=/onboarding`,
  } });
  if (error) redirect("/verify-email?error=The%20confirmation%20request%20could%20not%20be%20sent.%20Wait%20a%20minute,%20then%20try%20again.");
  redirect("/verify-email?sent=true");
}

export async function resetPassword(formData: FormData) {
  const parsed = z.object({ password: z.string().min(8, "Password must be at least 8 characters."), confirmPassword: z.string() }).refine((value) => value.password === value.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect(`/reset-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Check the new password.")}`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password?error=That%20recovery%20link%20has%20expired.%20Request%20a%20new%20one.");
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) redirect(`/reset-password?error=${encodeURIComponent("Your password could not be updated. Request a new recovery link.")}`);
  await supabase.auth.signOut();
  redirect("/login?message=Password%20updated.%20Log%20in%20with%20your%20new%20password.");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?message=You%20have%20signed%20out.");
}
