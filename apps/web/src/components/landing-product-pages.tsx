import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  Check,
  CheckCircle2,
  Clock3,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleDashed,
  FileText,
  GitBranch,
  History,
  Mail,
  Navigation,
  Plus,
  Route,
  Send,
  Settings2,
  SquareCheckBig,
  Target,
  UserRound,
  UsersRound,
} from "lucide-react";
import { CollectionViewControls } from "@/components/collection-view-controls";
import { Badge } from "@/components/ui/badge";
import {
  HomeWorkspaceDetails,
  HomeWorkspaceOverview,
} from "@/components/home-workspace-overview";
import { JobInbox } from "@/components/job-inbox";
import { landingOpportunities } from "@/components/landing-workspace-preview";
import { PipelineBoard } from "@/components/pipeline-board";
import type { SearchProject } from "@/features/projects/context";
import {
  CountBadge,
  PageHeader,
  PillTabs,
  ViewToolbar,
  WorkspaceHeader,
  WorkspaceListGroup,
} from "@/components/ui-primitives";

const landingProject: SearchProject = {
  id: "landing-product-engineering",
  name: "Product leadership",
  ticket_key: "PLD",
  icon_type: "icon",
  icon_value: "target",
  icon_color: "#5E6AD2",
  description:
    "A selective search for product roles with meaningful ownership and strong craft culture.",
  objective:
    "Find a senior product role where product quality and systems thinking matter",
  status: "active",
  target_titles: [
    "Senior Product Manager",
    "Staff Product Manager",
    "Product Lead",
  ],
  industries: ["Developer tools", "Productivity", "Fintech"],
  preferred_technologies: ["TypeScript", "React", "PostgreSQL"],
  employment_types: ["Full-time"],
  locations: ["Remote", "New York", "London"],
  remote_preference: "preferred",
  minimum_compensation: 150000,
  currency: "USD",
  seniority: ["Senior", "Staff", "Lead"],
  company_sizes: ["Startup", "Growth"],
  deal_breakers: [],
  preferred_companies: [],
  excluded_companies: [],
  search_keywords: ["product engineer"],
  weekly_application_goal: 5,
  is_favorite: false,
  created_at: "2026-08-20T12:00:00.000Z",
  updated_at: "2026-08-29T12:00:00.000Z",
};

const inboxJobs = [
  {
    id: "northstar-job",
    company: "Northstar Systems",
    title: "Senior Product Engineer",
    location: "Remote — US",
    compensation: "$165k–$190k",
    remote_policy: "Remote",
    source: "Company site",
    source_url: null,
    description:
      "Build dependable product workflows with TypeScript, React, and PostgreSQL.",
    inbox_state: "new",
    inbox_review_at: null,
    imported_at: "2026-08-29T10:00:00.000Z",
  },
  {
    id: "fieldwork-job",
    company: "Fieldwork",
    title: "Product Engineer",
    location: "New York / Remote",
    compensation: "$150k–$175k",
    remote_policy: "Hybrid",
    source: "Referral",
    source_url: null,
    description:
      "Own product systems from discovery through delivery with a small engineering team.",
    inbox_state: "new",
    inbox_review_at: null,
    imported_at: "2026-08-28T10:00:00.000Z",
  },
];

const interviews = [
  [
    "recruiter",
    "Recruiter conversation",
    "2026-08-06T14:00:00.000Z",
    14,
    "Northstar Systems",
  ],
  [
    "portfolio",
    "Portfolio review",
    "2026-08-11T18:30:00.000Z",
    15,
    "Fieldwork",
  ],
  [
    "system",
    "System design",
    "2026-08-14T14:00:00.000Z",
    14,
    "Northstar Systems",
  ],
  ["manager", "Hiring manager", "2026-08-20T17:00:00.000Z", 16, "Atlas Labs"],
  [
    "system",
    "System design",
    "2026-08-24T15:00:00.000Z",
    17,
    "Northstar Systems",
  ],
  [
    "executive",
    "Executive conversation",
    "2026-08-27T18:00:00.000Z",
    18,
    "Signal Works",
  ],
].map(([id, interviewType, startsAt, referenceNumber, company]) => ({
  id: id as string,
  interview_type: interviewType as string,
  starts_at: startsAt as string,
  timezone: "America/New_York",
  status: "scheduled",
  opportunities: {
    reference_number: referenceNumber as number,
    jobs: { company: company as string, title: "Product Engineer" },
  },
}));

