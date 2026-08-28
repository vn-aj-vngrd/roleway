import {
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  Building2,
  Code2,
  Compass,
  Gem,
  Globe2,
  GraduationCap,
  Heart,
  Palette,
  Rocket,
  Search,
  Sparkles,
  Star,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";

export const workspaceIconOptions = [
  ["briefcase", "Briefcase", BriefcaseBusiness],
  ["target", "Target", Target],
  ["compass", "Compass", Compass],
  ["search", "Search", Search],
  ["rocket", "Rocket", Rocket],
  ["sparkles", "Sparkles", Sparkles],
  ["brain", "Brain", BrainCircuit],
  ["code", "Code", Code2],
  ["palette", "Palette", Palette],
  ["building", "Company", Building2],
  ["globe", "Globe", Globe2],
  ["graduation", "Learning", GraduationCap],
  ["book", "Book", BookOpen],
  ["gem", "Gem", Gem],
  ["zap", "Energy", Zap],
  ["heart", "Heart", Heart],
  ["star", "Star", Star],
] as const satisfies readonly (readonly [string, string, LucideIcon])[];

export const workspaceEmojiOptions = ["💼", "🎯", "🧭", "🚀", "✨", "🧠", "💻", "🎨", "🏢", "🌍", "📚", "💎", "⚡", "🌱", "🔬", "🛠️", "📈", "🧩", "🔥", "⭐"] as const;

const iconMap = new Map<string, LucideIcon>(workspaceIconOptions.map(([value, , Icon]) => [value, Icon]));

export function WorkspaceMark({ type = "icon", value = "briefcase", color = "#5E6AD2", className = "" }: { type?: string; value?: string; color?: string; className?: string }) {
  const Icon = iconMap.get(value) ?? BriefcaseBusiness;
  return <span className={`workspace-mark${className ? ` ${className}` : ""}`} data-mark-type={type} style={{ color, backgroundColor: `${color}18` }} aria-hidden="true">
    {type === "emoji" ? <span>{value}</span> : <Icon />}
  </span>;
}
