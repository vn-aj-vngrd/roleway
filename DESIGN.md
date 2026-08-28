---
name: Roleway
description: A calm working surface for a selective job search.
colors:
  accent-blue: "oklch(0.59 0.18 264)"
  accent-blue-hover: "oklch(0.54 0.18 264)"
  accent-blue-soft: "oklch(0.95 0.035 264)"
  canvas-light: "oklch(0.995 0 0)"
  canvas-dark: "oklch(0.158 0.008 255)"
  surface-light: "oklch(0.972 0.002 255)"
  surface-dark: "oklch(0.188 0.008 255)"
  graphite: "oklch(0.19 0.006 255)"
  graphite-muted: "oklch(0.47 0.008 255)"
  hairline: "oklch(0.905 0.004 255)"
  hairline-strong: "oklch(0.82 0.007 255)"
typography:
  headline:
    fontFamily: "Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "28px"
    fontWeight: 650
    lineHeight: 1.16
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "16px"
    fontWeight: 620
    lineHeight: 1.3
  body:
    fontFamily: "Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Inter Variable, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
    fontSize: "13px"
    fontWeight: 470
    lineHeight: 1.4
  utility:
    fontFamily: "Geist Mono Variable, SFMono-Regular, Consolas, monospace"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  compact: "6px"
  control: "8px"
  action: "999px"
  object: "8px"
  settings-group: "10px"
  island: "12px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.accent-blue}"
    textColor: "{colors.canvas-light}"
    typography: "{typography.label}"
    rounded: "{rounded.action}"
    padding: "0 13px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.canvas-light}"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.action}"
    padding: "0 13px"
    height: "32px"
  navigation-active:
    backgroundColor: "{colors.accent-blue-soft}"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "28px"
  input:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.graphite}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "36px"
---

# Design System: Roleway

## Overview

Before changing application UI, read [`docs/LINEAR-DESIGN-SYSTEM-AUDIT.md`](docs/LINEAR-DESIGN-SYSTEM-AUDIT.md) and [`docs/LINEAR-COMPONENT-CATALOG.md`](docs/LINEAR-COMPONENT-CATALOG.md). They define the verified Linear reference patterns, reusable component families, motion contract, Agent surface, Roleway gaps, and acceptance checklist. Linear inspiration is structural—not permission to copy its branding or force every route into one visual template.

**Creative North Star: "The Focused Dossier and Waypoint Rail"**

Roleway should feel like a personal operating system for focused job searches, not a dashboard assembled from widgets. The authenticated application combines Notion’s editorial calm with Linear’s operational density, then makes the Next Action its own signature. The sidebar is a waypoint rail where each Workspace represents one focused job search with isolated context, supported by shared tools. Home is a Workspace-scoped action dossier: one ordered next-up list supported by a quiet search pulse rather than a wall of metrics. Opportunities default to a grouped issue list; the board remains a deliberate alternate view.

The interface supports equally composed light and dark themes for focused desk work. A distinctly quieter sidebar meets a slightly lifted work plane through one hairline. High-contrast typography, restrained blue waypoints, compact controls, and precise alignment keep attention on the current opportunity and its next action. Public product pages continue that workspace into a composed working pin-up using real interface evidence.

**Key Characteristics:**
- Flush persistent navigation and content separated by one structural rule.
- Neutral architecture with Waypoint Blue carrying primary actions, focus, selection, progress, and the route mark.
- Document-like pages and record surfaces instead of dashboard card grids.
- Labeled navigation that closes completely when more work-plane space is needed.
- Dark mode preserves the same hierarchy through semantic color roles.

## Implementation contract for agents

Treat the design system as code, not inspiration:

