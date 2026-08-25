"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = { children: React.ReactNode; pendingLabel?: string; className?: string; name?: string; value?: string; ariaLabel?: string; tooltip?: string | undefined; disabled?: boolean; formAction?: (formData: FormData) => void | Promise<void> };

export function SubmitButton({ children, pendingLabel = "Saving…", className = "button primary", name, value, ariaLabel, tooltip, disabled = false, formAction }: SubmitButtonProps) {
  const { pending, action } = useFormStatus();
  const isThisPending = pending && (!formAction || action === formAction);
  return <button className={className} data-tooltip={tooltip} type="submit" disabled={pending || disabled} aria-disabled={pending || disabled} aria-label={ariaLabel} name={name} value={value} formAction={formAction}>{isThisPending ? <><LoaderCircle className="button-spinner" aria-hidden="true" />{pendingLabel}</> : children}</button>;
}
