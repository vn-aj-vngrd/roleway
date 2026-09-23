# Roleway Core Workflow

_Status: product consolidation proposal and working-tree audit · August 26, 2026_

## Executive decision

Roleway should do one job exceptionally well:

> Turn a promising job listing into a deliberate next action, keep all work attached to that Opportunity, and bring the user back when action is due.

The product loop is:

```text
Choose Workspace → Capture Job → Decide → Advance Opportunity → Record result → Follow up → Close → Learn
                         ↑                                      ↓
                         └────────────── Home ─────────────────┘
```

The current application already implements most of this loop. Its main problem is not lack of capability; it is that the capability is distributed across many destinations and described with overlapping concepts. The consolidation priority is therefore **workflow clarity before more feature breadth**.

### Implementation pass

The first consolidation pass now removes Opportunity Inbox from product stages, standardizes Next Action copy, replaces indefinite Maybe with Later plus a return date, shortens onboarding to two essential steps, opens first-time users directly into real Job capture, adds stage-aware focus guidance to the Opportunity dossier, and removes application-volume goals from the user workflow. The remaining roadmap items below are intentionally sequenced after this foundation.

## The product contract

At any moment, a user should be able to answer four questions without reconstructing context:

1. **What search am I running?** — the active Workspace.
2. **Which roles deserve effort?** — Jobs awaiting a decision and active Opportunities.
3. **What should I do next?** — one Next Action per active Opportunity, ordered on Home.
4. **What happened?** — submission, conversation, document, stage, and outcome history.

If a feature does not improve one of those answers, it is not part of the core workflow.

## Canonical model

```text
Account
├── Career Profile                 approved, reusable career facts
└── Workspace                      one focused search strategy
    ├── Job Inbox                  discovered listings awaiting a decision
    ├── Home                      due actions across active work
    └── Opportunity                a Job the user decided to pursue
        ├── Next Action            exactly one leading action
        ├── Tasks                  supporting work
        ├── Application Record     what was submitted, where, and when
        ├── Interviews             schedule, preparation, notes, outcome
        ├── Contacts               people and follow-ups
        ├── Documents              drafts, versions, submitted snapshots
        └── Activity               durable history and Closed Outcome
```

### Terms that must not blur

- A **Job** is captured listing data. It belongs in the Job Inbox until the user tracks, defers, or dismisses it.
- An **Opportunity** exists only after the user decides the Job deserves active work.
- A **Stage** says where the Opportunity is in the hiring process.
- A **Next Action** says what the user will do to move it forward.
- A **Task** supports an Opportunity but does not replace its single Next Action.
- **Home** is an action projection, not another place where records live.
- Interviews, Contacts, Documents, Insights, and Board are projections or supporting records. The Opportunity remains the center of work.

## End-to-end workflow

### 1. Sign up and reach first value

**User goal:** start tracking a real search with minimal setup.

Recommended flow:

1. Create Account.
2. Name the first Workspace and enter one target role. Everything else is optional and can be refined later.
3. Choose one of three immediate starts:
   - add a Job URL;
   - add a Job manually;
   - import existing applications from CSV.
4. Review the first captured Job.
5. Track it and land directly on its Opportunity with a suggested, editable Next Action.

**First-value event:** the user sees one real Opportunity and its next useful action. Completing a product tour is not first value.

The Career Profile should be progressively completed after this loop begins. A resume/profile import is a useful accelerator, but tracking must work without it.

### 2. Capture a Job

**User goal:** preserve a listing quickly without committing to pursue it.

Required paths:

- URL capture with clear source and honest missing-field handling;
- manual entry that requires only company and role title;
- duplicate warning within the active Workspace;
- later: CSV import for users leaving spreadsheets or another tracker.

Successful capture always ends in the active Workspace’s **Job Inbox**. It must not silently become an Opportunity or application.

### 3. Decide in the Job Inbox

**User goal:** prevent saved jobs from becoming a graveyard.

Every Job receives one decision:

| Decision | Result |
| --- | --- |
| **Track** | Create one Opportunity in **Interested** and open it. |
| **Later** | Remove it from the immediate queue until a chosen review date. |
| **Dismiss** | Keep the source/history but remove it from active views. |

“Later” needs a review date. An indefinite `maybe` state is storage, not triage.

### 4. Advance an Opportunity

**User goal:** decide whether and how to invest effort.

The Opportunity dossier should lead with this compact control block:

