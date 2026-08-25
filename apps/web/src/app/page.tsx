import { ArrowRight, CalendarClock, CalendarDays, ChartNoAxesColumnIncreasing, Check, FileText, Inbox, LayoutDashboard, NotebookPen, PanelLeft, Plus, Search, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";
import { LandingHighlights } from "@/components/landing-highlights";
import { LandingMotion } from "@/components/landing-motion";
import { LogoMark } from "@/components/logo";
import { ThemePicker } from "@/components/theme-picker";
import { requireUser } from "@/lib/supabase/server";
import "./landing.css";

export const metadata = {
  title: "Roleway — Run your job search with a clear next move",
  description: "Review jobs, track serious opportunities, prepare strong applications, and keep every next action in one focused workspace.",
};

export default async function HomePage() {
  const auth = await requireUser();
  const primaryHref = auth ? "/today" : "/signup";
  const primaryLabel = auth ? "Open Roleway" : "Start your search";

  return (
    <div className="rw-site">
      <LandingMotion />
      <header className="rw-nav">
        <Link href="/" className="rw-brand" aria-label="Roleway home"><LogoMark size={23} tile /><span>Roleway</span></Link>
        <nav aria-label="Product navigation"><a href="#workflow">Workflow</a><a href="#features">Product</a><a href="#assist">Assist</a></nav>
        <div className="rw-nav-actions">{!auth ? <Link href="/login" className="rw-login">Log in</Link> : null}<Link href={primaryHref} className="rw-button rw-button-small">{primaryLabel}<ArrowRight aria-hidden="true" /></Link></div>
      </header>

      <main id="main-content">
        <section className="rw-hero">
          <div className="rw-hero-heading" data-reveal>
            <h1>The job search system for serious opportunities.</h1>
            <p className="rw-hero-subtitle">Review promising roles, run every application, prepare interviews, and keep the next move clear.</p>
            <div className="rw-hero-actions"><Link href={primaryHref} className="rw-button">{primaryLabel}<ArrowRight aria-hidden="true" /></Link><a href="#workflow" className="rw-button rw-button-secondary">See how it works</a></div>
            <p className="rw-control-note"><Check aria-hidden="true" />Useful without AI. You own every external action.</p>
          </div>
          <div className="rw-hero-stage" data-reveal>
            <WorkspacePreview />
            <div className="rw-next-slip"><span>Next action</span><strong>Choose two project examples</strong><small>Due Friday · Northstar Systems</small><button type="button" tabIndex={-1}>Mark complete <Check aria-hidden="true" /></button></div>
          </div>
        </section>

        <LandingHighlights />

        <section className="rw-problem">
          <div className="rw-problem-copy" data-reveal><p>Job hunting creates fragments.</p><h2>A listing in one tab. Notes in another. A follow-up you meant to send six days ago.</h2></div>
          <div className="rw-fragments" data-reveal aria-label="Disconnected job-search context">
            <span>saved-job.pdf</span><span>resume-final-v4.docx</span><span>Follow up Friday</span><span>Interview notes</span><span>Who referred me?</span>
            <strong>Roleway turns the fragments into one opportunity record.</strong>
          </div>
        </section>

        <section className="rw-story" id="workflow">
          <header className="rw-story-head" data-reveal><span>The complete loop</span><h2>From “worth a look” to a final decision.</h2><p>Each chapter keeps the context from the last one. Nothing important has to be reconstructed.</p></header>

          <article className="rw-chapter rw-chapter-review" data-reveal>
            <div className="rw-chapter-copy"><span>Review</span><h3>Decide what deserves your time.</h3><p>Save a role without committing to it. Review the source, compensation, location, requirements, and your first reaction before it enters the pipeline.</p><ul><li><Check />Separate discovered jobs from tracked opportunities</li><li><Check />Keep the original listing and source</li><li><Check />Dismiss or defer without cluttering active work</li></ul></div>
            <InboxPipelinePreview />
          </article>

          <article className="rw-chapter rw-chapter-move" data-reveal>
            <div className="rw-chapter-copy"><span>Move</span><h3>Give every opportunity one clear next move.</h3><p>A stage says where the role stands. A next action says what you will do about it. Roleway keeps both visible beside the work they affect.</p><ul><li><Check />Seven-stage opportunity pipeline</li><li><Check />One concrete next action and due date</li><li><Check />Tasks, notes, contacts, and history together</li></ul></div>
            <OpportunityPreview />
          </article>

          <article className="rw-chapter rw-chapter-prepare" data-reveal>
            <div className="rw-chapter-copy"><span>Prepare</span><h3>Prepare with the whole story in view.</h3><p>Resumes, application notes, research, interview schedules, and preparation stay attached to the opportunity they belong to.</p><ul><li><Check />Documents retain their opportunity context</li><li><Check />Interview plans sit beside the role brief</li><li><Check />Preparation builds on saved evidence</li></ul></div>
            <PreparationPreview />
          </article>

          <article className="rw-chapter rw-chapter-focus" data-reveal>
            <div className="rw-chapter-copy"><span>Focus</span><h3>Start the day with what needs attention.</h3><p>Today brings due tasks, interviews, follow-ups, and unreviewed jobs into one ordered queue—without turning a selective search into a volume contest.</p><ul><li><Check />Due work and follow-ups</li><li><Check />Upcoming interviews</li><li><Check />Jobs waiting for a decision</li></ul></div>
            <TodayPreview />
          </article>
        </section>

        <section className="rw-product" id="features">
          <div className="rw-product-layout">
            <header data-reveal><span>One connected workspace</span><h2>The tools are useful because the context stays attached.</h2><p>Roleway covers the operational work of a serious search without becoming an auto-apply bot, a generic CRM, or an AI chat wrapper.</p></header>
            <ProductOverviewPreview />
          </div>
        </section>

        <section className="rw-assist" id="assist">
          <header className="rw-assist-copy" data-reveal><span>Optional Assist</span><h2>Preparation, not autopilot.</h2><p>Connect a supported provider when you want grounded help. Roleway prepares a reviewable draft from the context you choose. It never applies, contacts employers, or moves work forward without you.</p></header>
          <div className="rw-assist-principles" data-reveal><div><ShieldCheck aria-hidden="true" /><span><strong>You start every run.</strong><small>Nothing is sent in the background.</small></span></div><div><Target aria-hidden="true" /><span><strong>You approve consequential changes.</strong><small>Drafts stay drafts until you use them.</small></span></div></div>
          <AssistPreview />
        </section>

        <section className="rw-close" data-reveal><div><span>Bring the opportunity already on your mind.</span><h2>Give it one clear next move.</h2><p>Start with a listing. Build the record as the opportunity becomes more serious.</p></div><Link href={primaryHref} className="rw-button rw-button-light">{primaryLabel}<ArrowRight aria-hidden="true" /></Link></section>
      </main>

      <footer className="rw-footer"><Link href="/" className="rw-brand"><LogoMark size={20} tile /><span>Roleway</span></Link><span className="rw-footer-copyright">© {new Date().getFullYear()}</span><span className="rw-footer-tagline">A focused workspace for a selective job search.</span><nav><Link href="/privacy">Privacy</Link>{!auth ? <Link href="/login">Log in</Link> : null}</nav><ThemePicker /></footer>
    </div>
  );
}

function WorkspacePreview() {
  const navigation = [["Workspace", [[LayoutDashboard, "Today"], [Target, "Pipeline"], [Inbox, "Job inbox"]]], ["Tools", [[CalendarClock, "Interviews"], [FileText, "Documents"], [NotebookPen, "Assist"], [ChartNoAxesColumnIncreasing, "Insights"]]]] as const;
  const columns = [["Interested", [["Northstar Systems", "Senior Product Engineer", "Review role evidence"], ["Fieldwork", "Product Engineer", "Compare compensation"]]], ["Preparing", [["Atlas Labs", "Frontend Engineer", "Tailor project examples"], ["Common Room", "Product Engineer", "Draft application notes"]]], ["Applied", [["Latticework", "Software Engineer", "Follow up Friday"]]], ["Interview", [["Northstar Systems", "Senior Product Engineer", "System design tomorrow"]]]] as const;
  return <div className="rw-app rw-app-pipeline" aria-label="Roleway pipeline workspace preview"><aside><div className="rw-app-brand"><LogoMark size={18} tile /><span><strong>Roleway</strong><small>Personal workspace</small></span></div><div className="rw-app-search"><Search /><span>Search</span><kbd>⌘ K</kbd></div>{navigation.map(([label, items]) => <div className="rw-app-nav-section" key={label}><small>{label}</small><nav>{items.map(([Icon, item]) => <span className={item === "Pipeline" ? "active" : ""} key={item}><Icon />{item}</span>)}</nav></div>)}</aside><main><div className="rw-app-bar"><PanelLeft /><i /><span>Workspace</span><b>/</b><strong>Pipeline</strong></div><header className="rw-hero-pipeline-head"><div><h2>Pipeline</h2><p>Move serious roles forward without losing the next action.</p></div><button><Plus />Add job</button></header><div className="rw-hero-pipeline-summary"><span><strong>6</strong> Active</span><span><strong>4</strong> In process</span><span><strong>1</strong> Needs action</span><p><CalendarClock />Keep one concrete next action on every active role.</p></div><div className="rw-hero-pipeline-toolbar"><span>7 stages</span><i /><span>Drag cards between stages</span></div><div className="rw-hero-pipeline-board">{columns.map(([stage, cards], columnIndex) => <section key={stage}><header><i /><strong>{stage}</strong><span>{cards.length}</span></header>{cards.map(([company, role, action]) => <article key={`${stage}-${company}`}><small>{company}</small><h3>{role}</h3><p>{action}</p><footer><span>RLW-0{14 + columnIndex}</span><span>Updated today</span></footer></article>)}</section>)}</div></main></div>;
}

function PreviewFrame({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <div className={`rw-preview rw-preview-focused ${className}`} aria-label={`${title} feature preview`}>{children}</div>;
}

function InboxPipelinePreview() {
  const jobs = [["Northstar Systems", "Senior Product Engineer", "$165k–$190k · Remote — US", "Build dependable product workflows with TypeScript, React, and PostgreSQL."], ["Fieldwork", "Product Engineer", "$150k–$175k · New York / Remote", "Own product systems from discovery through delivery with a small engineering team."]];
  return <PreviewFrame title="Job inbox" className="rw-inbox-preview"><div className="rw-job-records">{jobs.map(([company, role, meta, description], index) => <article key={company}><div><small>{company} · {index ? "Referral" : "Company site"}</small><h4>{role}</h4><span>{meta}</span><p>{description}</p><footer><button>Track opportunity</button><button>Maybe</button><button>Dismiss</button></footer></div><em>{index ? "Maybe" : "New"}</em></article>)}</div></PreviewFrame>;
}

function OpportunityPreview() {
  return <PreviewFrame title="Northstar Systems" className="rw-opportunity-preview"><div className="rw-opportunity-body"><section><h4>Senior Product Engineer</h4><p>Northstar Systems · Remote</p><nav><strong>Overview</strong><span>Tasks</span><span>Notes</span><span>Activity</span></nav><h5>Tasks</h5><label><i className="done" />Review platform requirements</label><label><i />Choose two project examples</label><label><i />Draft application notes</label></section><aside><span>Next action</span><strong>Choose two project examples</strong><small>Due Friday</small><button>Save next action</button><footer>1 of 3 tasks complete</footer></aside></div></PreviewFrame>;
}

function PreparationPreview() {
  return <PreviewFrame title="Preparation" className="rw-preparation-preview"><div className="rw-prep-grid"><section><h5>Documents</h5>{[["Targeted resume", "Updated today"], ["Project examples", "2 selected"], ["Application notes", "Draft"]].map(([name, meta]) => <div key={name}><FileText /><span><strong>{name}</strong><small>{meta}</small></span><em>Open</em></div>)}</section><section><h5>Next interview</h5><article><CalendarDays /><span><strong>System design interview</strong><small>Tomorrow · 10:00 · 60 min</small></span></article><label><i className="done" />Confirm format</label><label><i className="done" />Review role brief</label><label><i />Prepare trade-offs</label><button>Open preparation</button></section></div></PreviewFrame>;
}

function TodayPreview() {
  const rows = [["10:00", "System design interview", "Northstar Systems · 60 minutes", "Prepare"], ["Today", "Send application follow-up", "Fieldwork · Applied 6 days ago", "Open"], ["Inbox", "Review two saved jobs", "Decide what enters the pipeline", "Review"]];
  return <PreviewFrame title="Today" className="rw-today-preview"><div className="rw-today-head"><span>Thursday, August 20</span><h4>Good morning, Jordan</h4><p>Three items need your attention.</p></div>{rows.map(([time, title, meta, action]) => <article key={title}><time>{time}</time><i /><div><strong>{title}</strong><span>{meta}</span></div><button>{action}</button></article>)}</PreviewFrame>;
}

function ProductOverviewPreview() {
  const columns = [
    { name: "Review", count: 2, cards: [["Northstar Systems", "Senior Product Engineer", "Review role evidence"], ["Fieldwork", "Product Engineer", "Compare compensation"]] },
    { name: "Preparing", count: 2, cards: [["Atlas Labs", "Frontend Engineer", "Tailor project examples"], ["Common Room", "Product Engineer", "Draft application notes"]] },
    { name: "Applied", count: 1, cards: [["Latticework", "Software Engineer", "Follow up Friday"]] },
    { name: "Interviewing", count: 1, cards: [["Northstar Systems", "Senior Product Engineer", "System design tomorrow"]] },
  ];
  return <div className="rw-overview-preview rw-overview-focused" data-reveal aria-label="Connected opportunity pipeline preview"><div className="rw-pipeline-board">{columns.map((column) => <section key={column.name}><header><strong>{column.name}</strong><span>{column.count}</span></header>{column.cards.map(([company, role, action]) => <article key={`${company}-${role}`}><small>{company}</small><h4>{role}</h4><p><i />{action}</p><footer><span>Updated today</span><b>•••</b></footer></article>)}</section>)}</div></div>;
}

function AssistPreview() {
  return <div className="rw-assist-preview" data-reveal aria-hidden="true"><header><span>Opportunity context</span><strong>Northstar Systems · Senior Product Engineer</strong><small>Listing, profile, tasks, notes, and saved evidence selected</small></header><main><span>Reviewable draft</span><h3>Prepare for the system design interview</h3><p>Focus on evidence already attached to this opportunity. Review every suggestion before using it.</p><ol><li><b>Choose two architecture trade-offs</b><small>Connect each choice to a saved project example.</small><button>Use as next action</button></li><li><b>Prepare one clarifying question</b><small>Use the saved workforce-planning research as context.</small><button>Use as next action</button></li></ol></main><footer><ShieldCheck />Nothing is sent until you run Assist. No external action is taken.</footer></div>;
}
