import { ArrowRight, Check, FileText, Search } from "lucide-react";
import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { MarketingReveals } from "@/components/marketing-reveals";
import { requireUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Roleway — Track your job search",
  description: "Track opportunities, next actions, interviews, and application work in one private workspace.",
};

export default async function HomePage() {
  const auth = await requireUser();
  const primaryHref = auth ? "/today" : "/login";
  const primaryLabel = auth ? "Open Roleway" : "Get started";

  return (
    <div className="site-page">
      <MarketingReveals />
      <header className="site-header">
        <Link href="/" className="site-brand" aria-label="Roleway home"><LogoMark size={23} /><span>Roleway</span></Link>
        <nav aria-label="Product navigation"><a href="#story">How it works</a><a href="#workspace">Workspace</a><a href="#features">Features</a><a href="#principles">Why Roleway</a></nav>
        <div className="site-auth">{!auth ? <Link href="/login">Log in</Link> : null}<Link href={primaryHref} className="button primary">{primaryLabel}</Link></div>
      </header>

      <main id="main-content">
        <section className="site-hero" data-reveal>
          <div className="site-hero-copy">
            <h1>Keep every application moving.</h1>
            <p className="site-lede">Track jobs, tasks, interviews, notes, and follow-ups in one place. Open Roleway and see what needs your attention next.</p>
            <div className="site-hero-actions"><Link href={primaryHref} className="button primary site-cta">{primaryLabel}<ArrowRight aria-hidden="true" /></Link><a href="#story" className="site-text-link">See how it works <span aria-hidden="true">↓</span></a></div>
            <p className="site-proof"><Check aria-hidden="true" />Free to start. No credit card. Your data stays private.</p>
          </div>
          <PipelinePreview />
        </section>

        <section className="site-ledger" aria-label="A sample day in Roleway" data-reveal>
          <div className="site-ledger-label"><span>Thursday</span><strong>Your day</strong></div>
          <div className="site-ledger-row"><time>10:00</time><span className="ledger-state urgent">Interview</span><strong>System design · Northstar Systems</strong><span>Prepare</span></div>
          <div className="site-ledger-row"><time>Today</time><span className="ledger-state">Follow-up</span><strong>Product Engineer · Fieldwork</strong><span>6 days since application</span></div>
          <div className="site-ledger-row"><time>Friday</time><span className="ledger-state">Application</span><strong>Staff Engineer · Meridian</strong><span>Review requirements</span></div>
        </section>

        <section className="site-story" id="story">
          <header className="story-opening" data-reveal>
            <h2>From saved job to final decision.</h2>
            <div><p>Roleway keeps the details and the work together as a job moves from first review to interviews and follow-ups.</p></div>
          </header>

          <div className="story-line" aria-hidden="true" />
          <article className="story-chapter" data-reveal>
            <div className="story-copy"><h3>Save a job before you commit to it.</h3><p>Keep the listing, pay range, location, and description in your inbox. Review the job before you decide to pursue it.</p><ul><li>Keep the original listing</li><li>Compare it with your preferences</li><li>Track it, save it for later, or dismiss it</li></ul></div>
            <InboxScene />
          </article>

          <article className="story-chapter reverse" data-reveal>
            <div className="story-copy"><h3>Move serious roles into your pipeline.</h3><p>Choose a stage, add the next step, and set a due date. You can see where every application stands and what to do next.</p><ul><li>Seven clear stages</li><li>Due dates and overdue tasks</li><li>Move applications without dragging cards</li></ul></div>
            <PipelineScene />
          </article>

          <article className="story-chapter" data-reveal>
            <div className="story-copy"><h3>See what needs attention today.</h3><p>Tasks, follow-ups, jobs to review, and upcoming interviews appear in one list. Start with the first item and work down.</p><ul><li>See all due work in one place</li><li>Prepare for interviews on time</li><li>Know when nothing is urgent</li></ul></div>
            <TodayScene />
          </article>

          <article className="story-chapter reverse" data-reveal>
            <div className="story-copy"><h3>Keep interview prep with the job.</h3><p>Store the schedule, notes, documents, and preparation tasks with the application. If you use Assist, it only creates a draft when you ask.</p><ul><li>Keep the interview schedule and prep together</li><li>Attach resumes, answers, and notes</li><li>Review every draft before using it</li></ul></div>
            <PreparationScene />
          </article>
        </section>

        <section className="site-workspace-section" id="workspace">
          <div className="site-section-heading" data-reveal><h2>Everything about a job stays together.</h2><p>Open an application weeks later and find the listing, tasks, notes, interviews, documents, and history in the same place.</p></div>
          <div data-reveal><OpportunityRecord /></div>
        </section>

        <section className="feature-directory" id="features">
          <div className="feature-directory-heading" data-reveal><div><h2>Everything you need to manage your job search.</h2></div><p>Each feature supports a specific part of the process, while every application keeps one complete record.</p></div>
          <div className="feature-directory-list" data-reveal>
            <Feature number="01" name="Today" copy="See tasks, interviews, follow-ups, and jobs waiting for review." />
            <Feature number="02" name="Job inbox" copy="Save and review a listing before adding it to your pipeline." />
            <Feature number="03" name="Pipeline" copy="Track each application by stage, next step, and due date." />
            <Feature number="04" name="Application workspace" copy="Keep job details, tasks, notes, interviews, documents, and history together." />
            <Feature number="05" name="Documents" copy="Write and store resumes, cover letters, application answers, and notes." />
            <Feature number="06" name="Interviews" copy="Keep every interview and its preparation with the right application." />
            <Feature number="07" name="Insights" copy="See useful conversion rates once you have enough activity to measure." />
            <Feature number="08" name="Assist" copy="Ask your chosen AI provider for a draft. Nothing changes until you approve it." />
          </div>
        </section>

        <section className="site-principles" id="principles" data-reveal>
          <div className="principles-statement"><h2>Built to help you make better decisions.</h2></div>
          <div className="principles-list">
            <article><h3>Always know the next step</h3><p>Every active application can have one clear action and due date.</p></article>
            <article><h3>Keep the details</h3><p>The listing, requirements, notes, and your work stay easy to find.</p></article>
            <article><h3>Use AI only when you want it</h3><p>Roleway works without AI. If you connect a provider, it only runs when you ask.</p></article>
            <article><h3>Nothing happens without you</h3><p>Roleway never submits an application or contacts an employer for you.</p></article>
          </div>
        </section>

        <section className="site-final" data-reveal>
          <div><p>Start with one job.</p><h2>Keep your search moving.</h2></div>
          <Link href={primaryHref} className="button primary site-cta">{primaryLabel}<ArrowRight aria-hidden="true" /></Link>
        </section>
      </main>

      <footer className="site-footer"><Link href="/" className="site-brand"><LogoMark size={20} /><span>Roleway</span></Link><span>Job search workspace</span><nav><Link href="/login">Log in</Link><Link href="/privacy">Privacy</Link></nav><span>© {new Date().getFullYear()}</span></footer>
    </div>
  );
}

