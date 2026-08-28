# Linear component and motion catalog for Roleway

Captured 27 August 2026 from Linear’s authenticated production application, official interactive demo, and first-party documentation. This catalog describes observable interface behavior so Roleway can build a coherent system. It does not reproduce Linear source code, assets, trademarks, or private component APIs.

Read this with [`LINEAR-DESIGN-SYSTEM-AUDIT.md`](LINEAR-DESIGN-SYSTEM-AUDIT.md) and [`../DESIGN.md`](../DESIGN.md).

## Evidence and limits

The authenticated read-only run covered the app shell, Inbox, My Issues, team and workspace issue/project views, list and board layouts, issue and project dossiers, global search, Preferences, AI & Agents settings, Agent personalization, Linear Agent configuration, the dedicated Agent page, mobile Agent, menus, searchable selects, filters, advanced filters, display options, date shortcuts, dialogs, confirmation dialogs, emoji picker, tooltips, toast feedback, dark mode, and reduced-motion emulation.

The workspace had limited data and no prior Agent conversations. Conversation-result, live tool-progress, populated history, billing, enterprise-only, collaboration, and inaccessible error states are therefore documented from Linear’s official help material rather than invented. “All components” below means all observable reusable families relevant to Roleway—not Linear’s private internal library.

## Foundation

### Geometry

| Token | Production observation | Roleway contract |
| --- | --- | --- |
| Desktop sidebar | `244px` | `244px` |
| Outer frame inset | `8px` | `8px` desktop; none mobile |
| Work-plane radius | `12px` | `12px` |
| Route bar | `44px` | `44px` |
| View toolbar | `44px` | `44px` |
| Sidebar row | `28px`, `8px` radius | same geometry, `13px` type floor |
| Group header | `36px`, `8px` radius | same |
| List row | `44px`, `8px` interaction radius | same |
| Settings group | `10px` radius, `60px` minimum row | same |
| Editor | `6px` radius | same |
| Ordinary control | `8px` radius | same |
| Circle/pill | `9999px` | only icon circles, status/filter pills, segmented choices |

### Typography

- Linear production tokens: `11`, `12`, `13`, `15`, and `18px`; contextual titles use `20`, `24`, or `36px`.
- Linear uses Inter Variable with normal `450`, medium `500`, semibold `600`, and bold `700`.
- Roleway preserves a `13px` functional floor and `14px` body/control default. Faithfulness must not reduce accessibility.
- Berkeley Mono is used by Linear for technical metadata. Roleway uses Geist Mono for IDs, shortcuts, dates, and compact numeric values only.

### Surfaces and elevation

- Base light work plane: approximately `#f9f9fa`; sidebar approximately `#efeff0`.
- Base dark work plane: approximately `#121213`; sidebar approximately `#09090a`.
- Light/dark structural borders: approximately `#e2e2e2` / `#212224`.
- The work plane uses a `0.5px` border and a nearly invisible two-layer shadow.
- Static content is predominantly transparent and shadowless.
- Menus, popovers, dialogs, composers, and toasts are the elevated exceptions.

## Shell components

### `AppFrame`

**Anatomy:** persistent desktop sidebar, inset work plane, route content, bottom Agent rail/help controls.

**States:** desktop open, desktop hidden, mobile full-bleed, settings shell, light, dark.

**Rules:**

- One work plane only. Internal operational routes do not add another page card.
- Desktop sidebar and work plane remain different neutral tones.
- Mobile removes sidebar, frame inset, work-plane radius, border, and ambient shadow.
- Route identity remains visible after responsive recomposition.

### `Sidebar`

**Anatomy:** account/workspace control, global search, create action, top destinations, section disclosure, nested team/workspace destinations, contextual onboarding actions, help.

**Behavior:**

- Rows are `28px`; active state is a neutral tonal fill, not accent blue.
- Nested rows use indentation, not nested containers.
- Section headings are subdued and may collapse.
- Search and create use circular `28px` desktop controls.
- Mobile replaces the rail with one leading Menu control.

### `RouteBar`

**Anatomy:** mobile/sidebar trigger, breadcrumb or record identity, favorite, overflow, quiet utilities.

- Fixed `44px` height.
- Uses compact text and icon actions.
- Does not repeat a large generic heading underneath unless the route is a dossier/editor.

### `ViewToolbar`

**Anatomy:** tabs/saved views on the left; filter, display, and details controls on the right.

- Fixed `44px` height.
- Sits immediately below `RouteBar`.
- May reveal an inline active-filter row when filters exist.
- Mobile retains essential tabs and icon controls rather than hiding the workflow.

### `AgentRail`

Linear reserves a shallow bottom rail beneath the work plane for Agent access and chat history. Roleway may use this only if Agent is globally available; it must not duplicate the primary Agent route or mobile navigation.

### `GlobalSearchSurface`

- Search replaces the route identity area in place while preserving the app shell.
- One full-width input occupies the route bar; All/Issues/Projects/Documents scope tabs sit below.
- Filter and display controls retain their standard top-right position.
- Results use the same list-row grammar as source views.
- Empty search uses one quiet centered illustration, title, and explanatory sentence.
- Escape returns to the originating route and restores focus to the search trigger.

Roleway search must include only authenticated active-Workspace records, categorize results by domain type, and never leak another Workspace through suggestions or history.

## Navigation and selection

### `NavRow`

- `28px` height, `8px` radius, icon + label, optional disclosure/count.
- Neutral hover/active fills.
- Active and focus-visible are separate states.
- Labels remain visible in primary navigation; icon-only is limited to global utilities.

### `Tabs`

- Compact capsule/segmented geometry.
- Selected tab uses a neutral fill; unselected tabs use transparent or canvas surfaces.
- Appropriate for Active/Backlog/All, Overview/Activity/Issues, and search scopes.
- Tabs stay adjacent to the surface they control.

### `SegmentedControl`

Observed in List/Board selection.

- One enclosing row with equal options.
- Selected segment gets neutral fill and stronger foreground.
- Arrow keys and direct pointer selection should work.
- It changes a view projection, never creates a new domain record.

### `Breadcrumb`

- Compact icon/team/record identity separated by small chevrons.
- Every segment with a valid parent is actionable.
- Truncates before pushing primary actions offscreen.

## Actions and form controls

### `Button`

Variants:

- **Primary:** rare, filled accent, used for one forward action.
- **Secondary:** neutral fill or border.
- **Ghost:** text/icon on transparent background.
- **Destructive:** red only in destructive confirmation.
- **Icon:** `28px` desktop circle/rounded square; `44px` mobile target.
- **Split action:** direct action plus adjacent disclosure.

States: default, hover, pressed, focus-visible, disabled, pending, menu-open.

### `Input`

- `36px` Roleway control minimum; Linear uses denser controls contextually.
- Visible label when meaning is not obvious.
- Search inputs may place the icon at the leading edge.
- Focus uses a restrained accent ring, not a heavy border.
- Validation and recovery copy remain next to the field.

### `TextEditor`

Observed in issue title/description, comment composers, Agent guidance, and project descriptions.

- Open document field by default; border only when containment matters.
- `15px` editor text and approximately `1.6` line height in Linear.
- Placeholder recedes strongly.
- Attach/reaction/submit actions stay within the composer context.
- Rich text remains sanitized and keyboard accessible in Roleway.

### `Checkbox` / `Switch`

- Switches communicate immediate boolean preferences.
- Checkbox semantics are retained in the accessibility tree even when rendered as switches.
- Accent appears only in the checked track/thumb.
- Disabled state remains recognizable and labeled.

### `PropertyChip`

Used for status, priority, assignee, project, labels, and due date.

- Icon + value in a compact rounded capsule.
- Empty values use an action label: “Set priority,” “Assign,” or “Add label.”
- Mobile dossiers move high-value properties into chips beneath the title.
- Chips open shared searchable selectors; they are not passive badges.

