"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WorkspaceMark } from "@/components/workspace-mark";
import type { SearchProject } from "@/features/projects/context";

export function JobWorkspacePicker({ projects, value, onValueChange }: { projects: SearchProject[]; value: string; onValueChange: (projectId: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = projects.find((project) => project.id === value) ?? projects[0];
  if (!selected) return null;

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger render={<button className="job-workspace-picker-trigger" type="button" aria-label={`Workspace: ${selected.name}`} />}>
      <WorkspaceMark type={selected.icon_type} value={selected.icon_value} color={selected.icon_color} />
      <span>{selected.ticket_key}</span>
      <ChevronDown aria-hidden="true" />
    </PopoverTrigger>
    <PopoverContent className="job-workspace-picker-popover" align="start" sideOffset={7}>
      <p>Save job to</p>
      <div role="menu" aria-label="Choose workspace">{projects.map((project) => <button type="button" role="menuitemradio" aria-checked={project.id === selected.id} key={project.id} onClick={() => { onValueChange(project.id); setOpen(false); }}>
        <WorkspaceMark type={project.icon_type} value={project.icon_value} color={project.icon_color} />
        <span><strong>{project.name}</strong><small>{project.ticket_key}</small></span>
        {project.id === selected.id ? <Check aria-hidden="true" /> : null}
      </button>)}</div>
    </PopoverContent>
  </Popover>;
}
