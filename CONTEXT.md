# Roleway

Roleway models a person’s job search as a deliberate workflow from discovering a listing through reaching a final outcome.

## Language

**Job**:
Objective listing data captured from a source. A Job can remain in discovery without becoming user-managed work.
_Avoid_: Application, Opportunity

**Opportunity**:
A user’s tracked relationship with one Job, including strategy, work, history, and outcome.
_Avoid_: Lead, saved job, card

**Stage**:
The workflow position of an Opportunity: Inbox, Interested, Preparing, Applied, Interview, Offer, or Closed.
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