const productPages = [
  {
    id: "home-proof",
    label: "Home",
    title: "Home starts with the work that needs attention.",
    copy: "Due tasks, interviews, contact follow-ups, Next Actions, and Jobs waiting in the active Workspace—ordered into one calm briefing.",
    variant: "panorama",
  },
  {
    id: "inbox-proof",
    label: "Inbox",
    title: "Inbox gives every Job a deliberate first decision.",
    copy: "Keep discovered listings separate, then track, defer, or dismiss each one before it becomes active work.",
    variant: "split",
  },
  {
    id: "opportunities-proof",
    label: "Opportunities",
    title: "Opportunities keep every serious role and Next Action visible.",
    copy: "Work from the focused List by default. Switch to Board when changing stages is the work at hand.",
    variant: "theater",
  },
  {
    id: "interviews-proof",
    label: "Interviews",
    title: "Interviews turn a date on the calendar into a preparation plan.",
    copy: "Every conversation retains its Opportunity, time zone, participants, questions, and preparation.",
    variant: "offset",
  },
  {
    id: "contacts-proof",
    label: "Contacts",
    title: "Contacts keep people and follow-ups in context.",
    copy: "Recruiters, interviewers, referrals, and hiring managers stay attached to the right Opportunity.",
    variant: "portrait",
  },
  {
    id: "documents-proof",
    label: "Documents",
    title: "Documents make every draft and approval state explicit.",
    copy: "Resumes, messages, answers, and research notes support list and gallery views without losing review state.",
    variant: "portrait",
  },
  {
    id: "agent-proof",
    label: "Agent",
    title: "Agent works across your search. You approve every change.",
    copy: "Bring your own provider. Agent reads permitted context, prepares grounded work, and cannot take external action.",
    variant: "spotlight",
  },
  {
    id: "insights-proof",
    label: "Insights",
    title: "Insights measure only what your recorded activity supports.",
    copy: "Review account-wide momentum, source outcomes, and conversion rates only after the sample is meaningful.",
    variant: "reverse",
  },
  {
    id: "notifications-proof",
    label: "Notifications",
    title:
      "Notifications collect important changes without becoming another inbox.",
    copy: "Interview reminders, tasks, and Opportunity changes stay grouped, filterable, and individually actionable.",
    variant: "compact",
  },
] as const;

export function LandingProductPages() {
  return (
    <section
      className="rw-product-pages"
      id="features"
      aria-labelledby="product-pages-title"
    >
      <header className="rw-product-pages-head" data-reveal>
        <h2 id="product-pages-title">
          See the whole search. Move one thing forward.
        </h2>
        <p>
          One Workspace holds one focused search. Every view below is assembled
          from the same components used inside Roleway—not a marketing mockup.
        </p>
      </header>
      <nav className="rw-product-page-index" aria-label="Product pages">
        {productPages.map((page) => (
          <a href={`#${page.id}`} key={page.id}>
            {page.label}
          </a>
        ))}
      </nav>

      <ProductProof page={productPages[0]}>
        <HomeSurface />
      </ProductProof>
      <ProductProof page={productPages[1]}>
        <InboxSurface />
      </ProductProof>
      <ProductProof page={productPages[2]}>
        <OpportunitySurface />
      </ProductProof>
      <ProductProof page={productPages[3]}>
        <InterviewSurface />
      </ProductProof>
      <div className="rw-product-proof-pair">
        <ProductProof page={productPages[4]}>
          <ContactSurface />
        </ProductProof>
        <ProductProof page={productPages[5]}>
          <DocumentSurface />
        </ProductProof>
      </div>
      <ProductProof page={productPages[6]}>
        <AgentSurface />
      </ProductProof>
      <ProductProof page={productPages[7]}>
        <InsightsSurface />
      </ProductProof>
      <ProductProof page={productPages[8]}>
        <NotificationsSurface />
      </ProductProof>
    </section>
  );
}

function ProductProof({
  page,
  children,
}: {
  page: (typeof productPages)[number];
  children: React.ReactNode;
}) {
  return (
    <article
      className={`rw-product-proof rw-product-proof-${page.variant}`}
      id={page.id}
      data-reveal
    >
      <div className="rw-product-proof-copy">
        <h3>{page.title}</h3>
        <p>{page.copy}</p>
      </div>
      <div
        className="rw-product-proof-frame app-shell"
        role="img"
        aria-label={`${page.label} page preview`}
      >
        <div aria-hidden="true" inert>
          {children}
        </div>
      </div>
    </article>
  );
}

