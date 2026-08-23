---
name: Roleway
description: A calm working surface for a selective job search.
colors:
  roleway-blue: "oklch(0.55 0.19 255)"
  roleway-blue-hover: "oklch(0.49 0.185 255)"
  roleway-blue-soft: "oklch(0.94 0.035 255)"
  paper: "oklch(0.995 0.002 90)"
  warm-stone: "oklch(0.967 0.003 90)"
  quiet-surface: "oklch(0.978 0.003 90)"
  selected-stone: "oklch(0.935 0.004 90)"
  graphite: "oklch(0.22 0.006 90)"
  graphite-muted: "oklch(0.47 0.008 90)"
  hairline: "oklch(0.90 0.004 90)"
  hairline-strong: "oklch(0.82 0.006 90)"
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
    fontSize: "12px"
    fontWeight: 470
    lineHeight: 1.4
  utility:
    fontFamily: "JetBrains Mono Variable, SFMono-Regular, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  compact: "5px"
  control: "6px"
  object: "7px"
  island: "10px"
spacing:
  xxs: "4px"
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.roleway-blue}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "34px"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "34px"
  navigation-active:
    backgroundColor: "{colors.selected-stone}"
    textColor: "{colors.graphite}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "0 8px"
    height: "32px"
  input:
    backgroundColor: "{colors.quiet-surface}"
    textColor: "{colors.graphite}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "36px"
---

# Design System: Roleway

## Overview

**Creative North Star: "The Working Page"**

Roleway should feel like a personal workspace that happens to manage a job search, not a dashboard assembled from widgets. The authenticated application borrows the structural calm of current Notion, the interaction density of Linear, and Apple’s alignment and finish while retaining Roleway’s own blue action color and route-shaped mark.

The interface is light-first for focused desk work. A warm-stone navigation rail supports one paper-white main island. Graphite typography, neutral selection, compact controls, and hairline structure keep attention on the current opportunity and its next action.

**Key Characteristics:**
- Flat persistent navigation beside one dominant work island.
- Warm neutral architecture with blue reserved for action, progress, focus, and selected icons.
- Document-like pages and record surfaces instead of dashboard card grids.
- Compact, labeled navigation that remains legible in expanded and collapsed modes.
- Dark mode preserves the same hierarchy through semantic color roles.

## Colors

The palette is warm-neutral and restrained; Roleway blue is the only saturated interface voice.

### Primary
- **Roleway Blue:** Primary actions, focus rings, progress nodes, selected navigation icons, and the route logo.
- **Roleway Blue Soft:** Low-emphasis callouts, selected progress states, and accessible focus support.

### Neutral
- **Paper:** Main work island, cards representing movable records, dialogs, and secondary buttons.
- **Warm Stone:** Application backdrop and the uncontained navigation rail.
- **Quiet Surface:** Inputs, toolbars, and low-emphasis working regions.
- **Selected Stone:** Hover and selected navigation states.
- **Graphite:** Primary text and high-confidence iconography.
- **Graphite Muted:** Descriptions, metadata, and secondary controls.
- **Hairline / Hairline Strong:** Structural dividers and interactive boundaries.

**The One Saturated Voice Rule.** Blue communicates action or progress. Navigation containers, page chrome, and decorative regions stay neutral.

**The Semantic Theme Rule.** Dark mode changes role values, not component logic; selection, action, and hierarchy remain identical.

## Typography

**Display Font:** Inter Variable with the system sans stack.
**Body Font:** Inter Variable with the system sans stack.
**Utility Font:** JetBrains Mono Variable for IDs, keyboard shortcuts, dates, and compact numeric metadata only.

**Character:** The system uses one workhorse sans family with size-specific weight and tracking. It feels familiar and editorial without turning headings into marketing display type.

### Hierarchy
- **Headline** (650, 28px, 1.16): Primary page titles and Today greeting.
- **Title** (620, 16px, 1.3): Section titles, empty-state headings, and record names.
- **Body** (400, 14px, 1.45): Working copy and form content, kept below roughly 70 characters per line where practical.
- **Label** (470–590, 10–12px): Navigation, controls, section labels, and metadata.
- **Utility** (500, 11px): Reference numbers, shortcuts, dates, and tabular values.

**The Plain Hierarchy Rule.** Weight and spacing establish priority; decorative uppercase, display serifs, and oversized dashboard numbers do not.

## Layout

