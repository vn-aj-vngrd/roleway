import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SelectField } from "@/components/form-controls";
import { SubmitButton } from "@/components/submit-button";
import { createDocument } from "@/features/workspace/actions";
import { requireUser } from "@/lib/supabase/server";

export default async function NewDocumentPage() {
  const auth = await requireUser();
  if (!auth) return null;
  return <div className="page narrow create-page"><header className="page-header create-page-header"><div><Link className="back-link" href="/documents"><ArrowLeft />Documents</Link><h1>Create a document</h1><p className="page-subtitle">Start a focused draft. You can attach it to an Opportunity from the editor.</p></div></header><form action={createDocument} className="standalone-form standalone-form-compact"><section className="standalone-form-section"><header><h2>Document details</h2><p>Name the draft and choose the kind of material you are preparing.</p></header><div><div className="field"><label htmlFor="document-title">Title</label><input className="input" id="document-title" name="title" required placeholder="e.g. Northstar targeted resume" autoComplete="off" autoFocus /></div><div className="field"><label htmlFor="document-kind">Document type</label><SelectField id="document-kind" name="kind" defaultValue="resume" options={[{ value: "resume", label: "Resume" }, { value: "cover_letter", label: "Cover letter" }, { value: "answer", label: "Application answer" }, { value: "message", label: "Message" }, { value: "research_note", label: "Research note" }, { value: "interview_note", label: "Interview note" }]} /></div></div></section><footer className="standalone-form-actions"><Link className="button secondary" href="/documents">Cancel</Link><SubmitButton pendingLabel="Creating…">Create document</SubmitButton></footer></form></div>;
}
