# Linear design-system audit for Roleway

Researched 27 August 2026 from Linear’s first-party product captures, official design essays, authenticated production application, and official product documentation. This is a reference model for Roleway, not permission to copy Linear’s brand, assets, product terminology, or proprietary implementation. The reusable component/state inventory and motion details live in [`LINEAR-COMPONENT-CATALOG.md`](LINEAR-COMPONENT-CATALOG.md).

## Evidence boundary

Linear does not publish its complete internal component library, token package, Figma library, or production CSS. Exact private token values therefore cannot be “retrieved” responsibly. This audit separates:

- **Documented facts** — claims made in Linear’s official design writing or docs, with links.
- **Observed patterns** — visual characteristics visible in the six supplied Linear product captures dated 27 August 2026.
- **Roleway decisions** — adaptations that preserve Roleway’s product model and accessibility requirements.

The supplied captures cover: Inbox split view, team overview, issue board, project table, project dossier, and roadmap board. They are referred to as **S1–S6** in that order.

## What Linear is actually doing

Linear’s visual quality does not come from dark mode, tiny type, blue buttons, or rounded cards. It comes from a coherent application grammar:

1. **The work surface dominates; navigation recedes.** Linear explicitly darkened/dimmed its sidebar so content receives attention first. Supporting controls do not carry equal visual weight. [Linear, “A calmer interface for a product in motion”](https://linear.app/now/behind-the-latest-design-refresh)
2. **Structure is felt more often than outlined.** Linear reduced separators, softened border contrast, and removed unnecessary icon treatments. [Linear, “A calmer interface for a product in motion”](https://linear.app/now/behind-the-latest-design-refresh)
3. **Density is organized through alignment.** Its redesign adjusted sidebar, tabs, headers, and panels together to reduce noise while increasing navigation density and hierarchy. Linear specifically describes aligning labels, icons, and buttons both vertically and horizontally. [Linear, “How we redesigned the Linear UI”](https://linear.app/now/how-we-redesigned-the-linear-ui)
4. **The redesign is holistic.** Linear argues that visual product debt cannot be repaired one isolated module at a time because users experience the product as one system. [Linear, “A design reset”](https://linear.app/now/a-design-reset)
5. **Views are task-specific, not one universal page template.** Linear supports list, board, timeline, split, fullscreen, and property-panel layouts. [Linear, “How we redesigned the Linear UI”](https://linear.app/now/how-we-redesigned-the-linear-ui) [Linear display options](https://linear.app/docs/display-options)
6. **Keyboard and pointer paths are peers.** Inbox uses `J/K` or arrow navigation; Triage has direct numeric actions; boards preserve selection shortcuts; Peek previews records with Space. [Linear Inbox](https://linear.app/docs/inbox) [Linear Triage](https://linear.app/docs/triage) [Linear board layout](https://linear.app/docs/board-layout) [Linear Peek](https://linear.app/docs/peek)
7. **Color is generated semantically.** Linear describes a theme model derived from base color, accent color, and contrast in LCH, producing aliases for surfaces, text, icons, and controls across light and dark themes. [Linear, “How we redesigned the Linear UI”](https://linear.app/now/how-we-redesigned-the-linear-ui)

## Surface archetypes

A major correction for Roleway: consistency does **not** mean giving every route the same centered page header and body width. Linear is consistent because each recurring task uses one of a small number of stable archetypes.

### 1. Queue + detail

**Evidence:** S1, Linear Inbox documentation.

- Persistent application sidebar.
- Narrow queue column separated by one vertical rule.
- Selected item uses a quiet neutral fill, not a large saturated card.
- Detail content occupies the remaining plane and starts near the top.
- The queue and detail are flush parts of the same work surface—not a rounded card embedded inside a generic page.
- Keyboard navigation remains visible in behavior even when shortcut hints are not prominent.

**Roleway use:** Job Inbox and Notifications when a detail preview is useful.

### 2. Full-plane index/table

**Evidence:** S4.

- A 40–48px route bar names the object and contains the primary create action.
- View/filter controls occupy a compact second row.
- Column headers and rows align to a shared grid.
- Empty space is allowed; Linear does not center a decorative empty-state card when a table simply has few rows.
- The outer work plane provides containment; the table does not need another large border or card.

**Roleway use:** Opportunity list, Contacts, Documents, Interviews, Admin tables.

### 3. Operational board/timeline

**Evidence:** S3 and S6; official board documentation.

- The board starts directly below compact route and view controls.
- Columns are fixed working lanes with faint tonal separation.
- Cards are compact records, not marketing cards.
- Card content is intentionally incomplete; Linear’s docs state descriptions are not shown and properties may be omitted when space is limited. Detail is available through Peek or opening the issue. [Linear board layout](https://linear.app/docs/board-layout)
- Grouping, ordering, visible properties, and board/list layout are view-level controls, not page-level forms. [Linear display options](https://linear.app/docs/display-options)

**Roleway use:** Opportunity board only. List remains the default.

### 4. Dossier + properties rail

**Evidence:** S5.

- Breadcrumb/record identity lives in the top route bar.
- Tabs sit immediately beneath it.
- Main content is an editable document with generous whitespace.
- Important properties appear inline near the title and again in a persistent right rail when depth warrants it.
- Right-rail sections may use quiet bordered groups, while the main document remains mostly unboxed.
- The action is editing the record, not “viewing a dashboard.”

**Roleway use:** Opportunity, Interview preparation, and Document editor.

### 5. Editorial overview

**Evidence:** S2.

- Content is centered within a broad canvas but remains left-aligned.
- Large whitespace is intentional.
- The page has a restrained title, optional description, one resource/content region, and a narrow contextual rail.
- Tabs are compact pills near the top edge.

**Roleway use:** Workspace settings/overview and low-density explanatory surfaces.

### 6. Focused modal/composer

**Evidence:** Linear’s official issue-creation documentation and screenshot.

- Title and description form one open editor.
- Properties are secondary compact controls.
- The modal preserves the underlying workspace context.
- Creation is globally accessible through `C`; full-screen creation is also available. [Linear create issues](https://linear.app/docs/creating-issues)

**Roleway use:** New Job, Document, Interview, Contact, and Workspace.

## Official public runtime extraction

A browser crawl of Linear’s official interactive product demo at [`linear.app`](https://linear.app/) on 27 August 2026 exposed a public runtime token layer and allowed computed-style measurement. These values are exact for that public demo build; they are stronger evidence than visual estimation, but they may not be identical to every authenticated-app release or custom theme.

### Public runtime tokens

| Role | Observed value |
| --- | --- |
| App radius | `12px` |
| Frame padding | `8px` |
| Sidebar width | `232px` |
| Regular font | `Inter Variable`, then system UI fallbacks |
| Monospace font | `Berkeley Mono`, then system monospace fallbacks |
| Micro / mini / small / regular | `12px` / `13px` / `14px` / `16px` |
| Normal / medium / semibold / bold | `400` / `510` / `590` / `680` |
| Radius scale | `4px`, `6px`, `8px`, `12px`, `16px`, `24px`, `32px`, circle, full round |
| Focus ring | `1px solid #5e69d1`, `2px` offset |
| Quick / regular transition | `100ms` / `250ms` |
| Low / medium / high shadow | `0 2px 4px #0000001a` / `0 4px 24px #0003` / `0 7px 32px #00000059` |
| Minimum tap target token | `44px` |
| Scrollbar visual width | `6px`, expanding to `10px` active inside a `12px` hit area |

### Public dark-theme aliases

| Role | Observed value |
| --- | --- |
| Background levels 0–3 | `#08090a`, `#0f1011`, `#141516`, `#191a1b` |
| Primary / secondary / tertiary / quaternary foreground | `#f7f8f8`, `#d0d6e0`, `#8a8f98`, `#62666d` |
| Primary / secondary / tertiary border | `#23252a`, `#34343a`, `#3e3e44` |
| Brand background | `#5e6ad2` |
| Accent / accent hover / accent tint | `#7170ff`, `#828fff`, `#18182f` |
| Link | `#828fff` |
| Semantic blue / green / yellow / orange / red | `#4ea7fc`, `#27a644`, `#f0bf00`, `#fc7840`, `#eb5757` |

### Measured component facts

- The interactive demo frame measured `1320 × 720px` with a `232px` sidebar and `8px` frame inset.
- Sidebar navigation rows measured `28px` high with `7px` inline padding, `8px` content gap, `8px` radius, `13px` type, and weight `510`.
- Search and route icon buttons measured `28 × 28px` with full-round geometry.
- The sampled issue title used `20px / 26.6px`, weight `590`; the activity section heading used `16px / 28px`, weight `590`.
- Across 381 visible demo elements, transparent backgrounds dominated (358 elements), no shadow dominated (368 elements), and `0px` radius dominated (324 elements). Rounded surfaces and shadows are exceptions, not defaults.
- Repeated explicit gaps were `8px`, `6px`, `4px`, and `2px`; only one sampled element used a `24px` gap.

This quantitatively confirms Linear’s written principle that supporting structure should recede and that density comes from alignment rather than card decoration.

### Production app login measurements

A separate crawl of the production shell at [`linear.app/login`](https://linear.app/login) confirmed the current application’s newer compact typography and authentication control treatment:

- Font stack: `Inter Variable`, `SF Pro Display`, system UI, plus Linear Thai fallback.
- Runtime type tokens: micro `11px` (rounded from `.6875rem`), mini `12px`, small `13px`, regular `15px`.
- Login heading: `18px`, weight `500`.
- Authentication action: `44px` high, `13px` type, weight `500`, full-round radius, brand background `#5e69d1`, near-white foreground, and a subtle `0 0.5px 1px 1px` shadow.
- Secondary account links: `13px`, weight `450`.

This shows that Linear uses full-round actions in selected contexts, particularly authentication and compact categorical/view controls. It does **not** justify making every product button a pill; control shape must follow the surface archetype and neighboring controls.

## Authenticated production-app audit

A read-only crawl of an authenticated Linear workspace on 27 August 2026 covered the production Inbox, My Issues, workspace Projects, workspace Views, team overview, team Issues, team Projects, team Views, issue dossier, project dossier, global search, display-options popover, workspace menu, and Preferences. No workspace records or preferences were changed. Captures were temporary research artifacts and are not product source.

This crawl confirms that the public demo is structurally representative, while the authenticated app currently uses an even more compact shell.

### Exact authenticated shell geometry

Measured at a `1200 × 968px` CSS viewport in the default light theme:

| Element | Measured production value |
| --- | --- |
| Sidebar | `244px` wide |
| Main work plane | `948px` wide, inset `8px` from top/right and `36px` from the bottom Agent rail |
| Work-plane radius | `12px` |
| Work-plane border | `0.5px` low-contrast neutral |
| Work-plane shadow | `0 3px 6px -2px` at 2% black plus `0 1px 1px` at 4% black |
| Route bar | `44px` high |
| View toolbar | `44px` high |
| Combined route header | `88px` high |
| Sidebar navigation row | `28px` high, `8px` radius |
| Group header | `36px` high, `8px` radius, tonal fill |
| Issue list row | `44px` high, `8px` interaction radius |
| Sidebar primary inset | `12px`; nested team links begin at `31px` |
| Shell type | Inter Variable stack; navigation label `13px`, weight `500` |
| App text tokens | `11px`, `12px`, `13px`, `15px`, `18px`; titles extend to `20px`, `24px`, and `36px` in appropriate dossier/settings contexts |
| Standard weights | `450` normal and `500` medium; `600–700` reserved for stronger hierarchy |
| Motion | quick `100ms`, regular `250ms`, slow `350ms`; highlight fade-out `150ms` |

The authenticated root also exposed these semantic production values: base light surface `#f9f9fa`, sidebar light `#efeff0`, base dark surface `#121213`, sidebar dark `#09090a`, light border `#e2e2e2`, dark border `#212224`, rounded radius `9999px`, settings row minimum `60px`, settings group radius `10px`, editor radius `6px`, editor text `15px / 1.6`, monospace `Berkeley Mono`, and scrollbar width `12px`.

Roleway should preserve its `13px` accessibility floor rather than reproducing Linear’s 11–12px metadata. Faithfulness means matching hierarchy, geometry, density, and behavior—not reducing legibility.

### Authenticated surface findings

#### Inbox

- The main plane becomes a true two-column queue/detail surface; there is no centered page container inside it.
- The queue owns a compact header with filter/display controls and one vertical separator.
- An unselected detail state is intentionally sparse: a quiet line illustration and one sentence centered in the available detail plane.
- The sidebar and work plane remain visible, so Inbox feels like a mode of the same app rather than a separate mini-application.

#### Team issue index

- Identity/breadcrumb and notification action occupy the first `44px` row.
- Active/Backlog/All Issues tabs and filter/display/detail controls occupy the second `44px` row.
- Status groups use a `36px` tonal header; issue rows are flat `44px` scan lines.
- List content begins immediately under the toolbar. There is no descriptive hero, KPI strip, or nested card.
- Selection controls appear on hover/selection; persistent visual noise is minimized.

#### Display-options popover

- A floating panel opens adjacent to the top-right trigger and is materially more elevated than the base app.
- List/Board is a two-part segmented control at the top.
- Grouping, sub-grouping, ordering, completed-item policy, switches, and property visibility are organized into compact sections separated only where the conceptual group changes.
- Property visibility uses wrapping compact chips; selected chips receive a neutral fill rather than a brand-colored flood.
- This is the canonical model for Roleway view configuration: one reusable popover, not route-specific settings forms.

#### Workspace projects table

- A `44px` route bar contains the title and quiet “New project” action.
- A second row contains the active view and filter/display controls.
- The table is open and border-light. Column headings align directly with data; a one-record table simply leaves honest whitespace below.
- Status, health, lead, target date, count, and progress remain compact columns, not separate dashboard cards.

#### Team overview

- Compact top tabs lead into a broad editorial plane.
- Team identity, optional description, and resources are left-aligned; member/context shortcuts form a narrow right-side column.
- Empty resources remain an in-place instruction with small add controls rather than a large decorative empty-state card.

#### Issue dossier

- The route bar carries issue identity and utilities.
- The dossier body uses an approximately 60/40 main/property split: title, description, sub-issues, activity, and comment composer on the left; status, priority, assignee, labels, and project on the right.
- Editable absences use verbs such as “Set priority,” “Assign,” “Add label,” and “Add to project.”
- The main body is mostly unboxed. The comment composer receives a quiet boundary because it is an input surface.
- Activity is a compact textual stream, not a card timeline.

#### Project dossier

- Overview/Activity/Issues tabs sit directly under the route bar.
- Project icon, title, summary, inline properties, and resources lead the document.
- A wide update composer is the first bounded content surface; description and milestones remain open document regions.
- The optional properties rail is independently collapsible and uses grouped label/value rows.
- Linear tolerates large whitespace when a dossier has little content; it does not manufacture dashboard widgets to fill the plane.

#### Global search

- Search replaces the route-bar title area in place instead of opening a detached marketing-sized modal.
- All/Issues/Projects/Documents scopes sit immediately beneath the search input.
- Filter and display controls remain in the standard top-right position.
- The empty state is centered but visually quiet and does not compete with the input.

#### Menus and settings

- The workspace menu is anchored to its sidebar trigger, roughly the width of the sidebar, and uses separators only between account/app/workspace groups.
- Menu rows pair labels with optional shortcut hints. The floating panel has a white surface, hairline border, `8–10px` rounding, and subtle layered shadow.
- Settings intentionally use a different archetype: fixed settings navigation plus a centered reading column.
- Settings groups are the justified exception to the no-card default: `10px` grouped containers, `60px` minimum rows, `16px` horizontal padding, and hairline separators support dense preference editing.
- Interface theme and font size are first-class preferences. Roleway must keep light/dark semantic parity and should avoid hard-coded route colors.

### Authenticated mobile behavior

A second read-only pass at `390 × 844px` confirmed that Linear recomposes rather than miniaturizes its desktop shell:

- The desktop sidebar, outer frame gutter, work-plane border, radius, and ambient shadow disappear. Mobile is one full-bleed plane.
- The `44px` route bar remains. A compact leading navigation control replaces the persistent sidebar; identity stays readable and utilities remain at the right edge.
- Team Issues retains a second `44px` view row. Tabs, filter, display, and details controls remain reachable without a desktop sidebar.
- Issue groups keep their tonal `36px` headers while rows remove lower-value metadata such as IDs/dates when width is scarce. Status and assignee signals survive.
- Mobile Inbox shows the queue as the primary plane. The desktop detail pane is not squeezed beside it; selecting a queue item must move to a dedicated detail state.
- The issue dossier becomes one column. High-value properties become compact chips below the title; description, sub-issues, activity, and comment composer stack in document order.
- The issue properties rail is removed rather than pushed below all activity.
- An open project properties rail transforms into a full-width mobile details surface with stacked Properties, Milestones, and Activity groups. The desktop document remains behind it instead of being compressed.
- Mobile still uses generous empty whitespace where content is absent. It does not fill the screen with fallback cards.

Roleway should follow the same responsive principle while preserving its own bottom navigation requirement: hide/recompose supporting chrome, retain route identity and actions, and convert split/rail layouts into explicit stack, sheet, or dedicated-detail states. Never scale the desktop layout down or introduce horizontal scrolling.

### Authenticated component contract for Roleway

The following details are now high-confidence implementation constraints:

1. Build one shell with a `244px` desktop sidebar, an `8px` outer frame inset, and a `12px` work-plane radius. Collapse it responsively rather than scaling it proportionally.
2. Standardize route bars and view toolbars at `44px`; combine them into `88px` only where a route genuinely has both identity and view controls.
3. Standardize operational sidebar rows at `28px`, group headers at `36px`, and list rows at `44px`.
4. Use `8px` as the ordinary interactive radius, `12px` for the work plane, `10px` for settings groups, `6px` for editors, and full-round only for pills/circles.
5. Keep base surfaces almost shadowless. Reserve elevation for menus, popovers, composers, and the outer work plane.
6. Keep route content flush with the work plane. Do not add a second universal page card or arbitrary centered max-width around lists, boards, queues, and tables.
7. Use neutral selection fills. Reserve Waypoint Blue for Roleway focus, progress, links, and the single forward action.
8. Implement one shared family for route bars, tabs, icon buttons, segmented controls, menus, popovers, grouped settings rows, list rows, group headers, property rows, and composers.
9. Treat layout archetype as a component variant. Visual consistency must not erase the functional difference between queue, index, board, dossier, editorial, search, and settings surfaces.
10. Preserve Roleway terminology and workflows. Do not copy Linear’s brand marks, assets, proprietary code, issue terminology, or tiny metadata sizes.

## Visual grammar

The following ranges combine S1–S6 observations with the exact public-demo measurements above. Authenticated custom themes can change colors while preserving the semantic model.

### Application frame

- 4–8px neutral outer gutter on desktop.
- One inset work plane with approximately 10–14px corner radius.
- Sidebar is roughly 240–255px when visible.
- Route bars are approximately 40–48px high.
- Secondary tab/view-control rows are approximately 38–44px high.
- Internal full-plane layouts meet the work-plane edges instead of floating inside a second page card.

### Spacing

- **2–4px:** icon/label and metadata micro-gaps.
- **6–8px:** control groups, tab spacing, compact row padding.
- **12–16px:** card padding, route-bar horizontal padding, local sections.
- **24–32px:** document section separation.
- **48px+ whitespace:** only in editorial/dossier content, never as arbitrary padding around operational tables.

Linear’s density is achieved by repeating these intervals and aligning edges, not by shrinking every element.

### Typography

- One neutral sans family across UI; Linear documents Inter Display for headings and Inter for other text. [Linear, “How we redesigned the Linear UI”](https://linear.app/now/how-we-redesigned-the-linear-ui)
- Route title/navigation: compact, medium weight.
- Record title: larger and stronger only in dossier/detail contexts.
- Metadata: muted and compact, often on one line.
- Table and board type: visually small but supported by high contrast and tight alignment.
- Roleway adaptation: preserve a **13px functional-text floor** and use 14px for controls/body. Do not copy illegibly small screenshot-scale text.

### Color

- Near-neutral canvas and sidebar with very small luminance differences.
- Text and neutral icons carry stronger contrast than borders.
- Accent color marks team identity, status, focus, selection, links, or progress.
- Primary blue-filled actions are comparatively rare in S1–S6; many actions are neutral text/icon controls.
- Large saturated surfaces are exceptional.
- Semantic status colors are small signals—dots, rings, icons—not broad tinted containers.
- Light and dark themes must preserve semantic roles, not merely invert colors. Linear supports theme and font-size preferences. [Linear preferences](https://linear.app/docs/account-preferences)

### Borders and elevation

- Hairlines explain real structural divisions: sidebar/work plane, queue/detail, route bar/content, table header/rows.
- Many content sections have no boundary at all.
- Borders are low contrast and often softened by rounded outer edges.
- Shadows are nearly absent on the base interface.
- Menus, popovers, and temporary floating panels receive the clearest shadow/elevation.

### Shape

- Outer work plane: approximately 10–14px radius.
- Small controls/tabs/cards: approximately 5–8px radius.
- Pills are used for view tabs, status filters, and compact categories.
- Ordinary page sections are not automatically rounded cards.
- Icon buttons are compact circles or rounded squares depending on context.

### Icons

- Consistent thin outline icon family.
- Typically 14–16px in operational chrome.
- Icons support recognition but do not replace labels for primary navigation or consequential actions.
- Linear explicitly reduced icon usage and removed unnecessary colored icon backgrounds. [Linear, “A calmer interface for a product in motion”](https://linear.app/now/behind-the-latest-design-refresh)

## Component behavior inventory

### Sidebar

- Stable width and shallow row height.
- Multiple hierarchy levels use indentation and grouping, not cards.
- Inactive text is muted; active rows use a low-contrast neutral fill.
- Section names recede.
- Create/search controls remain globally available.
- Content should remain usable if the sidebar is hidden.

### Route bar and tabs

- Route bars carry breadcrumbs, title, overflow, and a small number of utility actions.
- Tabs are compact and close to the route bar.
- View filters and display controls belong at the view edge, usually top-right.
- Do not repeat a large marketing-style page title below an already descriptive route bar.

### Lists and tables

- Shared columns align headers and rows.
- Rows remain flat by default and gain a subtle hover/selected fill.
- Properties can be hidden or shown through display options rather than always rendering every badge. [Linear display options](https://linear.app/docs/display-options)
- Group headers remain compact and can be sticky/collapsible where needed.

### Boards

- Group headers show status and count.
- Cards expose only the fields needed for scanning.
- Board and list preserve feature parity where practical. [Linear board layout](https://linear.app/docs/board-layout)
- Dragging is supported but keyboard and menus provide equivalent movement.

### Split detail and Peek

- Selecting a row should not force a full navigation when quick review is the task.
- A detail/Peek surface updates as keyboard focus moves through records. [Linear Peek](https://linear.app/docs/peek)
- Detail surfaces show more properties than list rows but still avoid dashboard tiles.

### Property rails

- Label/value rows align vertically.
- Labels are muted; values carry the foreground.
- Empty properties are actionable (“Add lead”), not dead “N/A” text when the user can supply them.
- Rail groups may be bordered because they are self-contained property editors.

### Menus and popovers

- Open adjacent to their trigger.
- Contain compact rows, icons, labels, optional shortcuts, and separators only between real groups.
- Use a clear elevated surface and restrained entrance motion.
- Close with Escape and restore trigger focus.

### Empty states

The captures show that Linear often leaves honest whitespace instead of centering an illustrated empty-state object. Use three levels:

1. **Empty table/board:** preserve headers and controls; show a quiet inline row/message.
2. **Empty section:** one sentence or “Add…” affordance in place.
3. **First-run product state:** a larger instructional document is acceptable, as shown in S1’s Welcome to Linear detail.

### Feedback

- Avoid full-width success banners for routine mutations when the changed record itself confirms success.
- Reserve banners for errors, warnings, onboarding transitions, or actions whose result is otherwise invisible.
- Pending state stays inside the initiating control.

## Interaction model

### Selection and navigation

- `J/K` and arrow keys move through Inbox records. [Linear Inbox](https://linear.app/docs/inbox)
- Triage actions have direct shortcuts (`1` accept, `2` duplicate, `3` decline, `H` snooze). [Linear Triage](https://linear.app/docs/triage)
- Space opens Peek and arrow keys continue navigation while the preview updates. [Linear Peek](https://linear.app/docs/peek)
- Board/list switching uses `Cmd/Ctrl+B`; board items remain keyboard-selectable. [Linear board layout](https://linear.app/docs/board-layout)
- Filters can be opened through a direct shortcut and reflected in the URL. [Linear filters](https://linear.app/docs/filters)

Roleway should not copy shortcuts blindly, but each repeated workflow needs a consistent pointer, keyboard, and touch path.

### Progressive disclosure

- Lists show scan-level information.
- Peek/split detail shows review-level information.
- Full dossiers show editing/history-level information.
- Popovers reveal scheduling, filtering, or secondary actions only when requested.
- Property visibility is configurable at the view level. [Linear display options](https://linear.app/docs/display-options)

### View persistence

Linear lets users save filtered lists/boards as views, favorite them, share them, and preserve display preferences. [Linear custom views](https://linear.app/docs/custom-views) Roleway should retain view/layout preferences without turning them into primary domain records.

## Roleway gap audit

These are the main risks to correct before further visual implementation:

1. **A universal `PageHeader` is too blunt.** Shared code is useful, but index, board, split queue, dossier, settings, and editorial surfaces require different structural primitives.
2. **Centered page containers are overused.** Operational lists should meet the work-plane edges or use a consistent full-plane grid.
3. **Nested rounded workspaces are overused.** The application already has one inset work plane; a split Inbox should usually be flush within it rather than appearing as a second large app card.
4. **Primary blue buttons are overused.** Neutral actions should dominate; blue is for the single forward action or current focus.
5. **Success banners are too persistent.** Routine creation/update success should generally be evident in the resulting row or record.
6. **Empty states are too theatrical.** Preserve useful headers and structure, then use quiet inline guidance.
7. **Properties sometimes read as passive reports.** Editable missing values should invite input instead of repeating “Not provided.”
8. **Spacing is consistent locally but not archetypally.** A dossier needs document rhythm; a board needs edge-to-edge density; a split queue needs aligned panes.
9. **Visual consistency has been pursued through CSS overrides.** Repeated archetypes need explicit React primitives and tokenized variants so later agents do not recreate them with route-specific selectors.

## Roleway primitive plan

Do not implement another route-specific restyle before these seams exist:

- `AppFrame` — sidebar, route bar, work plane.
- `RouteBar` — breadcrumb/title/overflow/actions.
- `ViewToolbar` — tabs, filters, display options, create action.
- `IndexView` — table/list grid with inline empty state.
- `SplitView` — queue + detail, resizable/stacked variants.
- `BoardView` — group headers, lanes, compact record cards.
- `DossierView` — main editable document + properties rail.
- `EditorialView` — centered explanatory content + optional context rail.
- `PropertyList` / `PropertyRow` — aligned label/value/editor rows.
- `Popover` / `Menu` — one floating surface and focus behavior.
- `InlineState` — empty/loading/error/success feedback inside its owning surface.
- `Composer` — title, description, properties, stable footer.

The primitives should own layout and state behavior. Domain components should provide content and actions.

## Acceptance checklist

A surface is Linear-inspired only if all applicable statements are true:

- The route uses the correct archetype rather than a generic page template.
- The main task is visually obvious without a large decorative heading.
- Navigation and support controls recede behind content.
- Primary and secondary edges align to a repeatable grid.
- There is at most one dominant filled action in the current context.
- Borders explain containment or relationship; they do not decorate whitespace.
- The interface still makes sense with all shadows removed.
- Empty data preserves useful structure and offers a clear next step.
- Missing editable properties are actionable.
- List, detail, board, and mobile versions expose equivalent actions.
- Keyboard focus and selected state are visually distinct.
- Text remains at least 13px in Roleway even where Linear’s screenshot-scale UI appears smaller.
- Light and dark themes preserve the same semantic hierarchy.
- 1440px and 390px layouts have no horizontal overflow.
- No fake collaboration, metrics, integrations, or product behavior has been introduced.

## Primary sources

- [Linear — A design reset](https://linear.app/now/a-design-reset)
- [Linear — How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Linear — A calmer interface for a product in motion](https://linear.app/now/behind-the-latest-design-refresh)
- [Linear Docs — Display options](https://linear.app/docs/display-options)
- [Linear Docs — Inbox](https://linear.app/docs/inbox)
- [Linear Docs — Triage](https://linear.app/docs/triage)
- [Linear Docs — Board layout](https://linear.app/docs/board-layout)
- [Linear Docs — Peek](https://linear.app/docs/peek)
- [Linear Docs — Filters](https://linear.app/docs/filters)
- [Linear Docs — Custom views](https://linear.app/docs/custom-views)
- [Linear Docs — Create issues](https://linear.app/docs/creating-issues)
- [Linear Docs — Preferences](https://linear.app/docs/account-preferences)
