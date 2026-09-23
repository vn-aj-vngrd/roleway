# Linear and Apple design research for Roleway

Researched from Linear and Apple’s official product and design material on 20 August 2026. Roleway should borrow system principles—not either company’s palette or product identity.

## Findings

1. **Hierarchy comes from alignment and controlled density.** Linear describes its redesign as reducing visual noise, maintaining alignment, and increasing the hierarchy and density of navigation elements. Roleway should use a consistent content grid, compact controls, and fewer ornamental elements rather than adding more cards. [Linear, “How we redesigned the Linear UI”](https://linear.app/now/how-we-redesigned-the-linear-ui)
2. **Elements should earn attention.** Linear's latest refresh preserves information density while intentionally giving secondary elements less visual weight. Roleway should reserve strong blue, dark text, and prominent buttons for the next action; metadata and supporting copy should recede. [Linear, “A calmer interface for a product in motion”](https://linear.app/now/behind-the-latest-design-refresh)
3. **Structure should be felt, not outlined everywhere.** Linear softened separators, reduced unnecessary borders, and removed excessive icon treatments. Roleway should rely on spacing, alignment, and subtle surface changes, using borders only where they explain containment or relationships. [Linear, “A calmer interface for a product in motion”](https://linear.app/now/behind-the-latest-design-refresh)
4. **Neutral surfaces make an interface more durable.** Linear reduced blue from its chrome to produce a more neutral, timeless appearance while increasing text and icon contrast. Roleway should stay light and near-neutral, using its blue as an action color rather than tinting every surface. [Linear, “How we redesigned the Linear UI”](https://linear.app/now/how-we-redesigned-the-linear-ui)
5. **Typography should be expressive only where useful.** Linear uses Inter Display for headings and regular Inter elsewhere. Roleway can achieve the same coherent rhythm with Inter Variable across the interface, using weight, size, and tracking—not a contrasting display face—to distinguish headings. [Linear, “How we redesigned the Linear UI”](https://linear.app/now/how-we-redesigned-the-linear-ui)
6. **Light and dark themes should share a token model.** Linear generates surfaces and elevations from base color, accent color, and contrast in LCH, and supports both light and dark defaults. Roleway should remain light-first while preserving its user-selectable dark mode through shared OKLCH semantic tokens. [Linear, “How we redesigned the Linear UI”](https://linear.app/now/how-we-redesigned-the-linear-ui)
7. **Premium presentation comes from focus, not decoration.** Apple’s product pages give one product visual most of the available canvas, then reveal capabilities in focused chapters. For Roleway, the real workspace should be the hero’s visual centerpiece rather than a collection of abstract marketing graphics. [Apple, “MacBook Air”](https://www.apple.com/macbook-air/)
8. **Alignment explains relationships.** Apple’s UI guidance explicitly recommends aligning text, images, and buttons to show how information is related, keeping controls close to the content they affect, and ensuring primary content fits without horizontal scrolling. [Apple, “UI Design Dos and Don’ts”](https://developer.apple.com/design/tips/)
9. **Small interface type must become sturdier, not merely smaller.** Apple’s typography guidance describes size-specific tracking, leading, and stronger details as essential to legibility. Roleway should use compact type in dense product previews while retaining enough weight, spacing, and contrast to remain readable. [Apple, “The details of UI typography”](https://developer.apple.com/videos/play/wwdc2020/10175/)

## Applied direction

- Light-first public site with white and warm-neutral surfaces.
- Inter Variable for both headings and UI; JetBrains Mono only for shortcuts and compact metadata.
- A 1200px content grid, disciplined section spacing, and fewer decorative labels.
- Blue reserved for the logo, primary actions, selection, and progress.
- Product UI shown with real HTML components immediately below the hero copy, presented as the page’s single rich visual centerpiece.
- One application-progress rail as Roleway’s signature detail; it communicates the actual job-search journey rather than decorating the page.
- Consistent blue primary actions in the header, hero, product preview, and closing action.
- Layered but subtle surfaces and shadows; no dark marketing skin, glass cards, or decorative gradients.
- Authenticated dark mode remains available and uses the same semantic token hierarchy.

## Landing audit — 23 August 2026

A second pass checked the implemented landing page against Linear’s current design notes, Apple’s Human Interface Guidelines, and Vercel’s Web Interface Guidelines.

- **Reduce repetition before adding decoration.** The separate eight-row feature inventory repeated the interactive product explorer and lengthened the page without adding proof. It was removed; the explorer remains the complete feature index and demonstrates every capability with responsive HTML UI.
- **Keep color structural.** Large saturated marketing fields competed with the product. The landing now uses paper, quiet neutral surfaces, hairlines, and one blue action voice; blue marks selection, progress, and calls to action rather than acting as atmosphere.
- **Adapt product graphics instead of scaling them.** Pipeline, Inbox, and Opportunity previews now recompose into mobile-native layouts at phone widths. They do not use desktop screenshots, horizontal clipping, or transform scaling.
- **Use one visual focus per chapter.** The hero, explorer, and workflow chapters each center one working product surface. Secondary copy recedes through size and contrast instead of extra containers.
- **Motion explains progression.** Scroll reveals and the route progress indicator use transform, opacity, and clip-path, stop under reduced motion, and follow the product’s next-action journey rather than decorating unrelated elements.
- **Touch and safe areas are first-class.** The public page uses `viewport-fit=cover`, safe-area padding, 44px controls, inert decorative previews, and layouts verified from 320px through tablet and phone landscape.

Sources: [Linear, “How we redesigned the Linear UI”](https://linear.app/now/how-we-redesigned-the-linear-ui), [Linear, “A calmer interface for a product in motion”](https://linear.app/now/behind-the-latest-design-refresh), [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/), and [Vercel Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines).

## Creation flow audit — 25 August 2026

A focused crawl checked Linear’s current design notes, its official issue-creation documentation, and the supplied creation-dialog specimen.

- **The composer—not a conventional form—is the pattern.** Linear’s official issue-creation screenshot leads with a borderless title and description, keeps metadata in compact property controls, and isolates creation actions in one footer. Roleway now uses the same information hierarchy for jobs, documents, and interviews.
- **Creation is a protected focus task.** New records open over the current workspace instead of replacing it with a standalone page. The underlying context remains visible but recessive.
- **Context precedes content.** A compact workspace/new-record trail anchors the modal without adding a second page-style heading.
- **Properties are secondary.** Location, compensation, arrangement, URLs, type, Opportunity, date, and duration use dense property controls below the content instead of stacked labeled form sections.
- **Actions remain predictable.** Cancel and the single forward action occupy a stable footer; Escape, the close control, and the backdrop all provide a way out.
- **The Opportunity reads as an issue.** The identifier and title lead; the description owns the main column; stage and role metadata live in the right properties rail; next action remains visible beneath them.
- **Sidebar creation stays immediate.** Search and create are compact icon actions beside the workspace identity, while `C` opens the composer from anywhere.

This follows Linear’s stated principles that supporting navigation should recede, rich density should remain readable, and structure should be felt rather than outlined everywhere. Sources: [Linear, “Creating issues”](https://linear.app/docs/creating-issues), [Linear, “A calmer interface for a product in motion”](https://linear.app/now/behind-the-latest-design-refresh), and [Linear, “How we redesigned the Linear UI”](https://linear.app/now/how-we-redesigned-the-linear-ui).

## Full-system interaction audit — 26 August 2026

A final primary-source pass reviewed Linear’s current filter, custom-view, display-option, board, and Peek documentation against Roleway’s implemented workflows.

- **The default list should remain the operational home.** Linear’s views combine grouping, ordering, filtering, and visible properties without forcing every field into a badge. Roleway’s Opportunity index now leads with grouped issue rows, plain-text next steps and dates, and a compact board alternate.
- **Filters are useful when the result stays readable.** Priority and due-date filters compose beside the lifecycle tabs, remain visible as removable chips, and do not open a full-screen filter builder.
- **Saved views are personal navigation, not database ceremony.** Users can save, rename, apply, and remove Opportunity views on the current device. The saved state contains only filter and layout preferences—never record content.
- **Triage should preserve context while increasing speed.** The Inbox now keeps a keyboard-navigable review queue beside one listing dossier on desktop, then turns that dossier into a full-screen mobile layer. Track, keep, and dismiss actions remain visible and explicit.
- **Secondary mobile navigation belongs behind one intentional disclosure.** Home, Opportunities, and Inbox stay in the bottom bar. Interviews, Contacts, Documents, Assist, Insights, Notifications, and Settings remain one tap away in an accessible More sheet.
- **People need a Workspace-level operating surface.** Contacts now have a compact, searchable list with relationship, Opportunity, and follow-up context while remaining subordinate to the active Workspace.

Primary sources: [Linear filters](https://linear.app/docs/filters), [custom views](https://linear.app/docs/custom-views), [display options](https://linear.app/docs/display-options), [board layout](https://linear.app/docs/board-layout), and [Peek](https://linear.app/docs/peek).
