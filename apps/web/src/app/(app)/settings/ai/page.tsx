import {
  CheckCircle2,
  PlugZap,
  ShieldCheck,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { AiConnectionDialog } from "@/components/ai-connection-dialog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader } from "@/components/ui-primitives";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import {
  deleteAiConnection,
  testAiConnection,
  updateAgentGuidance,
} from "./actions";

type AiQuery = {
  saved?: string;
  tested?: string;
  deleted?: string;
  guidanceSaved?: string;
  error?: string;
};

export default async function AiSettingsPage(props: {
  searchParams: Promise<AiQuery>;
}) {
  const searchParams = await props.searchParams;
  const [auth, query] = await Promise.all([requireUser(), searchParams]);
  if (!auth) return null;
  const admin = createAdminClient();
  const [connectionsResult, preferenceResult] = await Promise.all([
    admin
      .from("ai_connections")
      .select(
        "id, provider, label, model, base_url, key_hint, status, last_error, last_tested_at",
      )
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false }),
    auth.supabase
      .from("agent_preferences")
      .select("guidance")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
  ]);
  const connections = connectionsResult.data ?? [];

  return (
    <div className="page settings-page ai-settings-page">
      <PageHeader
        title="Agent"
        description="Connect your provider and set personal guidance for grounded Workspace conversations."
      />
      <main className="ai-settings-main">
        {query.saved ? (
          <div className="form-alert success" role="status">
            Connection saved. Test it before using Agent.
          </div>
        ) : null}
        {query.tested ? (
          <div className="form-alert success" role="status">
            Connection verified and ready.
          </div>
        ) : null}
        {query.deleted ? (
          <div className="form-alert success" role="status">
            Connection removed.
          </div>
        ) : null}
        {query.guidanceSaved ? (
          <div className="form-alert success" role="status">
            Agent guidance saved.
          </div>
        ) : null}
        {query.error ? (
          <div className="form-alert error" role="alert">
            {query.error}
          </div>
        ) : null}

        <section className="settings-group ai-provider-section">
          <header className="settings-group-header settings-group-header-action">
            <div>
              <h2>Provider connections</h2>
              <p>
                Manage the API providers Agent can use. Keys are encrypted
                before storage.
              </p>
            </div>
            <AiConnectionDialog />
          </header>
          <div className="settings-card ai-provider-card">
            <div className="ai-safety-note">
              <ShieldCheck aria-hidden="true" />
              <p>
                <strong>You approve every internal change.</strong> Agent reads
                the active Workspace only after you send a request. It cannot
                submit applications or contact employers.
              </p>
            </div>
            {connections.length ? (
              <div className="connection-list">
                {connections.map((connection) => (
                  <article className="connection-row" key={connection.id}>
                    <span
                      className={`connection-status ${connection.status}`}
                      aria-hidden="true"
                    >
                      {connection.status === "connected" ? (
                        <CheckCircle2 />
                      ) : connection.status === "error" ? (
                        <TriangleAlert />
                      ) : (
                        <PlugZap />
                      )}
                    </span>
                    <div className="connection-copy">
                      <strong>{connection.label}</strong>
                      <span>
                        {providerLabel(connection.provider)} ·{" "}
                        <span className="mono">{connection.model}</span> ·{" "}
                        {connection.key_hint}
                      </span>
                      {connection.last_error ? (
                        <small>{connection.last_error}</small>
                      ) : null}
                    </div>
                    <span
                      className={`status-label ${connection.status === "connected" ? "success" : "neutral"}`}
                    >
                      <i />
                      {connection.status}
                    </span>
                    <form action={testAiConnection}>
                      <input
                        type="hidden"
                        name="connectionId"
                        value={connection.id}
                      />
                      <SubmitButton
                        className="button secondary"
                        pendingLabel="Testing…"
                      >
                        Test
                      </SubmitButton>
                    </form>
                    <ConfirmationDialog
                      title={`Delete ${connection.label}?`}
                      description="This removes the saved provider configuration and encrypted API key from Roleway."
                      action={deleteAiConnection}
                      confirmLabel="Delete connection"
                      pendingLabel="Deleting…"
                      trigger={<Trash2 aria-hidden="true" />}
                      triggerClassName="icon-button"
                      triggerAriaLabel={`Delete ${connection.label}`}
                      triggerTooltip="Delete connection"
                      hiddenFields={{ connectionId: connection.id }}
                      destructive
                    />
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-inline">
                No provider connected yet. Add one below; the rest of Roleway
                works without AI.
              </div>
            )}
          </div>
        </section>

        <section className="settings-group agent-guidance-section">
          <header className="settings-group-header">
            <h2>Personal guidance</h2>
            <p>
              Set how Agent should answer and prepare work. Guidance cannot
              expand its permissions.
            </p>
          </header>
          <form action={updateAgentGuidance} className="settings-card">
            <label className="sr-only" htmlFor="agent-guidance">
              Personal Agent guidance
            </label>
            <textarea
              id="agent-guidance"
              name="guidance"
              maxLength={6000}
              defaultValue={preferenceResult.data?.guidance ?? ""}
              placeholder="Stay concise. Separate stored facts from inference. Prefer one concrete next step…"
            />
            <footer>
              <span>Applied to future conversations</span>
              <SubmitButton pendingLabel="Saving guidance…">
                Save guidance
              </SubmitButton>
            </footer>
          </form>
        </section>
      </main>
    </div>
  );
}

function providerLabel(provider: string) {
  return (
    (
      {
        openai: "OpenAI",
        anthropic: "Anthropic",
        gemini: "Google Gemini",
        openrouter: "OpenRouter",
        "openai-compatible": "Compatible API",
      } as Record<string, string>
    )[provider] || provider
  );
}
