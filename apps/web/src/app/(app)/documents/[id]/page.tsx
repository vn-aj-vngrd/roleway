import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteDocument } from "@/components/delete-document";
import { SubmitButton } from "@/components/submit-button";
import { updateDocument } from "@/features/workspace/actions";
import { requireUser } from "@/lib/supabase/server";

type LinkedOpportunity = { id: string; reference_number: number; jobs: { company: string; title: string } | null };

export default async function DocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; error?: string }> }) {
  const [{ id }, query, auth] = await Promise.all([params, searchParams, requireUser()]);
  if (!auth) return null;
  const [documentResult, opportunitiesResult] = await Promise.all([
    auth.supabase.from("documents").select("id, title, kind, status, content, opportunity_id, updated_at").eq("id", id).maybeSingle(),
    auth.supabase.from("opportunities").select("id, reference_number, jobs(company, title)").neq("stage", "closed").order("updated_at", { ascending: false }),
  ]);
  if (!documentResult.data) notFound();
  const document = documentResult.data;
  const opportunities = (opportunitiesResult.data ?? []) as unknown as LinkedOpportunity[];
  const content = document.content && typeof document.content === "object" && !Array.isArray(document.content) ? document.content as Record<string, unknown> : {};
  const body = typeof content.body === "string" ? content.body : "";
  return <div className="page document-editor-page"><header className="page-header"><div className="page-header-copy"><div className="workspace-id"><Link href="/documents">Documents</Link> / {document.kind.replaceAll("_", " ")}</div><h1>{document.title}</h1><p className="page-subtitle">Last saved {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(document.updated_at))}</p></div><DeleteDocument documentId={document.id} title={document.title} /></header>{query.error ? <div className="form-alert error" role="alert">{query.error}</div> : null}{query.saved ? <div className="form-alert success" role="status">Document saved.</div> : null}<form action={updateDocument} className="document-editor"><input type="hidden" name="documentId" value={document.id} /><aside><div className="field"><label htmlFor="title">Title</label><input className="input" id="title" name="title" required defaultValue={document.title} /></div><div className="field"><label htmlFor="status">Status</label><select className="input" id="status" name="status" defaultValue={document.status}><option value="draft">Draft</option><option value="approved">Approved</option><option value="submitted">Submitted</option><option value="archived">Archived</option></select></div><div className="field"><label htmlFor="opportunityId">Opportunity</label><select className="input" id="opportunityId" name="opportunityId" defaultValue={document.opportunity_id ?? ""}><option value="">Not attached</option>{opportunities.map((opportunity) => <option value={opportunity.id} key={opportunity.id}>RLW-{String(opportunity.reference_number).padStart(3, "0")} · {opportunity.jobs?.company} · {opportunity.jobs?.title}</option>)}</select></div><SubmitButton pendingLabel="Saving document…">Save document</SubmitButton></aside><main><label htmlFor="body">Document content</label><textarea id="body" name="body" className="document-body" defaultValue={body} placeholder="Start writing…" spellCheck /></main></form></div>;
}
