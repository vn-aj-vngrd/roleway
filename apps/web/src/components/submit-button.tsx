"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = { children: React.ReactNode; pendingLabel?: string; className?: string; name?: string; value?: string; formAction?: (formData: FormData) => void | Promise<void> };

export function SubmitButton({ children, pendingLabel = "Saving…", className = "button primary", name, value, formAction }: SubmitButtonProps) {
  const { pending, action } = useFormStatus();
  const isThisPending = pending && (!formAction || action === formAction);
  return <button className={className} type="submit" disabled={pending} aria-disabled={pending} name={name} value={value} formAction={formAction}>{isThisPending ? <><LoaderCircle className="button-spinner" aria-hidden="true" />{pendingLabel}</> : children}</button>;
}
