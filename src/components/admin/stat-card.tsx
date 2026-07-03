import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  footer?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, trend, footer, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-outline-variant bg-surface-container-lowest p-6",
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
          {label}
        </p>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold",
              trend.direction === "up" && "bg-tertiary/10 text-tertiary",
              trend.direction === "down" && "bg-error-container text-on-error-container",
              trend.direction === "neutral" && "bg-surface-container text-on-surface-variant",
            )}
          >
            {trend.direction === "up" && "↑"}
            {trend.direction === "down" && "↓"}
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-2 font-display text-display text-on-surface">{value}</p>
      {footer && (
        <div className="mt-4 flex items-center justify-between border-t border-outline-variant pt-4">
          {footer}
        </div>
      )}
    </div>
  );
}