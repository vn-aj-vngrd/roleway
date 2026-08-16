import { redirect } from "next/navigation";
import { completeOnboarding } from "./actions";
import { requireUser } from "@/lib/supabase/server";

export const metadata = { title: "Set up your search" };

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (!auth) redirect("/login");

  const { data: profile } = await auth.supabase.from("profiles").select("onboarding_completed").eq("user_id", auth.user.id).maybeSingle();
  if (profile?.onboarding_completed) redirect("/today");

  return (
    <main className="onboarding-page">
      <header className="onboarding-head"><span className="brand-mark">R</span><span>Roleway</span><span className="onboarding-step">Step 1 of 1</span></header>
      <section className="onboarding-content">
        <div className="onboarding-copy"><h1>Set your search direction</h1><p>Roleway uses this information to organize opportunities around what you actually want. You can change everything later.</p></div>
        {query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}
        <form action={completeOnboarding} className="onboarding-form">
          <section className="form-section"><h2>Your professional profile</h2><p>This becomes the starting point for evidence-based application work.</p><div className="field-grid"><div className="field"><label htmlFor="fullName">Full name</label><input className="input" id="fullName" name="fullName" required autoComplete="name" /></div><div className="field"><label htmlFor="headline">Professional headline</label><input className="input" id="headline" name="headline" required placeholder="Product-minded full-stack engineer" /></div></div><div className="field"><label htmlFor="summary">Short summary <span className="muted">(optional)</span></label><textarea className="textarea" id="summary" name="summary" placeholder="What kind of work do you do best?" /></div></section>
          <section className="form-section"><h2>What you want next</h2><p>Separate multiple entries with commas.</p><div className="field"><label htmlFor="targetTitles">Target roles</label><input className="input" id="targetTitles" name="targetTitles" required placeholder="Product Engineer, Full-Stack Engineer" /></div><div className="field"><label htmlFor="technologies">Preferred technologies</label><input className="input" id="technologies" name="technologies" placeholder="TypeScript, React, PostgreSQL" /></div><div className="field-grid"><div className="field"><label htmlFor="remotePreference">Remote preference</label><select className="input" id="remotePreference" name="remotePreference" defaultValue="preferred"><option value="required">Remote required</option><option value="preferred">Remote preferred</option><option value="flexible">Flexible</option></select></div><div className="field"><label htmlFor="minimumCompensation">Minimum annual compensation</label><input className="input" id="minimumCompensation" name="minimumCompensation" type="number" min="0" placeholder="50000" /></div></div><div className="field"><label htmlFor="locations">Allowed locations</label><input className="input" id="locations" name="locations" placeholder="Worldwide, APAC, Philippines" /></div></section>
          <div className="onboarding-actions"><span className="muted small">Your profile is private and only visible to you.</span><button className="button primary" type="submit">Create my workspace</button></div>
        </form>
      </section>
    </main>
  );
}
