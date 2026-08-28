"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { SubmitButton } from "@/components/submit-button";

type ConfirmationField = {
  name: string;
  label: string;
  expected?: string;
  type?: "text" | "email" | "password";
};

type ConfirmationDialogProps = {
  title: string;
  description: string;
  action: (formData: FormData) => void | Promise<void>;
  confirmLabel: string;
  pendingLabel?: string;
  trigger: ReactNode;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  triggerTooltip?: string;
  hiddenFields?: Record<string, string>;
  confirmationFields?: ConfirmationField[];
  destructive?: boolean;
};

export function ConfirmationDialog({ title, description, action, confirmLabel, pendingLabel = "Working…", trigger, triggerClassName = "button secondary", triggerAriaLabel, triggerTooltip, hiddenFields = {}, confirmationFields = [], destructive = false }: ConfirmationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [values, setValues] = useState<Record<string, string>>({});
  const confirmed = confirmationFields.every((field) => field.expected === undefined ? (values[field.name] ?? "").length >= 8 : (values[field.name] ?? "").trim() === field.expected.trim());
  const close = () => { dialogRef.current?.close(); setValues({}); };

  return <>
    <button className={triggerClassName} type="button" aria-label={triggerAriaLabel} data-tooltip={triggerTooltip} onClick={() => dialogRef.current?.showModal()}>{trigger}</button>
    <dialog className="confirmation-dialog" ref={dialogRef} aria-labelledby={`${id}-title`} onClose={() => setValues({})} onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <form action={action}>
        {Object.entries(hiddenFields).map(([name, value]) => <input type="hidden" name={name} value={value} key={name} />)}
        <header><h2 id={`${id}-title`}>{title}</h2><p>{description}</p></header>
        {confirmationFields.length ? <div className="confirmation-fields">{confirmationFields.map((field, index) => <div className="field" key={field.name}><label htmlFor={`${id}-${field.name}`}>{field.label}</label>{field.expected !== undefined ? <span>Enter <strong>{field.expected}</strong></span> : <span>Enter your current password.</span>}<input className="input" id={`${id}-${field.name}`} name={field.name} type={field.type ?? "text"} value={values[field.name] ?? ""} autoComplete={field.type === "password" ? "current-password" : "off"} spellCheck={false} autoFocus={index === 0} required onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))} /></div>)}</div> : null}
        <footer><button className="button secondary" type="button" onClick={close}>Cancel</button><SubmitButton className={destructive ? "button danger confirmation-submit" : "button primary"} pendingLabel={pendingLabel} disabled={!confirmed}>{confirmLabel}</SubmitButton></footer>
      </form>
    </dialog>
  </>;
}
