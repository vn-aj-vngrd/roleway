# Roleway Design System

## Overview

Roleway is a desktop-first productivity workspace designed for a person working through a serious job search at a desk in clear daytime light, moving quickly between deadlines, evidence, and preparation without wanting visual stimulation. The color strategy is restrained: near-neutral architecture with a moss-green action color used only for selection, progress, and primary actions.

The signature is the **action line**: a thin, continuous route through Today and Opportunity views that connects time, status, and the next concrete action. It makes the product feel like an operating plan rather than a dashboard.

## Color

All application colors use OKLCH.

### Light

- Canvas: `oklch(1 0 0)`
- Sidebar: `oklch(0.972 0.004 130)`
- Raised surface: `oklch(0.985 0.002 130)`
- Subtle surface: `oklch(0.955 0.005 130)`
- Ink: `oklch(0.205 0.012 130)`
- Muted ink: `oklch(0.47 0.012 130)`
- Hairline: `oklch(0.89 0.006 130)`
- Primary moss: `oklch(0.49 0.142 130)`
- Primary hover: `oklch(0.43 0.13 130)`
- Accent ochre: `oklch(0.66 0.145 72)`
- Danger: `oklch(0.54 0.19 28)`

### Dark

- Canvas: `oklch(0.145 0.008 130)`
- Sidebar: `oklch(0.175 0.009 130)`
- Raised surface: `oklch(0.205 0.009 130)`
- Subtle surface: `oklch(0.235 0.01 130)`
- Ink: `oklch(0.94 0.005 130)`
- Muted ink: `oklch(0.70 0.01 130)`
- Hairline: `oklch(0.31 0.012 130)`
- Primary moss: `oklch(0.70 0.14 130)`

## Typography

- UI and prose: Geist Sans with system sans fallback. Compact, neutral, highly legible.
- IDs, shortcuts, dates, and numerical metadata: Geist Mono with SFMono fallback.
- Fixed product scale: 12 / 13 / 14 / 16 / 20 / 26px. No fluid headings.
- Titles use 600 weight; body uses 400–500. Metadata uses tabular numerals.

## Layout

- Desktop shell: 224px sidebar, flexible content, optional 320px contextual panel.
- Main content max width is route-specific; operational lists can use the full viewport.
- Dividers and alignment establish hierarchy. Cards are reserved for movable objects, approvals, and self-contained records.
- Mobile below 760px: bottom navigation for primary destinations, single-column content, contextual panels become sheets.

## Components

### Buttons

Small and exact: 32–36px height, 7px radius. Primary uses solid moss with white text. Secondary uses a hairline border and canvas fill. Ghost actions are reserved for toolbars.

### Opportunity cards

Compact, 8px radius, hairline border, no decorative shadow. Role leads; company, constraints, fit reasoning, age, and next action follow in that order.

### Status markers

Use icon/shape plus text. Pills are limited to true categorical status. Fit is rendered as a labeled value with a short reason, not a decorative gauge.

### Inputs

36px height, subtle surface, visible labels, strong moss focus ring. Placeholder contrast meets AA.

### Panels and dialogs

Context panels use a structural divider, not floating-card styling. Dialogs are limited to commands, approvals, and short creation flows.

## Motion

State transitions use 160–200ms ease-out. Kanban movement, panel entry, and disclosure changes communicate state only. Reduced-motion removes transforms and shortens transitions to near-instant.

## Accessibility

Visible 2px focus rings with offset, 44px mobile tap targets, semantic landmarks and headings, live announcements after status changes, and alternative stage-move controls on every opportunity card.
