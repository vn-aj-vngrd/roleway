"use client";

import {
  Bell,
  BriefcaseBusiness,
  NotebookPen,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  FileText,
  Inbox,
  LayoutDashboard,
  MoreHorizontal,
  Navigation,
  PanelLeft,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  SquarePen,
  Target,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { signOut } from "@/app/auth/actions";
import { CreateModal } from "@/components/create-modal";
import { JobCreateForm } from "@/components/job-create-form";
import { JobWorkspacePicker } from "@/components/job-workspace-picker";
import { LogoMark } from "@/components/logo";
import { ProductTour } from "@/components/product-tour";
import { SearchProjectSwitcher } from "@/components/search-project-switcher";
import { WorkspaceMark } from "@/components/workspace-mark";
import { WorkspaceCreateForm } from "@/components/workspace-create-form";
import { SettingsNav } from "@/components/settings-nav";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { SearchProject } from "@/features/projects/context";

type NavEntry = { href: string; label: string; icon: LucideIcon };
type SearchEntry = NavEntry & { description: string; keywords: string; shortcut?: string; resultKey?: string };
type EntitySearchResult = { kind: "opportunity" | "job" | "document" | "contact" | "interview" | "note"; entity_id: string; title: string; subtitle: string; href: string };
type BreadcrumbItem = { label: string; href?: string };

const BreadcrumbContext = createContext<((items: BreadcrumbItem[] | null) => void) | null>(null);

export function WorkspaceBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const setBreadcrumbs = useContext(BreadcrumbContext);
  useEffect(() => {
    setBreadcrumbs?.(items);
    return () => setBreadcrumbs?.(null);
  }, [items, setBreadcrumbs]);
  return null;
}

type CreateJobButtonProps = {
  children?: ReactNode;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
};

export function CreateJobButton({ children = "Add job", className, variant = "default", size = "default" }: CreateJobButtonProps) {
  return <Button type="button" className={className} variant={variant} size={size} onClick={() => window.dispatchEvent(new CustomEvent("roleway:create-job"))}>{children}</Button>;
}

function routeBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "opportunities" && segments[1]) return [{ label: "Opportunities", href: "/opportunities" }, { label: "Opportunity" }];
  if (segments[0] === "documents" && segments[1] === "new") return [{ label: "Documents", href: "/documents" }, { label: "New document" }];
  if (segments[0] === "documents" && segments[1]) return [{ label: "Documents", href: "/documents" }, { label: "Document" }];
  if (segments[0] === "inbox" && segments[1] === "new") return [{ label: "Job inbox", href: "/inbox" }, { label: "Add job" }];
  if (segments[0] === "interview" && segments[1] === "new") return [{ label: "Interviews", href: "/interview" }, { label: "Schedule interview" }];
  if (segments[0] === "settings") {
    const settingsLabels: Record<string, string> = { profile: "Profile", workspaces: "Workspaces", searches: "Workspaces", preferences: "Workspaces", notifications: "Notifications", appearance: "Appearance", ai: "Agent", privacy: "Privacy & data" };
    if (segments[1] === "workspaces" && segments[2] && segments[3] === "general") return [{ label: "Settings", href: "/settings/profile" }, { label: "Workspaces", href: "/settings/workspaces" }, { label: "Workspace", href: `/settings/workspaces/${segments[2]}` }, { label: "General" }];
    if (segments[1] === "workspaces" && segments[2]) return [{ label: "Settings", href: "/settings/profile" }, { label: "Workspaces", href: "/settings/workspaces" }, { label: "Workspace" }];
    return segments[1] ? [{ label: "Settings", href: "/settings/profile" }, { label: settingsLabels[segments[1]] ?? "Settings" }] : [{ label: "Settings" }];
  }
  const title = Object.entries(routeTitles).find(([route]) => pathname === route || pathname.startsWith(`${route}/`))?.[1] ?? "Workspace";
  return [{ label: title }];
}

