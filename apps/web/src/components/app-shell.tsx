"use client";

import {
  Bell,
  Bot,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  ChevronUp,
  FileText,
  HelpCircle,
  Inbox,
  LayoutDashboard,
  LogOut,
  Moon,
  PanelLeft,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sun,
  Target,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { LogoMark } from "@/components/logo";
import { ProductTour } from "@/components/product-tour";

type NavEntry = { href: string; label: string; icon: LucideIcon };
type SearchEntry = NavEntry & { description: string; keywords: string; shortcut?: string };

const workNav: NavEntry[] = [
  { href: "/today", label: "Today", icon: LayoutDashboard },
  { href: "/opportunities", label: "Pipeline", icon: Target },
  { href: "/jobs", label: "Job inbox", icon: Inbox },
];

const toolNav: NavEntry[] = [
  { href: "/preparation", label: "Interviews", icon: CalendarClock },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/assistant", label: "Assist", icon: Bot },
  { href: "/insights", label: "Insights", icon: ChartNoAxesColumnIncreasing },
];

const searchEntries: SearchEntry[] = [
  { href: "/jobs?create=true", label: "Add a job", description: "Capture a role in your inbox", keywords: "create new capture import", icon: Plus, shortcut: "C" },
  { href: "/today", label: "Today", description: "Tasks, interviews, and next actions", keywords: "home due focus", icon: LayoutDashboard },
  { href: "/opportunities", label: "Pipeline", description: "Track every opportunity by stage", keywords: "opportunities kanban board jira stages", icon: Target },
  { href: "/jobs", label: "Job inbox", description: "Review roles before tracking them", keywords: "jobs listings capture", icon: Inbox, shortcut: "I" },
  { href: "/preparation", label: "Interviews", description: "Schedule and prepare conversations", keywords: "calendar preparation", icon: CalendarClock },
  { href: "/documents", label: "Documents", description: "Resumes, cover letters, and notes", keywords: "files resume cover letter", icon: FileText },
  { href: "/assistant", label: "Assist", description: "Prepare grounded drafts and next actions", keywords: "ai helper suggestions", icon: Bot },
  { href: "/insights", label: "Insights", description: "Review pipeline performance", keywords: "metrics conversion analytics", icon: ChartNoAxesColumnIncreasing },
  { href: "/notifications", label: "Notifications", description: "Review important workspace changes", keywords: "alerts updates", icon: Bell },
  { href: "/settings/profile", label: "Profile settings", description: "Update your career profile", keywords: "account name settings", icon: UserRound },
  { href: "/settings/preferences", label: "Preferences", description: "Set role, location, and work preferences", keywords: "settings compensation remote", icon: SlidersHorizontal },
];

function NavItem({ item, pathname, badge }: { item: NavEntry; pathname: string; badge?: number }) {
  const active = pathname === item.href || (item.href !== "/today" && pathname.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      data-tour={item.href === "/today" ? "today" : item.href === "/jobs" ? "jobs" : item.href === "/opportunities" ? "opportunities" : undefined}
      className={`nav-link ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
      title={item.label}
    >
      <Icon aria-hidden="true" />
      <span>{item.label}</span>
      {badge ? <span className="nav-badge" aria-label={`${badge} unread`}>{badge > 99 ? "99+" : badge}</span> : null}
    </Link>
  );
}

function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return searchEntries;
    return searchEntries.filter((entry) => `${entry.label} ${entry.description} ${entry.keywords}`.toLowerCase().includes(normalized));
  }, [query]);

  const choose = useCallback((href: string) => {
    router.push(href);
    onClose();
  }, [onClose, router]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => setActiveIndex(0), [query]);

  if (!open) return null;

  return (
    <div role="presentation" className="backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Search Roleway"
        className="command-dialog search-dialog"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
          if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, results.length - 1)); }
          if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); }
          if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); choose(results[activeIndex].href); }
          if (event.key === "Tab") {
            const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), [href]") ?? []);
            const first = controls[0];
            const last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}
      >
        <div className="command-input-wrap">
          <Search aria-hidden="true" />
          <input ref={inputRef} className="command-input" aria-label="Search Roleway" placeholder="Search pages and actions…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <kbd>Esc</kbd>
          <button className="icon-button command-close" aria-label="Close search" onClick={onClose}><X aria-hidden="true" /></button>
        </div>
        <div className="command-list" role="listbox" aria-label="Search results">
          <div className="command-label">{query ? `${results.length} results` : "Go to"}</div>
          {results.map((entry, index) => {
            const Icon = entry.icon;
            return (
              <button key={entry.href} role="option" aria-selected={index === activeIndex} className={`command-item ${index === activeIndex ? "active" : ""}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(entry.href)}>
                <span className="command-item-icon"><Icon aria-hidden="true" /></span>
                <span className="command-item-copy"><strong>{entry.label}</strong><small>{entry.description}</small></span>
                {entry.shortcut ? <kbd>{entry.shortcut}</kbd> : <span className="command-arrow" aria-hidden="true">↗</span>}
              </button>
            );
          })}
          {results.length === 0 ? <div className="search-empty"><Search aria-hidden="true" /><strong>No results for “{query}”</strong><span>Try a page, action, or feature name.</span></div> : null}
        </div>
        <footer className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span>Searches Roleway navigation and actions</span></footer>
      </div>
    </div>
  );
}

