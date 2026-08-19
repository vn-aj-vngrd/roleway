import { Bell, BriefcaseBusiness, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

const settings = [
  { href: "/settings/profile", label: "Profile", icon: UserRound },
  { href: "/settings/preferences", label: "Job preferences", icon: BriefcaseBusiness },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/privacy", label: "Privacy & data", icon: ShieldCheck },
];

export function SettingsNav({ active }: { active: string }) {
  return <nav className="settings-nav" aria-label="Settings sections">{settings.map((item) => { const Icon = item.icon; return <Link className={item.label === active ? "active" : ""} href={item.href} key={item.href}><Icon aria-hidden="true" /><span>{item.label}</span></Link>; })}</nav>;
}