const workNav: NavEntry[] = [
  { href: "/home", label: "Home", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/opportunities", label: "Opportunities", icon: Target },
];

const searchNav: NavEntry[] = [
  { href: "/interview", label: "Interviews", icon: CalendarClock },
  { href: "/contacts", label: "Contacts", icon: UserRound },
  { href: "/documents", label: "Documents", icon: FileText },
];

const sidebarTopNav: NavEntry[] = [
  { href: "/agent", label: "Agent", icon: Navigation },
  { href: "/insights", label: "Insights", icon: ChartNoAxesColumnIncreasing },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

const routeTitles: Record<string, string> = {
  "/home": "Home",
  "/opportunities": "Opportunities",
  "/inbox": "Inbox",
  "/interview": "Interviews",
  "/contacts": "Contacts",
  "/documents": "Documents",
  "/agent": "Agent",
  "/insights": "Insights",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/admin": "Admin console",
};

const searchEntries: SearchEntry[] = [
  { href: "#create-job", label: "Add a job", description: "Capture a role in your inbox", keywords: "create new capture import", icon: Plus, shortcut: "C" },
  { href: "/contacts?create=true", label: "Add a contact", description: "Record a person and follow-up", keywords: "create person recruiter referral", icon: UserRound },
  { href: "/interview?create=true", label: "Add an interview", description: "Schedule a conversation and preparation", keywords: "create calendar interview", icon: CalendarClock },
  { href: "/documents?create=true", label: "Create a document", description: "Start application material", keywords: "new resume cover letter note", icon: FileText },
  { href: "#create-workspace", label: "Create a workspace", description: "Separate a distinct target or strategy", keywords: "new project search strategy", icon: BriefcaseBusiness },
  { href: "/home", label: "Home", description: "Workspace context, tasks, interviews, and next actions", keywords: "home due focus workspace overview", icon: LayoutDashboard },
  { href: "/opportunities", label: "Opportunities", description: "Track every serious role and Next Action", keywords: "pipeline opportunities kanban board stages", icon: Target },
  { href: "/inbox", label: "Inbox", description: "Review saved roles before tracking them", keywords: "jobs listings capture", icon: Inbox, shortcut: "I" },
  { href: "/interview", label: "Interviews", description: "Schedule and prepare conversations", keywords: "calendar preparation", icon: CalendarClock },
  { href: "/contacts", label: "Contacts", description: "People, context, and follow-ups", keywords: "people recruiters interviewers referrals crm", icon: UserRound },
  { href: "/documents", label: "Documents", description: "Resumes, cover letters, and notes", keywords: "files resume cover letter", icon: FileText },
  { href: "/agent", label: "Agent", description: "Ask across workspaces and approve changes", keywords: "ai assistant questions drafts tasks", icon: Navigation },
  { href: "/insights", label: "Insights", description: "Review performance across workspaces", keywords: "metrics conversion analytics", icon: ChartNoAxesColumnIncreasing },
  { href: "/notifications", label: "Notifications", description: "Review important changes across Roleway", keywords: "alerts updates", icon: Bell },
  { href: "/settings/profile", label: "Profile settings", description: "Update your career profile", keywords: "account name settings", icon: UserRound },
  { href: "/settings/workspaces", label: "Workspaces", description: "Manage separate search strategies and preferences", keywords: "projects settings compensation remote", icon: SlidersHorizontal },
];

function WorkspaceRouteAction({ pathname }: { pathname: string }) {
  if (pathname === "/home" || pathname === "/inbox" || pathname === "/opportunities") return <CreateJobButton className="workspace-route-create"><Plus aria-hidden="true" />Add job</CreateJobButton>;
  if (pathname === "/interview") return <Link className="workspace-route-create" href="/interview?create=true"><Plus aria-hidden="true" />Add interview</Link>;
  if (pathname === "/contacts") return <Link className="workspace-route-create" href="/contacts?create=true"><Plus aria-hidden="true" />Add contact</Link>;
  if (pathname === "/documents") return <Link className="workspace-route-create" href="/documents?create=true"><Plus aria-hidden="true" />Create document</Link>;
  return null;
}

function NavItem({ item, pathname, badge }: { item: NavEntry; pathname: string; badge?: number }) {
  const active = pathname === item.href || (item.href !== "/home" && pathname.startsWith(item.href));
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      data-tour={item.href === "/home" ? "home" : item.href === "/inbox" ? "jobs" : item.href === "/opportunities" ? "opportunities" : undefined}
      className={`nav-link ${active ? "active" : ""}`}
      aria-current={active ? "page" : undefined}
      data-tooltip={item.label}
    >
      <Icon aria-hidden="true" />
      <span>{item.label}</span>
      {badge ? <span className="nav-badge" aria-label={`${badge} unread`}>{badge > 99 ? "99+" : badge}</span> : null}
    </Link>
  );
}

const entityIcons: Record<EntitySearchResult["kind"], LucideIcon> = {
  opportunity: Target,
  job: BriefcaseBusiness,
  document: FileText,
  contact: UserRound,
  interview: CalendarClock,
  note: NotebookPen,
};

function SearchDialog({ open, onClose, projectName }: { open: boolean; onClose: () => void; projectName: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [entityResults, setEntityResults] = useState<SearchEntry[]>([]);
  const [searchState, setSearchState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const staticResults = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return searchEntries;
    return searchEntries.filter((entry) => `${entry.label} ${entry.description} ${entry.keywords}`.toLowerCase().includes(normalized));
  }, [query]);
  const results = query.trim().length >= 2 ? [...entityResults, ...staticResults] : staticResults;

  const choose = useCallback((href: string) => {
    if (href === "#create-job") window.dispatchEvent(new CustomEvent("roleway:create-job"));
    else if (href === "#create-workspace") window.dispatchEvent(new CustomEvent("roleway:create-workspace"));
    else if (href.startsWith("/") && !href.startsWith("//")) router.push(href);
    onClose();
  }, [onClose, router]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setEntityResults([]);
    setSearchState("idle");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    const normalized = query.trim();
    setActiveIndex(0);
    if (!open || normalized.length < 2) {
      setEntityResults([]);
      setSearchState("idle");
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchState("loading");
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search request failed");
        const payload = await response.json() as { results?: EntitySearchResult[] };
        setEntityResults((payload.results ?? []).map((result) => ({
          href: result.href,
          label: result.title,
          description: result.subtitle,
          keywords: result.kind,
          icon: entityIcons[result.kind],
          resultKey: `${result.kind}-${result.entity_id}`,
        })));
        setSearchState("ready");
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setEntityResults([]);
        setSearchState("error");
      }
    }, 180);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [open, query]);

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
          if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0))); }
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
          <input ref={inputRef} className="command-input" aria-label="Search Roleway" placeholder="Search opportunities, people, documents…" value={query} onChange={(event) => setQuery(event.target.value)} />
          <kbd>Esc</kbd>
          <button className="icon-button command-close" data-tooltip="Close search" aria-label="Close search" onClick={onClose}><X aria-hidden="true" /></button>
        </div>
        <div className="command-list" role="listbox" aria-label="Search results" aria-busy={searchState === "loading"}>
          <div className="command-label">{searchState === "loading" ? "Searching…" : query ? `${results.length} results` : "Go to"}</div>
          {results.map((entry, index) => {
            const Icon = entry.icon;
            return (
              <button key={entry.resultKey ?? entry.href} role="option" aria-selected={index === activeIndex} className={`command-item ${index === activeIndex ? "active" : ""}`} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(entry.href)}>
                <span className="command-item-icon"><Icon aria-hidden="true" /></span>
                <span className="command-item-copy"><strong>{entry.label}</strong><small>{entry.description}</small></span>
                {entry.shortcut ? <kbd>{entry.shortcut}</kbd> : <span className="command-arrow" aria-hidden="true">↗</span>}
              </button>
            );
          })}
          {searchState === "error" ? <div className="search-empty" role="status"><Search aria-hidden="true" /><strong>Search is temporarily unavailable</strong><span>Navigation and actions still appear above. Try entity search again.</span></div> : null}
          {searchState !== "loading" && searchState !== "error" && results.length === 0 ? <div className="search-empty"><Search aria-hidden="true" /><strong>No results for “{query}”</strong><span>Try a company, role, person, document, note, or page.</span></div> : null}
        </div>
        <footer className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span><span>Searching {projectName}</span></footer>
      </div>
    </div>
  );
}

