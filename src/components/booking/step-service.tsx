"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type ServiceOption = {
  id: string;
  name: string;
  description?: string;
  durationMin: number;
  basePrice: number;
};

function formatPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : "en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}

export function StepService({
  services,
  onSelect,
  backHref,
}: {
  services: ServiceOption[];
  onSelect: (serviceId: string) => void;
  backHref: string;
}) {
  const t = useTranslations("booking");
  const locale = useTranslations();

  if (services.length === 0) {
    return (
      <div className="mx-auto max-w-md text-center">
        <p className="text-on-surface-variant">{t("noServices")}</p>
        <Button asChild className="mt-4">
          <Link href={backHref}>{t("back")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-on-surface">
        {t("step1Title")}
      </h2>
      <p className="text-on-surface-variant">{t("step1Subtitle")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {services.map((svc) => (
          <Card
            key={svc.id}
            className="cursor-pointer p-5 transition-colors hover:bg-surface-container"
            onClick={() => onSelect(svc.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(svc.id);
              }
            }}
          >
            <h3 className="font-serif-headline text-xl text-on-surface">
              {svc.name}
            </h3>
            {svc.description && (
              <p className={cn("mt-2 text-sm text-on-surface-variant line-clamp-2")}>
                {svc.description}
              </p>
            )}
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-outline">
                {t("duration", { min: svc.durationMin })}
              </span>
              <span className="font-serif-display text-lg text-on-surface">
                {formatPrice(svc.basePrice, "es")}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}