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
import { runAgentEvaluation } from "./actions";

export const metadata: Metadata = { title: "Agent usage & quality" };
export const maxDuration = 300;

export default async function AgentInsightsPage({
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
    <div className="page admin-page">
      <header className="page-header">
        <div className="page-header-copy">
          <h1>Agent usage & quality</h1>
          <p className="page-subtitle">
            Your private run activity across Workspaces and provider
            connections.
          </p>
        </div>
        <Link className="button secondary" href="/agent">
          Back to Agent
        </Link>
      </header>
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
            <select id="eval-connection" name="connectionId" required>
              {connections.map((connection) => (
                <option value={connection.id} key={connection.id}>
                  {connection.label} · {connection.provider} ·{" "}
                  {connection.model}
                </option>
              ))}
            </select>
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
