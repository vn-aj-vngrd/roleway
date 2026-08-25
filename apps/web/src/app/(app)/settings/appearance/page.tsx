import { AppearanceControl } from "@/components/appearance-control";
import { SettingsNav } from "@/components/settings-nav";
import { requireUser } from "@/lib/supabase/server";

export default async function AppearanceSettingsPage() {
  const auth = await requireUser();
  if (!auth) return null;

  return <div className="page settings-page"><header className="page-header"><div><h1>Settings</h1><p className="page-subtitle">Tune Roleway around the way you work.</p></div></header><div className="settings-layout"><SettingsNav active="Appearance" /><main><section className="form-section"><h2>Appearance</h2><p>Choose how Roleway looks on this device. System follows your operating system preference.</p><AppearanceControl /></section></main></div></div>;
}