function AccountMenu({ user, dark, isAdmin, onToggleTheme }: { user: { name: string; email: string }; dark: boolean; isAdmin: boolean; onToggleTheme: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const initials = user.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    window.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", escape); };
  }, [open]);

  return (
    <div className="account-area" ref={menuRef}>
      {open ? <div className="account-popover" role="menu" aria-label="Account menu">
        <div className="account-popover-head"><span className="avatar avatar-large">{initials}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div>
        <div className="account-menu-group">
          <Link role="menuitem" href="/settings/profile"><UserRound aria-hidden="true" /><span>Profile</span></Link>
          <Link role="menuitem" href="/settings/preferences"><SlidersHorizontal aria-hidden="true" /><span>Preferences</span></Link>
          <Link role="menuitem" href="/settings/notifications"><Settings aria-hidden="true" /><span>Settings</span></Link>
        </div>
        <div className="account-menu-group">
          <button role="menuitem" onClick={onToggleTheme}>{dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}<span>{dark ? "Light appearance" : "Dark appearance"}</span></button>
          <a role="menuitem" href="mailto:support@roleway.app?subject=Roleway%20support"><HelpCircle aria-hidden="true" /><span>Help and support</span></a>
          {isAdmin ? <Link role="menuitem" href="/admin"><ShieldCheck aria-hidden="true" /><span>Admin console</span></Link> : null}
        </div>
        <form action={signOut} className="account-signout"><button role="menuitem"><LogOut aria-hidden="true" /><span>Sign out</span></button></form>
      </div> : null}
      <button className="sidebar-profile" aria-label={`${open ? "Close" : "Open"} account menu for ${user.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className="avatar">{initials}</span>
        <span className="user-copy"><span className="user-name">{user.name}</span><span className="user-state">{user.email}</span></span>
        <ChevronUp className={`account-chevron ${open ? "open" : ""}`} aria-hidden="true" />
      </button>
    </div>
  );
}

export function AppShell({ children, user, showTour, notificationCount, isAdmin }: { children: ReactNode; user: { name: string; email: string }; showTour: boolean; notificationCount: number; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(false);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const closeSearch = useCallback(() => { setSearchOpen(false); requestAnimationFrame(() => searchTriggerRef.current?.focus()); }, []);
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
    setCompactSidebar(localStorage.getItem("roleway-sidebar") === "compact");
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing = target.matches("input, textarea, select, [contenteditable='true']");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      else if (!editing && event.key === "/") { event.preventDefault(); setSearchOpen(true); }
      else if (!editing && event.key.toLowerCase() === "c") router.push("/jobs?create=true");
      else if (!editing && event.key.toLowerCase() === "i") router.push("/jobs");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const mobileNav = [...workNav, { href: "/settings/profile", label: "Settings", icon: Settings }];

  return (
    <div className="app-shell" data-sidebar={compactSidebar ? "compact" : "expanded"}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand-row">
          <Link href="/today" className="brand"><LogoMark /><span>Roleway</span></Link>
          <button className="icon-button sidebar-toggle" onClick={(event) => { setCompactSidebar((current) => { const next = !current; localStorage.setItem("roleway-sidebar", next ? "compact" : "expanded"); return next; }); if (event.detail > 0) event.currentTarget.blur(); }} aria-label={compactSidebar ? "Expand sidebar" : "Collapse sidebar"} title={compactSidebar ? "Expand sidebar" : "Collapse sidebar"}><PanelLeft aria-hidden="true" /></button>
        </div>
        <button ref={searchTriggerRef} className="sidebar-search" data-tour="commands" aria-label="Search Roleway" title="Search Roleway" onClick={() => setSearchOpen(true)}><Search aria-hidden="true" /><span>Search</span><kbd>⌘ K</kbd></button>
        <div className="sidebar-navigation">
          <div className="sidebar-section"><div className="sidebar-label">Workspace</div><nav className="nav-group" aria-label="Workspace">{workNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} />)}</nav></div>
          <div className="sidebar-section"><div className="sidebar-label">Tools</div><nav className="nav-group" aria-label="Tools">{toolNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} />)}</nav></div>
        </div>
        <div className="nav-spacer" />
        <nav className="sidebar-utility" aria-label="Updates"><NavItem item={{ href: "/notifications", label: "Notifications", icon: Bell }} pathname={pathname} badge={notificationCount} /></nav>
        <AccountMenu user={user} dark={dark} isAdmin={isAdmin} onToggleTheme={toggleTheme} />
      </aside>
      <main className="main" id="main-content">{children}</main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} />)}
        <button className="nav-link mobile-search" aria-label="Search Roleway" onClick={() => setSearchOpen(true)}><Search aria-hidden="true" /><span>Search</span></button>
      </nav>
      <SearchDialog open={searchOpen} onClose={closeSearch} />
      <ProductTour open={showTour} />
    </div>
  );
}