function AccountMenu({ user, isAdmin }: { user: { name: string; email: string }; isAdmin: boolean }) {
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
      {open ? <div className="account-popover floating-panel" data-side="top" role="menu" aria-label="Account menu">
        <div className="account-menu-group">
          <Link role="menuitem" href="/settings/profile">Profile</Link>
          <Link role="menuitem" href="/settings/workspaces">Workspaces</Link>
          <Link role="menuitem" href="/settings/notifications">Settings</Link>
        </div>
        <div className="account-menu-group">
          <a role="menuitem" href="mailto:support@roleway.app?subject=Roleway%20support">Help and support</a>
          {isAdmin ? <Link role="menuitem" href="/admin">Admin console</Link> : null}
        </div>
        <form action={signOut} className="account-signout"><button role="menuitem">Sign out</button></form>
      </div> : null}
      <button className="sidebar-profile" data-tooltip="Account" aria-label={`${open ? "Close" : "Open"} account menu for ${user.name}`} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        <span className="avatar">{initials}</span>
        <span className="user-copy"><span className="user-name">{user.name}</span><span className="user-state">{user.email}</span></span>
        <ChevronDown className={`account-chevron ${open ? "open" : ""}`} aria-hidden="true" />
      </button>
    </div>
  );
}

export function AppShell({ children, user, projects, activeProject, showTour, notificationCount, isAdmin }: { children: ReactNode; user: { name: string; email: string }; projects: SearchProject[]; activeProject: SearchProject; showTour: boolean; notificationCount: number; isAdmin: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [createJobProjectId, setCreateJobProjectId] = useState(activeProject.id);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(false);
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const [customBreadcrumbs, setCustomBreadcrumbs] = useState<BreadcrumbItem[] | null>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileMoreRef = useRef<HTMLDivElement>(null);
  const closeSearch = useCallback(() => { setSearchOpen(false); requestAnimationFrame(() => searchTriggerRef.current?.focus()); }, []);
  const closeCreateJob = useCallback(() => {
    setCreateJobOpen(false);
    if (pathname === "/inbox" && new URLSearchParams(window.location.search).has("create")) router.replace("/inbox");
  }, [pathname, router]);
  const closeCreateWorkspace = useCallback(() => {
    setCreateWorkspaceOpen(false);
    const params = new URLSearchParams(window.location.search);
    if (params.has("create") || params.has("workspaceError")) router.replace(pathname);
  }, [pathname, router]);
  useEffect(() => {
    setCompactSidebar(localStorage.getItem("roleway-sidebar") === "compact");
  }, []);

  useEffect(() => {
    const openJob = () => { setCreateJobProjectId(activeProject.id); setCreateJobOpen(true); };
    const openWorkspace = () => setCreateWorkspaceOpen(true);
    window.addEventListener("roleway:create-job", openJob);
    window.addEventListener("roleway:create-workspace", openWorkspace);
    const params = new URLSearchParams(window.location.search);
    if (pathname === "/inbox" && params.has("create")) {
      const requestedProjectId = params.get("projectId");
      setCreateJobProjectId(projects.some((project) => project.id === requestedProjectId) ? requestedProjectId! : activeProject.id);
      setCreateJobOpen(true);
    }
    if (params.has("workspaceCreate") || (pathname === "/settings/workspaces" && params.has("create"))) setCreateWorkspaceOpen(true);
    setMobileMoreOpen(false);
    return () => {
      window.removeEventListener("roleway:create-job", openJob);
      window.removeEventListener("roleway:create-workspace", openWorkspace);
    };
  }, [activeProject.id, pathname, projects]);

  useEffect(() => {
    if (!mobileMoreOpen) return;
    requestAnimationFrame(() => mobileMoreRef.current?.querySelector<HTMLElement>("a, button")?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMoreOpen(false);
      if (event.key !== "Tab") return;
      const controls = Array.from(mobileMoreRef.current?.querySelectorAll<HTMLElement>("a, button:not(:disabled)") ?? []);
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileMoreOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const editing = target.matches("input, textarea, select, [contenteditable='true']");
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); }
      else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setCompactSidebar((current) => {
          const next = !current;
          localStorage.setItem("roleway-sidebar", next ? "compact" : "expanded");
          return next;
        });
      }
      else if (!editing && event.key === "/") { event.preventDefault(); setSearchOpen(true); }
      else if (!editing && event.key.toLowerCase() === "c") { setCreateJobProjectId(activeProject.id); setCreateJobOpen(true); }
      else if (!editing && event.key.toLowerCase() === "i") router.push("/inbox");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeProject.id, router]);

  const toggleSidebar = useCallback(() => {
    setCompactSidebar((current) => {
      const next = !current;
      localStorage.setItem("roleway-sidebar", next ? "compact" : "expanded");
      return next;
    });
  }, []);
  const breadcrumbs = customBreadcrumbs ?? routeBreadcrumbs(pathname);
  const isAccountWideRoute = ["/agent", "/insights", "/notifications"].some((route) => pathname === route || pathname.startsWith(`${route}/`));
  const mobileNav = workNav;
  const mobileMoreEntries: NavEntry[] = [
    { href: "/interview", label: "Interviews", icon: CalendarClock },
    { href: "/contacts", label: "Contacts", icon: UserRound },
    { href: "/documents", label: "Documents", icon: FileText },
    { href: "/agent", label: "Agent", icon: Navigation },
    { href: "/insights", label: "Insights", icon: ChartNoAxesColumnIncreasing },
    { href: "/notifications", label: "Notifications", icon: Bell },
    { href: "/settings/profile", label: "Settings", icon: Settings },
  ];
  const mobileMoreActive = mobileMoreEntries.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));

  if (pathname.startsWith("/settings")) return <BreadcrumbContext.Provider value={setCustomBreadcrumbs}>
    <div className="settings-app-shell">
      <aside className="settings-shell-sidebar" aria-label="Settings navigation"><SettingsNav shell pathname={pathname} /></aside>
      <main className="settings-shell-main" id="main-content">{children}</main>
      {pathname !== "/settings/ai" ? <Link className="global-agent-launch" href="/agent" aria-label="Open Roleway Agent" data-tooltip="Open Agent"><Navigation aria-hidden="true" /><span>Agent</span></Link> : null}
      {createWorkspaceOpen ? <CreateModal title="Create a workspace" description="Keep one job-search direction and its Opportunities together." context="New workspace" size="compact" hideContext onClose={closeCreateWorkspace}><WorkspaceCreateForm onCancel={closeCreateWorkspace} /></CreateModal> : null}
    </div>
  </BreadcrumbContext.Provider>;

  return (
    <BreadcrumbContext.Provider value={setCustomBreadcrumbs}>
    <div className="app-shell" data-sidebar={compactSidebar ? "hidden" : "expanded"}>
      <aside className="sidebar" id="roleway-sidebar" aria-label="Main navigation">
        <div className="sidebar-brand-row">
          <Link className="sidebar-logo" href="/home" aria-label="Roleway home" data-tooltip="Roleway"><LogoMark tile size={24} /></Link>
          <div className="sidebar-quick-actions">
            <Tooltip><TooltipTrigger ref={searchTriggerRef} render={<button className="sidebar-search" data-tour="commands" aria-label="Search Roleway" onClick={() => setSearchOpen(true)} />}><Search aria-hidden="true" /></TooltipTrigger><TooltipContent side="bottom" align="start" sideOffset={8}>Search workspace <kbd data-slot="kbd">⌘K</kbd></TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger render={<button className="sidebar-create" aria-label="Create job" onClick={() => { setCreateJobProjectId(activeProject.id); setCreateJobOpen(true); }} />}><SquarePen aria-hidden="true" /></TooltipTrigger><TooltipContent side="bottom" align="start" sideOffset={8}>Create job <kbd data-slot="kbd">C</kbd></TooltipContent></Tooltip>
          </div>
        </div>
        <div className="sidebar-navigation">
          <nav className="nav-group sidebar-primary-nav" aria-label="Primary">{sidebarTopNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} {...(item.href === "/notifications" ? { badge: notificationCount } : {})} />)}</nav>
          <SearchProjectSwitcher projects={projects} activeProject={activeProject} variant="sidebar">
            {(project, active) => <nav className="nav-group sidebar-workspace-navigation" aria-label={`${project.name} workspace`}>
              {[...workNav, ...searchNav].map((item) => <NavItem key={item.href} item={item} pathname={active ? pathname : ""} />)}
            </nav>}
          </SearchProjectSwitcher>
        </div>
        <AccountMenu user={user} isAdmin={isAdmin} />
      </aside>
      {!isAccountWideRoute ? <div className="mobile-project-bar"><SearchProjectSwitcher projects={projects} activeProject={activeProject} /></div> : null}
      <main className="main" id="main-content">
        <header className="workspace-toolbar">
          <Tooltip><TooltipTrigger render={<button className="icon-button workspace-sidebar-toggle" onClick={toggleSidebar} aria-label={compactSidebar ? "Open sidebar" : "Close sidebar"} aria-expanded={!compactSidebar} aria-controls="roleway-sidebar" />}><PanelLeft aria-hidden="true" /></TooltipTrigger><TooltipContent side="bottom" align="start" sideOffset={8}>{compactSidebar ? "Open" : "Close"} sidebar <kbd data-slot="kbd">⌘B</kbd></TooltipContent></Tooltip>
          <span className="workspace-toolbar-separator" aria-hidden="true" />
          <nav className="workspace-breadcrumb" aria-label="Breadcrumb">
            {isAccountWideRoute ? <span className="muted">All workspaces</span> : <Link className="workspace-breadcrumb-project" href="/home"><WorkspaceMark type={activeProject.icon_type} value={activeProject.icon_value} color={activeProject.icon_color} />{activeProject.name}</Link>}
            {breadcrumbs.map((item, index) => <span className="workspace-breadcrumb-part" key={`${item.label}-${index}`}><span aria-hidden="true">/</span>{item.href ? <Link href={item.href}>{item.label}</Link> : <strong aria-current="page">{item.label}</strong>}</span>)}
          </nav>
          <div className="workspace-toolbar-actions"><WorkspaceRouteAction pathname={pathname} /></div>
        </header>
        <div className="main-content-scroll">{children}</div>
      </main>
      {pathname !== "/agent" ? <Link className="global-agent-launch" href="/agent" aria-label="Open Roleway Agent" data-tooltip="Open Agent"><Navigation aria-hidden="true" /><span>Agent</span></Link> : null}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobileNav.map((item) => <NavItem key={item.href} item={item} pathname={pathname} />)}
        <button className={`nav-link mobile-more ${mobileMoreActive ? "active" : ""}`} aria-label="More destinations" aria-haspopup="dialog" aria-expanded={mobileMoreOpen} onClick={() => setMobileMoreOpen(true)}><MoreHorizontal aria-hidden="true" /><span>More</span></button>
        <button className="nav-link mobile-search" aria-label="Search Roleway" onClick={() => setSearchOpen(true)}><Search aria-hidden="true" /><span>Search</span></button>
      </nav>
      {mobileMoreOpen ? <div className="mobile-more-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setMobileMoreOpen(false)}><div className="mobile-more-sheet" role="dialog" aria-modal="true" aria-label="More destinations" ref={mobileMoreRef}><header><div><strong>More</strong><span>{isAccountWideRoute ? "All workspaces" : activeProject.name}</span></div><button className="icon-button" data-tooltip="Close" aria-label="Close more destinations" onClick={() => setMobileMoreOpen(false)}><X aria-hidden="true" /></button></header><nav aria-label="More workspace destinations">{mobileMoreEntries.map((item) => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link className={active ? "active" : ""} aria-current={active ? "page" : undefined} href={item.href} key={item.href}><Icon aria-hidden="true" /><span>{item.label}</span>{item.href === "/notifications" && notificationCount ? <small>{notificationCount}</small> : null}</Link>; })}</nav></div></div> : null}
      <SearchDialog open={searchOpen} onClose={closeSearch} projectName={activeProject.name} />
      {createJobOpen ? <CreateModal title="Add a job" description="Capture the listing now. Decide whether it belongs in your pipeline after review." context="New job" identity={<JobWorkspacePicker projects={projects} value={createJobProjectId} onValueChange={setCreateJobProjectId} />} size="large" onClose={closeCreateJob}><JobCreateForm projectId={createJobProjectId} projectName={projects.find((project) => project.id === createJobProjectId)?.name ?? activeProject.name} onCancel={closeCreateJob} /></CreateModal> : null}
      {createWorkspaceOpen ? <CreateModal title="Create a workspace" description="Keep one job-search direction and its Opportunities together." context="New workspace" size="compact" hideContext onClose={closeCreateWorkspace}><WorkspaceCreateForm onCancel={closeCreateWorkspace} /></CreateModal> : null}
      <ProductTour open={showTour} />
    </div>
    </BreadcrumbContext.Provider>
  );
}
