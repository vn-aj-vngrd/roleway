import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AgentHealthDashboard,
  type AgentHealth,
} from "@/features/agent/health-dashboard";
import { requireSearchContext } from "@/features/projects/context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SubmitButton } from "@/components/submit-button";
import { SelectField } from "@/components/form-controls";
import { PageHeader } from "@/components/ui-primitives";
import { runAgentEvaluation } from "./actions";

export const metadata: Metadata = { title: "Usage & quality · Agent settings" };
export const maxDuration = 300;

export default async function AgentUsagePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; check?: string }>;
}) {
  const query = await searchParams;
  const context = await requireSearchContext();
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  const [{ data, error }, { data: connections }] = await Promise.all([
    context.supabase.rpc("agent_health", { input_global: false }),
    createAdminClient()
      .from("ai_connections")
      .select("id, label, provider, model, status")
      .eq("user_id", context.user.id)
      .eq("status", "connected")
      .order("updated_at", { ascending: false }),
  ]);
  return (
    <div className="page settings-page admin-page">
      <PageHeader
        title="Usage & quality"
        description="Your private Agent activity across Workspaces and provider connections."
        actions={
          <Link className="button secondary" href="/settings/ai">
            Agent settings
          </Link>
        }
      />
      {query.error ? (
        <p className="form-alert error" role="alert">
          {query.error}
        </p>
      ) : null}
      {query.check ? (
        <p
          className={
            query.check === "passed" ? "form-alert success" : "form-alert error"
          }
          role="status"
        >
          {query.check === "passed"
            ? "Model checks passed."
            : "Some model checks failed. Review the results below."}
        </p>
      ) : null}
      {!error && data ? (
        <section className="admin-section admin-agent-check-form">
          <header>
            <div>
              <h2>Check a model</h2>
              <p>
                Run six synthetic checks for tool choice, arguments, answer
                grounding, authorization, approval, and prompt injection. Uses
                your selected provider key and may incur provider charges. No
                account records are sent.
              </p>
            </div>
          </header>
          {connections?.length ? (
            <form action={runAgentEvaluation}>
              <label htmlFor="eval-connection">Provider connection</label>
              <SelectField
                id="eval-connection"
                name="connectionId"
                required
                defaultValue={connections[0]?.id ?? ""}
                options={connections.map((connection) => ({
                  value: connection.id,
                  label: `${connection.label} · ${connection.provider} · ${connection.model}`,
                }))}
              />
              <SubmitButton pendingLabel="Checking model…">
                Run model checks
              </SubmitButton>
            </form>
          ) : (
            <p className="muted">
              Connect and test a provider in{" "}
              <Link href="/settings/ai">Agent settings</Link> to run checks.
            </p>
          )}
        </section>
      ) : null}
      {error || !data ? (
        <p className="form-alert error" role="alert">
          Usage data is unavailable. Try again after the database update.
        </p>
      ) : (
        <AgentHealthDashboard data={data as AgentHealth} />
      )}
    </div>
  );
}
