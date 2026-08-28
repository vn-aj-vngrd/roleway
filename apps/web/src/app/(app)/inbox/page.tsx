import { Clock3, Inbox, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateJobButton } from "@/components/app-shell";
import { CollectionViewControls } from "@/components/collection-view-controls";
import { JobInbox } from "@/components/job-inbox";
import {
  CountBadge,
  EmptyState,
  PillTabs,
  ViewToolbar,
  WorkspaceHeader,
} from "@/components/ui-primitives";
import { requireSearchContext } from "@/features/projects/context";
import { richTextToPlainText } from "@/lib/rich-text";

export default async function JobsPage(props: {
  searchParams: Promise<{
    create?: string;
    error?: string;
    created?: string;
    welcome?: string;
    view?: string;
    remote?: string;
    sort?: string;
    q?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const [context, query] = await Promise.all([
    requireSearchContext(),
    searchParams,
  ]);
  if (!context) redirect("/login");
  const project = context.project;
  if (!project) redirect("/onboarding");

  const { data: jobs, error } = await context.supabase
    .from("jobs")
    .select(
      "id, company, title, location, compensation, remote_policy, source, source_url, description, inbox_state, inbox_review_at, imported_at",
    )
    .eq("project_id", project.id)
    .in("inbox_state", ["new", "maybe"])
    .order("imported_at", { ascending: false })
    .limit(500);

  const now = new Date();
  const allJobs = jobs ?? [];
  const laterJobs = allJobs.filter(
    (job) =>
      job.inbox_state === "maybe" &&
      job.inbox_review_at &&
      new Date(job.inbox_review_at) > now,
  );
  const reviewJobs = allJobs.filter(
    (job) =>
      job.inbox_state === "new" ||
      !job.inbox_review_at ||
      new Date(job.inbox_review_at) <= now,
  );
  const showingLater = query.view === "later";
  const remotePolicies = [
    ...new Set(allJobs.map((job) => job.remote_policy).filter(Boolean)),
  ].sort();
  const remote = remotePolicies.includes(query.remote ?? "")
    ? query.remote!
    : "all";
  const inboxSorts = [
    "newest",
    "oldest",
    "company",
    "title",
    "review",
  ] as const;
  const sort = inboxSorts.includes(query.sort as (typeof inboxSorts)[number])
    ? query.sort!
    : "newest";
  const normalizedQuery = query.q?.trim().toLowerCase() ?? "";
  const tabJobs = showingLater ? laterJobs : reviewJobs;
  const visibleJobs = tabJobs
    .filter((job) => {
      if (remote !== "all" && job.remote_policy !== remote) return false;
      if (!normalizedQuery) return true;
      return [job.title, job.company, job.location, job.source]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery));
    })
    .sort((left, right) => {
      if (sort === "oldest")
        return (
          new Date(left.imported_at).getTime() -
          new Date(right.imported_at).getTime()
        );
      if (sort === "company")
        return (
          left.company.localeCompare(right.company) ||
          left.title.localeCompare(right.title)
        );
      if (sort === "title")
        return (
          left.title.localeCompare(right.title) ||
          left.company.localeCompare(right.company)
        );
      if (sort === "review") {
        const leftReview = left.inbox_review_at
          ? new Date(left.inbox_review_at).getTime()
          : Number.MAX_SAFE_INTEGER;
        const rightReview = right.inbox_review_at
          ? new Date(right.inbox_review_at).getTime()
          : Number.MAX_SAFE_INTEGER;
        return leftReview - rightReview;
      }
      return (
        new Date(right.imported_at).getTime() -
        new Date(left.imported_at).getTime()
      );
    });
  const hasInboxFilters = remote !== "all" || Boolean(normalizedQuery);
  const minReviewDate = now.toISOString().slice(0, 10);
  const defaultReviewDate = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 7,
  )
    .toISOString()
    .slice(0, 10);
  const nextReviewAt = laterJobs
    .map((job) => job.inbox_review_at)
    .filter((value): value is string => Boolean(value))
    .sort(
      (left, right) => new Date(left).getTime() - new Date(right).getTime(),
    )[0];

  return (
    <div className="workspace-page inbox-page">
      <WorkspaceHeader
        title="Inbox"
        count={allJobs.length}
        context={
          <>
            Jobs you add wait here until you decide what deserves active work.
          </>
        }
        actions={
          <CreateJobButton>
            <Plus aria-hidden="true" />
            Add job
          </CreateJobButton>
        }
      />
      {!error && allJobs.length > 0 ? (
        <ViewToolbar
          className="inbox-top-view-toolbar"
          label="Inbox views"
          primary={
            <PillTabs
              className="inbox-view-tabs"
              label="Inbox views"
              items={[
                {
                  href: "/inbox",
                  label: "To review",
                  active: !showingLater,
                  count: reviewJobs.length,
                },
                {
                  href: "/inbox?view=later",
                  label: "Later",
                  active: showingLater,
                  count: laterJobs.length,
                },
              ]}
            />
          }
          actions={
            <CollectionViewControls
              page="inbox"
              filterGroups={[
                {
                  key: "remote",
                  label: "Work arrangement",
                  defaultValue: "all",
                  options: [
                    { value: "all", label: "Any arrangement" },
                    ...remotePolicies.map((value) => ({ value, label: value })),
                  ],
                },
              ]}
              values={{ remote }}
              sort={sort}
              defaultSort="newest"
              sortOptions={[
                { value: "newest", label: "Newest added" },
                { value: "oldest", label: "Oldest added" },
                { value: "company", label: "Company" },
                { value: "title", label: "Job title" },
                { value: "review", label: "Review date" },
              ]}
              search={{
                key: "q",
                value: query.q ?? "",
                placeholder: "Search saved jobs…",
              }}
            />
          }
        />
      ) : null}
      <div className="inbox-review-shell">
        <div className="inbox-review-layout">
          <div className="inbox-review-main">
            <section
              className="inbox-review-intro"
              aria-labelledby="inbox-review-heading"
            >
              <h1 id="inbox-review-heading">Inbox</h1>
              <p>
                Add or import a Job, then track it as an Opportunity, review it
                later, or dismiss it.
              </p>
            </section>
            {query.error ? (
              <div className="form-alert error" role="alert">
                {query.error}
              </div>
            ) : null}
            {query.welcome ? (
              <div className="welcome-banner">
                <Inbox aria-hidden="true" />
                <div>
                  <strong>{project.name} is ready.</strong>
                  <p>Your first saved Job will appear in this review queue.</p>
                </div>
              </div>
            ) : null}
            {query.created ? (
              <div className="form-alert success" role="status">
                Job added to {project.name}.
              </div>
            ) : null}
            {error ? (
              <EmptyState
                title="Jobs could not be loaded"
                description="Check your connection and refresh this page."
              />
            ) : null}
            {!error && allJobs.length === 0 ? (
              <EmptyState
                icon={<Inbox />}
                title="No jobs to review"
                description="Add a Job manually or import a listing URL. It will wait here until you track it as an Opportunity, review it later, or dismiss it."
                actions={
                  <CreateJobButton>
                    <Plus aria-hidden="true" />
                    Add a job
                  </CreateJobButton>
                }
              />
            ) : null}
            {!error && allJobs.length > 0 && visibleJobs.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">
                  {hasInboxFilters ? (
                    <Inbox aria-hidden="true" />
                  ) : showingLater ? (
                    <Clock3 aria-hidden="true" />
                  ) : (
                    <Inbox aria-hidden="true" />
                  )}
                </span>
                <h2>
                  {hasInboxFilters
                    ? "No matching saved jobs"
                    : showingLater
                      ? "No jobs saved for later"
                      : "You’re caught up"}
                </h2>
                <p>
                  {hasInboxFilters
                    ? "Try another search or work arrangement."
                    : showingLater
                      ? "Choose Review later on any saved Job and set when it should return."
                      : laterJobs.length
                        ? "Jobs saved for later will return on their review date."
                        : "Add a Job when you find a listing worth considering."}
                </p>
                {!hasInboxFilters && showingLater ? (
                  <Link className="button secondary" href="/inbox">
                    Return to review queue
                  </Link>
                ) : !hasInboxFilters ? (
                  <CreateJobButton>
                    <Plus aria-hidden="true" />
                    Add a job
                  </CreateJobButton>
                ) : null}
              </div>
            ) : null}
            {visibleJobs.length > 0 ? (
              <JobInbox
                jobs={visibleJobs.map((job) => ({
                  ...job,
                  description: richTextToPlainText(job.description),
                }))}
                minReviewDate={minReviewDate}
                defaultReviewDate={defaultReviewDate}
                referenceTime={now.toISOString()}
              />
            ) : null}
          </div>

          <aside
            className="inbox-overview"
            aria-labelledby="inbox-overview-heading"
          >
            <section className="inbox-overview-summary">
              <header>
                <h2 id="inbox-overview-heading">Inbox overview</h2>
                <CountBadge
                  value={allJobs.length}
                  label={`${allJobs.length} saved jobs`}
                />
              </header>
              <dl>
                <div>
                  <dt>Ready for a decision</dt>
                  <dd>
                    <CountBadge value={reviewJobs.length} />
                  </dd>
                </div>
                <div>
                  <dt>Returning later</dt>
                  <dd>
                    <CountBadge value={laterJobs.length} />
                  </dd>
                </div>
                <div>
                  <dt>Next return</dt>
                  <dd>
                    {nextReviewAt
                      ? new Intl.DateTimeFormat(undefined, {
                          month: "short",
                          day: "numeric",
                        }).format(new Date(nextReviewAt))
                      : "—"}
                  </dd>
                </div>
              </dl>
            </section>
            <section
              className="inbox-decision-guide"
              aria-labelledby="inbox-decision-heading"
            >
              <h3 id="inbox-decision-heading">What each decision does</h3>
              <ul>
                <li>
                  <span
                    className="inbox-decision-mark is-track"
                    aria-hidden="true"
                  />
                  <div>
                    <strong>Track</strong>
                    <p>Creates an active Opportunity for follow-up.</p>
                  </div>
                </li>
                <li>
                  <span
                    className="inbox-decision-mark is-later"
                    aria-hidden="true"
                  />
                  <div>
                    <strong>Later</strong>
                    <p>Returns the Job on the date you choose.</p>
                  </div>
                </li>
                <li>
                  <span
                    className="inbox-decision-mark is-dismiss"
                    aria-hidden="true"
                  />
                  <div>
                    <strong>Dismiss</strong>
                    <p>Removes the Job from this review queue.</p>
                  </div>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
