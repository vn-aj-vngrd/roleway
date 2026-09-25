import { CircleAlert } from "lucide-react";
import { redirect } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ThemePicker } from "@/components/theme-picker";
import { LogoMark } from "@/components/logo";
import { requireUser } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = {
  title: "Set up your workspace",
  robots: { index: false, follow: false, nocache: true },
};

export default async function OnboardingPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (!auth) redirect("/login");

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("onboarding_completed")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (profile?.onboarding_completed) redirect("/home");

  return (
    <main className="onboarding-page" id="main-content">
      <header className="onboarding-head">
        <LogoMark tile />
        <span>Roleway</span>
        <span className="onboarding-step">Account setup</span>
        <ThemePicker />
      </header>
      <section className="onboarding-content">
        {query.error ? (
          <Alert variant="destructive">
            <CircleAlert aria-hidden="true" />
            <AlertDescription>{query.error}</AlertDescription>
          </Alert>
        ) : null}
        <OnboardingWizard email={auth.user.email ?? "your account"} />
      </section>
    </main>
  );
}
