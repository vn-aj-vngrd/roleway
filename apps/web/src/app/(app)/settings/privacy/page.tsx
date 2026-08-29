import { signOut } from "@/app/auth/actions";
import { DeleteAccountControl } from "@/components/delete-account-control";
import { SettingsNav } from "@/components/settings-nav";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/ui-primitives";
import { requireUser } from "@/lib/supabase/server";

export default async function PrivacyPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (!auth) return null;
  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("full_name")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  const accountName =
    profile?.full_name ||
    String(
      auth.user.user_metadata?.full_name ||
        auth.user.email?.split("@")[0] ||
        "Roleway user",
    );
  const accountEmail = auth.user.email || "";

  return (
    <div className="page settings-page">
      <PageHeader title="Privacy & data" />
      <div className="settings-layout">
        <SettingsNav active="Privacy & data" />
        <main>
          {query.error ? (
            <div className="form-alert error" role="alert">
              {query.error}
            </div>
          ) : null}

          <section className="settings-group">
            <header className="settings-group-header">
              <h2>Account</h2>
              <p>Your account identity and current access method.</p>
            </header>
            <dl className="settings-card settings-details-card">
              <div className="settings-row">
                <dt className="settings-row-copy">
                  <strong>Signed in as</strong>
                </dt>
                <dd className="settings-static-value">{auth.user.email}</dd>
              </div>
              <div className="settings-row">
                <dt className="settings-row-copy">
                  <strong>Access</strong>
                </dt>
                <dd className="settings-static-value">Email and password</dd>
              </div>
            </dl>
          </section>

          <section className="settings-group">
            <header className="settings-group-header">
              <h2>Data export</h2>
              <p>Download a portable JSON archive of your Roleway account.</p>
            </header>
            <div className="settings-card">
              <div className="settings-row">
                <div className="settings-row-copy">
                  <strong>Download account data</strong>
                  <small>
                    Includes your profile, Workspaces, Jobs, Opportunities,
                    documents, notifications, and Agent history.
                  </small>
                </div>
                <a className="button secondary" href="/api/export" download>
                  Download export
                </a>
              </div>
            </div>
          </section>

          <section className="settings-group">
            <header className="settings-group-header">
              <h2>Active session</h2>
              <p>Manage the current browser session.</p>
            </header>
            <div className="settings-card">
              <div className="settings-row">
                <div className="settings-row-copy">
                  <strong>Sign out</strong>
                  <small>
                    Your Workspace remains available the next time you return.
                  </small>
                </div>
                <form action={signOut}>
                  <SubmitButton
                    className="button secondary"
                    pendingLabel="Signing out…"
                  >
                    Sign out
                  </SubmitButton>
                </form>
              </div>
            </div>
          </section>

          <section className="settings-group">
            <header className="settings-group-header danger-group-header">
              <h2>Danger zone</h2>
              <p>These actions are permanent and cannot be undone.</p>
            </header>
            <div className="settings-card danger-zone">
              <DeleteAccountControl name={accountName} email={accountEmail} />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
