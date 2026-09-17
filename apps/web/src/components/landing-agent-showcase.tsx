import Link from "next/link";
import { ArrowRight, Navigation } from "lucide-react";
import { LandingAgentDemo } from "@/components/landing-agent-demo";

export function LandingAgentShowcase() {
  return (
    <section
      id="agent-proof"
      className="rw-agent-showcase"
      aria-labelledby="landing-agent-title"
    >
      <div className="rw-agent-copy">
        <p className="rw-agent-label">
          <Navigation aria-hidden="true" /> Agent
        </p>
        <h2 id="landing-agent-title">
          Ask Agent.
          <br />
          Make your next move.
        </h2>
        <p>
          Find what needs attention, prepare for an interview, or turn an idea
          into work. Agent brings your Workspaces and job-search context into
          one conversation.
        </p>
        <ul>
          <li>Explore your next steps, Opportunities, and follow-ups.</li>
          <li>Create Workspaces, tasks, notes, and Next Actions.</li>
          <li>Get step-by-step guidance from the Help Center.</li>
        </ul>
        <p className="rw-agent-detail">
          No form to work through. Agent asks for missing details, then shows a
          proposal for your approval. You review every change and send
          applications yourself.
        </p>
        <Link href="/agent" className="rw-button">
          Ask Agent <ArrowRight aria-hidden="true" />
        </Link>
        <p className="rw-agent-detail">
          Connect your own AI provider in Settings → Agent. Provider charges are
          separate.
        </p>
      </div>
      <LandingAgentDemo />
    </section>
  );
}
