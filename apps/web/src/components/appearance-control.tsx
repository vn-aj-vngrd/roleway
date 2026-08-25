"use client";

import { Check, Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

const options = [
  { value: "light", label: "Light", description: "Bright canvas", icon: Sun },
  { value: "system", label: "System", description: "Match this device", icon: Monitor },
  { value: "dark", label: "Dark", description: "Dim canvas", icon: Moon },
] as const;

function resolvedTheme(theme: Theme) {
  return theme === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : theme;
}

export function AppearanceControl() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("roleway-theme");
    setTheme(saved === "light" || saved === "dark" || saved === "system" ? saved : "system");
  }, []);

  useEffect(() => {
    if (!theme) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => { document.documentElement.dataset.theme = resolvedTheme(theme); };
    apply();
    if (theme === "system") media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);

  const choose = (next: Theme) => {
    localStorage.setItem("roleway-theme", next);
    document.documentElement.dataset.theme = resolvedTheme(next);
    setTheme(next);
  };

  return <div className="appearance-control" role="radiogroup" aria-label="Color theme">
    {options.map(({ value, label, description, icon: Icon }) => <button type="button" role="radio" aria-checked={theme === value} className={theme === value ? "active" : ""} key={value} onClick={() => choose(value)}>
      <span className="appearance-preview" data-preview={value} aria-hidden="true"><i /><span><b /><b /><b /></span></span>
      <span className="appearance-option-copy"><Icon aria-hidden="true" /><span><strong>{label}</strong><small>{description}</small></span></span>
      <Check className="appearance-check" aria-hidden="true" />
    </button>)}
  </div>;
}
