"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

export type CategoryFilterItem = {
  id: string;
  slug: string;
  name: { es: string; en: string };
};

function pickLocalized(
  field: { es: string; en: string },
  locale: string,
): string {
  return field[locale as "es" | "en"] ?? field.es ?? field.en ?? "";
}

/**
 * Filtro horizontal de categorías. Componente client porque necesita
 * `usePathname` / `useSearchParams` para construir los links y marcar
 * la categoría activa.
 */
export function CategoryFilter({
  categories,
  locale,
}: {
  categories: CategoryFilterItem[];
  locale: Locale;
}) {
  const t = useTranslations("public.blog");
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("category");

  function hrefFor(slug: string | null): string {
    const params = new URLSearchParams(searchParams.toString());
    if (slug) params.set("category", slug);
    else params.delete("category");
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  return (
    <nav
      aria-label={t("filter.label")}
      className="-mx-2 flex flex-wrap items-center gap-2"
    >
      <FilterPill
        href={hrefFor(null)}
        active={!current}
        label={t("filter.all")}
      />
      {categories.map((c) => (
        <FilterPill
          key={c.id}
          href={hrefFor(c.slug)}
          active={current === c.slug}
          label={pickLocalized(c.name, locale)}
        />
      ))}
    </nav>
  );
}

function FilterPill({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors",
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary",
      )}
    >
      {label}
    </Link>
  );
}
