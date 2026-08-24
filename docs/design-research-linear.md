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
