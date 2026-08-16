import { signOut } from "@/app/auth/actions";
import { SettingsNav } from "@/components/settings-nav";
import { requireUser } from "@/lib/supabase/server";

export default async function PrivacyPage() {
  const auth = await requireUser(); if (!auth) return null;
  return <div className="page"><header className="page-header"><div><h1>Settings</h1><p className="page-subtitle">Understand where your account and workspace data live.</p></div></header><div className="settings-layout"><SettingsNav active="Privacy & data" /><main><section className="form-section"><h2>Supabase workspace</h2><p>Your profile, preferences, Jobs, Opportunities, tasks, notes, interviews, and documents are stored in Supabase PostgreSQL. Row-level security restricts every record to the authenticated owner.</p><div className="detail-row"><dt>Signed in as</dt><dd>{auth.user.email}</dd></div><div className="detail-row"><dt>Authentication</dt><dd>Email and password via Supabase Auth</dd></div></section><section className="form-section"><h2>Session</h2><p>Signing out clears the current browser session. Your workspace data remains available the next time you sign in.</p><form action={signOut}><button className="button secondary">Sign out</button></form></section><section className="form-section"><h2>Export and deletion</h2><p>Self-service export and permanent account deletion are not enabled yet. No non-functional controls are shown. Until they are available, use the linked Supabase project administrator for either operation.</p></section></main></div></div>;
}
