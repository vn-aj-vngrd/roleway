# UI consistency workflow

Use this workflow for app screens, public pages, authentication, onboarding, shared controls, themes, feedback, and email templates. `DESIGN.md` owns visual rules and tokens; this document owns the implementation process.

## 1. Find the existing pattern

Read `DESIGN.md`, the target component, and one neighboring screen that performs the same task. Trace its shared controls and CSS overrides before editing.

- App and public UI: inspect `apps/web/src/components/ui`, domain wrappers, and the semantic tokens in `apps/web/src/app/globals.css`.
- Authentication: inspect `signup-form.tsx`, `auth-protected-forms.tsx`, and `apps/web/src/app/auth.css`. Read `docs/PLANNING.md` before changing authentication behavior.
- Email: read `docs/AUTH_EMAIL.md`; its template guidance covers client fallbacks and the separate hosted activation process.

Complete when every affected control has an identified owner and the intended change can be stated in terms of the existing pattern.

## 2. Change the owner

Fix repeated behavior or appearance in the shared primitive or domain wrapper. Keep route-specific classes for layout. Extend an existing variant when several callers need the same visual treatment, and inspect those callers before changing its default.

Use the action, field, surface, and icon roles in `DESIGN.md`. Check legacy CSS as well as Tailwind classes: an unlayered selector can override a shared component even when the JSX looks correct. Theme changes belong in semantic tokens; resolve foreground and background together so transitions preserve readable text.

Complete when equivalent controls share their appearance and state behavior, and local overrides have a specific layout purpose.

## 3. Finish the interaction

### Forms and passwords

Compose `Field`, `FieldLabel`, `Input`, `FieldDescription`, and `FieldError`; use `SubmitButton` for pending submissions. Keep visible labels and connect help/error text through `aria-describedby`. Set `aria-invalid` on invalid controls and `data-invalid` on their field.

Show mismatch feedback after confirmation is attempted or the user leaves the field. Preserve entries while correcting client-side errors and focus the field that needs attention on submission. Validate the same requirement on the server before provider calls or mutations.

For passwords, distinguish the enforced policy from recommendations. Read the current validation in `apps/web/src/app/auth/actions.ts` and hosted-auth configuration before changing acceptance rules. Encourage length, uniqueness, passphrases, and password managers. Label length feedback as length guidance; length alone does not establish strength. Support paste, password-manager autocomplete, and an accessible reveal control. Keep passwords and confirmation values out of URLs, logs, analytics, and persisted client state.

### Feedback and navigation

Use `Alert` for persistent feedback, `FieldError` for field corrections, and the existing toast system for transient confirmations. Preserve a readable message and a usable next step. Status is conveyed through text and icon shape as well as color.

On step changes, move keyboard focus to the new step's heading or first relevant field. Provide a visible Back action and preserve entered values. Match reduced-motion preferences when moving the viewport.

Complete when loading, disabled, invalid, successful, and recovery states have a clear action and accessible names.

## 4. Verify the whole affected path

Run the relevant checks required by `AGENTS.md`. Exercise the changed workflow at 1440px and 390px in light and dark themes, using pointer and keyboard. Test empty fields, long content, correction after errors, pending actions, and focus visibility. Inspect console/network failures, text contrast, and page overflow.

For a shared component change, include at least one other caller. For emails, preview every changed template with dummy variables, compare action URLs and template placeholders, and distinguish browser rendering from real inbox delivery. Preserve disposable-account cleanup and keep generated recordings outside product source.

Complete when the affected paths pass and the handoff states any blocked, failed, or unrun checks. Report source changes, CI, hosted activation, and delivery as separate evidence.

## 5. Keep the rules coherent

If a visual rule changes, update its authoritative section in `DESIGN.md` and remove contradictory guidance. Keep specialized behavior beside its owning component or scoped document. Add a short trigger in `AGENTS.md` only when a new reference must be discovered by future agents.

Complete when the next agent has one clear entry point and one authority for each rule.
