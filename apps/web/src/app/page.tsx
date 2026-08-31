import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { LandingProductPages } from "@/components/landing-product-pages";
import { LandingWorkspacePreview } from "@/components/landing-workspace-preview";
import { LandingMotion } from "@/components/landing-motion";
import { LogoMark } from "@/components/logo";
import { ThemePicker } from "@/components/theme-picker";
import { requireUser } from "@/lib/supabase/server";
import "./landing.css";

export const metadata = {
  title: "Roleway — One workspace for every focused job search",
  description:
    "Separate career targets, review jobs, run applications, prepare interviews, and keep every next action in one focused system.",
};

export default async function HomePage() {
  const auth = await requireUser();
  const primaryHref = auth ? "/home" : "/signup";
  const primaryLabel = auth ? "Open Roleway" : "Create your workspace";

  return (
    <div className="rw-site">
      <LandingMotion />
      <header className="rw-nav">
        <Link href="/" className="rw-brand" aria-label="Roleway home">
          <LogoMark size={23} tile />
          <span>Roleway</span>
        </Link>
        <nav aria-label="Product navigation">
          <a href="#home-proof">Workspace</a>
          <a href="#opportunities-proof">Opportunities</a>
          <a href="#interviews-proof">Interviews</a>
          <a href="#agent-proof">Agent</a>
          <a href="#insights-proof">Insights</a>
        </nav>
        <div className="rw-nav-actions">
          {!auth ? (
            <Link href="/login" className="rw-login">
              Log in
            </Link>
          ) : null}
          <Link href={primaryHref} className="rw-button rw-button-small">
            {primaryLabel}
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main id="main-content">
        <section className="rw-hero">
          <div className="rw-hero-heading">
            <h1>Your job search, with a clear next move.</h1>
            <p className="rw-hero-subtitle">
              Give each target its own Workspace. Review promising roles, run
              applications, prepare interviews, and always know what comes next.
            </p>
            <div className="rw-hero-actions">
              <Link href={primaryHref} className="rw-button">
                {primaryLabel}
                <ArrowRight aria-hidden="true" />
              </Link>
              <a href="#features" className="rw-button rw-button-secondary">
                Explore the product
              </a>
            </div>
            <p className="rw-control-note">
              <Check aria-hidden="true" />
              AI when you want it. You stay in control.
            </p>
          </div>
          <div className="rw-hero-stage">
            <LandingWorkspacePreview />
            <div className="rw-next-slip">
              <span>Next action</span>
              <strong>Choose two project examples</strong>
              <small>Due Friday · Northstar Systems</small>
              <span className="rw-demo-button">
                Mark complete <Check aria-hidden="true" />
              </span>
            </div>
          </div>
        </section>

        <LandingProductPages />

        <section className="rw-problem">
          <div className="rw-problem-copy" data-reveal>
            <p>Job hunting creates fragments.</p>
            <h2>
              A listing in one tab. Notes in another. A follow-up you meant to
              send six days ago.
            </h2>
          </div>
          <div
            className="rw-fragments"
            data-reveal
            aria-label="Disconnected job-search context"
          >
            <span>saved-job.pdf</span>
            <span>resume-final-v4.docx</span>
            <span>Follow up Friday</span>
            <span>Interview notes</span>
            <span>Who referred me?</span>
            <strong>
              Roleway gives every workspace its own strategy—and every
              opportunity one complete record.
            </strong>
          </div>
        </section>

        <section className="rw-close" data-reveal>
          <div className="rw-close-copy">
            <h2>Stop managing your search from memory.</h2>
            <p>
              Bring the listing, people, interviews, documents, and next action
              into one record you can trust when the opportunity gets serious.
            </p>
            <div className="rw-close-actions">
              <Link href={primaryHref} className="rw-button rw-button-light">
                {primaryLabel}
                <ArrowRight aria-hidden="true" />
              </Link>
              <span>
                <Check aria-hidden="true" />
                AI when you want it. You stay in control.
              </span>
            </div>
          </div>
          <ol className="rw-close-flow" aria-label="From listing to next move">
            <li>
              <span>
                <small>Capture</small>
                <strong>Job saved</strong>
              </span>
              <ArrowRight aria-hidden="true" />
            </li>
            <li>
              <span>
                <small>Commit</small>
                <strong>Opportunity active</strong>
              </span>
              <ArrowRight aria-hidden="true" />
            </li>
            <li>
              <span>
                <small>Prepare</small>
                <strong>Interview ready</strong>
              </span>
              <ArrowRight aria-hidden="true" />
            </li>
            <li>
              <span>
                <small>Advance</small>
                <strong>Next move clear</strong>
              </span>
            </li>
          </ol>
        </section>
      </main>

      <footer className="rw-footer">
        <Link href="/" className="rw-brand">
          <LogoMark size={20} tile />
          <span>Roleway</span>
        </Link>
        <span className="rw-footer-copyright">
          © {new Date().getFullYear()}
        </span>
        <span className="rw-footer-tagline">
          A focused operating system for deliberate job searches.
        </span>
        <nav>
          <Link href="/privacy">Privacy</Link>
          {!auth ? <Link href="/login">Log in</Link> : null}
        </nav>
        <ThemePicker />
      </footer>
    </div>
  );
}
