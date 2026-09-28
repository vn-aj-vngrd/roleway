export type AgentHealth = {
  runs: number;
  failed: number;
  averageDurationMs: number | null;
  durationCoverage: number;
  p95DurationMs: number | null;
  averageFirstTextMs: number | null;
  firstTextCoverage: number;
  inputTokens: number;
  outputTokens: number;
  reportedCostMicros: number;
  costCoverage: number;
  goodRatings: number;
  badRatings: number;
  evalRuns: number;
  evalPassed: number;
  evalInputTokens: number;
  evalOutputTokens: number;
  evalReportedCostMicros: number;
  evalCostCoverage: number;
  evalChecks: Array<{ check: string; passed: number; total: number }>;
  evalFailureKinds: Array<{ kind: string | null; count: number }>;
  recentEvals: Array<{
    provider: string;
    model: string;
    connectionLabel: string | null;
    status: "passed" | "failed";
    createdAt: string;
  }>;
  errors: Array<{ code: string; count: number }>;
  badReasons: Array<{ reason: string; count: number }>;
  models: Array<{
    provider: string;
    model: string;
    connectionId: string | null;
    connectionLabel: string | null;
    runs: number;
    failed: number;
    averageDurationMs: number | null;
    inputTokens: number;
    outputTokens: number;
    reportedCostMicros: number;
    costCoverage: number;
  }>;
  daily: Array<{ day: string; runs: number; failed: number }>;
};

function duration(value: number | null) {
  return value == null ? "Not recorded" : `${(value / 1000).toFixed(1)}s`;
}

function cost(micros: number, covered: number) {
  return covered ? `$${(micros / 1_000_000).toFixed(4)}` : "Not reported";
}

