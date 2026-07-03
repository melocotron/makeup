import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors",
  {
    variants: {
      variant: {
        default: "border border-outline-variant bg-surface-container-highest text-on-surface",
        primary: "bg-primary/10 text-primary",
        secondary: "bg-secondary-container text-on-secondary-container",
        success: "bg-tertiary/10 text-tertiary",
        error: "bg-error-container text-on-error-container",
        warning: "bg-tertiary-container/10 text-tertiary-container",
        outline: "border border-outline text-on-surface",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };