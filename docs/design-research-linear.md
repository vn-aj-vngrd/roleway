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
