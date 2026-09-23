"use client";

import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { WorkspaceMark, workspaceEmojiOptions, workspaceIconOptions } from "@/components/workspace-mark";

const colors = ["#5E6AD2", "#2563EB", "#0891B2", "#0F9D75", "#65A30D", "#D97706", "#E5484D", "#EC4899", "#8B5CF6", "#6B7280"];

type MarkType = "icon" | "emoji";

export function WorkspaceIconPicker({ defaultType = "icon", defaultValue = "briefcase", defaultColor = "#5E6AD2" }: { defaultType?: string; defaultValue?: string; defaultColor?: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MarkType>(defaultType === "emoji" ? "emoji" : "icon");
  const [value, setValue] = useState(defaultValue || "briefcase");
  const [color, setColor] = useState(defaultColor || "#5E6AD2");

  return <div className="workspace-icon-picker">
    <input type="hidden" name="iconType" value={type} />
    <input type="hidden" name="iconValue" value={value} />
    <input type="hidden" name="iconColor" value={color.toUpperCase()} />
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<button type="button" className="workspace-icon-picker-trigger" aria-label="Choose Workspace icon and color" data-tooltip="Choose icon and color" />}>
        <WorkspaceMark type={type} value={value} color={color} />
        <ChevronDown aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="workspace-icon-picker-popover" align="start" sideOffset={7}>
        <div className="workspace-icon-picker-tabs" role="tablist" aria-label="Workspace mark type">
          <button type="button" role="tab" aria-selected={type === "icon"} onClick={() => { setType("icon"); if (!workspaceIconOptions.some(([candidate]) => candidate === value)) setValue("briefcase"); }}>Icons</button>
          <button type="button" role="tab" aria-selected={type === "emoji"} onClick={() => { setType("emoji"); if (!workspaceEmojiOptions.includes(value as typeof workspaceEmojiOptions[number])) setValue("💼"); }}>Emojis</button>
        </div>

        <section className="workspace-icon-color-section" aria-label="Icon color">
          <div><strong>Color</strong><span>{color.toUpperCase()}</span><label title="Custom color"><span className="sr-only">Custom Workspace icon color</span><input type="color" value={color} onChange={(event) => setColor(event.target.value)} /></label></div>
          <div className="workspace-icon-colors">{colors.map((candidate) => <button type="button" key={candidate} aria-label={`Use ${candidate}`} data-tooltip={candidate} aria-pressed={color.toUpperCase() === candidate} style={{ backgroundColor: candidate }} onClick={() => setColor(candidate)}>{color.toUpperCase() === candidate ? <Check aria-hidden="true" /> : null}</button>)}</div>
        </section>

        <section className="workspace-icon-options" aria-label={type === "icon" ? "Icons" : "Emojis"}>
          {type === "icon" ? workspaceIconOptions.map(([candidate, label]) => <button type="button" key={candidate} aria-label={label} data-tooltip={label} aria-pressed={value === candidate} onClick={() => setValue(candidate)}><WorkspaceMark type="icon" value={candidate} color={color} /></button>) : workspaceEmojiOptions.map((emoji) => <button type="button" key={emoji} aria-label={`Use ${emoji}`} data-tooltip={emoji} aria-pressed={value === emoji} onClick={() => setValue(emoji)}><WorkspaceMark type="emoji" value={emoji} color={color} /></button>)}
        </section>
        <button type="button" className="workspace-icon-picker-done" onClick={() => setOpen(false)}>Done</button>
      </PopoverContent>
    </Popover>
  </div>;
}
