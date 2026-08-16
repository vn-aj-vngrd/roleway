import Link from "next/link";

const settings = [{ href: "/settings/profile", label: "Career Profile" }, { href: "/settings/preferences", label: "Job preferences" }, { href: "/settings/ai", label: "AI providers" }, { href: "/settings/privacy", label: "Privacy & data" }];
export function SettingsNav({ active }: { active: string }) { return <nav className="settings-nav" aria-label="Settings sections">{settings.map((item) => <Link className={item.label === active ? "active" : ""} href={item.href} key={item.href}>{item.label}</Link>)}</nav>; }
