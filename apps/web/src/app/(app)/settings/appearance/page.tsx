import { AppearanceControl } from "@/components/appearance-control";
import { SettingsNav } from "@/components/settings-nav";
import { PageHeader } from "@/components/ui-primitives";
import { requireUser } from "@/lib/supabase/server";

export default async function AppearanceSettingsPage() {
  const auth = await requireUser();
  if (!auth) return null;

  return (
    <div className="page settings-page">
      <PageHeader title="Appearance" />
      <div className="settings-layout">
        <SettingsNav active="Appearance" />
        <main>
          <section className="settings-group">
            <header className="settings-group-header">
              <h2>Theme</h2>
              <p>
                Choose how Roleway looks on this device. System follows your
                operating system preference.
              </p>
            </header>
            <div className="settings-card appearance-settings-card">
              <AppearanceControl />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
