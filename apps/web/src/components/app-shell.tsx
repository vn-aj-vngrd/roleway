"use client";

import { Bell, CalendarClock, ChartNoAxesColumnIncreasing, FileText, Inbox, LayoutDashboard, LogOut, Moon, Plus, Search, Settings, ShieldCheck, Sun, Target, X, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { LogoMark } from "@/components/logo";
import { ProductTour } from "@/components/product-tour";

const workspaceNav = [
  { href: "/today", label: "Today", icon: LayoutDashboard },
  { href: "/opportunities", label: "Opportunities", icon: Target },
];
const resourcesNav = [
  { href: "/jobs", label: "Job inbox", icon: Inbox },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/preparation", label: "Interviews", icon: CalendarClock },
];
const reviewNav = [{ href: "/insights", label: "Insights", icon: ChartNoAxesColumnIncreasing }];
const utilityNav = [
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];
type NavEntry = { href: string; label: string; icon: LucideIcon };

const commands = [
  { label: "Add a job", shortcut: "C", icon: Plus, href: "/jobs?create=true" },
  { label: "Open job inbox", shortcut: "I", icon: Inbox, href: "/jobs" },
  { label: "Open opportunities", icon: Target, href: "/opportunities" },
  { label: "Open documents", icon: FileText, href: "/documents" },
  { label: "Open interviews", icon: CalendarClock, href: "/preparation" },
  { label: "Open notifications", icon: Bell, href: "/notifications" },
  { label: "Open settings", icon: Settings, href: "/settings/profile" },
];

function NavItem({ item, pathname, badge }: { item: NavEntry; pathname: string; badge?: number | undefined }) {
  const active = pathname === item.href || (item.href !== "/today" && pathname.startsWith(item.href));
  const Icon = item.icon;
  return <Link href={item.href} data-tour={item.href === "/today" ? "today" : item.href === "/jobs" ? "jobs" : item.href === "/opportunities" ? "opportunities" : undefined} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}><Icon aria-hidden="true" /><span>{item.label}</span>{badge ? <span className="nav-badge" aria-label={`${badge} unread`}>{badge > 99 ? "99+" : badge}</span> : null}</Link>;
}

function NavSection({ label, items, pathname }: { label: string; items: NavEntry[]; pathname: string }) {
  return <div className="sidebar-section"><div className="sidebar-label">{label}</div><nav className="nav-group" aria-label={label}>{items.map((item) => <NavItem key={item.href} item={item} pathname={pathname} />)}</nav></div>;
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase())), [query]);
  useEffect(() => { if (open) { setQuery(""); requestAnimationFrame(() => inputRef.current?.focus()); } }, [open]);
  if (!open) return null;
  return <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()} className="backdrop"><div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Command menu" className="command-dialog" onKeyDown={(event) => { if (event.key === "Escape") onClose(); if (event.key === "Tab") { const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), [href]") ?? []); const first = controls[0]; const last = controls.at(-1); if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); } } }}><div className="command-input-wrap"><Search aria-hidden="true" /><input ref={inputRef} className="command-input" aria-label="Search commands" placeholder="Search commands…" value={query} onChange={(event) => setQuery(event.target.value)} /><button className="icon-button" aria-label="Close command menu" onClick={onClose}><X aria-hidden="true" /></button></div><div className="command-list"><div className="command-label">Quick actions</div>{filtered.map((command, index) => { const Icon = command.icon; return <button key={command.label} className={`command-item ${index === 0 ? "active" : ""}`} onClick={() => { router.push(command.href); onClose(); }}><Icon aria-hidden="true" /><span>{command.label}</span>{command.shortcut ? <kbd>{command.shortcut}</kbd> : null}</button>; })}{filtered.length === 0 ? <p className="muted small command-empty">No matching commands.</p> : null}</div></div></div>;
}

