"use client";
import {
  ArrowLeft,
  Activity,
  BookOpen,
  CreditCard,
  Database,
  LayoutDashboard,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/logo";
import { Input } from "@/components/ui/input";
const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "plans", label: "Plans & limits", icon: SlidersHorizontal },
  { id: "billing", label: "Billing & payments", icon: CreditCard },
  { id: "help", label: "Help articles", icon: BookOpen },
  { id: "data", label: "Data", icon: Database },
  { id: "system", label: "System", icon: Activity },
  { id: "audit", label: "Audit log", icon: ShieldCheck },
  { id: "settings", label: "Registration", icon: Settings2 },
];
export function AdminNav() {
  const pathname = usePathname();
  const params = useSearchParams();
  const [query, setQuery] = useState("");
  const active = pathname.startsWith("/admin/users/")
    ? "users"
    : params.get("view") || "overview";
  const visible = sections.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="settings-shell-navigation admin-shell-navigation">
      <Link
        className="admin-nav-brand"
        href="/admin"
        aria-label="Roleway admin console"
      >
        <LogoMark tile size={24} />
        <span>Admin console</span>
      </Link>
      <label className="settings-search">
        <Search aria-hidden />
        <span className="sr-only">Search admin sections</span>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search admin…"
        />
      </label>
      <nav className="settings-nav" aria-label="Admin sections">
        <section className="settings-nav-group">
          {visible.map(({ id, label, icon: Icon }) => (
            <Link
              key={id}
              href={`/admin?view=${id}`}
              className={active === id ? "active" : ""}
              aria-current={active === id ? "page" : undefined}
            >
              <Icon aria-hidden />
              <span>{label}</span>
            </Link>
          ))}
        </section>
      </nav>
      {!visible.length ? (
        <p className="settings-search-empty">No sections found.</p>
      ) : null}
      <div className="admin-nav-footer">
        <Link className="settings-back-link" href="/home">
          <ArrowLeft aria-hidden />
          Back to app
        </Link>
      </div>
    </div>
  );
}
