"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

const STEPS = [
  { id: 1, key: "service" },
  { id: 2, key: "datetime" },
  { id: 3, key: "customer" },
  { id: 4, key: "confirm" },
] as const;

export function WizardStepper({ current }: { current: number }) {
  const t = useTranslations("booking.steps");
  return (
    <ol className="flex items-center justify-center gap-2 sm:gap-4">
      {STEPS.map((step, idx) => {
        const isCompleted = step.id < current;
        const isActive = step.id === current;
        return (
          <li key={step.id} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  isCompleted && "border-primary bg-primary text-on-primary",
                  isActive && "border-primary bg-primary text-on-primary",
                  !isCompleted && !isActive && "border-outline-variant text-outline",
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step.id}
              </div>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  isActive ? "text-on-surface" : "text-outline",
                )}
              >
                {t(step.key)}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-px w-6 sm:w-12",
                  step.id < current ? "bg-primary" : "bg-outline-variant",
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function parseStepFromParams(params: URLSearchParams): number {
  const raw = params.get("step");
  const n = raw ? parseInt(raw, 10) : 1;
  return [1, 2, 3, 4].includes(n) ? n : 1;
}

export function getWizardParams(params: URLSearchParams) {
  return {
    step: parseStepFromParams(params),
    serviceId: params.get("serviceId") ?? "",
    date: params.get("date") ?? "",
    slot: params.get("slot") ?? "",
  };
}

export function buildWizardHref(params: {
  step: number;
  serviceId?: string;
  date?: string;
  slot?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("step", String(params.step));
  if (params.serviceId) sp.set("serviceId", params.serviceId);
  if (params.date) sp.set("date", params.date);
  if (params.slot) sp.set("slot", params.slot);
  return `?${sp.toString()}`;
}

// Re-export for convenience
export { useRouter, useSearchParams };