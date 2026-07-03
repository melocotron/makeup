import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low py-12 text-center",
        className,
      )}
    >
      <Icon className="h-12 w-12 text-outline" />
      <p className="mt-4 text-sm font-semibold text-on-surface">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-xs text-on-surface-variant">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}