### `PropertyRow`

- Muted label, foreground value/action, aligned columns.
- Supports empty, set, hover, menu-open, pending, and error states.
- Desktop property rails use rows; mobile may convert essential values to chips or a dedicated details sheet.

## Floating surfaces

### `Menu`

**Anatomy:** optional search, compact rows, leading icons, labels, trailing shortcuts/submenu arrows, real group separators.

- Anchored to the trigger.
- `8–10px` radius and layered low shadow.
- Rows use neutral hover/selected fills.
- Escape closes and restores trigger focus.
- Submenus open beside the parent on desktop and should become a replacement panel/sheet on mobile.

Observed menu families: workspace, issue options, create-more, chat switcher, Skills, due-date shortcuts, and context actions.

### `SearchableSelect`

Observed for status, priority, assignee, project, labels, theme, font size, and settings choices.

- Search/input row at top when the option set can grow.
- Current option has neutral selected fill and checkmark.
- Leading semantic icon/avatar; optional numeric shortcut at right.
- Empty query state remains inside the panel.
- Selection closes the panel and updates the trigger label.

### `Tooltip`

- Appears after a short hover delay.
- Compact elevated neutral panel near the trigger.
- Shows action label and keyboard shortcut where available.
- Must not be the only accessible name.
- Roleway follows Linear’s neutral canvas tooltip rather than black inverse bubbles in light mode.

### `Popover`

Used for display options, filters, emoji picker, and larger anchored controls.

- Larger than a menu and may contain sections, switches, chips, or scroll regions.
- Anchors to the trigger edge and stays inside the viewport.
- Mobile uses a nearly full-width floating panel with safe margins.
- Scrollbar appears only when content exceeds available height.

### `DatePicker`

Observed first as a natural-language shortcut submenu:

- Search-like prompt supports values such as “24h,” “7 days,” or a date.
- Quick choices include Custom, Tomorrow, and In one week with resolved dates shown at right.
- Custom opens a centered nested dialog with title/close, explanatory field label, focused natural-language/date input, two adjacent month grids, month navigation, current-day ring, Cancel, and explicit Save due date.
- The calendar does not mutate the underlying composer until Save is chosen; Escape/Cancel restores the composer.
- Roleway’s date control must preserve timezone and recovery behavior.

### `EmojiPicker`

- Search field, “Frequently used,” categorized emoji grid, internal scrollbar.
- Anchored to the reaction trigger.
- Keyboard navigation and accessible emoji names are required.
- It is optional for Roleway unless reactions become real product behavior; do not add it decoratively.

## Dialogs and feedback

### `ComposerDialog`

Observed in issue creation.

**Anatomy:** context breadcrumb, expand and close utilities, title, open description editor, property chips, overflow, attachment, repeat toggle, primary submit.

- Desktop is a centered `~750px` floating composer.
- Mobile becomes a nearly full-width sheet/dialog with wrapped property chips.
- Backdrop dims the app without removing context.
- Focus starts in the title and is trapped until close.
- Escape cancels; submit remains explicit.

Roleway uses this pattern for New Job and other focused creation, with domain-specific properties.

### `ConfirmationDialog`

- Narrow centered dialog with direct title, consequence copy, neutral Cancel, and destructive action.
- Destructive action receives red; the rest of the dialog stays neutral.
- Cancel is visually and keyboard-safe.
- Roleway destructive confirmations must explain reversibility or permanent impact accurately.

### `Toast`

- Bottom-right desktop placement above the Agent rail.
- Icon + concise confirmation + dismiss.
- White/elevated surface in light mode with neutral border and shadow.
- Routine success feedback disappears automatically; errors require durable recovery.
- Mobile placement must avoid navigation and safe-area collisions.

### `InlineAlert`

