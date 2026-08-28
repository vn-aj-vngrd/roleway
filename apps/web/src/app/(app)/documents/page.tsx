import { ChevronRight, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateModal } from "@/components/create-modal";
import { SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { Badge } from "@/components/ui/badge";
import { EmptyState, ViewToolbar, WorkspaceHeader } from "@/components/ui-primitives";
import { requireSearchContext } from "@/features/projects/context";
import { createDocument } from "@/features/workspace/actions";

type DocumentRow = { id: string; title: string; kind: string; status: string; updated_at: string; opportunities: { reference_number: number; jobs: { company: string; title: string } | null } | null };

export default async function DocumentsPage(
  props: { searchParams: Promise<{ create?: string; opportunity?: string; error?: string; deleted?: string }> }
) {
  const searchParams = await props.searchParams;
  const [context, query] = await Promise.all([requireSearchContext(), searchParams]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  const { data, error } = await context.supabase.from("documents").select("id, title, kind, status, updated_at, opportunities(reference_number, jobs(company, title))").eq("project_id", context.project.id).order("updated_at", { ascending: false });
  const documents = (data ?? []) as unknown as DocumentRow[];

  return <div className="workspace-page workspace-index-page documents-index-page"><WorkspaceHeader title="Documents" count={documents.length} context={<>Application material for {context.project.name}, with Opportunity context intact.</>} actions={<Link className="button primary" href="/documents?create=true"><Plus aria-hidden="true" />Create document</Link>} /><ViewToolbar primary={<span className="workspace-view-chip" aria-current="page">All documents <span>{documents.length}</span></span>} />{query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}{query.deleted ? <div className="form-alert success" role="status">Document deleted.</div> : null}{error ? <EmptyState title="Documents could not be loaded" description="Check your connection and refresh this page." /> : null}<div className="workspace-index-content">{!error && documents.length === 0 ? <EmptyState icon={<FileText />} title="No documents in this workspace" description="Create a resume, cover letter, answer, message, or preparation note when an Opportunity needs it." actions={<Link className="button primary" href="/documents?create=true"><Plus aria-hidden="true" />Create your first document</Link>} /> : null}{documents.length > 0 ? <section className="document-list workspace-document-list" aria-label="Documents"><div className="document-list-header" aria-hidden="true"><span /><span>Document</span><span>Status</span><span>Updated</span><span /></div>{documents.map((document) => { const opportunity = document.opportunities; const kind = document.kind.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase()); return <Link className="list-row list-row-link" href={`/documents/${document.id}`} key={document.id}><span className="list-icon"><FileText aria-hidden="true" /></span><div><div className="list-title">{document.title}</div><div className="list-subtitle">{kind}{opportunity?.jobs ? ` · ${opportunity.jobs.company} · ${opportunity.jobs.title}` : ""}</div></div><DocumentStatusBadge status={document.status} /><time className="muted small">{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" }).format(new Date(document.updated_at))}</time><ChevronRight aria-hidden="true" /></Link>; })}</section> : null}</div>
  {query.create ? <CreateModal title="Create a document" description="Start a focused draft. Attach it to an Opportunity when the context is ready." context={context.project.name} closeHref={query.opportunity ? `/opportunities/${query.opportunity}` : "/documents"} size="compact"><form action={createDocument} className="modal-create-form linear-composer"><input type="hidden" name="opportunityId" value={query.opportunity ?? ""} /><div className="composer-editor"><label className="sr-only" htmlFor="document-title">Title</label><input className="composer-title" id="document-title" name="title" required placeholder="Document title" autoComplete="off" autoFocus /><p className="composer-placeholder">Start a focused draft. You can attach it to an Opportunity from the editor.</p></div><div className="composer-properties"><div className="composer-select-property"><span>Type</span><SelectField id="document-kind" name="kind" defaultValue="resume" ariaLabel="Document type" options={[{ value: "resume", label: "Resume" }, { value: "cover_letter", label: "Cover letter" }, { value: "answer", label: "Application answer" }, { value: "message", label: "Message" }, { value: "research_note", label: "Research note" }, { value: "interview_note", label: "Interview note" }]} /></div></div><footer className="composer-footer"><span className="composer-save-note">Creates a private draft in {context.project.name}.</span><Link className="button secondary" href={query.opportunity ? `/opportunities/${query.opportunity}` : "/documents"}>Cancel</Link><SubmitButton pendingLabel="Creating…">Create document</SubmitButton></footer></form></CreateModal> : null}</div>;
}

function DocumentStatusBadge({ status }: { status: string }) {
  const label = status ? `${status.charAt(0).toUpperCase()}${status.slice(1).replaceAll("_", " ")}` : "Unknown";
  return <Badge className="document-status-badge" data-status={status} variant="outline">{label}</Badge>;
}
