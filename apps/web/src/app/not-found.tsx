import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/logo";

export default function NotFoundPage() {
  return <main className="system-state-page" id="main-content"><section className="system-state"><LogoMark size={36} tile /><span className="system-state-label">Not found</span><h1>This Roleway record does not exist</h1><p>It may have been removed, archived, or belong to a different workspace.</p><Link className="button primary" href="/home"><ArrowLeft aria-hidden="true" />Return Home</Link></section></main>;
}