- Use for errors, warnings, setup requirements, and results not otherwise visible.
- Do not use persistent success banners for ordinary mutations when the changed object confirms success.

### `LoadingState`

- Linear uses small neutral spinner marks and route-preserving loading shells.
- Loading should keep stable geometry and avoid large decorative skeleton cards.
- Pending state belongs in the initiating control or local region.

### `EmptyState`

- Operational empty lists preserve route bars, tabs, headers, and filters.
- Sparse first-run/detail states may use one quiet illustration and sentence.
- No generic centered card is added solely to fill whitespace.

## Data surfaces

### `GroupHeader`

- `36px` tonal row with disclosure, status icon, label, count, and trailing create action.
- Sticks to the same horizontal grid as child rows/cards.
- Neutral fill differentiates groups without broad semantic color.

### `ListRow`

- `44px`, flat, aligned scan fields.
- Hover reveals selection controls or secondary actions.
- Status and assignee remain compact signals.
- Mobile removes lower-value ID/date metadata before compromising the main label.

### `Table`

- Shared grid for headers and cells.
- Open surface with little or no outer border.
- Column visibility belongs in display options.
- Few rows leave honest whitespace; no filler cards.

### `BoardLane`

- Tonal lane background with compact status/count header.
- Fixed working width and horizontal overflow only inside the board region.
- Empty lanes retain add affordance.
- Drag is optional; equivalent menus/keyboard paths are mandatory.

### `BoardCard`

- Compact bounded record with ID, title, selected properties, and overflow.
- Description is omitted from the scan surface.
- Border and tiny shadow identify a movable object.
- Card hover/selection is neutral; status color remains a small icon/ring.

### `QueueDetail`

- Queue and detail are one flush surface separated by a single vertical rule.
- Queue selection uses neutral fill.
- Desktop updates detail without replacing the queue.
- Mobile displays queue first and opens a dedicated detail state.

### `Dossier`

- Open document body with title, description, activity, and contextual content.
- Desktop may use a 60/40 body/property split.
- Property rail is collapsible.
- Mobile converts rail information into chips or a dedicated full-width details surface.

### `ActivityFeed`

- Compact avatar/icon, actor/action copy, and subdued timestamp.
- Textual stream rather than timeline cards.
- Agent actions should use the same history grammar as user actions and remain attributable.

## Filters and view configuration

### `FilterMenu`

- Search field plus categorized property list.
- Supports AI filter, advanced filter, status, assignee, Agent, Agent Session, creator, priority, labels, relations, dates, project, subscribers, content, and links in Linear.
- Nested choices open submenus.
- Active filters become removable chips in an inline filter row.

Roleway should expose only domain-relevant filters; copying Linear’s complete property list would be product noise.

### `AdvancedFilterBuilder`

- Adds an explicit filter row beneath the view toolbar.
- Conditions are composed incrementally.
- Clear/remove controls are present and unambiguous.
- URL/view state should remain recoverable.

### `DisplayOptions`

- List/Board segmented control first.
- Grouping, sub-grouping, ordering, completion policy, switches, and visible property chips follow in conceptual sections.
- Mobile keeps the same content in a narrower scrollable popover.
- This is one shared component across compatible views.

## Settings components

### `SettingsShell`

- Dedicated sidebar with Back to app, local search, grouped settings navigation.
- Main reading column is centered inside the work plane.
- Mobile should become a route list and dedicated setting pages rather than a squeezed two-column shell.

### `SettingsGroup`

- `10px` container radius, `60px` minimum rows, `16px` horizontal padding.
- Row title and explanation on the left; control/action on the right.
- Hairline separators only between rows.
- Appropriate exception to the app’s flat-document default.

### `ConnectionRow`

For Roleway’s BYO provider system:

- Provider identity, model, redacted key hint, connection health, Test, and Remove.
- Secret is never returned to the browser.
- Error state gives a redacted, actionable message.
- Setup states: empty, saved-unverified, testing, connected, failed, removing.

## Agent components

