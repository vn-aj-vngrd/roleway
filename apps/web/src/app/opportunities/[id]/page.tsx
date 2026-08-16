import { ArrowRight, CalendarClock, Ellipsis, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { opportunities, requirements } from "@/lib/data";

const tabs = ["Overview", "Application", "Preparation", "Research", "Interviews", "Activity"];
const dimensions = [{ label: "Skills", value: 92 }, { label: "Experience", value: 89 }, { label: "Seniority", value: 82 }, { label: "Location", value: 100 }, { label: "Compensation", value: 76 }, { label: "Domain", value: 84 }];

export default async function OpportunityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const item = opportunities.find((opportunity) => opportunity.id === id) ?? opportunities[0]!;
  const currentTab = query.tab ? query.tab.charAt(0).toUpperCase() + query.tab.slice(1) : "Overview";

  return (
    <div>
      <header className="workspace-head">
        <div className="workspace-title-row">
          <div className="workspace-title"><div className="workspace-id mono">{item.id}</div><h1>{item.role} · {item.company}</h1><div className="workspace-meta">{item.compensation} · {item.location} · {item.source}</div></div>
          <span className="tag"><span className="status-dot" />{item.stage}</span>
          <button className="button primary">Prepare application</button>
          <button className="icon-button" aria-label="Opportunity menu"><Ellipsis /></button>
        </div>
        <nav className="tabs" aria-label="Opportunity sections">{tabs.map((tab) => <Link key={tab} className={`tab ${currentTab === tab ? "active" : ""}`} href={`/opportunities/${item.id}?tab=${tab.toLowerCase()}`}>{tab}</Link>)}</nav>
      </header>
      <div className="workspace-grid">
        <main className="workspace-main">
          <section className="content-section">
            <div className="content-section-head"><div><h2>Role overview</h2><p className="page-subtitle">Snapshot retrieved August 15 · Source is current</p></div><button className="button ghost"><ExternalLink />Open listing</button></div>
            <dl className="detail-list">
              <div className="detail-row"><dt>Employment</dt><dd>Full-time</dd></div><div className="detail-row"><dt>Remote policy</dt><dd>Remote, worldwide</dd></div><div className="detail-row"><dt>Timezone</dt><dd>4 hours overlap with GMT–8 to GMT+1</dd></div><div className="detail-row"><dt>Seniority</dt><dd>Mid-level</dd></div><div className="detail-row"><dt>Posted</dt><dd>August 12, 2025</dd></div><div className="detail-row"><dt>Application URL</dt><dd><a href="#">jobs.linear.app/product-engineer</a></dd></div>
            </dl>
          </section>
          <section className="content-section">
            <div className="content-section-head"><div><h2>Requirements matrix</h2><p className="page-subtitle">5 of 7 required criteria have strong approved evidence.</p></div><button className="button ghost">Review analysis</button></div>
            <div className="requirement-row header"><span>Requirement</span><span>Importance</span><span>Match</span><span>Evidence</span></div>
            {requirements.map((row) => <div className="requirement-row" key={row.requirement}><strong>{row.requirement}</strong><span className="muted">{row.importance}</span><span className={`match ${row.tone}`}>{row.match}</span><Link href="/settings/profile">{row.evidence}</Link></div>)}
          </section>
          <section className="content-section"><h2>Job description snapshot</h2><div className="prose" style={{ marginTop: 12 }}><p>Join the product engineering team to build fast, thoughtful workflows used by modern software teams. You’ll work across the stack, own features from concept through measurement, and collaborate closely with design.</p><p>The role favors engineers who care about interaction quality, product decisions, accessible interfaces, and dependable systems. Experience with TypeScript, React, Node.js, and relational data is central.</p></div></section>
        </main>
        <aside className="context-panel" aria-label="Opportunity context">
          <section className="next-action"><div className="section-label">Next action</div><div className="next-action-title">{item.nextAction}</div><div className="next-action-date"><CalendarClock size={13} /> Due August 20</div><button className="button primary">Open preparation <ArrowRight /></button></section>
          <section className="fit-block" style={{ paddingTop: 20 }}><div className="fit-title"><div><h2>Fit analysis</h2><span className="muted small">Updated 4 min ago</span></div><span className="fit-number">{item.fit}%</span></div><p className="fit-reason"><strong>{item.fitLabel}.</strong> Strong product engineering evidence; GraphQL is partial and the requested experience is one year above profile.</p>{dimensions.map((dimension) => <div className="dimension" key={dimension.label}><div className="dimension-head"><span>{dimension.label}</span><span className="mono">{dimension.value}</span></div><div className="dimension-bar"><div className="dimension-fill" style={{ width: `${dimension.value}%` }} /></div></div>)}</section>
          <section className="task-list"><div className="content-section-head"><h2>Tasks</h2><button className="icon-button" aria-label="Add task"><Plus /></button></div>{["Research engineering culture", "Review resume changes", "Prepare product deep-dive"].map((task) => <div className="task-item" key={task}><button className="task-check" aria-label={`Complete ${task}`} /><span>{task}</span></div>)}</section>
        </aside>
      </div>
    </div>
  );
}
