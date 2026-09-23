// OpenRouter free models may queue for minutes; leave time for bounded calls and persistence.
export const maxDuration = 300;

import { Cpu, KeyRound, PlugZap, Trash2 } from "lucide-react";
import { AiConnectionDialog } from "@/components/ai-connection-dialog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { SubmitButton } from "@/components/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, PageHeader } from "@/components/ui-primitives";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";
import {
  deleteAiConnection,
  testAiConnection,
  updateAgentGuidance,
} from "./actions";

type AiQuery = {
  saved?: string;
  updated?: string;
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
        "id, provider, label, model, base_url, key_hint, status, last_error, last_tested_at, updated_at",
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
        {query.updated ? <div className="form-alert success" role="status">Connection updated.</div> : null}
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
            <AiConnectionDialog key={connections.map(connection => `${connection.id}:${connection.updated_at}`).join("|")} />
          </header>
          <div className="settings-card ai-provider-card">
            {connections.length ? (
              <div className="connection-list">
                {connections.map((connection) => (
                  <article className="connection-row" key={`${connection.id}:${connection.updated_at}`}>
                    <span className="connection-provider-mark" aria-hidden="true"><Cpu /></span>
                    <div className="connection-copy">
                      <div className="connection-heading">
                        <strong>{connection.label}</strong>
                        <span className="connection-provider">{providerLabel(connection.provider)}</span>
                      </div>
                      <p className="connection-model">{connection.model}</p>
                      <span className="connection-key"><KeyRound aria-hidden="true" /><span className="sr-only">API key </span>{connection.key_hint}</span>
                      {connection.last_error ? (
                        <small>{connection.last_error}</small>
                      ) : connection.status !== "connected" ? (
                        <small className="connection-help">
                          Test this connection before using Agent.
                        </small>
                      ) : null}
                    </div>
                    <div className="connection-controls">
                      <span
                        className={`status-label ${connection.status === "connected" ? "success" : connection.status === "error" ? "error" : "neutral"}`}
                      >
                        <i aria-hidden="true" />
                        {connection.status === "connected"
                          ? "Connected"
                          : connection.status === "error"
                            ? "Connection failed"
                            : "Not tested"}
                      </span>
                      <div className="connection-actions">
                        <form action={testAiConnection}>
                          <input
                            type="hidden"
                            name="connectionId"
                            value={connection.id}
                          />
                          <SubmitButton
                            variant="ghost"
                            size="icon-sm"
                            ariaLabel={`Test ${connection.label}`}
                            tooltip="Test connection"
                            pendingLabel="Testing connection…"
                          >
                            <PlugZap aria-hidden="true" />
                          </SubmitButton>
                        </form>
                        <AiConnectionDialog connection={{ id: connection.id, provider: connection.provider, label: connection.label, model: connection.model, baseUrl: connection.base_url ?? "" }} />
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
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState className="compact" icon={<Cpu />} title="No provider connected" description="Add a connection to use Agent. Roleway works without AI." />
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
            <label htmlFor="agent-guidance">Response preferences</label>
            <Textarea
              id="agent-guidance"
              name="guidance"
              aria-describedby="agent-guidance-hint"
              maxLength={6000}
              defaultValue={preferenceResult.data?.guidance ?? ""}
              placeholder="Stay concise. Separate stored facts from inference. Prefer one concrete next step…"
            />
            <footer>
              <span id="agent-guidance-hint">
                Used for your next Agent request
              </span>
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
