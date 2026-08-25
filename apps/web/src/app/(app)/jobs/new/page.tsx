import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { JobCreateForm } from "@/components/job-create-form";
import { requireUser } from "@/lib/supabase/server";

export default async function NewJobPage() {
  const auth = await requireUser();
  if (!auth) return null;
  return <div className="page narrow create-page"><header className="page-header create-page-header"><div><Link className="back-link" href="/jobs"><ArrowLeft />Job inbox</Link><h1>Add a job</h1><p className="page-subtitle">Capture the listing now. Decide whether it belongs in your pipeline after review.</p></div></header><JobCreateForm /></div>;
}