Linear’s official documentation states that Linear Agent can answer workspace questions, summarize activity, create/update internal records, show progress, retain chat history, support several open chats, use saved Skills, accept attachments, use MCP connectors, and operate within the current user’s permissions. Roleway adopts the interaction model but keeps external actions prohibited and internal mutations approval-gated.

### `AgentPage`

**Empty anatomy:**

- Standard app shell.
- `44px` Agent route bar with chat switcher.
- Quiet watermark in the work plane.
- Centered composer, approximately half the available desktop width.
- Skills at composer lower-left; attachment and submit at lower-right.
- Chat-history access remains globally reachable.

**Mobile:**

- Full-bleed route with leading Menu and chat switcher.
- Composer sits in the lower-middle area with safe horizontal margins.
- Skills opens a wide top-anchored searchable panel.
- Attachment and submit retain direct access.

### `AgentComposer`

- Open multi-line prompt area.
- Lower utility row with Skills, attachments, and circular submit.
- Submit is subdued until content is actionable.
- Supports keyboard submission according to account preference.
- Attachments are reviewed before sending.
- Context disclosure must state what Workspace/Opportunity data will be sent.

### `ChatSwitcher`

- Trigger shows current short chat title and disclosure.
- Panel lists open/recent chats; an empty state says “No history.”
- Official docs describe multiple open chats as toolbar tabs with working/unread indicators.
- Starting a new chat creates a clean context boundary.

### `ChatHistory`

- Searchable history grouped by recency: Today, Last week, 4 weeks ago, Older.
- May surface context-related chats.
- Rows need title, context, timestamp/recency, working/unread state, and overflow.
- Empty history is a compact anchored message, not a full-page empty card.

### `SkillMenu`

- Desktop: compact anchored menu; mobile: wide searchable panel.
- Empty state exposes Create skill.
- Skills can be manually invoked and may be auto-selected when intent matches.
- Personal guidance and Skills live in Agent personalization settings.

Roleway v1 should support user-authored prompt templates before autonomous skill selection. Templates remain reviewable text and cannot silently expand tool permissions.

### `AgentMessage`

Required Roleway variants:

- User prompt.
- Agent answer.
- Draft artifact.
- Caution/warning.
- Source/context reference.
- Error with retry/recovery.
- Interrupted/cancelled response.

Messages should read like a working transcript, not speech bubbles. Use aligned document blocks, restrained avatars, and clear authorship.

### `AgentProgress`

Official Linear docs state the Agent “can keep context over time [and] show its progress as it works.” Roleway needs:

- Durable Agent Run identity.
- Current status and cancel action.
- Ordered steps with timestamps.
- Read/tool activity summarized without exposing hidden prompts or credentials.
- Partial failure and retry states.
- Final result linked to the originating message.

### `ToolCall`

Roleway tool classes:

1. **Read tools:** search Workspace records, read selected Job/Opportunity/context, summarize existing data. May execute after the user starts a run.
2. **Draft tools:** create proposed next actions, tasks, notes, interview questions, follow-up drafts, or document text. Results are drafts.
3. **Internal mutation tools:** update Roleway records only after explicit approval showing exact changes.
4. **External tools:** submitting applications, contacting employers, or scheduling external events remain unavailable.

Tool UI shows tool name, scope, status, concise input summary, result summary, and approval requirement. It never shows API keys, raw prompts, stack traces, or unrelated personal data.

### `ApprovalCard`

- Exact proposed internal changes.
- Affected Workspace and record.
- Why the change is proposed.
- Approve and Reject/Edit actions.
- Pending, applied, failed, expired, and superseded states.
- Approval writes durable history and is never inferred from continuing the chat.

### `AgentSettings`

Roleway separates:

- **Provider connections:** BYO API key, model, optional compatible base URL, test status.
- **Personal guidance:** user-authored response and workflow instructions.
- **Permissions:** explicit read/draft/internal-tool policy; no external tools.
- **Data disclosure:** context categories sent to providers.
- **History controls:** retention and deletion where implemented.

