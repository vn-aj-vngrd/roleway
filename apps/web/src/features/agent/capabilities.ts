export const agentCapabilities = [
  { group: "Create", label: "Workspace", description: "Start a focused job search", prompt: "Help me create a Workspace. Ask me one question at a time, then propose it for approval." },
  { group: "Create", label: "Task", description: "Plan work for an Opportunity", prompt: "Help me create a task for an Opportunity. Ask me one question at a time, then propose it for approval." },
  { group: "Create", label: "Next Action", description: "Choose the next step for an Opportunity", prompt: "Help me set an Opportunity's Next Action. Ask me one question at a time, then propose it for approval." },
  { group: "Create", label: "Note", description: "Save context on an Opportunity", prompt: "Help me add a note to an Opportunity. Ask me one question at a time, then propose it for approval." },
  { group: "Create", label: "Interview", description: "Record an interview and preparation work", prompt: "Help me create an interview for an Opportunity. Confirm its type, date, time, timezone and duration, one question at a time, then propose it for approval. Do not send a calendar invitation." },
  { group: "Create", label: "Contact", description: "Save a person in a Workspace", prompt: "Help me create a contact. Confirm the Workspace, name, relationship and optional Opportunity, ask for any contact details I want to save, and check for duplicates before proposing it for approval. Do not send a message." },
  { group: "Explore", label: "Today & follow-ups", description: "Due tasks, interviews and next steps", prompt: "What needs my attention today across my Workspaces? Include overdue tasks, Next Actions, interviews and contact follow-ups. State any missing context." },
  { group: "Explore", label: "Workspaces", description: "Review search objectives and preferences", prompt: "Summarize my Workspaces, their objectives and search preferences using the available context." },
  { group: "Explore", label: "Opportunities", description: "Review stages, priorities and Next Actions", prompt: "Review my active Opportunities. Which have no clear Next Action, and what would you suggest?" },
  { group: "Explore", label: "Jobs", description: "Review captured Jobs awaiting attention", prompt: "Help me review the Jobs in my Inbox using the available listing information. Ask which Workspace if needed." },
  { group: "Explore", label: "Tasks", description: "Prioritize outstanding work", prompt: "Help me prioritize my outstanding Opportunity tasks across Workspaces." },
  { group: "Explore", label: "Interviews", description: "Prepare for an upcoming conversation", prompt: "Help me prepare for an upcoming interview. Ask which interview if needed, then draft preparation topics and questions from the available context." },
  { group: "Explore", label: "Contacts", description: "Review people and draft follow-ups", prompt: "Review my contacts and follow-ups. Help me draft a message that I can send myself. Ask who if needed." },
  { group: "Explore", label: "Documents", description: "Review document inventory and draft text", prompt: "Review my document inventory and help me draft a section. Ask which document and request its text when it is not in your context." },
  { group: "Explore", label: "Career Profile & fit", description: "Compare available career facts with a role", prompt: "Help me compare my Career Profile with an Opportunity. Ask which role if needed, distinguish evidence from gaps, and request any missing career facts or Job description." },
] as const;

export function matchingCapabilities(query: string) {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return agentCapabilities.filter(item => words.every(word => `${item.group} ${item.label} ${item.description}`.toLowerCase().includes(word)));
}
