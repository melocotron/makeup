import { Clock, Scissors } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";

export interface PublicServiceCardData {
  id: string;
  name: unknown;
  description: unknown;
  durationMin: number;
  basePrice: number;
  image: string | null;
  extras?: Array<{
    id: string;
    name: unknown;
    price: number;
  }>;
}

function pickLocalized(field: unknown, locale: string): string {
  if (field && typeof field === "object") {
    const f = field as Record<string, unknown>;
    const v = f[locale] ?? f.es ?? f.en;
    return typeof v === "string" ? v : "";
  }
  return "";
}

export function ServiceCard({
  service,
  locale,
}: {
  service: PublicServiceCardData;
  locale: string;
}) {
  const t = useTranslations("public.services");
  const name = pickLocalized(service.name, locale);
  const description = pickLocalized(service.description, locale);
  const extrasCount = service.extras?.length ?? 0;

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest transition-shadow hover:shadow-[var(--shadow-level-2)]">
      <div className="relative aspect-[4/3] bg-surface-container">
        {service.image ? (
          <Image
            src={service.image}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Scissors className="h-16 w-16 text-outline" />
          </div>
        )}
        {extrasCount > 0 && (
          <Badge
            variant="secondary"
            className="absolute right-3 top-3 bg-surface-container-lowest/90 backdrop-blur-sm"
          >
            {t("extrasCount", { count: extrasCount })}
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-serif-headline text-xl text-on-surface">{name}</h3>

        {description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-on-surface-variant">
            {description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-4">
          <div className="flex items-center gap-1.5 text-sm text-on-surface-variant">
            <Clock className="h-4 w-4" />
            <span>{t("duration", { min: service.durationMin })}</span>
          </div>
          <p className="font-serif-display text-2xl text-on-surface">
            <span className="text-xs uppercase tracking-widest text-on-surface-variant">
              {t("from")}
            </span>{" "}
            ${service.basePrice.toFixed(2)}
          </p>
        </div>
      </div>
    </article>
  );
}