1. Stage
2. Next Action and due date
3. Priority
4. application deadline
5. source/apply link

Then show context in the order work normally occurs:

1. role description and decision notes;
2. application material and Application Record;
3. tasks;
4. interviews and preparation;
5. people and follow-ups;
6. documents;
7. activity.

Stages remain non-linear because users may add work late:

```text
Interested → Preparing → Applied → Interview → Offer → Closed
```

The normal path is linear, but the controls may jump to any stage. Closing requires a Closed Outcome. **Inbox should not be an Opportunity Stage** because the Job Inbox already owns intake.

### 5. Apply and preserve the submission

**User goal:** remember exactly what was sent and ensure follow-up happens.

Recording an application should:

- capture submission date/time and channel;
- preserve confirmation and optional answers/notes;
- attach immutable versions of the resume and cover letter used;
- move the Opportunity to Applied;
- create one visible follow-up with a user-adjustable due date;
- update Home and Activity.

Roleway prepares and records. The user submits externally.

### 6. Follow up and manage people

**User goal:** retain relationship context without maintaining a separate CRM.

Contacts may exist at Workspace level, but Opportunity-linked contacts should be created and used from the Opportunity. A follow-up appears on Home and returns the user to the relevant Opportunity or Contact. Completing it should prompt for the next action only when useful, not create a chain of automatic noise.

### 7. Prepare for and record interviews

**User goal:** enter each conversation with relevant context and preserve what happened.

Scheduling an Interview should:

- attach it to one Opportunity;
- capture type, date/time, timezone, meeting link, and people;
- create one preparation task;
- move eligible Opportunities to Interview;
- place preparation and the event on Home.

The Interview view should keep preparation topics, questions, notes, outcome, and follow-up together. Completing an interview should ask: **What happens next?**

### 8. Close and learn

**User goal:** remove dead work without losing useful history.

Closing requires a structured outcome such as Rejected, Withdrawn, No response, Role closed, Offer declined, or Accepted. Closing clears the Opportunity from active Home work while retaining the dossier for search, export, and Insights.

Insights should answer a small set of operational questions only after enough data exists:

- Which sources produce conversations?
- Where are Opportunities stalling?
- Are follow-ups and preparation being completed?
- Which submitted document versions were associated with outcomes?

Insights must not claim causation or predict hiring decisions.

## What Home must do

Home is the home screen and the return loop. It should contain one ordered queue, not a dashboard:

1. overdue items;
2. interviews and preparation due soon;
3. application and contact follow-ups;
4. due Next Actions and tasks;
5. active Opportunities missing a Next Action;
6. Jobs whose Inbox review date has arrived.

Each row needs one clear action: complete, review, or open. The product should avoid showing the same work twice as both a Task and Next Action.

When the queue is clear, the empty state should offer only two meaningful choices: capture a Job or review active Opportunities.

## Essential feature set

### Required for the core promise

| Capability | Why it is essential | Current state |
| --- | --- | --- |
| Account, recovery, export, deletion | Trust and durable private use | Implemented |
| Workspace create/switch/archive | Separates distinct search strategies | Implemented |
| Fast manual and URL Job capture | Starts the operating loop | Implemented |
| Job Inbox with track/later/dismiss | Separates discovery from commitment | Partial: later has no review date |
| Opportunity List plus dossier | Active work and full context | Implemented |
| Stage plus required Closed Outcome | Honest lifecycle tracking | Implemented, but duplicate Inbox stage remains |
| One Next Action with due date | Core differentiation from passive trackers | Implemented, inconsistently named “Next step” |
| Home action queue | Restores attention and prevents dropped work | Implemented |
| Application Record and submitted versions | Trustworthy application history | Implemented |
| Tasks and predictable follow-ups | Supports execution | Implemented |
| Interviews, preparation, notes, outcome | Supports the highest-value stage | Implemented |
| Lightweight Contacts and follow-ups | Preserves relationship context | Implemented |
| Documents and append-only versions | Keeps material with the Opportunity | Implemented |
| Workspace-scoped search | Retrieves complete context | Implemented |
| Accessible mobile essentials | Capture and act away from desktop | Implemented and E2E-covered |

### Essential next improvements

These close workflow gaps rather than expand the product sideways:

