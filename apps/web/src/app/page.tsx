import { ArrowRight, Check, FileText, Search } from "lucide-react";
import Link from "next/link";
import { LandingFeatureExplorer } from "@/components/landing-feature-explorer";
import { LogoMark } from "@/components/logo";
import { requireUser } from "@/lib/supabase/server";

export const metadata = {
  title: "Roleway — The workspace for a selective job search",
  description: "Review jobs, track serious opportunities, prepare applications, and keep every next action in one place.",
};

export default async function HomePage() {
  const auth = await requireUser();
  const primaryHref = auth ? "/today" : "/login";
  const primaryLabel = auth ? "Open Roleway" : "Get started";

  return (
    <div className="landing-v2">
      <header className="landing-nav">
        <Link href="/" className="landing-brand" aria-label="Roleway home"><LogoMark size={22} /><span>Roleway</span></Link>
        <nav aria-label="Product navigation"><a href="#product">Product</a><a href="#workflow">Workflow</a><a href="#features">Features</a></nav>
        <div className="landing-auth">{!auth ? <Link href="/login">Log in</Link> : null}<Link href={primaryHref} className="landing-primary landing-primary--compact">{primaryLabel}<ArrowRight aria-hidden="true" /></Link></div>
      </header>

      <main id="main-content">
        <section className="landing-hero">
          <div className="landing-hero-copy landing-hero-copy--centered">
            <h1>Give every serious opportunity a clear next move.</h1>
            <p>Roleway is a focused workspace for reviewing jobs, preparing strong applications, remembering follow-ups, and carrying complete context into every interview.</p>
            <div className="landing-hero-actions"><Link href={primaryHref} className="landing-primary">{primaryLabel}<ArrowRight aria-hidden="true" /></Link><a href="#product">Explore the product</a></div>
            <p className="landing-note"><Check aria-hidden="true" />Core tracking works without AI. You own every external action.</p>
          </div>
          <div className="landing-product-stage">
            <div className="landing-product-stage-head"><span>Your active search</span><p><i />One next action needs attention</p></div>
            <PipelinePreview />
            <div className="landing-journey" aria-label="Opportunity workflow">
              {['Save a job', 'Review it', 'Prepare', 'Apply', 'Interview', 'Decide'].map((step, index) => <span key={step} className={index < 4 ? 'complete' : ''}><i />{step}</span>)}
            </div>
          </div>
        </section>

        <section className="landing-thesis">
          <p>A job listing is only the beginning.</p>
          <h2>The tasks, notes, documents, follow-ups, and interviews stay with the opportunity that gives them meaning.</h2>
          <div className="landing-principles"><article><strong>Decide before you commit</strong><span>Jobs wait in an inbox until you choose what deserves a place in the pipeline.</span></article><article><strong>Always know what comes next</strong><span>Every active opportunity can carry one concrete action and due date.</span></article><article><strong>Prepare, then approve</strong><span>Optional Assist creates reviewable drafts. It never applies or contacts anyone for you.</span></article></div>
        </section>

        <section className="landing-product-section" id="product">
          <header><div><h2>See the whole search at work.</h2><p>Choose a feature to explore a real Roleway working view.</p></div><span>Eight connected workspaces. One opportunity record.</span></header>
          <LandingFeatureExplorer />
        </section>

        <section className="landing-workflow" id="workflow">
          <header><h2>A deliberate path from discovery to decision.</h2><p>Roleway separates “I found this” from “I am pursuing this,” then keeps the work connected through the rest of the search.</p></header>
          <article className="landing-chapter"><div className="landing-chapter-copy"><h3>Review the role before it enters your pipeline.</h3><p>Capture the source listing, compensation, location, requirements, and your first reaction. Track it only when it is worth pursuing.</p><span>Job inbox → Opportunity</span></div><InboxScene /></article>
          <article className="landing-chapter reverse"><div className="landing-chapter-copy"><h3>Keep the complete application in one workspace.</h3><p>The listing, next action, tasks, notes, documents, interview schedule, preparation, and activity history remain easy to find.</p><span>One role → One durable record</span></div><OpportunityScene /></article>
          <article className="landing-chapter"><div className="landing-chapter-copy"><h3>Start each day with what actually needs attention.</h3><p>Today brings due work, follow-ups, interviews, and jobs awaiting review into one calm, ordered queue.</p><span>Due work → A clear next move</span></div><TodayScene /></article>
        </section>

        <section className="landing-features" id="features">
          <header><h2>Everything the search produces, kept in context.</h2><p>Roleway remains useful with AI disabled. Assist is an optional extension of the workflow—not the product itself.</p></header>
          <div className="landing-feature-list">
            <Feature name="Today" copy="Due tasks, follow-ups, interviews, and jobs waiting for review." />
            <Feature name="Job inbox" copy="Save listings and evaluate them before tracking an opportunity." />
            <Feature name="Pipeline" copy="Seven stages, with a next action and due date on active work." />
            <Feature name="Opportunity workspace" copy="Role details, tasks, notes, documents, interviews, and history." />
            <Feature name="Documents" copy="Resumes, cover letters, application answers, and research notes." />
            <Feature name="Interviews" copy="Schedules and preparation attached to the right opportunity." />
            <Feature name="Insights" copy="Stage movement and conversion based on activity you record." />
            <Feature name="Assist" copy="Grounded drafts from your provider, reviewed and approved by you." />
          </div>
        </section>

        <section className="landing-final"><div><span>Start with the opportunity already on your mind.</span><h2>Give it a next move.</h2></div><Link href={primaryHref} className="landing-primary">{primaryLabel}<ArrowRight aria-hidden="true" /></Link></section>
      </main>

      <footer className="landing-footer"><Link href="/" className="landing-brand"><LogoMark size={19} /><span>Roleway</span></Link><span>A focused job search workspace</span><nav><Link href="/login">Log in</Link><Link href="/privacy">Privacy</Link></nav><span>© {new Date().getFullYear()}</span></footer>
    </div>
  );
}

