export type Stage = "Inbox" | "Interested" | "Preparing" | "Applied" | "Interview" | "Offer" | "Closed";

export type Opportunity = {
  id: string;
  company: string;
  role: string;
  stage: Stage;
  compensation: string;
  location: string;
  fit: number;
  fitLabel: string;
  nextAction: string;
  date?: string;
  source: string;
  age: string;
};

export const opportunities: Opportunity[] = [
  { id: "RLW-024", company: "Linear", role: "Product Engineer", stage: "Interview", compensation: "$75k–$95k", location: "Remote", fit: 93, fitLabel: "Strong apply", nextAction: "Prepare technical round", date: "Aug 21", source: "Wellfound", age: "6d" },
  { id: "RLW-027", company: "Plane", role: "Full-Stack Engineer", stage: "Preparing", compensation: "$70k–$90k", location: "Remote · APAC", fit: 91, fitLabel: "Strong apply", nextAction: "Review application", date: "Today", source: "Company site", age: "3d" },
  { id: "RLW-019", company: "Acme", role: "Senior Software Engineer", stage: "Interview", compensation: "$85k–$110k", location: "Remote", fit: 86, fitLabel: "Apply", nextAction: "Open interview prep", date: "Today, 10:00", source: "Referral", age: "12d" },
  { id: "RLW-030", company: "Attio", role: "Frontend Engineer", stage: "Interested", compensation: "$90k–$120k", location: "Remote · EU overlap", fit: 84, fitLabel: "Apply", nextAction: "Resolve timezone constraint", source: "Otta", age: "1d" },
  { id: "RLW-016", company: "GitBook", role: "Product Engineer", stage: "Applied", compensation: "$80k–$105k", location: "Remote", fit: 89, fitLabel: "Apply", nextAction: "Prepare follow-up", date: "Due today", source: "LinkedIn", age: "9d" },
  { id: "RLW-031", company: "Resend", role: "Software Engineer", stage: "Inbox", compensation: "$95k–$130k", location: "Remote", fit: 88, fitLabel: "Apply", nextAction: "Review requirements", source: "Company site", age: "4h" },
  { id: "RLW-012", company: "Raycast", role: "Web Engineer", stage: "Closed", compensation: "$85k–$110k", location: "Remote · Europe", fit: 77, fitLabel: "Consider", nextAction: "None", source: "Otta", age: "26d" },
];

export const inboxJobs = [
  { company: "Resend", role: "Software Engineer", meta: "$95k–$130k · Remote", fit: 88, recommendation: "Apply", reason: "Strong TypeScript and product ownership evidence", posted: "4 hours ago", source: "Company site" },
  { company: "Vercel", role: "DX Engineer", meta: "$110k–$145k · Remote", fit: 82, recommendation: "Consider", reason: "Strong frontend fit; developer advocacy is partial", posted: "Yesterday", source: "Wellfound" },
  { company: "PostHog", role: "Product Engineer", meta: "$90k–$125k · Remote", fit: 91, recommendation: "Strong apply", reason: "Meets 9 of 10 major requirements", posted: "2 days ago", source: "Company site" },
  { company: "Northstar", role: "Senior React Engineer", meta: "$72k–$92k · On-site", fit: 61, recommendation: "Weak match", reason: "On-site conflicts with a required preference", posted: "3 days ago", source: "Imported URL" },
];

export const requirements = [
  { requirement: "TypeScript", importance: "Required", match: "Strong", evidence: "3 years professional", tone: "good" },
  { requirement: "React", importance: "Required", match: "Strong", evidence: "Multiple production projects", tone: "good" },
  { requirement: "Node.js", importance: "Required", match: "Strong", evidence: "Backend and API experience", tone: "good" },
  { requirement: "GraphQL", importance: "Preferred", match: "Partial", evidence: "Rally project usage", tone: "warn" },
  { requirement: "Kubernetes", importance: "Preferred", match: "Gap", evidence: "No approved evidence", tone: "muted" },
];