1. **Remove Opportunity “Inbox” as a stage.** Migrate any existing value to Interested. Keep Inbox exclusively for untracked Jobs.
2. **Replace indefinite Maybe with Later + review date.** Return deferred Jobs to Home/Inbox on that date.
3. **Use “Next Action” everywhere.** Do not alternate among Next step, next up, recommendation, and generic task.
4. **Shorten onboarding.** Require Workspace name and target role, then begin with a real Job. Move compensation, technologies, locations, and product education into progressive setup.
5. **Add CSV import with preview and row-level errors.** This is the lowest-risk way to activate users who already have a spreadsheet or tracker.
6. **Add Career Profile/resume import and evidence review.** The current profile is too thin to support the evidence-first product promise or consistently grounded assistance.
7. **Add stage-aware primary actions.** Interested: evaluate; Preparing: prepare application; Applied: follow up; Interview: prepare/record; Offer: evaluate; Closed: review outcome.
8. **Make completion ask for the next useful move.** After an application, follow-up, or interview, update the Next Action rather than leaving stale work.

### Supporting, not core

- Board view
- saved filter views
- Notifications inbox
- Insights
- optional Roleway Agent
- admin console
- PWA installation

These may remain, but they should never compete visually with Home, Inbox, Opportunities, or the active Workspace.

### Explicitly later

- browser extension/autofill, after a permissions and privacy design;
- email/calendar sync, after token storage and recovery design;
- legitimate job-source adapters;
- explainable Job Requirement ↔ Career Evidence analysis;
- optional reusable application-answer bank.

### Not part of Roleway’s essential product

- mass auto-apply or background submission;
- automated recruiter outreach;
- a scraped job marketplace;
- opaque ATS, fit, or hireability scores;
- generic project management or automation rules;
- team CRM and collaboration;
- billing-driven feature gates before the core loop is proven.

## Working-tree audit

### What is coherent today

The implementation has a real connected loop, not a collection of mock screens:

- onboarding creates the Account profile and first Workspace atomically (`apps/web/src/app/onboarding/actions.ts`);
- Job capture supports manual and guarded URL import (`apps/web/src/features/capture/actions.ts`, `apps/web/src/features/workspace/actions.ts`);
- Inbox decisions are explicit and tracking is idempotent (`apps/web/src/components/job-inbox.tsx`, `public.track_job`);
- tracking creates an Interested Opportunity with a default Next Action;
- the dossier connects the Application Record, tasks, interviews, documents, people, and activity (`apps/web/src/app/(app)/opportunities/[id]/page.tsx`);
- application submission and interview scheduling create predictable follow-up/preparation work;
- Home merges tasks, interviews, Next Actions, contact follow-ups, and Inbox review (`apps/web/src/app/(app)/home/page.tsx`);
- the critical E2E journey exercises signup through application and interview rather than only testing isolated pages (`apps/web/tests/e2e/critical-flow.spec.ts`).

### Why it still feels confusing

1. **The same word represents two states.** There is a Job Inbox and an Opportunity stage named Inbox, even though tracking currently creates an Interested Opportunity. Users should never have to determine which Inbox a record means.
2. **The central mechanism has several labels.** The domain says Next Action while the dossier says Next step and Home says Next up. “Next up” can remain a queue heading, but the record field must always be Next Action.
3. **Onboarding explains the model before proving it.** The user enters profile, technologies, location, remote preference, and compensation, then sees a workflow lesson and product tour before working with a real Job.
4. **Top-level navigation exposes the feature inventory.** Agent, Insights, Notifications, Interviews, Contacts, and Documents are all visible destinations. Supporting projections must remain subordinate to the core loop even when Agent is a product highlight.
5. **The dossier is complete but uniformly weighted.** Application, tasks, interviews, documents, people, activity, status, decision, properties, and Agent entry points can all compete. The stage-specific action must remain dominant; contextual Agent access is one quiet action into the shared Agent surface.
6. **“Maybe” has no recovery mechanism.** Keeping a Job for later does not answer when it should return.
7. **The selective-search positioning conflicts with a volume goal.** `weekly_application_goal` defaults to five and appears in Workspace settings, but application volume is not the stated success measure. Prefer a weekly progress/review commitment or remove the field until it drives a meaningful workflow.
8. **Career Profile is promised more deeply than implemented.** Current onboarding/profile fields provide identity and summary, but not the approved evidence, resume base, or requirement mapping described in the glossary.
9. **The existing production audit measures presence more than comprehension.** `docs/PRODUCT-AUDIT.md` accurately lists implemented paths, but its 9/10 clarity score does not account for the duplicate Inbox concept, navigation competition, or pre-value onboarding load.
10. **The existing competitive assessment is directionally strong but too broad for sequencing.** `docs/COMPETITIVE-ASSESSMENT.md` identifies many possible capabilities; this document reduces them to the smallest coherent loop and separates core, next, later, and rejected work.

