import { FileText, MoreHorizontal, Plus } from "lucide-react";

const documents = [
  { title: "Full Stack", sub: "Resume base · 4 versions", status: "Approved", used: "Used 2 days ago" },
  { title: "Linear v3", sub: "Tailored resume · RLW-024", status: "Submitted", used: "Updated Aug 15" },
  { title: "Plane application answers", sub: "Application answers · RLW-027", status: "Review", used: "Updated today" },
  { title: "Why this company?", sub: "Answer bank · 3 variants", status: "Approved", used: "Used 6 days ago" },
  { title: "GitBook follow-up", sub: "Follow-up · RLW-016", status: "Draft", used: "Updated today" },
];

export default function DocumentsPage() {
  return <div className="page narrow"><header className="page-header"><div className="page-header-copy"><h1>Documents</h1><p className="page-subtitle">Versioned material tied to the work it supports.</p></div><button className="button primary"><Plus />New document</button></header><div className="split-header" style={{ marginBottom: 16 }}><div className="segmented"><button className="active">All</button><button>Resumes</button><button>Answers</button><button>Messages</button></div></div><section className="document-list" aria-label="Documents">{documents.map((document) => <article className="list-row" key={document.title}><span className="list-icon"><FileText /></span><div><div className="list-title">{document.title}</div><div className="list-subtitle">{document.sub}</div></div><span className="tag">{document.status}</span><span className="muted small">{document.used}</span><button className="icon-button" aria-label={`${document.title} menu`}><MoreHorizontal /></button></article>)}</section></div>;
}
