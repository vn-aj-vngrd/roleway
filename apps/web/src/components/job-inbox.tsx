"use client";

import {
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Inbox,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { SubmitButton } from "@/components/submit-button";
import { Button } from "@/components/ui/button";
import { showToast } from "@/components/toast";
import { setJobInboxState, trackJob } from "@/features/workspace/actions";

type InboxJob = {
  id: string;
  company: string;
  title: string;
  location: string;
  compensation: string;
  remote_policy: string;
  source: string;
  source_url: string | null;
  description: string;
  inbox_state: string;
  inbox_review_at: string | null;
  imported_at: string;
};

export function JobInbox({
  jobs,
  minReviewDate,
  defaultReviewDate,
  referenceTime,
}: {
  jobs: InboxJob[];
  minReviewDate: string;
  defaultReviewDate: string;
  referenceTime: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(
    jobs[0]?.id ?? null,
  );
  const [laterOpenId, setLaterOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLElement>(null);
  const referenceTimestamp = new Date(referenceTime).getTime();

  useEffect(() => {
    if (expandedId && !jobs.some((job) => job.id === expandedId))
      setExpandedId(null);
  }, [expandedId, jobs]);

  useEffect(() => {
    if (laterOpenId && laterOpenId !== expandedId) setLaterOpenId(null);
  }, [expandedId, laterOpenId]);

  const updateInboxState = async (formData: FormData) => {
    const state = String(formData.get("state") ?? "");
    await setJobInboxState(formData);
    showToast(
      state === "dismissed"
        ? { title: "Job dismissed", tone: "removed" }
        : {
            title: "Review scheduled",
            description: "The Job will return to Inbox on that date.",
          },
    );
    setLaterOpenId(null);
  };

  const selectIndex = (index: number) => {
    const next = jobs[Math.min(Math.max(index, 0), jobs.length - 1)];
    if (!next) return;
    setExpandedId(next.id);
    requestAnimationFrame(() =>
      listRef.current
        ?.querySelector<HTMLButtonElement>(`[data-job-id="${next.id}"]`)
        ?.focus(),
    );
  };

  if (jobs.length === 0) return null;

  return (
    <section
      className="inbox-review-list"
      aria-label="Jobs awaiting review"
      ref={listRef}
      role="list"
      onKeyDown={(event) => {
        if (
          (event.target as HTMLElement).closest(
            "input, textarea, select, .inbox-review-actions",
          )
        )
          return;
        const row = (event.target as HTMLElement).closest<HTMLButtonElement>(
          "[data-job-id]",
        );
        const currentIndex = row
          ? jobs.findIndex((job) => job.id === row.dataset.jobId)
          : jobs.findIndex((job) => job.id === expandedId);
        if (event.key === "ArrowDown" || event.key.toLowerCase() === "j") {
          event.preventDefault();
          selectIndex((currentIndex < 0 ? 0 : currentIndex) + 1);
        }
        if (event.key === "ArrowUp" || event.key.toLowerCase() === "k") {
          event.preventDefault();
          selectIndex((currentIndex < 0 ? 0 : currentIndex) - 1);
        }
      }}
    >
      {jobs.map((job) => {
        const expanded = job.id === expandedId;
        const laterOpen = job.id === laterOpenId;
        const reviewDate = job.inbox_review_at
          ? new Date(job.inbox_review_at)
          : null;
        const reviewIsDue =
          job.inbox_state === "maybe" &&
          reviewDate !== null &&
          reviewDate.getTime() <= referenceTimestamp;
        return (
          <article
            className={`inbox-review-item${expanded ? " is-open" : ""}`}
            key={job.id}
            role="listitem"
          >
            <button
              className="inbox-review-row"
              type="button"
              data-job-id={job.id}
              aria-expanded={expanded}
              aria-controls={`job-${job.id}-review`}
              onClick={() =>
                setExpandedId((current) => (current === job.id ? null : job.id))
              }
            >
              <span className="inbox-company-mark" aria-hidden="true">
                {job.company.slice(0, 1).toUpperCase()}
              </span>
              <span className="inbox-review-row-copy">
                <span className="inbox-review-row-title">
                  <strong>{job.title}</strong>
                  {job.inbox_state === "maybe" ? (
                    <span className={reviewIsDue ? "is-due" : undefined}>
                      {reviewDate
                        ? `${reviewIsDue ? "Due" : "Later"} · ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(reviewDate)}`
                        : "Later"}
                    </span>
                  ) : null}
                </span>
                <small>{job.company}</small>
                <span>
                  {[job.location, job.compensation]
                    .filter(Boolean)
                    .join(" · ") || "Details not provided"}
                </span>
              </span>
              <ChevronDown
                className="inbox-review-chevron"
                aria-hidden="true"
              />
            </button>

            <AnimatedInboxDetail open={expanded}>
              {() => (
                <div
                  className="inbox-review-detail"
                  id={`job-${job.id}-review`}
                >
                  <div className="inbox-review-detail-top">
                    <dl
                      className="inbox-review-facts"
                      aria-label="Listing details"
                    >
                      <div>
                        <dt>Location</dt>
                        <dd>{job.location || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt>Work arrangement</dt>
                        <dd>{job.remote_policy || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt>Compensation</dt>
                        <dd>{job.compensation || "Not provided"}</dd>
                      </div>
                      <div>
                        <dt>Source</dt>
                        <dd>{job.source}</dd>
                      </div>
                    </dl>
                    {job.source_url ? (
                      <a
                        className="button ghost inbox-open-listing"
                        href={job.source_url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open listing <ExternalLink aria-hidden="true" />
                      </a>
                    ) : null}
                  </div>

                  <section className="inbox-review-description">
                    <header>
                      <h3>Role description</h3>
                      <span>
                        Saved{" "}
                        {new Intl.DateTimeFormat(undefined, {
                          month: "short",
                          day: "numeric",
                        }).format(new Date(job.imported_at))}
                      </span>
                    </header>
                    {job.description ? (
                      <div>{job.description}</div>
                    ) : (
                      <div className="inbox-review-empty-copy">
                        <Inbox aria-hidden="true" />
                        <p>
                          No description was saved. Use the listing details to
                          decide, open the original listing, or dismiss this
                          Job.
                        </p>
                      </div>
                    )}
                  </section>

                  <footer
                    className="inbox-review-actions"
                    aria-label="Review actions"
                  >
                    <form action={trackJob} className="inbox-track-action">
                      <input type="hidden" name="jobId" value={job.id} />
                      <SubmitButton pendingLabel="Tracking…">
                        <CheckCircle2 aria-hidden="true" />
                        Track as opportunity
                      </SubmitButton>
                    </form>
                    <Button
                      className="button secondary inbox-review-later-trigger"
                      variant="outline"
                      type="button"
                      aria-expanded={laterOpen}
                      aria-controls={`review-later-${job.id}`}
                      onClick={() =>
                        setLaterOpenId((current) =>
                          current === job.id ? null : job.id,
                        )
                      }
                    >
                      <CalendarClock aria-hidden="true" />
                      Review later
                    </Button>
                    <form
                      action={updateInboxState}
                      className="inbox-dismiss-action"
                    >
                      <input type="hidden" name="jobId" value={job.id} />
                      <input type="hidden" name="state" value="dismissed" />
                      <SubmitButton
                        className="button secondary inbox-dismiss-button"
                        pendingLabel="Dismissing…"
                      >
                        <X aria-hidden="true" />
                        Dismiss
                      </SubmitButton>
                    </form>
                    {laterOpen ? (
                      <form
                        action={updateInboxState}
                        className="inbox-later-popover floating-panel"
                        id={`review-later-${job.id}`}
                        key={job.id}
                      >
                        <input type="hidden" name="jobId" value={job.id} />
                        <input type="hidden" name="state" value="maybe" />
                        <label htmlFor={`review-at-${job.id}`}>
                          Return to Inbox
                        </label>
                        <input
                          className="input"
                          id={`review-at-${job.id}`}
                          name="reviewAt"
                          type="date"
                          required
                          min={minReviewDate}
                          defaultValue={
                            job.inbox_review_at?.slice(0, 10) ??
                            defaultReviewDate
                          }
                          autoFocus
                        />
                        <div>
                          <Button
                            className="button ghost"
                            variant="ghost"
                            type="button"
                            onClick={() => setLaterOpenId(null)}
                          >
                            Cancel
                          </Button>
                          <SubmitButton pendingLabel="Saving…">
                            Schedule
                          </SubmitButton>
                        </div>
                      </form>
                    ) : null}
                  </footer>
                </div>
              )}
            </AnimatedInboxDetail>
          </article>
        );
      })}
    </section>
  );
}

function AnimatedInboxDetail({
  open,
  children,
}: {
  open: boolean;
  children: () => ReactNode;
}) {
  const [present, setPresent] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setPresent(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setPresent(false), 190);
    return () => window.clearTimeout(timeout);
  }, [open]);

  if (!present && !open) return null;

  return (
    <div
      className={`inbox-review-detail-motion${visible ? " is-open" : ""}`}
      aria-hidden={!open}
      inert={!open}
    >
      <div>{children()}</div>
    </div>
  );
}
