import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const dangerStyle =
  "border-[color-mix(in_oklch,var(--danger)_25%,var(--line))] bg-[var(--danger-soft)] text-[var(--danger)] *:data-[slot=alert-description]:text-current";

const alertVariants = cva(
  "group/alert relative grid w-full gap-1 rounded-lg border p-3 text-left text-sm leading-relaxed has-data-[slot=alert-action]:relative has-data-[slot=alert-action]:pr-18 has-[>svg]:grid-cols-[auto_1fr] has-[>svg]:gap-x-2.5 *:[svg]:row-span-2 *:[svg]:translate-y-[calc((1lh-1rem)/2)] *:[svg]:text-current *:[svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-muted text-foreground",
        info: "border-[color-mix(in_oklch,var(--info)_25%,var(--line))] bg-[var(--info-soft)] text-[var(--info)] *:data-[slot=alert-description]:text-current",
        success:
          "border-[color-mix(in_oklch,var(--success)_25%,var(--line))] bg-[var(--success-soft)] text-[var(--success)] *:data-[slot=alert-description]:text-current",
        warning:
          "border-[color-mix(in_oklch,var(--warning)_25%,var(--line))] bg-[var(--warning-soft)] text-[var(--warning)] *:data-[slot=alert-description]:text-current",
        danger: dangerStyle,
        destructive: dangerStyle,
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      data-variant={variant ?? "default"}
      role={variant === "info" || variant === "success" ? "status" : "alert"}
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground",
        className,
      )}
      {...props}
    />
  );
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "min-w-0 text-sm leading-relaxed break-words text-muted-foreground group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3 [&_a]:hover:text-foreground [&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  );
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn("absolute top-2 right-2", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, AlertAction };
