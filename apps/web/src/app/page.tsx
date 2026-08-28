import { ArrowRight, BriefcaseBusiness, CalendarClock, CalendarDays, ChartNoAxesColumnIncreasing, Check, FileText, Inbox, LayoutDashboard, Navigation, PanelLeft, Plus, Search, ShieldCheck, Target } from "lucide-react";
import Link from "next/link";
import { LandingHighlights } from "@/components/landing-highlights";
import { LandingMotion } from "@/components/landing-motion";
import { LogoMark } from "@/components/logo";
import { ThemePicker } from "@/components/theme-picker";
import { requireUser } from "@/lib/supabase/server";
import "./landing.css";

export const metadata = {
  title: "Roleway — One workspace for every focused job search",
  description: "Separate career targets, review jobs, run applications, prepare interviews, and keep every next action in one focused system.",
};

export default async function HomePage() {
  const auth = await requireUser();
  const primaryHref = auth ? "/home" : "/signup";
  const primaryLabel = auth ? "Open Roleway" : "Create your workspace";

  return (
    <div className="rw-site">
      <LandingMotion />
      <header className="rw-nav">
        <Link href="/" className="rw-brand" aria-label="Roleway home"><LogoMark size={23} tile /><span>Roleway</span></Link>
        <nav aria-label="Product navigation"><a href="#workflow">Workflow</a><a href="#features">Product</a><a href="#assist">Agent</a></nav>
        <div className="rw-nav-actions">{!auth ? <Link href="/login" className="rw-login">Log in</Link> : null}<Link href={primaryHref} className="rw-button rw-button-small">{primaryLabel}<ArrowRight aria-hidden="true" /></Link></div>
      </header>

      <main id="main-content">
        <section className="rw-hero">
          <div className="rw-hero-heading" data-reveal>
            <h1>One workspace for every focused job search.</h1>
            <p className="rw-hero-subtitle">Separate your targets. Review promising roles, run applications, prepare interviews, and keep the next move clear.</p>
            <div className="rw-hero-actions"><Link href={primaryHref} className="rw-button">{primaryLabel}<ArrowRight aria-hidden="true" /></Link><a href="#workflow" className="rw-button rw-button-secondary">See how it works</a></div>
            <p className="rw-control-note"><Check aria-hidden="true" />Useful without AI. You own every external action.</p>
          </div>
          <div className="rw-hero-stage" data-reveal>
            <WorkspacePreview />
            <div className="rw-next-slip"><span>Next action</span><strong>Choose two project examples</strong><small>Due Friday · Northstar Systems</small><span className="rw-demo-button">Mark complete <Check aria-hidden="true" /></span></div>
          </div>
        </section>

        <LandingHighlights />

        <section className="rw-problem">
          <div className="rw-problem-copy" data-reveal><p>Job hunting creates fragments.</p><h2>A listing in one tab. Notes in another. A follow-up you meant to send six days ago.</h2></div>
          <div className="rw-fragments" data-reveal aria-label="Disconnected job-search context">
            <span>saved-job.pdf</span><span>resume-final-v4.docx</span><span>Follow up Friday</span><span>Interview notes</span><span>Who referred me?</span>
            <strong>Roleway gives every workspace its own strategy—and every opportunity one complete record.</strong>
          </div>
        </section>

        <section className="rw-story" id="workflow">
          <header className="rw-story-head" data-reveal><span>The complete loop</span><h2>From “worth a look” to a final decision.</h2><p>Each workspace keeps its own preferences and results. Each opportunity keeps the context from the last step.</p></header>

          <article className="rw-chapter rw-chapter-review" data-reveal>
            <div className="rw-chapter-copy"><span>Review</span><h3>Decide what deserves your time.</h3><p>Save a role without committing to it. Review the source, compensation, location, requirements, and your first reaction before it enters the pipeline.</p><ul><li><Check />Separate discovered jobs from tracked opportunities</li><li><Check />Keep the original listing and source</li><li><Check />Dismiss or defer without cluttering active work</li></ul></div>
            <InboxPipelinePreview />
          </article>

          <article className="rw-chapter rw-chapter-move" data-reveal>
            <div className="rw-chapter-copy"><span>Move</span><h3>Give every opportunity one clear next move.</h3><p>A stage says where the role stands. A next action says what you will do about it. Roleway keeps both visible beside the work they affect.</p><ul><li><Check />Seven-stage opportunity pipeline</li><li><Check />One concrete next action and due date</li><li><Check />Tasks, notes, contacts, and history together</li></ul></div>
            <OpportunityPreview />
          </article>

          <article className="rw-chapter rw-chapter-prepare" data-reveal>
            <div className="rw-chapter-copy"><span>Prepare</span><h3>Prepare with the whole story in view.</h3><p>Resumes, application notes, research, interview schedules, and preparation stay attached to the opportunity they belong to.</p><ul><li><Check />Documents retain their opportunity context</li><li><Check />Interview plans sit beside the role brief</li><li><Check />Preparation stays with each scheduled conversation</li></ul></div>
            <PreparationPreview />
          </article>

          <article className="rw-chapter rw-chapter-focus" data-reveal>
            <div className="rw-chapter-copy"><span>Focus</span><h3>Start the day with what needs attention.</h3><p>Home brings Workspace context, due tasks, interviews, follow-ups, and unreviewed jobs into one ordered queue—without turning a selective search into a volume contest.</p><ul><li><Check />Due work and follow-ups</li><li><Check />Upcoming interviews</li><li><Check />Jobs waiting for a decision</li></ul></div>
            <HomePreview />
          </article>
        </section>

        <section className="rw-product" id="features">
          <div className="rw-product-layout">
            <header data-reveal><span>Separate workspaces, connected work</span><h2>The tools are useful because the context stays attached.</h2><p>Run product engineering and consulting as different strategies, then keep every application artifact with the Opportunity it belongs to.</p></header>
            <ProductOverviewPreview />
          </div>
        </section>

        <section className="rw-assist" id="assist">
          <header className="rw-assist-copy" data-reveal><span>Roleway Agent</span><h2>Ask, prepare, then approve.</h2><p>Connect your provider to ask questions across the active Workspace. Agent prepares grounded answers and proposes internal work; you approve every change.</p></header>
          <div className="rw-assist-principles" data-reveal><div><ShieldCheck aria-hidden="true" /><span><strong>You start every run.</strong><small>Nothing is sent in the background.</small></span></div><div><Target aria-hidden="true" /><span><strong>You approve consequential changes.</strong><small>Drafts stay drafts until you use them.</small></span></div></div>
          <AgentPreview />
        </section>

        <section className="rw-close" data-reveal><div><span>Start with the workspace already on your mind.</span><h2>Give every serious role a clear next move.</h2><p>Create one focused workspace, add a listing, and build the record as the opportunity becomes more serious.</p></div><Link href={primaryHref} className="rw-button rw-button-light">{primaryLabel}<ArrowRight aria-hidden="true" /></Link></section>
      </main>

      <footer className="rw-footer"><Link href="/" className="rw-brand"><LogoMark size={20} tile /><span>Roleway</span></Link><span className="rw-footer-copyright">© {new Date().getFullYear()}</span><span className="rw-footer-tagline">A focused operating system for deliberate job searches.</span><nav><Link href="/privacy">Privacy</Link>{!auth ? <Link href="/login">Log in</Link> : null}</nav><ThemePicker /></footer>
    </div>
  );
}