function Feature({ number, name, copy }: { number: string; name: string; copy: string }) {
  return <article><span className="mono">{number}</span><h3>{name}</h3><p>{copy}</p></article>;
}

function PipelinePreview() {
  const columns = [
    { label: "Inbox", count: 1, cards: [{ company: "Atlas", role: "Founding Product Engineer", action: "Review role brief", due: "Today" }] },
    { label: "Interested", count: 2, cards: [{ company: "Northstar", role: "Senior Product Engineer", action: "Review team brief", due: "Today" }, { company: "Fieldwork", role: "Product Engineer", action: "Compare requirements", due: "Fri" }] },
    { label: "Preparing", count: 1, cards: [{ company: "Meridian", role: "Staff Engineer", action: "Choose project examples", due: "Thu" }] },
    { label: "Interview", count: 1, cards: [{ company: "Northstar", role: "Platform Engineer", action: "System design interview", due: "10:00" }] },
  ];
  return <div className="hero-app" aria-label="Interactive Roleway application preview">
    <aside className="hero-app-sidebar">
      <div className="hero-app-brand"><LogoMark size={19} /><strong>Roleway</strong></div>
      <div className="hero-app-search"><Search aria-hidden="true" /><span>Search</span><kbd>⌘ K</kbd></div>
      <div className="hero-app-nav-label">Workspace</div>
      <nav aria-label="Preview navigation"><span><i className="nav-symbol grid" />Today</span><span className="active"><i className="nav-symbol target" />Pipeline</span><span><i className="nav-symbol inbox" />Job inbox</span></nav>
      <div className="hero-app-nav-label">Tools</div>
      <nav aria-label="Preview tools"><span><i className="nav-symbol calendar" />Interviews</span><span><i className="nav-symbol document" />Documents</span><span><i className="nav-symbol assist" />Assist</span><span><i className="nav-symbol insight" />Insights</span></nav>
      <div className="hero-app-sidebar-spacer" />
      <div className="hero-app-profile"><span>JL</span><div><strong>Jordan Lee</strong><small>jordan@example.com</small></div></div>
    </aside>
    <div className="hero-app-main">
      <header className="hero-app-heading"><div><h2>Pipeline</h2><p>See where every application stands and what to do next.</p></div><button>+ Add job</button></header>
      <div className="hero-app-summary"><span><b>5</b> Active</span><span><b>3</b> In process</span><span><b>1</b> Needs action</span><p>One interview this week</p></div>
      <div className="hero-app-toolbar"><span>7 stages</span><i /><span>Updated just now</span></div>
      <div className="hero-app-board">{columns.map((column) => <section key={column.label}><header><strong>{column.label}</strong><span>{column.count}</span></header>{column.cards.map((card) => <article key={`${card.company}-${card.role}`}><small>{card.company}</small><h3>{card.role}</h3><p><i />{card.action}</p><footer><span>RLW-{card.company.length + card.role.length}</span><time>{card.due}</time></footer></article>)}</section>)}</div>
    </div>
  </div>;
}

function SceneFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="story-scene"><header><span><LogoMark size={16} />Roleway</span><b>{title}</b><kbd>⌘ K</kbd></header>{children}</div>;
}

function InboxScene() {
  return <SceneFrame title="Job inbox"><div className="scene-toolbar"><span>2 jobs to review</span><button>+ Add job</button></div><div className="scene-job selected"><div><small>Northstar Systems · Company site</small><h4>Senior Product Engineer</h4><p>Remote · $165k–$190k · TypeScript, React, PostgreSQL</p></div><span>New</span></div><div className="scene-job-actions"><button>Add to pipeline</button><button>Maybe</button><button>Dismiss</button></div><div className="scene-job"><div><small>Fieldwork · Referral</small><h4>Product Engineer</h4><p>New York / Remote · $150k–$175k</p></div><span>Maybe</span></div></SceneFrame>;
}

function PipelineScene() {
  return <SceneFrame title="Pipeline"><div className="scene-pipeline">{["Interested", "Preparing", "Applied"].map((stage, index) => <section key={stage}><header><span>{stage}</span><b>{index === 0 ? 2 : 1}</b></header>{index === 0 ? <><MiniCard company="Northstar" role="Senior Product Engineer" action="Review requirements" /><MiniCard company="Fieldwork" role="Product Engineer" action="Confirm compensation" /></> : index === 1 ? <MiniCard company="Meridian" role="Staff Engineer" action="Choose project examples" /> : <MiniCard company="Arcway" role="Platform Engineer" action="Follow up Friday" />}</section>)}</div></SceneFrame>;
}

function MiniCard({ company, role, action }: { company: string; role: string; action: string }) {
  return <article><small>{company}</small><h4>{role}</h4><p><i />{action}</p></article>;
}

function TodayScene() {
  return <SceneFrame title="Today"><div className="scene-today-head"><span>Thursday, August 20</span><h4>Good morning, Jordan</h4><p>Three items can move your search forward.</p></div><div className="scene-focus"><time>10:00</time><i /><div><strong>System design interview</strong><span>Northstar Systems · 60 minutes</span></div><button>Open prep</button></div><div className="scene-focus"><time>Today</time><i /><div><strong>Send application follow-up</strong><span>Fieldwork · Applied 6 days ago</span></div><button>Prepare</button></div><div className="scene-focus"><time>Inbox</time><i /><div><strong>Review two jobs</strong><span>Decide what enters the pipeline</span></div><button>Review</button></div></SceneFrame>;
}

function PreparationScene() {
  return <SceneFrame title="Interview preparation"><div className="scene-prep-head"><div><span>Northstar Systems</span><h4>System design interview</h4><p>Tomorrow · 10:00 · 60 minutes</p></div><button>Open application</button></div><div className="scene-prep-grid"><main><span>Preparation plan</span><label><i />Prepare two architecture trade-offs</label><label><i />Review workforce planning domain</label><label className="done"><i />Confirm interview format</label></main><aside><span>Documents</span><div><FileText aria-hidden="true" /><p><strong>System design notes</strong><small>Updated today</small></p></div><div><FileText aria-hidden="true" /><p><strong>Project examples</strong><small>4 examples selected</small></p></div><button>Prepare with Assist</button></aside></div></SceneFrame>;
}

function OpportunityRecord() {
  return <div className="record-preview" aria-label="An example application record"><header><div><span className="mono">RLW-014 · INTERVIEW</span><h3>Senior Product Engineer</h3><p>Northstar Systems · Remote · $165k–$190k</p></div><span className="record-owner">JL</span></header><nav><strong>Overview</strong><span>Tasks</span><span>Notes</span><span>Interviews</span><span>Activity</span></nav><div className="record-body"><main><div className="record-block"><span>Role brief</span><p>Lead product engineering for a workforce planning platform. Own delivery across TypeScript, React, and PostgreSQL.</p></div><div className="record-table"><div><span>Application</span><strong>Submitted August 12</strong></div><div><span>Hiring contact</span><strong>Maya Chen · Engineering Director</strong></div><div><span>Source</span><strong>Company careers page</strong></div></div><div className="record-tasks"><span>Open tasks</span><label><i />Prepare two architecture trade-offs</label><label><i />Review workforce planning domain</label><label className="done"><i />Confirm interview schedule</label></div></main><aside><span>Next action</span><h4>Prepare system design examples</h4><p>Due today · Interview tomorrow at 10:00</p><button>Open preparation <ArrowRight aria-hidden="true" /></button><dl><div><dt>Stage</dt><dd>Interview</dd></div><div><dt>Days active</dt><dd>12</dd></div><div><dt>Open tasks</dt><dd>2</dd></div></dl></aside></div></div>;
}
