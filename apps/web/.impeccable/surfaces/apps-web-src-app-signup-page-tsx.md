---
version: 1
slug: "apps-web-src-app-signup-page-tsx"
primary_target: "apps/web/src/app/signup/page.tsx"
related_targets: ["apps/web/src/app/auth.css","apps/web/src/components/auth-frame.tsx"]
---

## Scope and mode
Public account-creation page at `apps/web/src/app/signup/page.tsx`. Operate.

## Audience, task, and action
New Roleway users create an account with email and a password of at least eight characters, then continue to onboarding. The only primary action is Create account; returning users link to the separate login route.

## Chosen direction and memorable moment
The same minimal centered authentication system as login: one narrow form on the Roleway paper field, a precise header with the route mark, and no side panel, card, illustration, or marketing copy.

## Constraints
Keep labels visible, keyboard focus explicit, mobile targets at least 40px, errors actionable, and privacy guidance subordinate. Signup must remain public in middleware and route its own validation errors back to `/signup`.
