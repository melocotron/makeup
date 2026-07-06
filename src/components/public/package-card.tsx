import { Package as PackageIcon, Sparkles } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";

export interface PublicPackageCardData {
  id: string;
  name: unknown;
  description: unknown;
  totalPrice: number;
  image: string | null;
  items: Array<{
    id: string;
    quantity: number;
    service: { id: string; name: unknown };
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

export function PackageCard({
  pkg,
  locale,
}: {
  pkg: PublicPackageCardData;
  locale: string;
}) {
  const t = useTranslations("public.packages");
  const name = pickLocalized(pkg.name, locale);
  const description = pickLocalized(pkg.description, locale);

  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest transition-shadow hover:shadow-[var(--shadow-level-2)]">
      <div className="relative aspect-[4/3] bg-surface-container">
        {pkg.image ? (
          <Image
            src={pkg.image}
            alt={name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <PackageIcon className="h-16 w-16 text-outline" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-serif-headline text-xl text-on-surface">{name}</h3>

        {description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-on-surface-variant">
            {description}
          </p>
        )}

        <div className="space-y-1.5 border-t border-outline-variant pt-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            <Sparkles className="h-3.5 w-3.5" />
            {t("includes")}
          </p>
          <ul className="space-y-1 text-sm text-on-surface-variant">
            {pkg.items.map((item) => {
              const itemName = pickLocalized(item.service.name, locale);
              return (
                <li key={item.id} className="flex items-baseline gap-2">
                  <span className="font-display text-base text-on-surface">
                    {item.quantity}×
                  </span>
                  <span className="line-clamp-1">{itemName}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-outline-variant pt-4">
          <span className="text-xs uppercase tracking-widest text-on-surface-variant">
            {t("totalPrice")}
          </span>
          <p className="font-serif-display text-2xl text-on-surface">
            ${pkg.totalPrice.toFixed(2)}
          </p>
        </div>
      </div>
    </article>
  );
}