1. **Reuse before adding.** Base controls, feedback, overlays, tables, and form fields come from the source-owned shadcn/Base UI layer in `apps/web/src/components/ui`. Operational Workspace collections use `WorkspaceHeader` and `ViewToolbar`; editorial and dossier routes use `PageHeader`; all routes reuse the appropriate shared empty and section patterns. Domain wrappers such as `SelectField`, `DateTimeField`, `TimezoneField`, and `SubmitButton` compose those controls. Extend the shared layer when a repeated need appears; do not paste local lookalikes or bypass an installed shadcn primitive.
2. **Tokens only.** Tailwind CSS 4 semantic utilities and component CSS map to the semantic variables in `globals.css` (`--canvas`, `--sidebar`, `--surface`, `--ink`, `--muted`, `--line`, `--primary`, spacing, radius, shadow, motion). Raw hex, RGB, or one-off OKLCH values belong only in the token definitions or a documented semantic exception.
3. **One type floor.** Functional and descriptive UI text is at least 13px; controls default to 14px. Smaller type is not a solution for fitting content—truncate, wrap, simplify, or redesign the layout.
4. **One geometry.** Buttons use compact 32px desktop heights and fully rounded ends; fields retain an 8px radius and 36px height. Compact operational icon controls may be 28px when they have accessible labels and are not used as mobile touch targets. Mobile interactive targets are at least 44px. Editors may use 6px, settings groups 10px, and the desktop work plane 12px.
5. **One saturated voice.** Blue means action, focus, selection, or progress. Large blue slabs, colored chrome, decorative gradients, and arbitrary status colors are prohibited. Danger red is reserved for destructive/error states.
6. **Spacing over boxes.** Use 4/8/12/16px for local grouping and 24/32px for section separation. Do not create a card merely to separate content. Hairlines mark real boundaries; shadows mark elevation.
7. **State completeness.** Every reusable pattern must account for default, hover, active, focus-visible, disabled, pending, error, empty, dark theme, reduced motion, keyboard, 1440px desktop, and 390px mobile states.
8. **No speculative UI.** Do not add decorative metrics, fake integrations, fake customers, chat bubbles, sparkle icons, generic gradient hero art, or controls without a working action.

When a page needs to violate one of these rules, record the reason in `DESIGN.md` before implementing the exception.

## Colors

The palette is neutral and high-contrast. Waypoint Blue is the only saturated voice and carries every forward action.

### Primary
- **Waypoint Blue:** Primary buttons, the favicon-style Roleway tile, focus rings, active navigation, progress nodes, and links requiring emphasis.
- **Waypoint Blue Hover:** A deeper blue in light mode and a brighter blue in dark mode, preserving clear interaction feedback.
- **Waypoint Blue Soft:** Selected rows, low-emphasis callouts, and accessible focus support.

### Neutral
- **Canvas:** Pure white in light mode and near-black in dark mode; the main work plane, cards, dialogs, and secondary buttons.
- **Sidebar:** A single neutral tonal step from the canvas in both themes.
- **Surface:** Inputs, toolbars, hover states, and low-emphasis working regions.
- **Graphite:** Primary text and high-confidence iconography.
- **Graphite Muted:** Descriptions, metadata, and secondary controls.
- **Hairline / Hairline Strong:** Muted gray structural and control boundaries. Even the stronger hairline must never read as black or compete with text.

**The One Saturated Voice Rule.** Waypoint Blue communicates forward action, focus, selection, progress, or a waypoint. Product chrome and secondary controls stay neutral.

**The Semantic Theme Rule.** Dark mode changes role values, not component logic; selection, action, and hierarchy remain identical.

## Typography

**Display Font:** Self-hosted Inter Variable with the system sans stack.
**Body Font:** Self-hosted Inter Variable with the system sans stack.
**Utility Font:** Geist Mono Variable for IDs, keyboard shortcuts, dates, and compact numeric metadata only.

**Character:** The system uses one workhorse sans family with size-specific weight and tracking. It feels familiar and editorial without turning headings into marketing display type.

