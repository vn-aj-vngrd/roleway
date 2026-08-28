"use client";

import { Bold, Italic, List, ListOrdered } from "lucide-react";
import { useEffect, useRef } from "react";

type Command = "bold" | "italic" | "insertUnorderedList" | "insertOrderedList";

const tools: Array<{ command: Command; label: string; icon: typeof Bold }> = [
  { command: "bold", label: "Bold", icon: Bold },
  { command: "italic", label: "Italic", icon: Italic },
  { command: "insertUnorderedList", label: "Bulleted list", icon: List },
  { command: "insertOrderedList", label: "Numbered list", icon: ListOrdered },
];

export function RichTextEditor({ id, name, initialHtml = "", placeholder = "Add a description…", className = "", onDirty }: { id: string; name: string; initialHtml?: string; placeholder?: string; className?: string; onDirty?: () => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialValueRef = useRef(initialHtml);

  useEffect(() => {
    initialValueRef.current = initialHtml;
    if (inputRef.current) inputRef.current.value = initialHtml;
  }, [initialHtml]);

  const sync = () => {
    if (!inputRef.current || !editorRef.current) return;
    if (!editorRef.current.textContent?.trim()) editorRef.current.innerHTML = "";
    inputRef.current.value = editorRef.current.innerHTML;
    if (inputRef.current.value !== initialValueRef.current) onDirty?.();
  };

  const format = (command: Command) => {
    editorRef.current?.focus();
    document.execCommand(command);
    sync();
  };

  return <div className={`rich-text-editor ${className}`}>
    <div className="rich-text-toolbar" aria-label="Description formatting">
      {tools.map(({ command, label, icon: Icon }) => <button key={command} type="button" aria-label={label} data-tooltip={label} onMouseDown={(event) => event.preventDefault()} onClick={() => format(command)}><Icon aria-hidden="true" /></button>)}
    </div>
    <div
      ref={editorRef}
      id={id}
      className="rich-text-content"
      contentEditable
      role="textbox"
      aria-multiline="true"
      aria-label="Description"
      data-placeholder={placeholder}
      dangerouslySetInnerHTML={{ __html: initialHtml }}
      onInput={sync}
      onBlur={sync}
      suppressContentEditableWarning
    />
    <input ref={inputRef} type="hidden" name={name} defaultValue={initialHtml} />
  </div>;
}
