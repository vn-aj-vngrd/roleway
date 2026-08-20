# Roleway Design System

## Overview

Roleway is a desktop-first productivity workspace designed for a person working through a serious job search at a desk in clear daytime light, moving quickly between deadlines, evidence, and preparation without wanting visual stimulation. The color strategy is restrained: cool near-neutral architecture with a precise blue action color used only for selection, progress, and primary actions.

The signature is the **action line**: a thin, continuous route through Today and Opportunity views that connects time, status, and the next concrete action. It makes the product feel like an operating plan rather than a dashboard.

## Logo

The Roleway mark is a compact geometric **R drawn as a route**. Its terminal waypoint represents the next action—the product’s central organizing idea. The near-square tile uses Roleway blue with a white route in both themes. Keep the mark flat, unshadowed, and paired with the Roleway wordmark in product navigation. Use the standalone fixed-color SVG for favicons and external surfaces.

## Color

All application colors use OKLCH.

### Light

- Canvas: `oklch(1 0 0)`
- Sidebar: `oklch(0.972 0.004 255)`
- Raised surface: `oklch(0.985 0.003 255)`
- Subtle surface: `oklch(0.95 0.009 255)`
- Ink: `oklch(0.19 0.012 255)`
- Muted ink: `oklch(0.45 0.015 255)`
- Hairline: `oklch(0.895 0.008 255)`
- Primary blue: `oklch(0.54 0.205 255)`
- Primary hover: `oklch(0.48 0.195 255)`
- Accent amber: `oklch(0.68 0.15 78)`
- Danger: `oklch(0.55 0.205 27)`

### Dark

- Canvas: `oklch(0.15 0.01 255)`
- Sidebar: `oklch(0.125 0.012 255)`
- Raised surface: `oklch(0.19 0.012 255)`
- Subtle surface: `oklch(0.235 0.017 255)`
- Ink: `oklch(0.95 0.006 255)`
- Muted ink: `oklch(0.70 0.014 255)`
- Hairline: `oklch(0.29 0.016 255)`
- Primary blue: `oklch(0.70 0.155 255)`

## Typography

- UI and prose: Instrument Sans Variable with system sans fallback. Precise and compact, with a warmer, more human shape than a default dashboard grotesk.
- IDs, shortcuts, dates, and numerical metadata: JetBrains Mono Variable with SFMono fallback.
- Fixed product scale: 12 / 13 / 14 / 16 / 20 / 26px. No fluid headings.
- Titles use 600 weight; body uses 400–500. Metadata uses tabular numerals.

## Layout

- Desktop shell: a 244px navigation rail and flexible work surface sit inside a 12px floating application frame. The main surface has its own border, radius, and subtle depth rather than touching the viewport.
- Main content max width is route-specific; operational lists can use the full work surface.
- Dividers and alignment establish hierarchy. Cards are reserved for movable objects, approvals, and self-contained records.
- Mobile below 760px: bottom navigation for primary destinations, single-column content, contextual panels become sheets.

## Components

### Buttons

Small and exact: 32–36px height, 7px radius. Primary uses solid Roleway blue with white text. Secondary uses a hairline border and canvas fill. Ghost actions are reserved for toolbars.

### Opportunity cards

Compact, 8px radius, hairline border, no decorative shadow. Role leads; company, constraints, fit reasoning, age, and next action follow in that order.

### Status markers

Use icon/shape plus text. Pills are limited to true categorical status. Fit is rendered as a labeled value with a short reason, not a decorative gauge.

### Inputs

36px height, subtle surface, visible labels, strong blue focus ring. Placeholder contrast meets AA.

### Panels and dialogs

Context panels use a structural divider, not floating-card styling. Dialogs are limited to commands, approvals, and short creation flows.

## Motion

State transitions use 160–200ms ease-out. Kanban movement, panel entry, and disclosure changes communicate state only. Reduced-motion removes transforms and shortens transitions to near-instant.

## Accessibility

Visible 2px focus rings with offset, 44px mobile tap targets, semantic landmarks and headings, live announcements after status changes, and alternative stage-move controls on every opportunity card.

## Continuous quality loop

UI quality is a product goal, not a launch task. Every meaningful interface change repeats the same loop:

1. Walk the complete capture → review → track → act → follow-up flow with real records.
2. Inspect landing, Today, one dense workspace, notifications, and settings at desktop and mobile widths.
3. Fix the highest-friction issue first: unclear next action, broken hierarchy, inconsistent control, spacing defect, or inaccessible state.
4. Verify keyboard flow, reduced motion, loading, empty, error, and destructive states.
5. Run lint, unit tests, production build, and critical browser tests before release.

Prefer small systemic improvements to isolated decoration. A token, component, or navigation correction should improve every route that uses it.
