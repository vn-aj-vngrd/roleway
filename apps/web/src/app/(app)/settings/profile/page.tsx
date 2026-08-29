import { restartTour } from "@/app/(app)/tour-actions";
import { SettingsNav } from "@/components/settings-nav";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/ui-primitives";
import { requireUser } from "@/lib/supabase/server";
import { updateProfile } from "../actions";

export default async function ProfilePage(props: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const searchParams = await props.searchParams;
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (!auth) return null;
  const { data: profile, error } = await auth.supabase.from("profiles").select("full_name, headline, summary").eq("user_id", auth.user.id).single();
  const initials = String(profile?.full_name || auth.user.email || "R").split(/[\s@]+/).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase();

  return <div className="page settings-page">
    <PageHeader title="Profile" />
    <div className="settings-layout"><SettingsNav active="Profile" /><main>
      {query.saved ? <div className="form-alert success" role="status">Profile saved.</div> : null}
      {query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}
      {error || !profile ? <div className="form-alert error">Your profile could not be loaded.</div> : <form action={updateProfile}>
        <section className="settings-group">
          <header className="settings-group-header"><h2>Profile details</h2><p>Manage the identity and career context used across Roleway.</p></header>
          <div className="settings-card profile-settings-card" aria-label="Profile details">
            <div className="settings-row"><div className="settings-row-copy"><strong>Profile picture</strong></div><span className="avatar avatar-large">{initials}</span></div>
            <div className="settings-row"><div className="settings-row-copy"><strong>Email</strong></div><span className="settings-static-value">{auth.user.email}</span></div>
            <label className="settings-row" htmlFor="fullName"><span className="settings-row-copy"><strong>Full name</strong></span><input id="fullName" name="fullName" className="input" required defaultValue={profile.full_name} autoComplete="name" /></label>
            <label className="settings-row" htmlFor="headline"><span className="settings-row-copy"><strong>Title</strong><small>Your professional title or role</small></span><input id="headline" name="headline" className="input" defaultValue={profile.headline} placeholder="Software engineer" /></label>
            <label className="settings-row settings-row-textarea" htmlFor="summary"><span className="settings-row-copy"><strong>Career summary</strong><small>Experience, strengths, and the problems you solve</small></span><textarea id="summary" name="summary" className="textarea" defaultValue={profile.summary} rows={4} placeholder="A concise career summary…" /></label>
          </div>
          <div className="settings-save-row"><SubmitButton pendingLabel="Saving…">Save profile</SubmitButton></div>
        </section>
      </form>}
      <section className="settings-group"><header className="settings-group-header"><h2>Product tour</h2><p>Revisit navigation, capture, and command shortcuts.</p></header><div className="settings-card"><div className="settings-row"><div className="settings-row-copy"><strong>Replay product tour</strong><small>Start the guided walkthrough from the beginning</small></div><form action={restartTour}><SubmitButton className="button secondary" pendingLabel="Starting…">Restart tour</SubmitButton></form></div></div></section>
    </main></div>
  </div>;
}
