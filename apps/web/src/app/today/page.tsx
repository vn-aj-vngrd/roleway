import { ArrowRight, CalendarClock, FileCheck2, Inbox, MessageSquareText } from "lucide-react";
import Link from "next/link";

const focus = [
  { time: "10:00 AM", title: "Technical interview", meta: "Acme · Senior Software Engineer · 60 min", detail: "Starts in 2 hours", action: "Open prep", href: "/preparation", icon: CalendarClock },
  { time: "Due today", title: "Follow up", meta: "GitBook · Product Engineer", detail: "Applied 6 days ago", action: "Prepare follow-up", href: "/opportunities/RLW-016", icon: MessageSquareText },
  { time: "Ready", title: "Application ready", meta: "Plane · Full-Stack Engineer", detail: "91% fit · 3 changes need review", action: "Review application", href: "/opportunities/RLW-027", icon: FileCheck2 },
  { time: "New", title: "Recommended jobs", meta: "12 found · 4 recommended", detail: "Best match: Product Engineer at PostHog", action: "Review inbox", href: "/jobs", icon: Inbox },
];

export default function TodayPage() {
  return (
    <div className="page narrow">
      <header className="greeting">
        <h1>Good morning, Alex</h1>
        <p className="page-subtitle">Four things need your attention. Start with the interview.</p>
      </header>
      <div className="section-label">Today · Tuesday, August 19</div>
      <section className="focus-list" aria-label="Today’s priorities">
        {focus.map((item) => {
          const Icon = item.icon;
          return (
            <article className="focus-item" key={item.title}>
              <time className="focus-time">{item.time}</time>
              <div className="action-line" aria-hidden="true"><span className="action-node" /></div>
              <div>
                <div className="focus-title">{item.title}</div>
                <div className="focus-meta">{item.meta}</div>
                <div className="focus-detail"><Icon size={14} aria-hidden="true" /><span>{item.detail}</span></div>
              </div>
              <Link href={item.href} className={`button ${item.title === "Technical interview" ? "primary" : "secondary"}`}>{item.action}<ArrowRight /></Link>
            </article>
          );
        })}
      </section>
      <footer className="today-footer">
        <div>
          <h2>This week</h2>
          <p className="page-subtitle">Quality work, not application volume.</p>
        </div>
        <div className="goal-track" aria-label="Weekly goals">
          <div className="goal"><b>5 / 8</b><span>quality applications</span></div>
          <div className="goal"><b>2 / 3</b><span>follow-ups</span></div>
          <div className="goal"><b>3 / 4</b><span>prep sessions</span></div>
        </div>
      </footer>
    </div>
  );
}