function WorkspacePreview() {
  const navigation = [["Focus", [[LayoutDashboard, "Home"], [Target, "Opportunities"], [Inbox, "Inbox"]]], ["Prepare", [[CalendarClock, "Interviews"], [FileText, "Documents"], [Navigation, "Agent"]]], ["Review", [[ChartNoAxesColumnIncreasing, "Insights"]]]] as const;
  const columns = [["Interested", [["Northstar Systems", "Senior Product Engineer", "Review role evidence"], ["Fieldwork", "Product Engineer", "Compare compensation"]]], ["Preparing", [["Atlas Labs", "Frontend Engineer", "Tailor project examples"], ["Common Room", "Product Engineer", "Draft application notes"]]], ["Applied", [["Latticework", "Software Engineer", "Follow up Friday"]]], ["Interview", [["Northstar Systems", "Senior Product Engineer", "System design tomorrow"]]]] as const;
  return <div className="rw-app rw-app-pipeline" aria-label="Roleway opportunities workspace preview"><aside><div className="rw-app-brand"><LogoMark size={18} tile /><span><strong>Roleway</strong></span></div><div className="rw-app-project"><BriefcaseBusiness /><span><strong>Product engineering</strong><small>Workspace</small></span></div><div className="rw-app-search"><Search /><span>Search</span><kbd>⌘ K</kbd></div>{navigation.map(([label, items]) => <div className="rw-app-nav-section" key={label}><small>{label}</small><nav>{items.map(([Icon, item]) => <span className={item === "Opportunities" ? "active" : ""} key={item}><Icon />{item}</span>)}</nav></div>)}</aside><main><div className="rw-app-bar"><PanelLeft /><i /><span>Product engineering</span><b>/</b><strong>Opportunities</strong></div><header className="rw-hero-pipeline-head"><div><h2>Opportunities</h2><p>Move serious roles forward without losing the next action.</p></div><span className="rw-demo-button primary"><Plus />Add job</span></header><div className="rw-hero-pipeline-summary"><span><strong>6</strong> Active</span><span><strong>4</strong> In process</span><span><strong>1</strong> Needs action</span><p><CalendarClock />Keep one concrete next action on every active role.</p></div><div className="rw-hero-pipeline-toolbar"><span>7 stages</span><i /><span>Drag cards between stages</span></div><div className="rw-hero-pipeline-board">{columns.map(([stage, cards], columnIndex) => <section key={stage}><header><i /><strong>{stage}</strong><span>{cards.length}</span></header>{cards.map(([company, role, action]) => <article key={`${stage}-${company}`}><small>{company}</small><h3>{role}</h3><p>{action}</p><footer><span>PROD-0{14 + columnIndex}</span><span>Updated today</span></footer></article>)}</section>)}</div></main></div>;
}