function label(value: string) {
  if (value === "unclassified") return "No saved error code";
  return value
    .replaceAll("_", " ")
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function AgentHealthDashboard({
  data,
  global = false,
}: {
  data: AgentHealth;
  global?: boolean;
}) {
  const rated = data.goodRatings + data.badRatings;
  const nonfailed = Math.max(0, data.runs - data.failed);
  const maxDaily = Math.max(1, ...data.daily.map((day) => day.runs));
  return (
    <div className="admin-agent-health">
      <p className="muted">
        Last 30 days · {global ? "All accounts" : "Your account"}. Run checks
        and voluntary ratings describe observed behavior; they are not a factual
        accuracy score.
      </p>
      <section className="admin-agent-kpis" aria-label="Agent health metrics">
        <article>
          <strong>{data.runs.toLocaleString()}</strong>
          <span>Runs</span>
        </article>
        <article>
          <strong>{data.failed.toLocaleString()}</strong>
          <span>Failed runs</span>
        </article>
        <article>
          <strong>{duration(data.averageDurationMs)}</strong>
          <span>Average run</span>
        </article>
        <article>
          <strong>{duration(data.p95DurationMs)}</strong>
          <span>95th percentile</span>
        </article>
        <article>
          <strong>{duration(data.averageFirstTextMs)}</strong>
          <span>Average first text</span>
        </article>
      </section>
      <p className="muted admin-agent-coverage">
        Run timing covers {data.durationCoverage} of {data.runs} runs. Earlier
        runs use saved finish events. First-text timing covers {data.firstTextCoverage} of {data.runs};
        it starts with newly measured runs.
      </p>
      <div className="admin-agent-grid">
        <section className="admin-section">
          <header>
            <div>
              <h2>Run outcomes</h2>
              <p>
                {nonfailed} nonfailed · {data.failed} failed
              </p>
            </div>
          </header>
          <div
            className="admin-agent-bar"
            role="img"
            aria-label={`${nonfailed} nonfailed and ${data.failed} failed runs`}
          >
            <span
              style={{
                width: `${data.runs ? (nonfailed / data.runs) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="muted">
            {data.runs
              ? `${((data.failed / data.runs) * 100).toFixed(1)}% failed`
              : "No runs recorded yet."}
          </p>
        </section>
        <section className="admin-section">
          <header>
            <div>
              <h2>Reply ratings</h2>
              <p>Feedback on completed answers</p>
            </div>
          </header>
          <div
            className="admin-agent-bar"
            role="img"
            aria-label={`${data.goodRatings} good and ${data.badRatings} bad ratings`}
          >
            <span
              style={{
                width: `${rated ? (data.goodRatings / rated) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="muted">
            {data.goodRatings} good · {data.badRatings} bad
            {rated
              ? ` · ${((data.goodRatings / rated) * 100).toFixed(1)}% good among rated replies`
              : ""}
          </p>
        </section>
        <section className="admin-section">
          <header>
            <div>
              <h2>Usage and cost</h2>
              <p>Recorded tokens and provider-reported charges</p>
            </div>
          </header>
          <dl className="admin-agent-list">
            <div>
              <dt>Chat input tokens</dt>
              <dd>{data.inputTokens.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Chat output tokens</dt>
              <dd>{data.outputTokens.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Chat reported cost</dt>
              <dd>{cost(data.reportedCostMicros, data.costCoverage)}</dd>
            </div>
            <div>
              <dt>Chat cost coverage</dt>
              <dd>
                {data.costCoverage} of {data.runs} runs
              </dd>
            </div>
            <div>
              <dt>Model-check tokens</dt>
              <dd>
                {(
                  data.evalInputTokens + data.evalOutputTokens
                ).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt>Model-check reported cost</dt>
              <dd>
                {cost(data.evalReportedCostMicros, data.evalCostCoverage)}
              </dd>
            </div>
            <div>
              <dt>Check cost coverage</dt>
              <dd>
                {data.evalCostCoverage} of {data.evalRuns} suites
              </dd>
            </div>
          </dl>
          <p className="muted">
            Costs appear only when a provider reports them. Earlier runs did not save charges; missing cost is unknown, not zero.
          </p>
        </section>
        <section className="admin-section">
          <header>
            <div>
              <h2>Error analysis</h2>
              <p>Redacted run codes and selected bad-rating reasons</p>
            </div>
          </header>
          <div className="admin-agent-errors">
            <h3>Run failures</h3>
            {data.errors.length ? (
              data.errors.map((item) => (
                <p key={item.code}>
                  <span>{label(item.code)}</span>
                  <strong>{item.count}</strong>
                </p>
              ))
            ) : (
              <p>No failed runs.</p>
            )}
            <h3>Bad response reasons</h3>
            {data.badReasons.length ? (
              data.badReasons.map((item) => (
                <p key={item.reason}>
                  <span>{label(item.reason)}</span>
                  <strong>{item.count}</strong>
                </p>
              ))
            ) : (
              <p>No bad ratings.</p>
            )}
          </div>
        </section>
      </div>
      <section className="admin-section admin-agent-models">
        <header>
          <div>
            <h2>
              {global
                ? "Provider and model breakdown"
                : "Your connections and models"}
            </h2>
            <p>
              Each run is attributed to the provider and model used at the time.
            </p>
          </div>
        </header>
        {data.models.length ? (
          <div className="admin-agent-model-list">
            {data.models.map((item, index) => (
              <article
                key={`${item.provider}:${item.model}:${item.connectionId ?? index}`}
              >
                <div>
                  <strong>
                    {item.connectionLabel ? `${item.connectionLabel} · ` : ""}
                    {item.model}
                  </strong>
                  <span>
                    {item.provider} · {item.runs} runs · {item.failed} failed
                  </span>
                </div>
                <div>
                  <strong>
                    {cost(item.reportedCostMicros, item.costCoverage)}
                  </strong>
                  <span>
                    Cost reported for {item.costCoverage} · avg{" "}
                    {duration(item.averageDurationMs)}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No model activity yet.</p>
        )}
      </section>
      <section className="admin-section admin-agent-models">
        <header>
          <div>
            <h2>Model checks</h2>
            <p>
              {data.evalRuns} synthetic suites in 30 days · {data.evalPassed}{" "}
              passed all checks. These use fixed test data, not private records.
            </p>
          </div>
        </header>
        {data.evalChecks.length ? (
          <div className="admin-agent-errors">
            {data.evalChecks.map((item) => (
              <p key={item.check}>
                <span>{label(item.check)}</span>
                <strong>
                  {item.passed} / {item.total} passed
                </strong>
              </p>
            ))}
          </div>
        ) : (
          <p className="muted">No model checks have run yet.</p>
        )}
        {data.evalFailureKinds.length ? (
          <div className="admin-agent-errors">
            <h3>Why checks failed</h3>
            {data.evalFailureKinds.map((item) => (
              <p key={item.kind ?? "unknown"}>
                <span>{label(item.kind ?? "unknown")}</span>
                <strong>{item.count}</strong>
              </p>
            ))}
          </div>
        ) : null}
        {data.recentEvals.length ? (
          <div className="admin-agent-evals">
            <h3>Recent suites</h3>
            {data.recentEvals.map((item, index) => (
              <p key={`${item.createdAt}:${index}`}>
                <span>
                  {item.connectionLabel ? `${item.connectionLabel} · ` : ""}
                  {item.provider} · {item.model}
                </span>
                <strong
                  className={item.status === "passed" ? "positive" : "negative"}
                >
                  {label(item.status)}
                </strong>
                <time dateTime={item.createdAt}>
                  {new Date(item.createdAt).toLocaleDateString("en-US")}
                </time>
              </p>
            ))}
          </div>
        ) : null}
      </section>
      <section className="admin-section admin-agent-trend">
        <header>
          <div>
            <h2>Daily activity</h2>
            <p>Each bar is a day with recorded runs.</p>
          </div>
        </header>
        {data.daily.length ? (
          <div
            className="admin-agent-days"
            role="img"
            aria-label={data.daily
              .map(
                (day) => `${day.day}: ${day.runs} runs, ${day.failed} failed`,
              )
              .join("; ")}
          >
            {data.daily.map((day) => (
              <div
                key={day.day}
                title={`${day.day}: ${day.runs} runs, ${day.failed} failed`}
              >
                <span
                  style={{
                    height: `${Math.max(8, (day.runs / maxDaily) * 100)}%`,
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">No runs recorded yet.</p>
        )}
      </section>
    </div>
  );
}