### Hierarchy
- **Headline** (650, 28px, 1.16): Primary page titles and Home greeting.
- **Title** (620, 16px, 1.3): Section titles, empty-state headings, and record names.
- **Body** (400, 14px, 1.45): Working copy and form content, kept below roughly 70 characters per line where practical.
- **Label** (470–590, 13px): Navigation, controls, section labels, and metadata.
- **Utility** (500, 13px): Reference numbers, shortcuts, dates, and tabular values. Product and authentication interfaces never render functional text below 13px.

**The Plain Hierarchy Rule.** Weight and spacing establish priority; decorative uppercase, display serifs, and oversized dashboard numbers do not.

## Layout

Desktop uses a 244px sidebar that closes completely rather than collapsing into an icon rail. The quiet chrome starts with the standalone Roleway mark, search, and create controls; Agent, Insights, and Notifications form an unlabeled top group above expandable Workspaces; the account control anchors its bottom edge. The main work plane is inset 8px from the outer frame and uses a 12px radius. A 44px route bar holds the sidebar trigger, route breadcrumb, and a compact Waypoint Blue create action at the far right. Routes with tabs or view controls add one 44px view toolbar directly below it: capsule tabs stay left while circular filter, display, and details controls stay right. The route-level create action is the single accent-filled control in the header.

Operational pages meet the work-plane edges and must not inherit universal page padding. Dossiers and editorial pages use task-specific document padding and may cap readable content near 1100px. Home uses a primary action column with a 282px context rail. Tight intervals of 4–16px group related controls, while 24–36px separates document sections. Page archetype—not a generic centered container—determines spacing.

Below 760px the sidebar and content toolbar disappear, pages use 20px horizontal padding, and primary navigation becomes a 58px bottom bar. DOM order remains unchanged and no mobile view may scroll horizontally.

**The One Work Surface Rule.** One subtly inset, 12px work surface sits inside the quiet sidebar chrome. Its one-pixel boundary and near-imperceptible shadow clarify the application frame; internal content remains flat and avoids nested islands.

## Elevation & Depth

The system is flat by default. Tonal shifts and hairlines establish hierarchy. The inset work surface receives only enough shadow to separate it from workspace chrome; dialogs and account menus may rise above it with a stronger neutral shadow. Opportunity cards receive only a slight state shadow because they are movable objects.

### Shadow Vocabulary
- **Application shell:** `0 1px 2px` plus a very soft ambient shadow around the inset work surface.
- **Dialog:** `0 18px 54px oklch(.18 .01 90 / .20)`.
- **Movable record hover:** `0 2px 6px oklch(.20 .01 90 / .07)`.

**The Flat-by-Default Rule.** Shadows explain hierarchy or movement; they never decorate static content.

## Shapes

Navigation rows, ordinary controls, action buttons, and content tabs use 8px corners. Editors may use 6px corners. Pills are reserved for categorical status, counts, filters, and true segmented choices—not ordinary actions. Square icon actions may be circular. Movable records use 8px corners. Settings groups and command dialogs use 10px corners; the single desktop work surface uses 12px corners. The breadcrumb toolbar keeps the primary structural separator; internal content relies on spacing unless a boundary is operationally necessary. Status remains categorical even though actions and tabs may share a capsule silhouette.

The Roleway mark follows the favicon everywhere: a Waypoint Blue rounded tile with a white route-shaped R and terminal waypoint. Interface icons use Lucide’s consistent outline vocabulary at 15–16px with restrained stroke weight.

## Components

### Buttons
- **Shape:** Compact 36px-high rounded rectangle with an 8px radius and horizontal padding; 28px icon-only operational controls may be circular on desktop and must expand to a 44px touch target on mobile.
- **Primary:** Solid Waypoint Blue with high-contrast text in both themes. No gradient or decorative shadow.
- **Secondary:** Canvas background, muted gray hairline, and current foreground text; borders never approach the darkness of labels.
- **Hover / Focus:** Blue fill shift plus a visible blue focus ring; no floating transform on routine controls.
- **Tabs:** Compact segmented controls with a 6px radius and a quiet neutral fill for the selected tab; never underline the active tab.

