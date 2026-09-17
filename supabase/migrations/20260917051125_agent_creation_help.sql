-- Add a searchable, admin-editable guide without replacing existing editorial content.
insert into public.help_articles (slug, title, summary, body, published)
values (
  'agent-create',
  'Create Workspaces, tasks, notes, and Next Actions with Agent',
  'A step-by-step guide to creating work through conversation: choose an action, answer one question at a time, and approve the exact change.',
  $article$## Before you start
Open Settings → Agent and add and test your own provider connection. Then open Agent. Core Roleway tracking still works without AI; your provider may charge separately for API use.

## Start a creation conversation
1. Select + or the / button above the composer controls. You can also type / at the beginning of your message.
2. Under Create, choose Workspace, Task, Next Action, or Note. Selecting an item fills a starting message; send it to begin. You can also describe what you want directly.
3. Answer Agent's questions in ordinary language. Agent is instructed to ask for one missing detail at a time and reuse what you have already told it. If it misunderstands, correct the detail in the chat.
4. When the details are ready, review the proposed change. Nothing is created just because you continue the conversation.

## Create a Workspace
Choose Workspace under Create, or say “Help me create a Workspace for my frontend job search.” Give it a name and explain your search objective when asked. Check the proposed name and objective, then select Approve change. Once the proposal says Applied, find the Workspace in Settings → Workspaces. A Workspace represents one focused job search.

## Create a task
Choose Task under Create, or say “Help me create a preparation task.” Identify the Opportunity and its Workspace, explain the task, and give a due date or say “No due date.” If several Opportunities have similar names, clarify which one you mean. Review the target, task title and due date, then select Approve change. Find the applied task in that Opportunity's dossier.

## Add a note
Choose Note under Create, or say “Add a note about my recruiter conversation.” Identify the Opportunity and its Workspace, then tell Agent what to record. Review the exact note and destination before selecting Approve change. Find the applied note in the Opportunity's dossier. Include only information you want stored and shared with your selected AI provider.

## Set a Next Action
Choose Next Action under Create, or say “Help me choose the next step for this Opportunity.” Identify the Opportunity and its Workspace, describe the single action that will move it forward, and provide a due date or say “No due date.” Review the proposed title and date before selecting Approve change. This replaces the Opportunity's existing Next Action; it does not create a separate task.

## Review, correct, or reject
Check the destination Workspace, Opportunity, text, and date on every approval card. For an ambiguous date, tell Agent the exact date, time and timezone you intend. If something is wrong, reject the old proposal and ask for a corrected one. Approve only the correct card. Applied means Roleway saved the change; a proposed card or conversational reply does not.

## If a change cannot be applied
If a proposal expires or a Next Action was edited after the proposal was prepared, ask Agent for a fresh proposal. If a plan or storage limit blocks creation, review Plan & billing before retrying. If generation fails, your saved message remains in the conversation; try again or check your provider connection. Check the proposal status and the destination record before asking for a duplicate.

## What this version supports
Agent can propose Workspaces, Opportunity tasks, Opportunity notes, and Next Actions. It can also answer questions and prepare text through Explore. Jobs, Opportunities, contacts, interviews, and documents are created through their normal Roleway screens in this version. Agent does not submit applications, send messages, or schedule external events; you perform those actions yourself.$article$,
  true
)
on conflict (slug) do nothing;
