import { Bot } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/server";

export default async function AgentPage() {
  const auth = await requireUser();
  if (!auth) return null;
  const { count } = await auth.supabase.from("opportunities").select("id", { count: "exact", head: true }).neq("stage", "closed");
  return <div className="page narrow"><header className="page-header"><div className="page-header-copy"><h1>Agent</h1><p className="page-subtitle">Contextual assistance grounded in your private workspace.</p></div></header><div className="empty-state"><span className="empty-icon"><Bot /></span><h2>The agent is not configured yet</h2><p>No simulated AI output is shown. Connect a provider before Roleway sends any job, profile, or document context outside Supabase. You currently have {count ?? 0} active opportunities available as future context.</p><Link className="button primary" href="/settings/ai">Review AI settings</Link></div></div>;
}
