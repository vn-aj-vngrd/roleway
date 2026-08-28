import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type CountBadgeProps = {
  value: ReactNode;
  label?: string;
  tone?: "neutral" | "accent";
  className?: string;
};

/** Compact numeric count used beside labels, tabs, groups, and navigation. */
export function CountBadge({
  value,
  label,
  tone = "neutral",
  className,
}: CountBadgeProps) {
  const displayValue =
    typeof value === "number" || typeof value === "string" ? String(value) : "";
  const wide = displayValue.length > 2;
  return (
    <Badge
      variant={tone === "accent" ? "default" : "secondary"}
      className={cn("count-badge", className)}
      data-wide={wide || undefined}
      {...(label ? { "aria-label": label } : {})}
    >
      {value}
    </Badge>
  );
}

type PillTabItem = {
  href: string;
  label: ReactNode;
  active: boolean;
  count?: ReactNode;
};
type PillTabButtonItem<Value extends string> = {
  value: Value;
  label: ReactNode;
  active: boolean;
  count?: ReactNode;
};

function PillTabContent({
  label,
  count,
  active,
}: {
  label: ReactNode;
  count?: ReactNode;
  active: boolean;
}) {
  return (
    <>
      <span>{label}</span>
      {count !== undefined ? (
        <CountBadge tone={active ? "accent" : "neutral"} value={count} />
      ) : null}
    </>
  );
}

/** URL-backed capsule tabs with one shared active treatment and count behavior. */
export function PillTabs({
  label,
  items,
  className,
  scroll,
}: {
  label: string;
  items: PillTabItem[];
  className?: string;
  scroll?: boolean;
}) {
  return (
    <nav className={cn("pill-tabs", className)} aria-label={label}>
      {items.map((item) => (
        <Link
          className="pill-tab"
          aria-current={item.active ? "page" : undefined}
          href={item.href}
          key={item.href}
          {...(scroll !== undefined ? { scroll } : {})}
        >
          <PillTabContent
            label={item.label}
            count={item.count}
            active={item.active}
          />
        </Link>
      ))}
    </nav>
  );
}

/** State-backed capsule tabs for client views that cannot navigate by URL. */
export function PillTabButtons<Value extends string>({
  label,
  items,
  onChange,
  className,
}: {
  label: string;
  items: PillTabButtonItem<Value>[];
  onChange: (value: Value) => void;
  className?: string;
}) {
  return (
    <div
      className={cn("pill-tabs", className)}
      role="tablist"
      aria-label={label}
    >
      {items.map((item) => (
        <button
          className="pill-tab"
          type="button"
          role="tab"
          aria-selected={item.active}
          key={item.value}
          onClick={() => onChange(item.value)}
        >
          <PillTabContent
            label={item.label}
            count={item.count}
            active={item.active}
          />
        </button>
      ))}
    </div>
  );
}

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/**
 * Editorial and dossier heading treatment. Operational Workspace collections use
 * `WorkspaceHeader` plus `ViewToolbar` so route identity and view controls stay compact.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <header className={`page-header${className ? ` ${className}` : ""}`}>
      <div className="page-header-copy">
        {eyebrow ? <div className="page-eyebrow">{eyebrow}</div> : null}
        <h1>{title}</h1>
        {description ? <p className="page-subtitle">{description}</p> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </header>
  );
}

type WorkspaceHeaderProps = {
  title: ReactNode;
  count?: ReactNode;
  context?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** Compact identity row for operational Workspace routes. */
export function WorkspaceHeader({
  title,
  count,
  context,
  actions,
  className = "",
}: WorkspaceHeaderProps) {
  return (
    <header
      className={`workspace-page-header${className ? ` ${className}` : ""}`}
    >
      <div className="workspace-page-heading">
        <div>
          <h1>{title}</h1>
          {count !== undefined ? <CountBadge value={count} /> : null}
        </div>
        {context ? <p>{context}</p> : null}
      </div>
      {actions ? <div className="workspace-page-actions">{actions}</div> : null}
    </header>
  );
}

type ViewToolbarProps = {
  primary: ReactNode;
  actions?: ReactNode;
  label?: string;
  className?: string;
};

/** Shared second-row controls for collection views. */
export function ViewToolbar({
  primary,
  actions,
  label = "View controls",
  className = "",
}: ViewToolbarProps) {
  return (
    <div
      className={`workspace-view-toolbar${className ? ` ${className}` : ""}`}
      role="group"
      aria-label={label}
    >
      <div className="workspace-view-primary">{primary}</div>
      {actions ? <div className="workspace-view-actions">{actions}</div> : null}
    </div>
  );
}

type WorkspaceListGroupProps = {
  title: ReactNode;
  count?: ReactNode;
  leading?: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Tonal 36px group header with flat operational rows beneath it. */
export function WorkspaceListGroup({
  title,
  count,
  leading,
  children,
  className = "",
}: WorkspaceListGroupProps) {
  return (
    <section
      className={`workspace-list-group${className ? ` ${className}` : ""}`}
    >
      <header>
        {leading ? (
          <span className="workspace-list-group-icon" aria-hidden="true">
            {leading}
          </span>
        ) : null}
        <h2>{title}</h2>
        {count !== undefined ? <CountBadge value={count} /> : null}
      </header>
      <div className="workspace-list-group-rows">{children}</div>
    </section>
  );
}

type EmptyStateProps = {
  title: ReactNode;
  description: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

/** A consistent, left-aligned recovery state for empty and unavailable collections. */
export function EmptyState({
  title,
  description,
  icon,
  actions,
  className = "",
}: EmptyStateProps) {
  return (
    <Empty className={`empty-state${className ? ` ${className}` : ""}`}>
      <EmptyHeader>
        {icon ? (
          <EmptyMedia className="empty-icon" aria-hidden="true">
            {icon}
          </EmptyMedia>
        ) : null}
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {actions ? (
        <EmptyContent className="empty-state-actions">{actions}</EmptyContent>
      ) : null}
    </Empty>
  );
}

type SectionHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  count?: ReactNode;
  actions?: ReactNode;
};

/** Shared heading rhythm for sections inside a page or dossier. */
export function SectionHeader({
  title,
  description,
  count,
  actions,
}: SectionHeaderProps) {
  return (
    <header className="section-header">
      <div className="section-header-copy">
        <div className="section-header-title">
          <h2>{title}</h2>
          {count !== undefined ? <CountBadge value={count} /> : null}
        </div>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="section-header-actions">{actions}</div> : null}
    </header>
  );
}