### Creation Composer
- New Job uses one open composer plane: title, company, rich description, compact property controls, and footer actions.
- Job URL import is an inline property action, not a separate bordered section. Import feedback appears as a small tonal message near the properties.
- Composer headers, editors, property rows, and footers are separated by spacing rather than divider lines.

### Cards / Containers
- **Opportunity cards:** Paper surface, 7px radius, hairline border, almost flat at rest.
- **Form sections:** Document sections separated primarily by generous vertical rhythm; horizontal rules are exceptional, not automatic.
- **Empty states:** Open whitespace with a centered, narrow content column whose icon, heading, copy, and compact actions are left-aligned. Use a large standalone route/target icon; never put it in a generic rounded tile.
- **Summary values:** Flat property groups separated by spacing, not dashboard metric cards or repeated dividers.

### Inputs / Fields
- **Style:** Canvas or quiet warm surface, muted gray border, 8px radius, and visible labels. Rich-text/editor sub-surfaces may use 6px. Inputs never use dark or near-black outlines.
- **Focus:** Roleway blue border with a restrained three-pixel soft ring in both themes.
- **Error / Disabled:** Semantic danger color or reduced opacity without removing the field’s label or recovery copy.

### Navigation
- The top-left shell presents only the Roleway mark, a quiet search icon, and a circular compose-style create action. The create action uses a canvas fill and minimal neutral shadow without a visible border. Agent, Insights, and Notifications appear directly below in that order, without a section title.
- The account avatar anchors the bottom of the sidebar. Its menu opens above the trigger, uses the shared floating-panel primitive, and enters with a restrained 120ms fade-and-rise. Default avatars use Waypoint Blue rather than a neutral fill.
- **One Workspace equals one focused job search:** the sidebar lists every non-archived Workspace. The active Workspace expands in place to reveal Home, Inbox, Opportunities, Interviews, Contacts, and Documents; inactive Workspaces remain compact switch targets. There is no generic “Manage searches” row.
- Switching a Workspace refreshes Jobs, Opportunities, notifications, and every Workspace-owned record so contexts never mix. Hovering or focusing a Workspace reveals an ellipsis menu for favorite, settings, private URL copy, and archive. Favorites sort first. Archive is the safe removal path because project history is preserved.
- Agent and Insights remain utilities rather than Workspaces, operate against the active Workspace context, and stay in the unlabeled top navigation group.
- Expanded destination and Workspace rows use a shared 28px operational row with 1–2px internal rhythm and 14px between major groups. Workspace children open and close with a restrained 160ms height-and-fade transition; the complete sidebar opens and closes with one coordinated 280ms slide while the work plane expands into the released space. Reduced-motion mode removes both. Hover and active states use neutral fills, while Workspace marks use restrained Waypoint Blue as standalone glyphs without filled icon tiles. Section labels are sentence case, untracked, and visually subordinate.
- Menus, select lists, date pickers, filters, saved views, and account popovers reuse one borderless floating-panel treatment and minimal entrance motion; reduced-motion preferences remove the animation. Icon-only search, create, and sidebar controls expose tooltips. Tooltips use the current canvas with foreground text and a muted boundary rather than black inverse bubbles in light mode.
- Mobile navigation uses labeled 48px targets in a fixed bottom bar with the same neutral active state. Secondary destinations open from one accessible More sheet instead of crowding the bar.

### Settings Shell
Settings replace the application rail with a dedicated shell: Back to app, a local settings search, and grouped Personal, Workspaces, Intelligence, and Account navigation. The main plane uses one simple page title and a narrow settings column. Quiet group headings sit above bordered row cards; each row pairs a title and optional explanation with its control. Settings inputs use only a neutral outline on the canvas—no filled field background or decorative shadow. The shell does not repeat an inner settings navigation.