Desktop uses a 240px expanded navigation rail or 64px compact rail directly on the warm-stone backdrop. Only the main work surface becomes an island: 8px from the viewport edge, separated from the rail by 8px, with a 10px corner radius.

Pages use 42px top spacing and fluid horizontal padding from 28px to 64px. Focused pages cap content at 980px; operational boards may use the full island. Tight intervals of 4–16px group related controls, while 24–32px separates sections.

Below 760px the sidebar disappears, the island boundary is removed, pages use 20px horizontal padding, and primary navigation becomes a 58px bottom bar. DOM order remains unchanged and no mobile view may scroll horizontally.

**The One Island Rule.** The navigation rail belongs to the backdrop. Never place the sidebar inside a floating container or nest additional page-sized islands inside the main surface.

## Elevation & Depth

The system is flat by default. Tonal shifts and hairlines establish most hierarchy. The main island uses one ambient shadow plus a one-pixel structural border; dialogs and account menus may rise above it with a stronger but neutral shadow. Opportunity cards receive only a slight state shadow because they are movable objects.

### Shadow Vocabulary
- **Main island:** `0 1px 2px oklch(.20 .01 90 / .06), 0 10px 28px oklch(.20 .01 90 / .065)`.
- **Dialog:** `0 18px 54px oklch(.18 .01 90 / .20)`.
- **Movable record hover:** `0 2px 6px oklch(.20 .01 90 / .07)`.

**The Flat-by-Default Rule.** Shadows explain hierarchy or movement; they never decorate static content.

## Shapes

Controls use compact 5–6px corners. Movable records use 7px corners. The single main island and command dialogs use 10px corners. Dividers remain one pixel. Pills are reserved for categorical status, not ordinary buttons, navigation, or metadata.

The Roleway mark remains a compact route-shaped R in a blue tile. Interface icons use Lucide’s consistent outline vocabulary at 15–16px with restrained stroke weight.

## Components

### Buttons
- **Shape:** Compact rectangle with a 6px radius and 34px height.
- **Primary:** Solid Roleway blue, paper-white text, modest inset highlight, and no decorative gradient.
- **Secondary:** Paper background, strong hairline border, and graphite text.
- **Hover / Focus:** Color shift plus a visible blue focus ring; no floating transform on routine controls.

### Cards / Containers
- **Opportunity cards:** Paper surface, 7px radius, hairline border, almost flat at rest.
- **Form sections:** Document sections separated by horizontal rules, not filled cards.
- **Empty states:** Open whitespace with a standalone route/target icon; never put the icon in a generic rounded tile.
- **Summary values:** Flat property strips with top and bottom dividers, not dashboard metric cards.

### Inputs / Fields
- **Style:** Quiet warm surface, strong hairline border, 6px radius, and visible labels.
- **Focus:** Roleway blue border with a restrained three-pixel soft ring.
- **Error / Disabled:** Semantic danger color or reduced opacity without removing the field’s label or recovery copy.

### Navigation
- Expanded rows are 32px high with 16px outline icons, 12px labels, and 6px corners. Hover and active states use neutral fills; only the active icon turns blue. Section labels are sentence case, untracked, and visually subordinate.
- Compact mode preserves a 40px centerline for logo, search, destinations, notifications, and avatar.
- Mobile navigation uses labeled 48px targets in a fixed bottom bar with the same neutral active state.

### Main Work Island
The island is the application’s dominant structural component. It owns page content, boards, settings, dialogs anchored to content, and route-specific loading states. Its border, background, and radius remain consistent across authenticated routes.

## Do's and Don'ts

### Do:
- **Do** use proximity and hairlines before adding a container.
- **Do** keep the next action and its due state visible near the record it affects.
- **Do** reserve cards for movable opportunities, approvals, and self-contained records.
- **Do** use blue for actions, progress, focus, and selected icons.
- **Do** preserve the same semantic hierarchy in dark mode and on mobile.

### Don't:
- **Don't** wrap the sidebar in a floating panel or give every section its own island.
- **Don't** use blue-tinted application chrome, startup gradients, glass, glow, or decorative metrics.
- **Don't** turn summaries into large dashboard cards or put empty-state icons in generic rounded tiles.
- **Don't** use AI imagery, sparkles, robots, or chat styling to represent Assist.
- **Don't** copy Notion’s brand assets, collaboration terminology, or AI-first positioning; only its workspace discipline is relevant.