function PreviewFrame({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return <div className={`rw-preview rw-preview-focused ${className}`} aria-label={`${title} feature preview`}>{children}</div>;
}

function InboxPipelinePreview() {
  const jobs = [["Northstar Systems", "Senior Product Engineer", "$165k–$190k · Remote — US", "Build dependable product workflows with TypeScript, React, and PostgreSQL."], ["Fieldwork", "Product Engineer", "$150k–$175k · New York / Remote", "Own product systems from discovery through delivery with a small engineering team."]];
  return <PreviewFrame title="Job inbox" className="rw-inbox-preview"><div className="rw-job-records">{jobs.map(([company, role, meta, description], index) => <article key={company}><div><small>{company} · {index ? "Referral" : "Company site"}</small><h4>{role}</h4><span>{meta}</span><p>{description}</p><footer><span className="rw-demo-button primary">Track opportunity</span><span className="rw-demo-button">Maybe</span><span className="rw-demo-button">Dismiss</span></footer></div><em>{index ? "Maybe" : "New"}</em></article>)}</div></PreviewFrame>;
}

function OpportunityPreview() {
  return <PreviewFrame title="Northstar Systems" className="rw-opportunity-preview"><div className="rw-opportunity-body"><section><h4>Senior Product Engineer</h4><p>Northstar Systems · Remote</p><nav><strong>Overview</strong><span>Tasks</span><span>Notes</span><span>Activity</span></nav><h5>Tasks</h5><label><i className="done" />Review platform requirements</label><label><i />Choose two project examples</label><label><i />Draft application notes</label></section><aside><span>Next action</span><strong>Choose two project examples</strong><small>Due Friday</small><span className="rw-demo-button primary">Save next action</span><footer>1 of 3 tasks complete</footer></aside></div></PreviewFrame>;
}

function PreparationPreview() {
  return <PreviewFrame title="Preparation" className="rw-preparation-preview"><div className="rw-prep-grid"><section><h5>Documents</h5>{[["Targeted resume", "Updated today"], ["Project examples", "2 selected"], ["Application notes", "Draft"]].map(([name, meta]) => <div key={name}><FileText /><span><strong>{name}</strong><small>{meta}</small></span><em>Open</em></div>)}</section><section><h5>Next interview</h5><article><CalendarDays /><span><strong>System design interview</strong><small>Tomorrow · 10:00 · 60 min</small></span></article><label><i className="done" />Confirm format</label><label><i className="done" />Review role brief</label><label><i />Prepare trade-offs</label><span className="rw-demo-button primary">Open preparation</span></section></div></PreviewFrame>;
}

function HomePreview() {
  const rows = [["10:00", "System design interview", "Northstar Systems · 60 minutes", "Prepare"], ["Today", "Send application follow-up", "Fieldwork · Applied 6 days ago", "Open"], ["Inbox", "Review two saved jobs", "Decide what enters the pipeline", "Review"]];
  return <PreviewFrame title="Home" className="rw-home-preview"><div className="rw-home-head"><span>Thursday, August 20</span><h4>Good morning, Jordan</h4><p>Three items need your attention.</p></div>{rows.map(([time, title, meta, action]) => <article key={title}><time>{time}</time><i /><div><strong>{title}</strong><span>{meta}</span></div><span className="rw-demo-button">{action}</span></article>)}</PreviewFrame>;
}

function ProductOverviewPreview() {
  const columns = [
    { name: "Review", count: 2, cards: [["Northstar Systems", "Senior Product Engineer", "Review role evidence"], ["Fieldwork", "Product Engineer", "Compare compensation"]] },
    { name: "Preparing", count: 2, cards: [["Atlas Labs", "Frontend Engineer", "Tailor project examples"], ["Common Room", "Product Engineer", "Draft application notes"]] },
    { name: "Applied", count: 1, cards: [["Latticework", "Software Engineer", "Follow up Friday"]] },
    { name: "Interviewing", count: 1, cards: [["Northstar Systems", "Senior Product Engineer", "System design tomorrow"]] },
  ];
  return <div className="rw-overview-preview rw-overview-focused" data-reveal aria-label="Connected opportunity pipeline preview"><div className="rw-pipeline-board" tabIndex={0} aria-label="Opportunity board preview">{columns.map((column) => <section key={column.name}><header><strong>{column.name}</strong><span>{column.count}</span></header>{column.cards.map(([company, role, action]) => <article key={`${company}-${role}`}><small>{company}</small><h4>{role}</h4><p><i />{action}</p><footer><span>Updated today</span><b>•••</b></footer></article>)}</section>)}</div></div>;
}

function AgentPreview() {
  return <div className="rw-assist-preview" data-reveal aria-label="Roleway Agent grounded answer preview"><header><span>Active Workspace</span><strong>Northstar Systems · Senior Product Engineer</strong><small>Career Profile, Opportunity, tasks, interviews, and notes selected</small></header><main><span>Grounded answer</span><h3>Prepare for the system design interview</h3><p>Start with two verified project stories, then connect each one to the architecture trade-offs in this role.</p><ol><li><b>Create preparation task</b><small>Review platform constraints and choose two examples by Friday.</small><span className="rw-demo-button">Approve change</span></li><li><b>Update Next Action</b><small>Prepare one clarifying question from the saved interview context.</small><span className="rw-demo-button">Approve change</span></li></ol></main><footer><ShieldCheck />Nothing changes until you approve it. No external action is available.</footer></div>;
}