### Main Work Plane
The content plane is the application’s dominant structural region. It owns the route toolbar, action dossier, grouped Opportunity list, optional board, settings, and route-specific loading states. Opportunity dossiers read as one document with application, tasks, interviews, documents, people, and activity separated primarily by spacing; status, Next Action, decision properties, and listing facts live in the right rail. The Opportunity index leads with a grouped list, supports composable priority and due-date filters, and lets users save, rename, apply, or remove personal views; the board remains the direct-manipulation alternate. The Inbox uses a keyboard-navigable review queue beside one listing dossier rather than repeating full records. Contacts use a Workspace-scoped relationship list with Opportunity context and follow-up dates. The sidebar and inset work surface remain visibly distinct in both themes without turning internal sections into floating cards.

### Roleway Agent
Agent is a first-class work surface and product highlight, not a dashboard card or generic support chatbot. The dedicated route uses a 44px chat switcher bar, quiet open work plane, centered prompt composer, Skills/templates access, attachment control, and explicit provider/context disclosure. Messages read as an inspectable working transcript rather than speech bubbles.

Desktop keeps the composer near the visual center in an empty conversation and moves it to the bottom of the transcript once messages exist. Mobile removes the sidebar and frame decoration, retains route/chat identity, and gives the composer safe horizontal and bottom margins. History, Skills, provider setup, and approvals use shared menus, settings groups, and floating surfaces.

Every agent action displays its scope and state. Read steps may run after the user submits; drafts remain reviewable; internal mutations render an exact Approval card with Approve and Reject/Edit actions. Progress is a stable ordered step list, never a decorative thinking animation. Errors preserve the conversation and provide retry or recovery. External actions are not offered.

Provider connections remain visually subordinate setup. Empty Agent explains how to connect a user-owned API provider without turning security copy into a hero. Connected state prioritizes the conversation. Personal guidance and prompt templates are editable settings; they never silently expand permissions.

**The Native Agent Rule.** Agent can answer Workspace questions and prepare or propose Roleway work, but it must feel embedded in Jobs, Opportunities, interviews, contacts, documents, and Home. Every contextual Agent entry opens the same conversation system with explicit scope—not a route-specific AI widget.

### Public Product Pages
Marketing uses the application itself as evidence. Large, tightly set graphite headlines lead into real HTML product views composed as a working pin-up rather than a generic split hero. A pale or charcoal measurement board may carry the main product view; one blue-tinted action slip overlaps it to make the next-action mechanism tangible. One inverse monochrome statement field and closing field pace the page. Product views are responsive compositions, never raster screenshots or decorative dashboard mockups.

**The Product Pin-up Rule.** The public page gets one dominant interface composition, one annotation system, and one tactile next-action object. Do not repeat miniature dashboard cards to fill sections.

## Do's and Don'ts

### Do:
- **Do** use proximity first; reserve hairlines for the application frame, breadcrumb toolbar, fields, tables, and true interactive boundaries.
- **Do** keep the next action and its due state visible near the record it affects.
- **Do** reserve cards for movable opportunities, approvals, and self-contained records.
- **Do** use Waypoint Blue for primary actions, focus, selection, progress, and the full Roleway route mark.
- **Do** preserve the same semantic hierarchy in dark mode and on mobile.
- **Do** show real product structure and task-specific content on public pages.

### Don't:
- **Don't** add more than the single inset work surface or give every section its own floating island.
- **Don't** tint application chrome blue or add secondary saturated colors, startup gradients, glass, glow, or decorative metrics.
- **Don't** turn summaries into large dashboard cards or put empty-state icons in generic rounded tiles.
- **Don't** use AI imagery, sparkles, robots, gradient magic, or speech-bubble styling to represent Agent.
- **Don't** copy Notion’s brand assets, collaboration terminology, or AI-first positioning; only its workspace discipline is relevant.
- **Don't** market Roleway with generic dashboard art, fake metrics, or product screenshots that still show a discarded shell.
