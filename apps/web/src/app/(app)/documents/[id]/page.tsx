import { formatOpportunityTicket } from "@roleway/core";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { WorkspaceBreadcrumbs } from "@/components/app-shell";
import { DeleteDocument } from "@/components/delete-document";
import { SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { requireSearchContext } from "@/features/projects/context";
import { updateDocument } from "@/features/workspace/actions";

type LinkedOpportunity = { id: string; reference_number: number; jobs: { company: string; title: string } | null };
type DocumentVersion = { id: string; version: number; status: string; created_at: string };

export default async function DocumentPage(
  props: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const [{ id }, query, context] = await Promise.all([params, searchParams, requireSearchContext()]);
  if (!context) redirect("/login");
  if (!context.project) redirect("/onboarding");
  const [documentResult, opportunitiesResult, versionsResult] = await Promise.all([
    context.supabase.from("documents").select("id, title, kind, status, content, opportunity_id, updated_at").eq("id", id).eq("project_id", context.project.id).maybeSingle(),
    context.supabase.from("opportunities").select("id, reference_number, jobs(company, title)").eq("project_id", context.project.id).neq("stage", "closed").order("updated_at", { ascending: false }),
    context.supabase.from("document_versions").select("id, version, status, created_at").eq("document_id", id).eq("project_id", context.project.id).order("version", { ascending: false }).limit(10),
  ]);
  if (documentResult.error) throw new Error("The document could not be loaded.");
  if (!documentResult.data) notFound();
  const document = documentResult.data;
  const opportunities = (opportunitiesResult.data ?? []) as unknown as LinkedOpportunity[];
  const versions = (versionsResult.data ?? []) as DocumentVersion[];
  const content = document.content && typeof document.content === "object" && !Array.isArray(document.content) ? document.content as Record<string, unknown> : {};
  const body = typeof content.body === "string" ? content.body : "";

  return <div className="page document-editor-page"><WorkspaceBreadcrumbs items={[{ label: "Documents", href: "/documents" }, { label: document.title }]} /><header className="page-header"><div className="page-header-copy"><div className="workspace-id"><Link href="/documents">Documents</Link> / {document.kind.replaceAll("_", " ")}</div><h1>{document.title}</h1><p className="page-subtitle">{context.project.name} · last saved {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(document.updated_at))}</p></div><DeleteDocument documentId={document.id} title={document.title} /></header>{query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}{query.saved ? <div className="form-alert success" role="status">Document saved as version {versions[0]?.version ?? 1}.</div> : null}{versionsResult.error || opportunitiesResult.error ? <div className="form-alert error" role="alert">Some document context could not be loaded.</div> : null}<form action={updateDocument} className="document-editor"><input type="hidden" name="documentId" value={document.id} /><aside><div className="field"><label htmlFor="title">Title</label><input className="input" id="title" name="title" required defaultValue={document.title} /></div><div className="field"><label htmlFor="status">Status</label><SelectField id="status" name="status" defaultValue={document.status} ariaLabel="Document status" options={["draft", "approved", "submitted", "archived"].map((value) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1) }))} /></div><div className="field"><label htmlFor="opportunityId">Opportunity</label><SelectField id="opportunityId" name="opportunityId" defaultValue={document.opportunity_id ?? ""} ariaLabel="Linked opportunity" options={[{ value: "", label: "Not attached" }, ...opportunities.map((opportunity) => ({ value: opportunity.id, label: `${formatOpportunityTicket(context.project.ticket_key, opportunity.reference_number)} · ${opportunity.jobs?.company} · ${opportunity.jobs?.title}` }))]} /></div><SubmitButton pendingLabel="Saving document…">Save new version</SubmitButton>{versions.length ? <section className="document-version-list" aria-labelledby="document-versions-heading"><h2 id="document-versions-heading">Version history</h2>{versions.map((version) => <div key={version.id}><span>Version {version.version}</span><time>{new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(version.created_at))}</time></div>)}</section> : null}</aside><main><label htmlFor="body">Document content</label><textarea id="body" name="body" className="document-body" defaultValue={body} placeholder="Start writing…" spellCheck /></main></form></div>;
}