function Feature({ name, copy }: { name: string; copy: string }) {
  return <article><h3>{name}</h3><p>{copy}</p><ArrowRight aria-hidden="true" /></article>;
}

function PipelinePreview() {
  const columns = [
    { label: "Interested", cards: [{ company: "Northstar", role: "Senior Product Engineer", action: "Review requirements", due: "Today" }, { company: "Fieldwork", role: "Product Engineer", action: "Confirm compensation", due: "Fri" }] },
    { label: "Preparing", cards: [{ company: "Meridian", role: "Staff Engineer", action: "Choose project examples", due: "Thu" }] },
    { label: "Applied", cards: [{ company: "Arcway", role: "Platform Engineer", action: "Follow up", due: "Friday" }] },
    { label: "Interview", cards: [{ company: "Northstar", role: "Product Lead", action: "Prepare role stories", due: "Tomorrow" }] },
  ];
  return <div className="hero-app landing-app-preview" aria-label="Roleway pipeline preview"><aside className="hero-app-sidebar"><div className="hero-app-brand"><LogoMark size={19} /><strong>Roleway</strong></div><div className="hero-app-search"><Search aria-hidden="true" /><span>Search</span><kbd>⌘ K</kbd></div><div className="hero-app-nav-label">Workspace</div><nav aria-label="Preview navigation"><span><i className="nav-symbol grid" />Today</span><span className="active"><i className="nav-symbol target" />Pipeline</span><span><i className="nav-symbol inbox" />Job inbox</span></nav><div className="hero-app-nav-label">Tools</div><nav aria-label="Preview tools"><span><i className="nav-symbol calendar" />Interviews</span><span><i className="nav-symbol document" />Documents</span><span><i className="nav-symbol assist" />Assist</span><span><i className="nav-symbol insight" />Insights</span></nav><div className="hero-app-sidebar-spacer" /><div className="hero-app-profile"><span>JL</span><div><strong>Jordan Lee</strong><small>Personal workspace</small></div></div></aside><div className="hero-app-main"><header className="hero-app-heading"><div><h2>Pipeline</h2><p>Where every application stands and what to do next.</p></div><button>+ Add job</button></header><div className="hero-app-summary"><span><b>5</b> Active</span><span><b>3</b> In process</span><span><b>1</b> Needs action</span><p>One interview this week</p></div><div className="hero-app-toolbar"><span>7 stages</span><i /><span>Updated now</span></div><div className="hero-app-board">{columns.map((column) => <section key={column.label}><header><strong>{column.label}</strong><span>{column.cards.length}</span></header>{column.cards.map((card) => <article key={`${card.company}-${card.role}`}><small>{card.company}</small><h3>{card.role}</h3><p><i />{card.action}</p><footer><span>RLW-{card.company.length + card.role.length}</span><time>{card.due}</time></footer></article>)}</section>)}</div></div></div>;
}

function SceneFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="story-scene"><header><span><LogoMark size={16} />Roleway</span><b>{title}</b><kbd>⌘ K</kbd></header>{children}</div>;
}
function InboxScene() { return <SceneFrame title="Job inbox"><div className="scene-toolbar"><span>2 jobs to review</span><button>+ Add job</button></div><div className="scene-job selected"><div><small>Northstar Systems · Company site</small><h4>Senior Product Engineer</h4><p>Remote · $165k–$190k · TypeScript, React, PostgreSQL</p></div><span>New</span></div><div className="scene-job-actions"><button>Add to pipeline</button><button>Maybe</button><button>Dismiss</button></div><div className="scene-job"><div><small>Fieldwork · Referral</small><h4>Product Engineer</h4><p>New York / Remote · $150k–$175k</p></div><span>Maybe</span></div></SceneFrame>; }
function OpportunityScene() { return <SceneFrame title="Opportunity"><div className="scene-prep-head"><div><span>RLW-014 · Interested</span><h4>Senior Product Engineer · Northstar Systems</h4><p>Remote · $165k–$190k · Company site</p></div><button>Open listing</button></div><div className="scene-prep-grid"><main><span>Tasks</span><label><i />Review platform requirements</label><label><i />Choose two project examples</label><label className="done"><i />Save the job description</label></main><aside><span>Next action</span><div><FileText aria-hidden="true" /><p><strong>Review requirements</strong><small>Due Friday</small></p></div><div><FileText aria-hidden="true" /><p><strong>Targeted resume</strong><small>Updated today</small></p></div><button>Save next action</button></aside></div></SceneFrame>; }
function TodayScene() { return <SceneFrame title="Today"><div className="scene-today-head"><span>Thursday, August 20</span><h4>Good morning, Jordan</h4><p>Three items need your attention.</p></div><div className="scene-focus"><time>10:00</time><i /><div><strong>System design interview</strong><span>Northstar Systems · 60 minutes</span></div><button>Prepare</button></div><div className="scene-focus"><time>Today</time><i /><div><strong>Send application follow-up</strong><span>Fieldwork · Applied 6 days ago</span></div><button>Open</button></div><div className="scene-focus"><time>Inbox</time><i /><div><strong>Review two jobs</strong><span>Decide what enters the pipeline</span></div><button>Review</button></div></SceneFrame>; }
