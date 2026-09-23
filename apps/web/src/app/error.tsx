"use client";

import { RefreshCw } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="system-state-page" id="main-content">
      <section className="system-state" role="alert">
        <LogoMark size={36} tile />
        <span className="system-state-label">Workspace unavailable</span>
        <h1>This workspace could not be loaded</h1>
        <p>Your data was not changed. Check your connection, then try again.</p>
        <Button className="button primary" onClick={reset}><RefreshCw aria-hidden="true" />Try again</Button>
      </section>
    </main>
  );
}