export function AppShell({ children, user, showTour, notificationCount, isAdmin }: { children: ReactNode; user: { name: string; email: string }; showTour: boolean; notificationCount: number; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const commandTriggerRef = useRef<HTMLButtonElement>(null);
  const closePalette = useCallback(() => { setPaletteOpen(false); requestAnimationFrame(() => commandTriggerRef.current?.focus()); }, []);
  const toggleTheme = useCallback(() => { setDark((current) => { const next = !current; document.documentElement.dataset.theme = next ? "dark" : "light"; localStorage.setItem("roleway-theme", next ? "dark" : "light"); return next; }); }, []);
  useEffect(() => { const isDark = localStorage.getItem("roleway-theme") === "dark"; setDark(isDark); document.documentElement.dataset.theme = isDark ? "dark" : "light"; }, []);
  useEffect(() => { const onKeyDown = (event: KeyboardEvent) => { const target = event.target as HTMLElement; const editing = target.matches("input, textarea, select, [contenteditable='true']"); if (event.key === "Escape" && paletteOpen) closePalette(); else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setPaletteOpen(true); } else if (!editing && event.key === "/") { event.preventDefault(); setPaletteOpen(true); } else if (!editing && event.key.toLowerCase() === "c") router.push("/jobs?create=true"); else if (!editing && event.key.toLowerCase() === "i") router.push("/jobs"); }; window.addEventListener("keydown", onKeyDown); return () => window.removeEventListener("keydown", onKeyDown); }, [closePalette, paletteOpen, router]);

  const segment = pathname.split("/").filter(Boolean)[0] ?? "today";
  const titleMap: Record<string, string> = { today: "Today", opportunities: "Opportunities", jobs: "Job inbox", documents: "Documents", preparation: "Interviews", insights: "Insights", notifications: "Notifications", settings: "Settings", admin: "Admin console" };
  const title = titleMap[segment] ?? segment;
  const initials = user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const mobileNav = [...workspaceNav, resourcesNav[0]!, utilityNav[1]!];

  return <div className="app-shell"><aside className="sidebar" aria-label="Main navigation"><Link href="/today" className="brand"><LogoMark /><span>Roleway</span></Link><div className="sidebar-navigation"><NavSection label="Workspace" items={workspaceNav} pathname={pathname} /><NavSection label="Resources" items={resourcesNav} pathname={pathname} /><NavSection label="Review" items={reviewNav} pathname={pathname} /></div><div className="nav-spacer" /><div className="sidebar-section sidebar-utilities"><nav className="nav-group" aria-label="Account">{utilityNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} badge={item.href === "/notifications" ? notificationCount : undefined} />)}{isAdmin ? <NavItem item={{ href: "/admin", label: "Admin console", icon: ShieldCheck }} pathname={pathname} /> : null}</nav></div><div className="sidebar-user"><Link href="/settings/profile" className="sidebar-profile"><span className="avatar">{initials}</span><span className="user-copy"><span className="user-name">{user.name}</span><span className="user-state">{isAdmin ? "Administrator" : user.email}</span></span></Link><form action={signOut}><button className="icon-button" aria-label="Sign out" title="Sign out"><LogOut aria-hidden="true" /></button></form></div></aside><main className="main" id="main-content"><header className="topbar"><div className="breadcrumb"><strong>{title}</strong>{pathname.startsWith("/opportunities/") ? <><span>/</span><span className="mono">Detail</span></> : null}</div><div className="topbar-spacer" /><button ref={commandTriggerRef} className="search-trigger" data-tour="commands" aria-label="Search or run a command" onClick={() => setPaletteOpen(true)}><Search aria-hidden="true" /><span>Search</span><kbd>⌘ K</kbd></button><Link className="icon-button notification-trigger" href="/notifications" aria-label={notificationCount ? `${notificationCount} unread notifications` : "Notifications"}><Bell aria-hidden="true" />{notificationCount ? <span className="notification-dot" /> : null}</Link><button className="icon-button" onClick={toggleTheme} aria-label={dark ? "Use light theme" : "Use dark theme"}>{dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}</button></header>{children}</main><nav className="mobile-nav" aria-label="Mobile navigation">{mobileNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} />)}</nav><CommandPalette open={paletteOpen} onClose={closePalette} /><ProductTour open={showTour} /></div>;
}
