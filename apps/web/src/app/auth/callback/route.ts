import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/validation";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), "/home");
  const passwordSetup = type === "recovery" || type === "invite";
  if (tokenHash && (passwordSetup || type === "signup" || type === "email" || type === "magiclink" || type === "email_change")) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) return NextResponse.redirect(new URL(passwordSetup ? "/reset-password" : type === "signup" ? "/onboarding" : next, request.url));
  } else if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  const failurePath = passwordSetup || next === "/reset-password" ? "/forgot-password?error=That%20recovery%20link%20is%20invalid%20or%20expired." : "/verify-email?error=That%20email%20link%20is%20invalid%20or%20expired.%20Request%20a%20new%20one.";
  return NextResponse.redirect(new URL(failurePath, request.url));
}
