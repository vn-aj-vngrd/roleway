# Shadcn sidebar reference

Research date: 24 August 2026

## Primary references

- [sidebar-07 block](https://ui.shadcn.com/view/new-york-v4/sidebar-07)
- [Sidebar component documentation](https://ui.shadcn.com/docs/components/base/sidebar)
- [Sidebar blocks library](https://ui.shadcn.com/blocks/sidebar)

## Findings

The official `sidebar-07` block uses a conventional application frame: a persistent left sidebar, grouped navigation, a user footer, an icon-only collapsed state, and a simple content region. The sidebar documentation defines this as a composition of header, scrollable content, grouped menus, footer, rail, trigger, and content inset rather than one monolithic component.

Shadcn supports three variants—`sidebar`, `floating`, and `inset`—plus `offcanvas`, `icon`, and fixed collapsible behavior. Roleway intentionally follows the flush `sidebar` structure rather than the floating or inset treatment: the sidebar meets the content directly across one border, and the content has no outer radius or shadow.

The documented keyboard shortcut is Command-B on macOS and Control-B on Windows. Roleway now uses the same shortcut while preserving its existing local preference for expanded or compact mode.

## Applied to Roleway

- 256px expanded sidebar and 64px icon rail.
- One full-height separator between sidebar and content.
- Flat white content plane; no application island, outer radius, or shell shadow.
- Compact grouped navigation with neutral hover and active states.
- Sticky 52px content toolbar with sidebar trigger and route breadcrumb.
- Account control remains in the sidebar footer.
- Existing mobile bottom navigation remains because Roleway’s essential mobile workflow differs from the desktop block.

This is structural reference, not a package adoption or visual copy. Roleway keeps its own routes, mark, blue action color, product language, accessibility behavior, and data-backed page components.