function HomeSurface() {
  return (
    <div className="workspace-page home-v2-page">
      <WorkspaceHeader
        title="Home"
        context="Saturday, August 29 · Product leadership"
        className="home-v2-header"
      />
      <div className="home-v2-layout">
        <main className="home-focus-panel">
          <HomeWorkspaceOverview project={landingProject} />
          <header className="home-section-header">
            <div>
              <h2>Next up</h2>
              <CountBadge value={9} />
              <span>items</span>
            </div>
            <p>
              Actions, follow-ups, and interviews that can move this Workspace
              forward.
            </p>
          </header>
          <div className="home-action-groups">
            <WorkspaceListGroup
              title="Overdue"
              count={4}
              className="home-group home-group-overdue"
            >
              <div className="home-action-list">
                <HomeRow
                  group="overdue"
                  date="Overdue"
                  icon={<Target />}
                  title="Follow up on the application"
                  meta="Helio Health · Principal Product Manager"
                />
                <HomeRow
                  group="overdue"
                  date="Overdue"
                  icon={<Target />}
                  title="Prepare three platform strategy stories"
                  meta="Kite Financial · Product Lead, Platform"
                />
                <HomeRow
                  group="overdue"
                  date="Overdue"
                  icon={<UserRound />}
                  title="Ask Maya for an introduction to the hiring manager"
                  meta="Aster Labs · Senior Product Manager, Workflows"
                />
                <HomeRow
                  group="overdue"
                  date="Overdue"
                  icon={<Circle />}
                  title="Tighten the opening case study"
                  meta="Northstar Systems · Staff Product Manager"
                />
              </div>
            </WorkspaceListGroup>
            <WorkspaceListGroup
              title="Today"
              count={3}
              className="home-group home-group-today"
            >
              <div className="home-action-list">
                <HomeRow
                  group="today"
                  date="Today"
                  icon={<Target />}
                  title="Review the offer against workspace criteria"
                  meta="Signal Works · Director of Product"
                />
                <HomeRow
                  group="today"
                  date="Today"
                  icon={<Target />}
                  title="Finish the tailored product narrative"
                  meta="Northstar Systems · Staff Product Manager"
                />
                <HomeRow
                  group="today"
                  date="Today"
                  icon={<Circle />}
                  title="Send Maya a concise context note"
                  meta="Aster Labs · Senior Product Manager, Workflows"
                />
              </div>
            </WorkspaceListGroup>
            <WorkspaceListGroup
              title="Upcoming"
              count={2}
              className="home-group home-group-upcoming"
            >
              <div className="home-action-list">
                <HomeRow
                  group="upcoming"
                  date="Next"
                  icon={<Target />}
                  title="Review requirements and decide whether to prepare"
                  meta="Meridian AI · Group Product Manager"
                />
                <HomeRow
                  group="upcoming"
                  date="Sat 8:52 PM"
                  icon={<CalendarClock />}
                  title="Prepare for Hiring manager conversation"
                  meta="Kite Financial · Product Lead, Platform"
                />
              </div>
            </WorkspaceListGroup>
          </div>
        </main>
        <aside className="home-context-rail">
          <HomeWorkspaceDetails project={landingProject} />
          <section className="home-pulse">
            <div className="home-rail-heading">
              <h2>Workspace pulse</h2>
            </div>
            <nav className="home-pulse-links">
              <PulseRow label="Due tasks" value={4} />
              <PulseRow label="Interviews this week" value={1} />
              <PulseRow label="Active opportunities" value={6} />
              <PulseRow label="Jobs to review" value={1} />
            </nav>
          </section>
          <section className="home-active-opportunities">
            <div className="home-rail-heading">
              <h2>Active opportunities</h2>
              <span>View all</span>
            </div>
            <div className="home-opportunity-list">
              <OpportunityRow
                title="Product Lead, Platform"
                meta="Kite Financial · Interview"
              />
              <OpportunityRow
                title="Director of Product"
                meta="Signal Works · Offer"
              />
              <OpportunityRow
                title="Senior Product Manager, Workflows"
                meta="Aster Labs · Preparing"
              />
              <OpportunityRow
                title="Principal Product Manager"
                meta="Helio Health · Applied"
              />
              <OpportunityRow
                title="Staff Product Manager"
                meta="Northstar Systems · Applied"
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function PulseRow({ label, value }: { label: string; value: number }) {
  return (
    <a href="#home-proof">
      <span>{label}</span>
      <span className="home-pulse-value">
        <CountBadge value={value} />
        <ArrowRight aria-hidden="true" />
      </span>
    </a>
  );
}

function OpportunityRow({ title, meta }: { title: string; meta: string }) {
  return (
    <a href="#home-proof">
      <span className="status-dot" />
      <span>
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      <ArrowRight aria-hidden="true" />
    </a>
  );
}

function HomeRow({
  group,
  date,
  icon,
  title,
  meta,
}: {
  group: "overdue" | "today" | "upcoming";
  date: string;
  icon: React.ReactNode;
  title: string;
  meta: string;
}) {
  return (
    <span className="home-action-row home-action-row-link" data-group={group}>
      <time>{date}</time>
      <span className="home-action-icon">{icon}</span>
      <span className="home-action-copy">
        <strong>{title}</strong>
        <small>{meta}</small>
      </span>
      <ArrowRight className="home-action-arrow" />
    </span>
  );
}

function InboxSurface() {
  return (
    <div className="workspace-page inbox-page">
      <WorkspaceHeader
        title="Inbox"
        count={2}
        context="Jobs you add wait here until you decide what deserves active work."
      />
      <ViewToolbar
        className="inbox-top-view-toolbar"
        label="Inbox views"
        primary={
          <PillTabs
            className="inbox-view-tabs"
            label="Inbox views"
            items={[
              {
                href: "#inbox-review",
                label: "To review",
                active: true,
                count: 2,
              },
              { href: "#inbox-later", label: "Later", active: false, count: 0 },
            ]}
          />
        }
        actions={
          <CollectionViewControls
            page="landing-inbox"
            filterGroups={[
              {
                key: "remote",
                label: "Work arrangement",
                defaultValue: "all",
                options: [
                  { value: "all", label: "Any arrangement" },
                  { value: "Remote", label: "Remote" },
                  { value: "Hybrid", label: "Hybrid" },
                ],
              },
            ]}
            values={{ remote: "all" }}
            sort="newest"
            defaultSort="newest"
            sortOptions={[
              { value: "newest", label: "Newest added" },
              { value: "oldest", label: "Oldest added" },
              { value: "company", label: "Company" },
            ]}
            search={{
              key: "q",
              value: "",
              placeholder: "Search saved jobs…",
            }}
          />
        }
      />
      <div className="inbox-review-shell">
        <div className="inbox-review-layout">
          <div className="inbox-review-main">
            <section className="inbox-review-intro">
              <h1>Inbox</h1>
              <p>
                Add or import a Job, then track it as an Opportunity, review it
                later, or dismiss it.
              </p>
            </section>
            <JobInbox
              jobs={inboxJobs}
              minReviewDate="2026-08-29"
              defaultReviewDate="2026-09-05"
              referenceTime="2026-08-29T12:00:00.000Z"
            />
          </div>
          <aside className="inbox-overview">
            <section className="inbox-overview-summary">
              <header>
                <h2>Inbox overview</h2>
                <CountBadge value={2} label="2 saved jobs" />
              </header>
              <dl>
                <div>
                  <dt>Ready for a decision</dt>
                  <dd>
                    <CountBadge value={2} />
                  </dd>
                </div>
                <div>
                  <dt>Returning later</dt>
                  <dd>
                    <CountBadge value={0} />
                  </dd>
                </div>
                <div>
                  <dt>Next return</dt>
                  <dd>—</dd>
                </div>
              </dl>
            </section>
            <section className="inbox-decision-guide">
              <h3>What each decision does</h3>
              <ul>
                <DecisionGuide
                  tone="track"
                  title="Track"
                  copy="Creates an active Opportunity for follow-up."
                />
                <DecisionGuide
                  tone="later"
                  title="Later"
                  copy="Returns the Job on the date you choose."
                />
                <DecisionGuide
                  tone="dismiss"
                  title="Dismiss"
                  copy="Removes the Job from this review queue."
                />
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function DecisionGuide({
  tone,
  title,
  copy,
}: {
  tone: "track" | "later" | "dismiss";
  title: string;
  copy: string;
}) {
  return (
    <li>
      <span className={`inbox-decision-mark is-${tone}`} />
      <div>
        <strong>{title}</strong>
        <p>{copy}</p>
      </div>
    </li>
  );
}

function OpportunitySurface() {
  return (
    <div className="workspace-page board-page has-board">
      <WorkspaceHeader
        title="Opportunities"
        count={landingOpportunities.length}
        context="Every serious role and the Next Action that moves it forward."
      />
      <PipelineBoard
        opportunities={landingOpportunities}
        now="2026-08-29T12:00:00.000Z"
        ticketKey="PROD"
        preferencePage="landing-product-opportunities"
        previewHref="/signup"
      />
    </div>
  );
}

function InterviewSurface() {
  return (
    <div className="workspace-page workspace-index-page interview-index-page">
      <WorkspaceHeader
        title="Interviews"
        count={interviews.length}
        context="Scheduled conversations and preparation for Product leadership."
      />
      <ViewToolbar
        className="interview-view-toolbar"
        label="Interview views"
        primary={
          <PillTabs
            label="Interview views"
            items={[
              {
                href: "#interviews-upcoming",
                label: "Upcoming",
                active: true,
                count: interviews.length,
              },
              {
                href: "#interviews-week",
                label: "Next 7 days",
                active: false,
                count: 2,
              },
              {
                href: "#interviews-history",
                label: "History",
                active: false,
                count: 3,
              },
              {
                href: "#interviews-calendar",
                label: "Calendar",
                active: false,
              },
            ]}
          />
        }
        actions={
          <CollectionViewControls
            page="landing-interviews"
            filterGroups={[
              {
                key: "type",
                label: "Interview type",
                defaultValue: "all",
                options: [
                  { value: "all", label: "All types" },
                  { value: "Recruiter conversation", label: "Recruiter" },
                  { value: "Hiring manager", label: "Hiring manager" },
                  { value: "Portfolio review", label: "Portfolio review" },
                ],
              },
              {
                key: "status",
                label: "Status",
                defaultValue: "all",
                options: [
                  { value: "all", label: "Any status" },
                  { value: "scheduled", label: "Scheduled" },
                  { value: "completed", label: "Completed" },
                ],
              },
            ]}
            values={{ type: "all", status: "all" }}
            sort="schedule"
            defaultSort="schedule"
            sortOptions={[
              { value: "schedule", label: "Schedule order" },
              { value: "oldest", label: "Oldest first" },
              { value: "newest", label: "Newest first" },
            ]}
            search={{
              key: "q",
              value: "",
              placeholder: "Search conversations…",
            }}
          />
        }
      />
      <div className="interview-index-layout">
        <main className="interview-schedule">
          <header className="interview-schedule-header">
            <div>
              <h2>Upcoming interviews</h2>
              <p>
                Open a conversation to prepare, capture notes, and record what
                happens next.
              </p>
            </div>
            <span>{interviews.length} conversations</span>
          </header>
          <div className="interview-groups">
            <WorkspaceListGroup
              title="Upcoming"
              count={interviews.length}
              className="interview-group"
            >
              <div className="document-list interview-list">
                <InterviewRow
                  month="Sep"
                  day="02"
                  title="Recruiter conversation"
                  meta="PLD-014 · Helio Health · Principal Product Manager"
                  time="10:00 AM"
                />
                <InterviewRow
                  month="Sep"
                  day="04"
                  title="Portfolio review"
                  meta="PLD-015 · Kite Financial · Product Lead, Platform"
                  time="2:30 PM"
                />
                <InterviewRow
                  month="Sep"
                  day="08"
                  title="Hiring manager"
                  meta="PLD-016 · Aster Labs · Senior Product Manager"
                  time="1:00 PM"
                />
                <InterviewRow
                  month="Sep"
                  day="11"
                  title="Case study review"
                  meta="PLD-017 · Northstar Systems · Staff Product Manager"
                  time="11:30 AM"
                />
                <InterviewRow
                  month="Sep"
                  day="15"
                  title="System design"
                  meta="PLD-018 · Meridian AI · Group Product Manager"
                  time="3:00 PM"
                />
                <InterviewRow
                  month="Sep"
                  day="18"
                  title="Executive conversation"
                  meta="PLD-019 · Signal Works · Director of Product"
                  time="4:30 PM"
                />
              </div>
            </WorkspaceListGroup>
          </div>
        </main>
        <aside className="interview-insights-rail">
          <section>
            <header className="interview-rail-heading">
              <h2>Schedule insights</h2>
            </header>
            <dl className="interview-insight-list">
              <InsightCount label="Next 7 days" value={2} />
              <InsightCount label="Upcoming" value={interviews.length} />
              <InsightCount label="History" value={3} />
            </dl>
          </section>
          <section>
            <header className="interview-rail-heading">
              <h2>Next conversation</h2>
            </header>
            <a className="interview-next-link" href="#interviews-proof">
              <span className="interview-next-date">
                <CalendarClock aria-hidden="true" />
                <span>Wednesday, September 2 at 10:00 AM</span>
              </span>
              <strong>Recruiter conversation</strong>
              <span>Helio Health · Principal Product Manager</span>
              <span className="interview-next-action">
                Open preparation <ArrowRight aria-hidden="true" />
              </span>
            </a>
          </section>
          <section>
            <header className="interview-rail-heading">
              <h2>Preparation check</h2>
              <span>2 of 3</span>
            </header>
            <ul className="interview-preparation-checks">
              <PreparationCheck label="Preparation plan" complete />
              <PreparationCheck label="Questions to ask" complete />
              <PreparationCheck label="Interviewers" />
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InterviewRow({
  month,
  day,
  title,
  meta,
  time,
}: {
  month: string;
  day: string;
  title: string;
  meta: string;
  time: string;
}) {
  return (
    <a
      className="list-row list-row-link interview-list-row"
      href="#interviews-proof"
    >
      <span className="interview-date-mark">
        <span>{month}</span>
        <strong>{day}</strong>
      </span>
      <span className="interview-list-copy">
        <strong>{title}</strong>
        <span>{meta}</span>
      </span>
      <time className="interview-list-time">
        <strong>{time}</strong>
        <span>EDT</span>
      </time>
      <span className="interview-status-badge">Scheduled</span>
      <ChevronRight aria-hidden="true" />
    </a>
  );
}

function InsightCount({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <CountBadge value={value} />
      </dd>
    </div>
  );
}

function PreparationCheck({
  label,
  complete = false,
}: {
  label: string;
  complete?: boolean;
}) {
  return (
    <li data-complete={complete || undefined}>
      {complete ? <CheckCircle2 /> : <Circle />}
      <span>{label}</span>
      <small>{complete ? "Added" : "Not added"}</small>
    </li>
  );
}

function ContactSurface() {
  return (
    <div className="workspace-page workspace-index-page contacts-page">
      <WorkspaceHeader
        title="Contacts"
        count={4}
        context="People, relationships, and follow-ups for Product leadership."
      />
      <ViewToolbar
        className="contacts-view-toolbar"
        label="Contact views and filters"
        primary={
          <PillTabs
            label="Contact views"
            items={[
              {
                href: "#contacts-directory",
                label: "All contacts",
                active: true,
                count: 4,
              },
              {
                href: "#contacts-follow-up",
                label: "Needs follow-up",
                active: false,
                count: 3,
              },
              {
                href: "#contacts-timeline",
                label: "Timeline",
                active: false,
                count: 3,
              },
            ]}
          />
        }
        actions={
          <CollectionViewControls
            page="landing-contacts"
            filterGroups={[
              {
                key: "relationship",
                label: "Relationship",
                defaultValue: "all",
                options: [
                  { value: "all", label: "All relationships" },
                  { value: "recruiter", label: "Recruiter" },
                  { value: "hiring_manager", label: "Hiring manager" },
                  { value: "referral", label: "Referral" },
                ],
              },
            ]}
            values={{ relationship: "all" }}
            sort="follow_up"
            defaultSort="follow_up"
            sortOptions={[
              { value: "follow_up", label: "Follow-up date" },
              { value: "name", label: "Name" },
              { value: "company", label: "Company" },
            ]}
            search={{ key: "q", value: "", placeholder: "Search people…" }}
          />
        }
      />
      <div className="contacts-index-layout">
        <main className="contacts-directory">
          <header className="contacts-directory-header">
            <div>
              <h2>People and follow-ups</h2>
              <p>
                Keep relationship context close to the Opportunity and the next
                useful touchpoint.
              </p>
            </div>
            <span>4 people</span>
          </header>
          <section className="contacts-table" role="table">
            <div className="contacts-row contacts-row-header" role="row">
              <span>Person</span>
              <span>Relationship</span>
              <span>Opportunity</span>
              <span>Follow-up</span>
              <span />
            </div>
            <ContactRow
              initials="MC"
              name="Maya Chen"
              detail="Senior recruiter · Northstar Systems"
              email="maya@northstar.example"
              relationship="Recruiter"
              opportunity="PLD-014"
              role="Staff Product Manager"
              followUp="Aug 28"
              overdue
            />
            <ContactRow
              initials="JB"
              name="Jon Bell"
              detail="Hiring manager · Kite Financial"
              email="jon@kite.example"
              relationship="Hiring manager"
              opportunity="PLD-015"
              role="Product Lead, Platform"
              followUp="Sep 2"
            />
            <ContactRow
              initials="PS"
              name="Priya Shah"
              detail="Referral · Aster Labs"
              email="priya@aster.example"
              relationship="Referral"
              opportunity="PLD-016"
              role="Senior Product Manager"
              followUp="Sep 5"
            />
            <ContactRow
              initials="AR"
              name="Alex Rivera"
              detail="Former colleague · Workspace-wide"
              email="alex@example.com"
              relationship="Former colleague"
              followUp="Not scheduled"
            />
          </section>
        </main>
        <aside className="contacts-insights-rail">
          <section>
            <header className="contacts-rail-heading">
              <h2>Contact overview</h2>
              <CountBadge value={4} />
            </header>
            <dl className="contacts-insight-list">
              <InsightCount label="Due or overdue" value={3} />
              <InsightCount label="Overdue" value={1} />
              <InsightCount label="Linked to an Opportunity" value={3} />
              <InsightCount label="Workspace-wide" value={1} />
            </dl>
          </section>
          <section>
            <header className="contacts-rail-heading">
              <h2>Next follow-up</h2>
            </header>
            <a className="contacts-next-link" href="#contacts-proof">
              <span className="contacts-next-date">
                <Clock3 aria-hidden="true" /> Tue, Sep 2
              </span>
              <strong>Jon Bell</strong>
              <span>Hiring manager · Kite Financial</span>
              <span className="contacts-next-action">
                Open contact <ArrowRight aria-hidden="true" />
              </span>
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}

function ContactRow({
  initials,
  name,
  detail,
  email,
  relationship,
  opportunity,
  role,
  followUp,
  overdue = false,
}: {
  initials: string;
  name: string;
  detail: string;
  email: string;
  relationship: string;
  opportunity?: string;
  role?: string;
  followUp: string;
  overdue?: boolean;
}) {
  return (
    <article className="contacts-row" role="row">
      <span className="contact-identity">
        <span className="contact-avatar">{initials}</span>
        <span>
          <strong>{name}</strong>
          <small>{detail}</small>
          <a href={`mailto:${email}`}>
            <Mail aria-hidden="true" /> {email}
          </a>
        </span>
      </span>
      <span className="contact-relationship">
        <Badge variant="secondary">{relationship}</Badge>
      </span>
      <span className="contact-opportunity">
        {opportunity ? (
          <a href="#contacts-proof">
            <strong>{opportunity}</strong>
            <small>{role}</small>
          </a>
        ) : (
          <span className="contact-workspace-wide">
            <UsersRound aria-hidden="true" /> Workspace-wide
          </span>
        )}
      </span>
      <span className={`contact-follow-up${overdue ? " overdue" : ""}`}>
        {followUp === "Not scheduled" ? (
          <span className="contact-follow-up-empty">{followUp}</span>
        ) : (
          <>
            <CalendarClock aria-hidden="true" />
            <span>
              <time>{followUp}</time>
              <small>{overdue ? "Overdue" : "Scheduled"}</small>
            </span>
          </>
        )}
      </span>
      <span className="contact-row-actions">
        <ChevronRight aria-hidden="true" />
      </span>
    </article>
  );
}

function DocumentSurface() {
  return (
    <div className="workspace-page workspace-index-page documents-index-page">
      <WorkspaceHeader
        title="Documents"
        count={5}
        context="Application material for Product leadership, with Opportunity context intact."
      />
      <ViewToolbar
        className="documents-view-toolbar"
        label="Document views"
        primary={
          <PillTabs
            label="Document views"
            items={[
              {
                href: "#documents-all",
                label: "All documents",
                active: true,
                count: 5,
              },
              {
                href: "#documents-drafts",
                label: "Drafts",
                active: false,
                count: 2,
              },
              {
                href: "#documents-gallery",
                label: "Gallery",
                active: false,
              },
            ]}
          />
        }
        actions={
          <CollectionViewControls
            page="landing-documents"
            filterGroups={[
              {
                key: "kind",
                label: "Document type",
                defaultValue: "all",
                options: [
                  { value: "all", label: "All types" },
                  { value: "resume", label: "Resume" },
                  { value: "answer", label: "Application answer" },
                  { value: "research_note", label: "Research note" },
                ],
              },
              {
                key: "status",
                label: "Status",
                defaultValue: "all",
                options: [
                  { value: "all", label: "Any status" },
                  { value: "draft", label: "Draft" },
                  { value: "approved", label: "Approved" },
                ],
              },
            ]}
            values={{ kind: "all", status: "all" }}
            sort="updated"
            defaultSort="updated"
            sortOptions={[
              { value: "updated", label: "Recently updated" },
              { value: "title", label: "Title" },
              { value: "kind", label: "Document type" },
            ]}
          />
        }
      />
      <div className="documents-index-layout">
        <main className="documents-library">
          <header className="documents-library-header">
            <div>
              <h2>Document library</h2>
              <p>
                Keep each working draft, approved version, and submission
                artifact attached to its purpose.
              </p>
            </div>
            <span>5 documents</span>
          </header>
          <section className="document-list workspace-document-list">
            <div className="document-list-header">
              <span />
              <span>Document</span>
              <span>Status</span>
              <span>Updated</span>
              <span />
            </div>
            <DocumentRow
              title="Targeted product resume"
              meta="Resume · PLD-014 · Helio Health"
              status="Draft"
              date="Aug 29, 2026"
            />
            <DocumentRow
              title="Platform strategy examples"
              meta="Research note · PLD-015 · Kite Financial"
              status="Approved"
              date="Aug 28, 2026"
            />
            <DocumentRow
              title="Application answers"
              meta="Application answer · PLD-016 · Aster Labs"
              status="Draft"
              date="Aug 27, 2026"
            />
            <DocumentRow
              title="Hiring manager preparation"
              meta="Interview note · PLD-015 · Kite Financial"
              status="Approved"
              date="Aug 26, 2026"
            />
            <DocumentRow
              title="Offer criteria"
              meta="Research note · Workspace document"
              status="Approved"
              date="Aug 25, 2026"
            />
          </section>
        </main>
        <aside className="documents-insights-rail">
          <section>
            <header className="documents-rail-heading">
              <h2>Document overview</h2>
              <CountBadge value={5} />
            </header>
            <dl className="documents-insight-list">
              <InsightCount label="Drafts" value={2} />
              <InsightCount label="Approved or submitted" value={3} />
              <InsightCount label="Linked to an Opportunity" value={4} />
              <InsightCount label="Workspace-wide" value={1} />
            </dl>
          </section>
          <section>
            <header className="documents-rail-heading">
              <h2>Recently updated</h2>
            </header>
            <a className="documents-recent-link" href="#documents-proof">
              <span className="documents-recent-date">
                <Clock3 aria-hidden="true" /> Sat, Aug 29
              </span>
              <strong>Targeted product resume</strong>
              <span>Resume · Helio Health</span>
              <span className="documents-recent-action">
                Open document <ArrowRight aria-hidden="true" />
              </span>
            </a>
          </section>
        </aside>
      </div>
    </div>
  );
}

function DocumentRow({
  title,
  meta,
  status,
  date,
}: {
  title: string;
  meta: string;
  status: "Draft" | "Approved";
  date: string;
}) {
  return (
    <a className="list-row list-row-link" href="#documents-proof">
      <span className="list-icon">
        <FileText aria-hidden="true" />
      </span>
      <div className="document-row-copy">
        <div className="list-title">{title}</div>
        <div className="list-subtitle">{meta}</div>
      </div>
      <span
        className="document-status-badge"
        data-status={status.toLowerCase()}
      >
        {status === "Approved" ? <CheckCircle2 /> : <CircleDashed />}
        {status}
      </span>
      <time className="muted small">{date}</time>
      <ChevronRight aria-hidden="true" />
    </a>
  );
}

function AgentSurface() {
  return (
    <div className="agent-native-page has-conversation">
      <header className="agent-native-routebar">
        <details className="agent-history-menu">
          <summary>
            <History />
            <span>Interview preparation</span>
            <ChevronDown />
          </summary>
        </details>
        <span className="agent-native-scope">
          <Route />
          All workspaces
        </span>
        <span className="agent-new-chat">
          <Plus />
          <span>New conversation</span>
        </span>
      </header>
      <main className="agent-native-workplane">
        <div className="agent-transcript">
          <article className="agent-message user">
            <header>
              <span className="agent-message-author">You</span>
              <time>10:14 AM</time>
            </header>
            <div className="agent-message-content">
              <p>Prepare me for the Northstar system design interview.</p>
            </div>
          </article>
          <article className="agent-message agent">
            <header>
              <span className="agent-message-author">
                <Navigation />
                Roleway Agent
              </span>
              <time>10:14 AM</time>
            </header>
            <div className="agent-message-content">
              <p>
                Start with two verified project stories, then connect each one
                to the architecture trade-offs in this role.
              </p>
            </div>
            <section className="agent-approval-card proposed">
              <header>
                <span>
                  <Navigation />
                  Approval required
                </span>
                <strong>Create task</strong>
              </header>
              <p>Add a preparation task due Friday.</p>
              <footer>
                <span className="button ghost">Reject</span>
                <span className="button primary">Approve change</span>
              </footer>
            </section>
          </article>
        </div>
        <section className="agent-native-composer">
          <textarea
            readOnly
            value=""
            placeholder="Ask across your workspaces…"
          />
          <footer>
            <span className="agent-context-disclosure">
              <Route />
              Career Profile and all Workspace context
            </span>
            <span className="agent-send">
              <Send />
            </span>
          </footer>
        </section>
      </main>
    </div>
  );
}

function InsightsSurface() {
  const activity = [
    ["Jun 1", 28, 1],
    ["Jun 8", 42, 2],
    ["Jun 15", 22, 1],
    ["Jun 22", 58, 3],
    ["Jun 29", 36, 2],
    ["Jul 6", 68, 4],
    ["Jul 13", 47, 2],
    ["Jul 20", 82, 5],
    ["Jul 27", 62, 3],
    ["Aug 3", 94, 6],
  ] as const;
  return (
    <div className="insights-page">
      <PageHeader
        title="Insights"
        description="Account-wide activity across your Workspaces · last 90 days."
        actions={
          <span className="insights-range-select">
            <span className="custom-select-trigger">
              Last 90 days <ChevronDown />
            </span>
          </span>
        }
      />
      <div className="insights-layout">
        <main className="insights-main">
          <section className="insights-summary">
            <Summary value="14" label="Jobs captured" />
            <Summary value="6" label="Applications" />
            <Summary value="3" label="Interviews held" />
            <Summary value="1" label="Offers recorded" />
          </section>
          <section className="insight-section insight-signal">
            <div className="insight-section-heading">
              <div>
                <h2>Search signal</h2>
                <p>What changed inside the selected period.</p>
              </div>
            </div>
            <div className="signal-statement">
              <ChartNoAxesColumnIncreasing />
              <div>
                <strong>Application activity increased</strong>
                <p>
                  Four applications were recorded in the current half of this
                  period.
                </p>
              </div>
            </div>
          </section>
          <section className="insight-section">
            <div className="insight-section-heading">
              <div>
                <h2>Activity over time</h2>
                <p>
                  Recorded Jobs, applications, and completed interview activity.
                </p>
              </div>
              <div className="activity-legend">
                <span data-series="jobs">Jobs</span>
                <span data-series="applications">Applications</span>
                <span data-series="interviews">Interviews</span>
              </div>
            </div>
            <div className="activity-chart">
              {activity.map(([label, height, total], index) => (
                <div className="activity-bucket" key={label}>
                  <div
                    className="activity-bar-track"
                    style={{ height: `${height}%` }}
                  >
                    <div className="activity-bar">
                      {index % 3 === 0 ? (
                        <span data-series="interviews" />
                      ) : null}
                      {index % 2 === 1 ? (
                        <span data-series="applications" />
                      ) : null}
                      <span data-series="jobs" />
                    </div>
                  </div>
                  <span>{label}</span>
                  <small>{total}</small>
                </div>
              ))}
            </div>
          </section>
          <section className="insight-section">
            <div className="insight-section-heading">
              <div>
                <h2>Application outcomes</h2>
                <p>
                  Outcomes for applications submitted in this period, including
                  later progress.
                </p>
              </div>
            </div>
            <div className="outcome-funnel">
              <Outcome label="Applications submitted" value="6" rate="100%" />
              <Outcome label="Reached an interview" value="3" rate="50%" />
              <Outcome label="Reached an offer" value="1" rate="17%" />
            </div>
          </section>
        </main>
        <aside className="insights-rail">
          <section>
            <h2>Needs attention</h2>
            <dl className="insights-quick-list">
              <QuickInsight label="Active Opportunities" value="7" />
              <QuickInsight label="Missing a Next Action" value="2" />
              <QuickInsight label="Overdue Next Actions" value="1" />
              <QuickInsight label="Inactive for 14+ days" value="2" />
            </dl>
            <span className="insights-rail-link">
              Review active Workspace <ArrowRight />
            </span>
          </section>
          <section>
            <h2>Workspace activity</h2>
            <div className="workspace-insight-list">
              <div>
                <strong>Product leadership</strong>
                <span>4 applications · 2 interviews</span>
              </div>
              <div>
                <strong>Consulting</strong>
                <span>2 applications · 1 interview</span>
              </div>
            </div>
          </section>
          <section className="insights-method-note">
            <AlertCircle />
            <div>
              <h2>How to read this</h2>
              <p>
                Insights use only activity recorded in Roleway. They describe
                your search history and do not predict hiring outcomes.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Summary({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function QuickInsight({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Outcome({
  label,
  value,
  rate,
}: {
  label: string;
  value: string;
  rate: string;
}) {
  return (
    <div className="outcome-row">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div className="outcome-track">
        <span style={{ width: rate }} />
      </div>
      <small>{rate}</small>
    </div>
  );
}

function NotificationsSurface() {
  const rows = [
    [
      CalendarClock,
      "System design interview tomorrow",
      "Product engineering · Interview · 10:14 AM",
    ],
    [
      GitBranch,
      "Opportunity moved to Applied",
      "Product engineering · Opportunity · Yesterday",
    ],
    [
      SquareCheckBig,
      "Follow-up task due today",
      "Consulting · Task · Yesterday",
    ],
  ] as const;
  return (
    <div className="notifications-page">
      <PageHeader
        title="Notifications"
        description="Important changes and reminders across all Workspaces."
        actions={
          <span className="button secondary">
            <Check />
            Mark all read
          </span>
        }
      />
      <div className="notifications-layout">
        <main className="notifications-main">
          <nav className="notification-filters">
            <span aria-current="page">
              All <b>3</b>
            </span>
            <span>
              Unread <b>2</b>
            </span>
          </nav>
          <div className="notification-groups">
            <section className="notification-group">
              <header>
                <h2>Today</h2>
                <span>3</span>
              </header>
              <div className="notification-list">
                {rows.map(([Icon, title, meta], index) => (
                  <article
                    className={`notification-row ${index < 2 ? "is-unread" : "is-read"}`}
                    key={title}
                  >
                    <span className="notification-state" />
                    <span className="notification-icon">
                      <Icon />
                    </span>
                    <div className="notification-copy">
                      <strong>{title}</strong>
                      <span>{meta}</span>
                    </div>
                    <div className="notification-actions">
                      <span className="button ghost">
                        View <ArrowRight />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </main>
        <aside className="notifications-rail">
          <section>
            <h2>At a glance</h2>
            <dl className="notification-quick-list">
              <div>
                <dt>Unread</dt>
                <dd>2</dd>
              </div>
              <div>
                <dt>Received today</dt>
                <dd>3</dd>
              </div>
              <div>
                <dt>Workspaces with unread</dt>
                <dd>1</dd>
              </div>
            </dl>
          </section>
          <section>
            <span className="notification-settings-link">
              <Settings2 />
              <span>
                <strong>Notification settings</strong>
                <small>Choose which updates appear here.</small>
              </span>
              <ArrowRight />
            </span>
          </section>
        </aside>
      </div>
    </div>
  );
}
