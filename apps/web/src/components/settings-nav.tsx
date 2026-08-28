"use client";

import { ArrowLeft, Bell, BriefcaseBusiness, Navigation, Palette, Search, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

const groups = [
  { label: "Personal", items: [
    { href: "/settings/profile", label: "Profile", icon: UserRound },
    { href: "/settings/notifications", label: "Notifications", icon: Bell },
    { href: "/settings/appearance", label: "Appearance", icon: Palette },
  ] },
  { label: "Workspaces", items: [
    { href: "/settings/workspaces", label: "Workspaces", icon: BriefcaseBusiness },
  ] },
  { label: "Intelligence", items: [
    { href: "/settings/ai", label: "Agent", icon: Navigation },
  ] },
  { label: "Account", items: [
    { href: "/settings/privacy", label: "Privacy & data", icon: ShieldCheck },
  ] },
];

export function SettingsNav({ active, shell = false, pathname }: { active?: string; shell?: boolean; pathname?: string }) {
  const [query, setQuery] = useState("");
  const visibleGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return groups;
    return groups.map((group) => ({ ...group, items: group.items.filter((item) => item.label.toLowerCase().includes(normalized)) })).filter((group) => group.items.length);
  }, [query]);

  const navigation = <nav className="settings-nav" aria-label="Settings sections">{visibleGroups.map((group) => <section className="settings-nav-group" key={group.label}><div>{group.label}</div>{group.items.map((item) => { const Icon = item.icon; const selected = pathname === item.href || pathname?.startsWith(`${item.href}/`) || (!pathname && item.label === active); return <Link className={selected ? "active" : ""} aria-current={selected ? "page" : undefined} href={item.href} key={item.href}><Icon aria-hidden="true" /><span>{item.label}</span></Link>; })}</section>)}</nav>;

  if (!shell) return navigation;
  return <div className="settings-shell-navigation">
    <Link className="settings-back-link" href="/home"><ArrowLeft aria-hidden="true" />Back to app</Link>
    <label className="settings-search"><Search aria-hidden="true" /><span className="sr-only">Search settings</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search…" /></label>
    {navigation}
    {visibleGroups.length === 0 ? <p className="settings-search-empty">No settings found.</p> : null}
  </div>;
}
