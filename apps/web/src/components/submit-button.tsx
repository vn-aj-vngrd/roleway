"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "outline" | "secondary" | "ghost" | "destructive" | "link";
type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel?: string;
  className?: string;
  variant?: ButtonVariant;
  name?: string;
  value?: string;
  ariaLabel?: string;
  tooltip?: string | undefined;
  disabled?: boolean;
  formAction?: (formData: FormData) => void | Promise<void>;
};

const legacyButtonClasses = new Set(["button", "primary", "secondary", "ghost", "danger"]);

export function SubmitButton({ children, pendingLabel = "Saving…", className, variant, name, value, ariaLabel, tooltip, disabled = false, formAction }: SubmitButtonProps) {
  const { pending, action } = useFormStatus();
  const isThisPending = pending && (!formAction || action === formAction);
  const resolvedVariant = variant ?? inferLegacyVariant(className);
  const layoutClassName = className?.split(/\s+/).filter((token) => token && !legacyButtonClasses.has(token)).join(" ");

  return <Button className={cn(layoutClassName)} variant={resolvedVariant} type="submit" disabled={pending || disabled} aria-disabled={pending || disabled} aria-label={ariaLabel} title={tooltip} name={name} value={value} formAction={formAction}>{isThisPending ? <><Spinner data-icon="inline-start" />{pendingLabel}</> : children}</Button>;
}

function inferLegacyVariant(className?: string): ButtonVariant {
  if (className?.includes("danger")) return "destructive";
  if (className?.includes("ghost")) return "ghost";
  if (className?.includes("secondary")) return "outline";
  return "default";
}
