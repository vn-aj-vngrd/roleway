export const helpTopics = [
  {
    id: "start",
    title: "Start with Roleway",
    description:
      "Set up your account and follow a job search from discovery to outcome.",
    slugs: ["getting-started", "search-walkthrough", "account-and-recovery"],
  },
  {
    id: "workspaces",
    title: "Workspaces and daily work",
    description: "Keep searches separate and decide what happens next.",
    slugs: [
      "workspace-strategy",
      "home-and-tasks",
      "search-and-navigation",
      "workspaces-and-limits",
    ],
  },
  {
    id: "opportunities",
    title: "Jobs and Opportunities",
    description: "Capture listings, track applications, and record decisions.",
    slugs: [
      "capture-and-inbox",
      "opportunity-workflow",
      "applications-and-outcomes",
    ],
  },
  {
    id: "prepare",
    title: "Prepare and follow up",
    description:
      "Manage interviews, contacts, notes, and application documents.",
    slugs: [
      "interviews-and-preparation",
      "contacts-and-follow-ups",
      "documents-and-history",
      "notes-and-evidence",
    ],
  },
  {
    id: "agent",
    title: "Roleway Agent",
    description:
      "Connect a provider, explore your search, and approve internal changes.",
    slugs: ["agent-and-privacy", "agent-create", "agent-explore"],
  },
  {
    id: "account",
    title: "Settings, insights, and privacy",
    description:
      "Understand your data, notifications, appearance, and account controls.",
    slugs: [
      "insights",
      "notifications",
      "profile-and-appearance",
      "privacy-and-export",
      "mobile-and-installation",
    ],
  },
  {
    id: "support",
    title: "Plans and support",
    description: "Understand limits, manual payments, and how to get help.",
    slugs: ["manual-payments", "support-and-troubleshooting"],
  },
  {
    id: "admin",
    title: "Administration",
    description: "Guidance for authorized administrators managing the product.",
    slugs: ["administration"],
  },
] as const;

export function topicForArticle(slug: string) {
  return helpTopics.find((topic) =>
    (topic.slugs as readonly string[]).includes(slug),
  );
}

export const helpActions: Record<string, { href: string; label: string }> = {
  "getting-started": { href: "/home", label: "Open Home" },
  "search-walkthrough": { href: "/home", label: "Open Home" },
  "account-and-recovery": { href: "/login", label: "Sign in" },
  "workspace-strategy": {
    href: "/settings/workspaces",
    label: "Manage Workspaces",
  },
  "home-and-tasks": { href: "/home", label: "Review today's work" },
  "search-and-navigation": { href: "/home", label: "Open Roleway" },
  "workspaces-and-limits": {
    href: "/settings/billing",
    label: "Check your limits",
  },
  "capture-and-inbox": { href: "/inbox", label: "Open Inbox" },
  "opportunity-workflow": {
    href: "/opportunities",
    label: "Open Opportunities",
  },
  "applications-and-outcomes": {
    href: "/opportunities",
    label: "Review Opportunities",
  },
  "interviews-and-preparation": {
    href: "/interview",
    label: "Open Interviews",
  },
  "contacts-and-follow-ups": { href: "/contacts", label: "Open Contacts" },
  "documents-and-history": { href: "/documents", label: "Open Documents" },
  "notes-and-evidence": { href: "/opportunities", label: "Open Opportunities" },
  "agent-and-privacy": { href: "/settings/ai", label: "Connect your provider" },
  "agent-create": { href: "/agent", label: "Create with Agent" },
  "agent-explore": { href: "/agent", label: "Explore with Agent" },
  insights: { href: "/insights", label: "Open Insights" },
  notifications: { href: "/notifications", label: "Open Notifications" },
  "profile-and-appearance": {
    href: "/settings/profile",
    label: "Open Profile settings",
  },
  "privacy-and-export": {
    href: "/settings/privacy",
    label: "Open Privacy & data",
  },
  "mobile-and-installation": { href: "/home", label: "Open Roleway" },
  "manual-payments": {
    href: "/settings/billing",
    label: "Open Plan & billing",
  },
  administration: { href: "/admin", label: "Open Admin" },
};

export function matchesHelpQuery(
  article: { title: string; summary: string; body: string },
  query: string,
) {
  const text =
    `${article.title} ${article.summary} ${article.body}`.toLowerCase();
  return query
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .every((word) => text.includes(word));
}

// A deliberately small plain-text format. React escapes all content, including HTML.
export function articleBlocks(body: string) {
  return body
    .split(/\n\s*\n/)
    .filter((block) => block.trim())
    .map((text, index) => {
      const lines = text.trim().split("\n");
      const heading = lines[0]?.startsWith("## ")
        ? lines.shift()!.slice(3)
        : null;
      const numbered =
        lines.length > 0 && lines.every((line) => /^\d+\. /.test(line));
      const bullets =
        lines.length > 0 && lines.every((line) => line.startsWith("- "));
      return {
        id: `section-${index}`,
        heading,
        kind: numbered
          ? ("ordered" as const)
          : bullets
            ? ("unordered" as const)
            : ("paragraph" as const),
        lines: lines.map((line) =>
          numbered
            ? line.replace(/^\d+\. /, "")
            : bullets
              ? line.slice(2)
              : line,
        ),
      };
    });
}
