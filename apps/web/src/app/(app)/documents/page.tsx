import { formatOpportunityTicket } from "@roleway/core";
import {
  ArrowRight,
  ChevronRight,
  Clock3,
  FileCheck2,
  Files,
  FileText,
  FileUser,
  Link2,
  MessageSquareText,
  NotebookPen,
  Plus,
  Send,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CollectionViewControls } from "@/components/collection-view-controls";
import { CreateModal } from "@/components/create-modal";
import { SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import {
  CountBadge,
  EmptyState,
  PillTabs,
  ViewToolbar,
  WorkspaceHeader,
} from "@/components/ui-primitives";
import { requireSearchContext } from "@/features/projects/context";
import { createDocument } from "@/features/workspace/actions";

type DocumentRow = {
  id: string;
  title: string;
  kind: string;
  status: string;
  updated_at: string;
  opportunities: {
    reference_number: number;
    jobs: { company: string; title: string } | null;
  } | null;
};

const documentKinds = [
  { value: "resume", label: "Resume" },
  { value: "cover_letter", label: "Cover letter" },
  { value: "answer", label: "Application answer" },
  { value: "message", label: "Message" },
  { value: "research_note", label: "Research note" },
  { value: "interview_note", label: "Interview note" },
] as const;

export default async function DocumentsPage(props: {
  searchParams: Promise<{
    create?: string;
    opportunity?: string;
    view?: string;
    kind?: string;
    status?: string;
    sort?: string;
    error?: string;
    deleted?: string;
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

  const { data, error } = await context.supabase
    .from("documents")
    .select(
      "id, title, kind, status, updated_at, opportunities(reference_number, jobs(company, title))",
    )
    .eq("project_id", project.id)
    .order("updated_at", { ascending: false });
  const documents = (data ?? []) as unknown as DocumentRow[];
  const drafts = documents.filter((document) => document.status === "draft");
  const draftView = query.view === "drafts";
  const kind = documentKinds.some((option) => option.value === query.kind)
    ? query.kind!
    : "all";
  const statuses = [
    "all",
    "draft",
    "approved",
    "submitted",
    "archived",
  ] as const;
  const status = statuses.includes(query.status as (typeof statuses)[number])
    ? query.status!
    : "all";
  const sorts = ["updated", "title", "kind"] as const;
  const sort = sorts.includes(query.sort as (typeof sorts)[number])
    ? query.sort!
    : "updated";
  const visibleDocuments = (draftView ? drafts : documents)
    .filter(
      (document) =>
        (kind === "all" || document.kind === kind) &&
        (status === "all" || document.status === status),
    )
    .sort((left, right) => {
      if (sort === "title") return left.title.localeCompare(right.title);
      if (sort === "kind")
        return (
          documentKindLabel(left.kind).localeCompare(
            documentKindLabel(right.kind),
          ) || left.title.localeCompare(right.title)
        );
      return (
        new Date(right.updated_at).getTime() -
        new Date(left.updated_at).getTime()
      );
    });
  const hasDocumentFilters = kind !== "all" || status !== "all";
  const linkedDocuments = documents.filter(
    (document) => document.opportunities,
  );
  const readyDocuments = documents.filter(
    (document) =>
      document.status === "approved" || document.status === "submitted",
  );
  const mostRecent = documents[0];
  const kindCounts = documentKinds
    .map((kind) => ({
      ...kind,
      count: documents.filter((document) => document.kind === kind.value)
        .length,
    }))
    .filter((kind) => kind.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);

  return (
    <div className="workspace-page workspace-index-page documents-index-page">
      <WorkspaceHeader
        title="Documents"
        count={draftView ? drafts.length : documents.length}
        context={
          <>
            Application material for {project.name}, with Opportunity context
            intact.
          </>
        }
        actions={
          <Link className="button primary" href="/documents?create=true">
            <Plus aria-hidden="true" />
            Create document
          </Link>
        }
      />

      <ViewToolbar
        className="documents-view-toolbar"
        label="Document views"
        primary={
          <PillTabs
            label="Document views"
            items={[
              {
                href: "/documents",
                label: "All documents",
                active: !draftView,
                count: documents.length,
              },
              {
                href: "/documents?view=drafts",
                label: "Drafts",
                active: draftView,
                count: drafts.length,
              },
            ]}
          />
        }
        actions={
          <CollectionViewControls
            page="documents"
            filterGroups={[
              {
                key: "kind",
                label: "Document type",
                defaultValue: "all",
                options: [
                  { value: "all", label: "All types" },
                  ...documentKinds,
                ],
              },
              {
                key: "status",
                label: "Status",
                defaultValue: "all",
                options: [
                  { value: "all", label: "Any status" },
                  { value: "draft", label: "Draft" },
                  { value: "approved", label: "Approved" },
                  { value: "submitted", label: "Submitted" },
                  { value: "archived", label: "Archived" },
                ],
              },
            ]}
            values={{ kind, status }}
            sort={sort}
            defaultSort="updated"
            sortOptions={[
              { value: "updated", label: "Recently updated" },
              { value: "title", label: "Title" },
              { value: "kind", label: "Document type" },
            ]}
          />
        }
      />

      {query.error || query.deleted ? (
        <div className="documents-notices">
          {query.error ? (
            <div className="form-alert error" role="alert">
              {query.error}
            </div>
          ) : null}
          {query.deleted ? (
            <div className="form-alert success" role="status">
              Document deleted.
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={`documents-index-layout${error ? " no-rail" : ""}`}>
        <main className="documents-library">
          <header className="documents-library-header">
            <div>
              <h2>{draftView ? "Draft documents" : "Document library"}</h2>
              <p>
                Keep each working draft, approved version, and submission
                artifact attached to its purpose.
              </p>
            </div>
            <span>
              {visibleDocuments.length}{" "}
              {visibleDocuments.length === 1 ? "document" : "documents"}
            </span>
          </header>

          {error ? (
            <EmptyState
              className="documents-empty-state"
              title="Documents could not be loaded"
              description="Refresh this page to recover the library. Your saved documents have not been changed."
            />
          ) : documents.length === 0 ? (
            <EmptyState
              className="documents-empty-state"
              icon={<FileText />}
              title="No documents in this workspace"
              description="Create a resume, cover letter, answer, message, or preparation note when an Opportunity needs it."
              actions={
                <Link className="button primary" href="/documents?create=true">
                  <Plus aria-hidden="true" />
                  Create your first document
                </Link>
              }
            />
          ) : visibleDocuments.length === 0 ? (
            <EmptyState
              className="documents-empty-state"
              icon={<FileCheck2 />}
              title={
                hasDocumentFilters
                  ? "No matching documents"
                  : "No draft documents"
              }
              description={
                hasDocumentFilters
                  ? "Try another document type or status."
                  : "Every document in this workspace has moved beyond draft status."
              }
              actions={
                <Link className="button secondary" href="/documents">
                  View all documents
                </Link>
              }
            />
          ) : (
            <section
              className="document-list workspace-document-list"
              aria-label="Documents"
            >
              <div className="document-list-header" aria-hidden="true">
                <span />
                <span>Document</span>
                <span>Status</span>
                <span>Updated</span>
                <span />
              </div>
              {visibleDocuments.map((document) => {
                const opportunity = document.opportunities;
                const kind = documentKindLabel(document.kind);
                const KindIcon = documentKindIcon(document.kind);
                return (
                  <Link
                    className="list-row list-row-link"
                    href={`/documents/${document.id}`}
                    key={document.id}
                  >
                    <span className="list-icon">
                      <KindIcon aria-hidden="true" />
                    </span>
                    <div className="document-row-copy">
                      <div className="list-title">{document.title}</div>
                      <div className="list-subtitle">
                        <span>{kind}</span>
                        {opportunity ? (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>
                              {formatOpportunityTicket(
                                project.ticket_key,
                                opportunity.reference_number,
                              )}
                            </span>
                            {opportunity.jobs ? (
                              <span>{opportunity.jobs.company}</span>
                            ) : null}
                          </>
                        ) : (
                          <span>Workspace document</span>
                        )}
                      </div>
                    </div>
                    <DocumentStatusBadge status={document.status} />
                    <time className="muted small">
                      {new Intl.DateTimeFormat(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }).format(new Date(document.updated_at))}
                    </time>
                    <ChevronRight aria-hidden="true" />
                  </Link>
                );
              })}
            </section>
          )}
        </main>

        {!error ? (
          <aside
            className="documents-insights-rail"
            aria-label="Document overview"
          >
            <section>
              <header className="documents-rail-heading">
                <h2>Document overview</h2>
                <CountBadge value={documents.length} />
              </header>
              <dl className="documents-insight-list">
                <div>
                  <dt>Drafts</dt>
                  <dd>
                    <CountBadge
                      tone={drafts.length ? "accent" : "neutral"}
                      value={drafts.length}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Approved or submitted</dt>
                  <dd>{readyDocuments.length}</dd>
                </div>
                <div>
                  <dt>Linked to an Opportunity</dt>
                  <dd>{linkedDocuments.length}</dd>
                </div>
                <div>
                  <dt>Workspace-wide</dt>
                  <dd>{documents.length - linkedDocuments.length}</dd>
                </div>
              </dl>
            </section>

            <section>
              <header className="documents-rail-heading">
                <h2>Recently updated</h2>
              </header>
              {mostRecent ? (
                <Link
                  className="documents-recent-link"
                  href={`/documents/${mostRecent.id}`}
                >
                  <span className="documents-recent-date">
                    <Clock3 aria-hidden="true" />
                    {new Intl.DateTimeFormat(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    }).format(new Date(mostRecent.updated_at))}
                  </span>
                  <strong>{mostRecent.title}</strong>
                  <span>
                    {documentKindLabel(mostRecent.kind)}
                    {mostRecent.opportunities?.jobs
                      ? ` · ${mostRecent.opportunities.jobs.company}`
                      : " · Workspace document"}
                  </span>
                  <span className="documents-recent-action">
                    Open document <ArrowRight aria-hidden="true" />
                  </span>
                </Link>
              ) : (
                <div className="documents-rail-empty">
                  <p>No document activity yet.</p>
                  <Link href="/documents?create=true">
                    Create a document <ArrowRight aria-hidden="true" />
                  </Link>
                </div>
              )}
            </section>

            {kindCounts.length ? (
              <section>
                <header className="documents-rail-heading">
                  <h2>Document types</h2>
                  <span>{kindCounts.length} types</span>
                </header>
                <ul className="documents-kind-list">
                  {kindCounts.map((kind) => (
                    <li key={kind.value}>
                      <span>
                        <Link2 aria-hidden="true" />
                        {kind.label}
                      </span>
                      <CountBadge value={kind.count} />
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </aside>
        ) : null}
      </div>

      {query.create ? (
        <CreateModal
          title="Create a document"
          description="Start a focused draft. Attach it to an Opportunity when the context is ready."
          context={project.name}
          closeHref={
            query.opportunity
              ? `/opportunities/${query.opportunity}`
              : "/documents"
          }
          size="compact"
        >
          <form
            action={createDocument}
            className="modal-create-form linear-composer"
          >
            <input
              type="hidden"
              name="opportunityId"
              value={query.opportunity ?? ""}
            />
            <div className="composer-editor">
              <label className="sr-only" htmlFor="document-title">
                Title
              </label>
              <input
                className="composer-title"
                id="document-title"
                name="title"
                required
                placeholder="Document title"
                autoComplete="off"
                autoFocus
              />
              <p className="composer-placeholder">
                Start a focused draft. You can attach it to an Opportunity from
                the editor.
              </p>
            </div>
            <div className="composer-properties">
              <div className="composer-select-property">
                <span>Type</span>
                <SelectField
                  id="document-kind"
                  name="kind"
                  defaultValue="resume"
                  ariaLabel="Document type"
                  options={[...documentKinds]}
                />
              </div>
            </div>
            <footer className="composer-footer">
              <span className="composer-save-note">
                Creates a private draft in {project.name}.
              </span>
              <Link
                className="button secondary"
                href={
                  query.opportunity
                    ? `/opportunities/${query.opportunity}`
                    : "/documents"
                }
              >
                Cancel
              </Link>
              <SubmitButton pendingLabel="Creating…">
                Create document
              </SubmitButton>
            </footer>
          </form>
        </CreateModal>
      ) : null}
    </div>
  );
}

function DocumentStatusBadge({ status }: { status: string }) {
  const label = status
    ? `${status.charAt(0).toUpperCase()}${status.slice(1).replaceAll("_", " ")}`
    : "Unknown";
  return (
    <Badge
      className="document-status-badge"
      data-status={status}
      variant="outline"
    >
      {label}
    </Badge>
  );
}

function documentKindLabel(kind: string) {
  return (
    documentKinds.find((option) => option.value === kind)?.label ??
    kind.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase())
  );
}

function documentKindIcon(kind: string) {
  if (kind === "resume") return FileUser;
  if (kind === "cover_letter") return Send;
  if (kind === "message") return MessageSquareText;
  if (kind === "research_note" || kind === "interview_note") return NotebookPen;
  if (kind === "answer") return FileCheck2;
  return Files;
}
