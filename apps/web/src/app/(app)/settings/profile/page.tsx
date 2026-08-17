import { SettingsNav } from "@/components/settings-nav";
import { requireUser } from "@/lib/supabase/server";
import { restartTour } from "@/app/(app)/tour-actions";
import { updateProfile } from "../actions";

export default async function ProfilePage() {
  const auth = await requireUser(); if (!auth) return null;
  const { data: profile, error } = await auth.supabase.from("profiles").select("full_name, headline, summary").eq("user_id", auth.user.id).single();
  return <div className="page"><header className="page-header"><div><h1>Settings</h1><p className="page-subtitle">Your source-of-truth profile and workspace controls.</p></div></header><div className="settings-layout"><SettingsNav active="Career Profile" /><main>{error ? <div className="form-alert error">Your profile could not be loaded.</div> : <form action={updateProfile} className="form-section"><h2>Career Profile</h2><p>Keep these facts accurate. Future generated application material may only use approved information from your profile.</p><div className="field"><label htmlFor="fullName">Full name</label><input id="fullName" name="fullName" className="input" required defaultValue={profile.full_name} /></div><div className="field"><label htmlFor="headline">Headline</label><input id="headline" name="headline" className="input" defaultValue={profile.headline} /></div><div className="field"><label htmlFor="summary">Summary</label><textarea id="summary" name="summary" className="textarea" defaultValue={profile.summary} /></div><button className="button primary">Save profile</button></form>}<section className="form-section"><h2>Product tour</h2><p>Replay the short workflow tour whenever you need a refresher.</p><form action={restartTour}><button className="button secondary">Restart product tour</button></form></section><section className="form-section"><h2>Account</h2><p>Signed in as {auth.user.email}. Authentication is managed securely by Supabase Auth.</p></section></main></div></div>;
}