Linear’s workspace AI settings also expose enablement, web search, MCP connectors, and workspace guidance. Roleway must not show these controls until the corresponding behavior and security boundary exists.

## Motion system

### Observed production timings

| Motion | Observation |
| --- | --- |
| Common color/fill/border/opacity transition | `150ms` |
| Quick token | `100ms` |
| Regular token | `250ms` |
| Slow token | `350ms` |
| Menu/popover entrance | `100ms` opacity, `ease-out` |
| Dialog panel entrance | `300ms` opacity with a spring-like generated linear easing |
| Menu-open trigger color | `150ms ease` |
| Sidebar/content padding adjustment observed | `300ms cubic-bezier(.43,.07,.59,.94)` |
| Highlight fade-out | `150ms` |

An additional long opacity animation was present in the runtime overlay infrastructure; it should not be copied as a product timing without a visible behavioral reason.

### Roleway motion contract

- **Hover/focus/press:** `150ms` color, border, fill, opacity.
- **Menu/popover/tooltip:** `100–150ms` fade with no more than `4px` translation.
- **Dialog/sheet:** `200–300ms`; backdrop fades, panel settles once.
- **Sidebar:** one coordinated `250–300ms` transition.
- **List/board reordering:** `150–250ms`, preserving spatial continuity.
- **Agent streaming/progress:** no decorative pulsing. Use a small status indicator and stable incremental content.
- **Reduced motion:** remove translation, scaling, spring movement, and animated reordering. Short opacity changes may remain.
- No routine control may bounce, float, glow, or continuously animate.

## Required state matrix

Every shared Roleway component must be reviewed against applicable states:

- Default
- Hover
- Active/pressed
- Focus-visible
- Selected/current
- Menu-open
- Disabled
- Pending/loading
- Success
- Warning
- Error with recovery
- Empty
- Overflow/truncation
- Long localized text
- Light
- Dark
- Reduced motion
- Keyboard
- Pointer
- Touch
- `1440px` desktop
- `390px` mobile

## Component implementation map

Roleway should converge on these reusable seams:

- `AppFrame`, `Sidebar`, `RouteBar`, `ViewToolbar`, `AgentRail`
- `NavRow`, `Tabs`, `SegmentedControl`, `Breadcrumb`
- `Button`, `IconButton`, `Input`, `TextEditor`, `Switch`, `PropertyChip`, `PropertyRow`
- `FloatingSurface`, `Menu`, `SearchableSelect`, `Tooltip`, `Popover`, `DatePicker`
- `ComposerDialog`, `ConfirmationDialog`, `Toast`, `InlineAlert`, `LoadingState`, `EmptyState`
- `GroupHeader`, `ListRow`, `Table`, `BoardLane`, `BoardCard`, `QueueDetail`, `Dossier`, `ActivityFeed`
- `FilterMenu`, `AdvancedFilterBuilder`, `DisplayOptions`
- `SettingsShell`, `SettingsGroup`, `ConnectionRow`
- `AgentPage`, `AgentComposer`, `ChatSwitcher`, `ChatHistory`, `SkillMenu`, `AgentMessage`, `AgentProgress`, `ToolCall`, `ApprovalCard`

Domain components provide labels, data, and actions. These primitives own geometry, state, responsive behavior, focus, and motion.

## Primary sources

- [Linear Agent](https://linear.app/docs/linear-agent)
- [Agents in Linear](https://linear.app/docs/agents-in-linear)
- [Linear MCP](https://linear.app/docs/mcp)
- [Display options](https://linear.app/docs/display-options)
- [Board layout](https://linear.app/docs/board-layout)
- [Peek](https://linear.app/docs/peek)
- [Filters](https://linear.app/docs/filters)
- [Creating issues](https://linear.app/docs/creating-issues)
- [Account preferences](https://linear.app/docs/account-preferences)
