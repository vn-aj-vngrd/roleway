# Roleway

Roleway models a person’s job search as a deliberate workflow from discovering a listing through reaching a final outcome.

## Language

**Account**:
A person’s private Roleway identity, global Career Profile, Agent, Insights, and Notification Center. An Account can own several Workspaces.
_Avoid_: Workspace

**Workspace**:
One focused job search with its own icon or emoji, color, objective, preferences, Opportunity ticket key, Jobs, Opportunities, documents, people, goals, and attributed notification events. Workspaces isolate operational records so different role targets and strategies never mix; account-wide surfaces may aggregate those records. The database retains the legacy `search_projects` table and `project_id` keys; these are storage names, not product language.
_Avoid_: Account, Job, Opportunity, pipeline

**Home**:
The Workspace-scoped return surface that combines the Workspace’s objective and strategy context with its ordered queue of due tasks, Next Actions, follow-ups, interviews, and Jobs awaiting review. Home is a projection of existing records, not a separate record type.
_Avoid_: Today, dashboard

**Job**:
Objective listing data captured from a source inside one Workspace. A Job can remain in discovery without becoming user-managed work.
_Avoid_: Application, Opportunity

**Opportunity**:
A person’s tracked relationship with one Job inside a Workspace, including evaluation, application work, people, interviews, documents, next action, history, and outcome.
_Avoid_: Lead, saved job, card

**Application Record**:
The durable record of what a person submitted for an Opportunity, when and where they submitted it, and which documents or answers they used.
_Avoid_: Opportunity, Job

**Contact**:
A person relevant to a Workspace or Opportunity, such as a recruiter, hiring manager, interviewer, referral, or networking contact.
_Avoid_: User, account

**Stage**:
The workflow position of an Opportunity: Interested, Preparing, Applied, Interview, Offer, or Closed. Inbox belongs only to untracked Jobs.
_Avoid_: Column, status

**Next Action**:
The single concrete action that most directly advances an active Opportunity.
_Avoid_: Recommendation, generic task

**Career Profile**:
The user-approved source of truth for career facts and evidence that generated material may use.
_Avoid_: Master resume, AI memory

**Career Evidence**:
A specific approved skill, experience, project, achievement, education, or certification that supports a claim.
_Avoid_: Generated claim

**Resume Base**:
A reusable role-oriented selection and arrangement of approved Career Profile content.
_Avoid_: Template

**Resume Version**:
An immutable Opportunity-specific or base revision whose changes can be reviewed and approved.
_Avoid_: Resume Base, document

**Job Requirement**:
A normalized expectation extracted from a Job snapshot, with importance and source provenance.
_Avoid_: Skill

**Fit Analysis**:
A structured, explainable comparison of Job Requirements, preferences, and Career Evidence at a point in time.
_Avoid_: Match score

**Application Plan**:
A reviewable set of recommendations, risks, source material, and proposed tasks for one Opportunity.
_Avoid_: Auto-apply

**Roleway Agent**:
The account-wide conversational assistant. It can answer questions from permitted context across the Account’s Workspaces, prepare drafts, and propose internal changes. Every proposed mutation identifies its destination Workspace and requires explicit approval; external actions remain unavailable.
_Avoid_: Chatbot, autopilot, recruiter, auto-apply

**Agent Conversation**:
A durable account-owned thread that can use all permitted Workspace context and may focus on one Opportunity. Starting a new conversation creates a clean context; a focused mutation never crosses the target record’s Workspace.
_Avoid_: Prompt history, Workspace chat

**Agent Run**:
A durable, inspectable execution containing context, model, steps, tool calls, outputs, errors, and approvals.
_Avoid_: Spinner, chat response

**Approval**:
A user decision permitting a proposed internal change or required external action.
_Avoid_: Confirmation

**Interview Event**:
A scheduled hiring interaction attached to an Opportunity.
_Avoid_: Preparation session

**Preparation Plan**:
A contextual set of preparation topics and tasks derived from an Interview Event, Job Requirements, and Career Evidence.
_Avoid_: Interview Event

**Closed Outcome**:
The terminal result of an Opportunity, including rejection, withdrawal, no response, role closure, declined offer, or acceptance.
_Avoid_: Deleted opportunity
