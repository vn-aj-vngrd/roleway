import { redirect } from "next/navigation";
import { LogoMark } from "@/components/logo";
import { requireUser } from "@/lib/supabase/server";
import { OnboardingWizard } from "./onboarding-wizard";

export const metadata = { title: "Set up your search" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (!auth) redirect("/login");

  const { data: profile } = await auth.supabase.from("profiles").select("onboarding_completed").eq("user_id", auth.user.id).maybeSingle();
  if (profile?.onboarding_completed) redirect("/today");

  return (
    <main className="onboarding-page" id="main-content">
      <header className="onboarding-head"><LogoMark /><span>Roleway</span><span className="onboarding-step">Workspace setup</span></header>
      <section className="onboarding-content">
        {query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}
        <OnboardingWizard email={auth.user.email ?? "your account"} />
      </section>
    </main>
  );
}
