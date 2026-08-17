"use client";

import {
  Bell,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  Command,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Target,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { LogoMark } from "@/components/logo";
import { ProductTour } from "@/components/product-tour";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const primaryNav = [
  { href: "/today", label: "Today", icon: LayoutDashboard },
  { href: "/opportunities", label: "Opportunities", icon: Target },
  { href: "/jobs", label: "Jobs", icon: Inbox },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/preparation", label: "Preparation", icon: CalendarClock },
  { href: "/insights", label: "Insights", icon: ChartNoAxesColumnIncreasing },
];

const lowerNav = [
  { href: "/agent", label: "Agent", icon: Bot },
  { href: "/settings/profile", label: "Settings", icon: Settings },
];

const mobileNav = [primaryNav[0]!, primaryNav[1]!, primaryNav[2]!, primaryNav[4]!, lowerNav[0]!];

const commands = [
  { label: "Create opportunity", shortcut: "C", icon: Plus, href: "/jobs?create=opportunity" },
  { label: "Import job", shortcut: "I", icon: Inbox, href: "/jobs?import=true" },
  { label: "Search jobs", shortcut: "/", icon: Search, href: "/jobs?search=true" },
  { label: "Review applications", icon: FileText, href: "/opportunities" },
  { label: "Analyze a job", icon: Target, href: "/jobs" },
  { label: "Research a company", icon: BriefcaseBusiness, href: "/opportunities" },
  { label: "Create preparation plan", icon: CalendarClock, href: "/preparation" },
  { label: "Find stale applications", icon: Bell, href: "/today" },
  { label: "Ask agent", shortcut: "A", icon: Bot, href: "/agent" },
];

function NavItem({ item, pathname }: { item: (typeof primaryNav)[number]; pathname: string }) {
  const active = pathname === item.href || (item.href !== "/today" && pathname.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link href={item.href} data-tour={item.href === "/today" ? "today" : item.href === "/jobs" ? "jobs" : item.href === "/opportunities" ? "opportunities" : undefined} className={`nav-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
      <Icon aria-hidden="true" />
      <span>{item.label}</span>
    </Link>
  );
}

function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase())), [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  if (!open) return null;

  return (
    <div role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()} className="backdrop">
      <div role="dialog" aria-modal="true" aria-label="Command palette" className="command-dialog" onKeyDown={(event) => event.key === "Escape" && onClose()}>
        <div className="command-input-wrap">
          <Search aria-hidden="true" />
          <input ref={inputRef} className="command-input" placeholder="Search commands and opportunities…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <button className="icon-button" aria-label="Close command palette" onClick={onClose}><X /></button>
        </div>
        <div className="command-list">
          <div className="command-label">Actions</div>
          {filtered.map((command, index) => {
            const Icon = command.icon;
            return (
              <button key={command.label} className={`command-item ${index === 0 ? "active" : ""}`} onClick={() => { router.push(command.href); onClose(); }}>
                <Icon aria-hidden="true" /><span>{command.label}</span>{command.shortcut ? <kbd>{command.shortcut}</kbd> : null}
              </button>
            );
          })}
          {filtered.length === 0 ? <p className="muted small" style={{ padding: "12px" }}>No matching commands.</p> : null}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children, user, showTour }: { children: ReactNode; user: { name: string; email: string }; showTour: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const toggleTheme = useCallback(() => {
    setDark((current) => {
      const next = !current;
      document.documentElement.dataset.theme = next ? "dark" : "light";
      localStorage.setItem("roleway-theme", next ? "dark" : "light");
      return next;
    });
  }, []);

  useEffect(() => {
    const isDark = localStorage.getItem("roleway-theme") === "dark";
    setDark(isDark);
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing = target.matches("input, textarea, select, [contenteditable='true']");
      if (event.key === "Escape" && paletteOpen) {
        setPaletteOpen(false);
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (!editing && event.key === "/") {
        event.preventDefault();
        setPaletteOpen(true);
      } else if (!editing && event.key.toLowerCase() === "a" && pathname !== "/jobs") {
        router.push("/agent");
      } else if (!editing && event.key.toLowerCase() === "c") {
        router.push("/jobs?create=opportunity");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, pathname, router]);

  const section = pathname.split("/").filter(Boolean)[0] ?? "today";
  const title = section.charAt(0).toUpperCase() + section.slice(1);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <Link href="/today" className="brand"><LogoMark /><span>Roleway</span></Link>
        <nav className="nav-group">{primaryNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} />)}</nav>
        <div className="nav-spacer" />
        <nav className="nav-group">{lowerNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} />)}</nav>
        <div className="sidebar-user"><span className="avatar">{user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</span><span className="user-copy"><span className="user-name">{user.name}</span><span className="user-state">{user.email}</span></span><form action={signOut}><button className="icon-button" aria-label="Sign out" title="Sign out"><LogOut /></button></form></div>
      </aside>
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb"><strong>{title}</strong>{pathname.split("/").filter(Boolean)[1] ? <><span>/</span><span className="mono">{pathname.split("/")[2]}</span></> : null}</div>
          <div className="topbar-spacer" />
          <button className="search-trigger" data-tour="commands" aria-label="Search or run a command" onClick={() => setPaletteOpen(true)}><Search aria-hidden="true" /><span>Search or run a command</span><kbd>⌘ K</kbd></button>
          <button className="icon-button" onClick={toggleTheme} aria-label={dark ? "Use light theme" : "Use dark theme"}>{dark ? <Sun /> : <Moon />}</button>
          <button className="icon-button" aria-label="Notifications"><Bell /><span className="sr-only">2 unread</span></button>
        </header>
        {children}
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">{mobileNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} />)}</nav>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ProductTour open={showTour} />
    </div>
  );
}
