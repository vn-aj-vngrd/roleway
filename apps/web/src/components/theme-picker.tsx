"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type ThemePreference = "light" | "system" | "dark";

const options = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

function resolveTheme(preference: ThemePreference, systemDark: boolean) {
  return preference === "system" ? (systemDark ? "dark" : "light") : preference;
}

export function ThemePicker() {
  const [preference, setPreference] = useState<ThemePreference>("system");

  useEffect(() => {
    const saved = localStorage.getItem("roleway-theme");
    const initial = saved === "light" || saved === "dark" ? saved : "system";
    setPreference(initial);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystem = () => {
      const current = localStorage.getItem("roleway-theme");
      if (!current || current === "system") document.documentElement.dataset.theme = media.matches ? "dark" : "light";
    };
    media.addEventListener("change", applySystem);
    return () => media.removeEventListener("change", applySystem);
  }, []);

  const choose = (next: ThemePreference) => {
    const systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    localStorage.setItem("roleway-theme", next);
    document.documentElement.dataset.theme = resolveTheme(next, systemDark);
    setPreference(next);
  };

  return (
    <div className="rw-theme-picker" role="group" aria-label="Appearance">
      {options.map(({ value, label, Icon }) => (
        <button type="button" key={value} aria-pressed={preference === value} onClick={() => choose(value)}>
          <Icon aria-hidden="true" /><span>{label}</span>
        </button>
      ))}
    </div>
  );
}