## Market research: what to adopt and what to resist

This review uses first-party product/help documentation. Vendor claims describe intended behavior, not independent proof of user outcomes.

### Patterns worth adopting

- **Fast capture plus manual fallback is table stakes.** Huntr presents its browser extension as the fastest capture path while retaining manual entry for unsupported or off-browser jobs. Roleway’s current URL/manual pair is credible; CSV should be the next low-permission import path. [Huntr Job Board](https://help.huntr.co/en/articles/13413245-the-job-board)
- **Existing data must be easy to bring in.** Simplify supports extension capture, manual entry, and CSV import/export, and keeps status, documents, and application history together. Roleway has private JSON export but lacks a migration path into the product. [Simplify Job Tracker](https://help.simplify.jobs/articles/2140179-using-the-job-tracker)
- **Triage needs a timed deferral.** Linear’s Triage separates intake from committed work and offers accept, decline, duplicate, and snooze; snoozed work returns at a chosen time or on new activity. For Roleway, Track, Dismiss, and Later-until-date are the appropriate job-search translation. [Linear Triage](https://linear.app/docs/triage)
- **Simple lifecycle language is valuable.** Indeed’s Saved, Applied, Interviews, and Archived model is easy to understand, but its own documentation says external applications require manual movement and the UI does not retain a complete history. Roleway should preserve that simplicity while owning cross-source context and durable history. [Indeed My Jobs](https://support.indeed.com/hc/en-us/articles/205332490-What-is-My-Jobs)
- **Multiple views should remain projections of the same records.** Notion’s databases support list, table, board, calendar, and other views over one source. Roleway should keep List, Board, Home, and future calendar views subordinate to the Opportunity model rather than turning each into a separate workflow. [Notion database views](https://www.notion.com/help/views-filters-and-sorts)

### Patterns to resist

- **Board-as-product.** Huntr allows deeply customized stages and multiple boards. That flexibility is useful, but it can make setup and board maintenance the job. Roleway should own a stable job-search model and keep Board secondary.
- **Automatic capture as the whole value proposition.** Simplify can add applications through its own job board or after Copilot use. Roleway should not depend on browser access or external submission to remain useful.
- **Source-bound history.** Indeed explicitly notes incomplete history and manual updates for applications made elsewhere. Roleway’s advantage is one durable, source-independent Opportunity.
- **Volume and opaque scoring.** Existing Roleway research correctly rejects auto-apply and unexplained fit scores. The stronger alternative is not more dashboards; it is better Next Actions, evidence, and complete records.

## Consolidation plan

### Phase 1 — remove conceptual ambiguity

- remove the Opportunity Inbox stage;
- rename the record field and UI copy consistently to Next Action;
- change Maybe to Later with a review date;
- demote supporting utilities in navigation;
- make stage-aware action prompts dominant in the dossier.

**Acceptance test:** a new user can explain Job vs Opportunity, find what to do today, and move one real role forward without using Help or the tour.

### Phase 2 — reduce time to useful data

- shorten onboarding;
- add CSV import preview, project assignment, duplicate handling, and row-level errors;
- add progressive Career Profile/resume import with user approval;
- prompt for the next useful action after application and interview events.

**Acceptance test:** a user with an existing spreadsheet can reach a populated Home queue in one session without re-entering every application.

### Phase 3 — deepen preparation, not breadth

- introduce Career Evidence and Job Requirements;
- add explainable fit review without a predictive score;
- ground document and interview preparation in approved evidence;
- measure completion and stalled work before adding more analytics.

**Acceptance test:** Roleway can explain why an action or draft was proposed and show the user-approved evidence behind it.

## Success measures

Prefer behavioral measures tied to the loop:

- median time from signup to first tracked Opportunity;
- percentage of active Opportunities with a Next Action;
- percentage of due actions completed or rescheduled;
- percentage of applications with a recorded follow-up;
- percentage of interviews with preparation and post-interview notes;
- percentage of Closed Opportunities with a structured outcome;
- weekly return rate among users with active Opportunities.

Do not optimize the product around number of applications submitted. Selective progress and complete follow-through are the promise.
