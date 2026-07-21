import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { CategoryFilter } from "@/components/public/category-filter";
import { PostCard, type PublicPostCardData } from "@/components/public/post-card";
import { listCategories, listPostsPublic } from "@/server/blog/queries";
import { getSettings } from "@/server/system/queries";
import { routing, type Locale } from "@/i18n/routing";

export const dynamic = "force-dynamic"; // settings/maintenance checks

const PAGE_SIZE = 12;

type SearchParams = Promise<{
  category?: string;
  page?: string;
}>;

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }
  setRequestLocale(locale as Locale);

  const sp = await searchParams;
  const categorySlug = sp.category?.trim() || undefined;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [t, tCommon, settings, allCategories, { items, total }] =
    await Promise.all([
      getTranslations({ locale, namespace: "public.blog" }),
      getTranslations({ locale, namespace: "common" }),
      getSettings(),
      listCategories(),
      listPostsPublic({ categorySlug, skip, take: PAGE_SIZE }),
    ]);

  // Si el blog está desactivado en settings, no mostramos el listado
  // público. (El admin sigue accesible en /admin/blog.)
  if (!settings.blogEnabled) {
    notFound();
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const cards: PublicPostCardData[] = items.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    excerpt: p.excerpt,
    image: p.image,
    publishedAt: p.publishedAt,
    category: p.category,
    tags: p.tags,
    readingTime: undefined, // calculo de reading time requiere el content;
    // el listado público no lo carga (optimización: lista vs detalle)
  }));

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-12 md:px-16 md:py-20">
      <header className="mb-10 max-w-2xl">
        <h1 className="font-serif-display mb-3 text-4xl text-on-surface md:text-5xl">
          {t("listTitle")}
        </h1>
        <p className="text-base text-on-surface-variant md:text-lg">
          {t("listSubtitle")}
        </p>
      </header>

      {allCategories.length > 0 && (
        <div className="mb-8">
          <CategoryFilter
            categories={allCategories}
            locale={locale as Locale}
          />
        </div>
      )}

      {cards.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low py-20 text-center">
          <p className="text-base font-medium text-on-surface">
            {t("emptyTitle")}
          </p>
          <p className="mt-2 text-sm text-on-surface-variant">
            {t("emptySubtitle")}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((p) => (
            <PostCard key={p.id} post={p} locale={locale} />
          ))}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <nav
          aria-label={t("pagination.label")}
          className="mt-12 flex items-center justify-center gap-3"
        >
          {page > 1 && (
            <PaginationLink
              page={page - 1}
              categorySlug={categorySlug}
              locale={locale}
              label={t("pagination.prev")}
            />
          )}
          <span className="text-sm text-on-surface-variant">
            {t("pagination.summary", { page, total: totalPages })}
          </span>
          {page < totalPages && (
            <PaginationLink
              page={page + 1}
              categorySlug={categorySlug}
              locale={locale}
              label={t("pagination.next")}
            />
          )}
        </nav>
      )}

      <p className="mt-12 text-center text-xs uppercase tracking-widest text-on-surface-variant">
        {tCommon("loading") ? "" : `${total} ${t("totalLabel", { count: total })}`}
      </p>
    </div>
  );
}

function PaginationLink({
  page,
  categorySlug,
  locale,
  label,
}: {
  page: number;
  categorySlug?: string;
  locale: string;
  label: string;
}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (categorySlug) params.set("category", categorySlug);
  return (
    <a
      href={`/${locale}/blog?${params.toString()}`}
      className="rounded-md border border-outline-variant bg-surface-container-lowest px-4 py-2 text-xs font-semibold uppercase tracking-widest text-on-surface transition-colors hover:border-primary hover:text-primary"
    >
      {label}
    </a>
  );
}
