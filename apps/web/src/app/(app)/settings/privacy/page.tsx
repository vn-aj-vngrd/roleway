import { signOut } from "@/app/auth/actions";
import { DeleteAccountControl } from "@/components/delete-account-control";
import { SettingsNav } from "@/components/settings-nav";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/supabase/server";

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [auth, query] = await Promise.all([requireUser(), searchParams]); if (!auth) return null;
  const { data: profile } = await auth.supabase.from("profiles").select("full_name").eq("user_id", auth.user.id).maybeSingle();
  const accountName = profile?.full_name || String(auth.user.user_metadata?.full_name || auth.user.email?.split("@")[0] || "Roleway user");
  const accountEmail = auth.user.email || "";
  return <div className="page settings-page"><header className="page-header"><div><h1>Settings</h1><p className="page-subtitle">Tune Roleway around the way you work.</p></div></header><div className="settings-layout"><SettingsNav active="Privacy & data" /><main>{query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}<section className="form-section account-section"><h2>Account</h2><p>Your workspace records are private to your account. Use the controls below to export your information, manage this session, or remove the account.</p><dl className="settings-details"><div className="detail-row"><dt>Signed in as</dt><dd>{auth.user.email}</dd></div><div className="detail-row"><dt>Access</dt><dd>Email and password</dd></div></dl></section><section className="form-section"><h2>Export workspace</h2><p>Download a portable JSON archive containing your profile, preferences, jobs, Opportunities, tasks, notes, interviews, documents, and saved Assist runs.</p><a className="button secondary" href="/api/export" download>Download data export</a></section><section className="form-section"><h2>Active session</h2><p>Sign out on this browser. Your workspace remains available the next time you return.</p><form action={signOut}><SubmitButton className="button secondary" pendingLabel="Signing out…">Sign out</SubmitButton></form></section><section className="form-section danger-zone"><h2>Danger zone</h2><p>These actions are permanent and cannot be undone.</p><DeleteAccountControl name={accountName} email={accountEmail} /></section></main></div></div>;
}
