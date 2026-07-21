import { setRequestLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { PostsList, type PostRow } from "@/components/admin/posts-list";
import { listPostsAdmin, getPostStats } from "@/server/blog/queries";
import type { Locale } from "@/i18n/routing";

export default async function BlogPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const tBlog = await getTranslations({
    locale,
    namespace: "admin.blog",
  });
  const statusParam = (sp.status ?? "all") as
    | "all"
    | "DRAFT"
    | "PUBLISHED"
    | "ARCHIVED";

  const [{ items, total }, stats] = await Promise.all([
    listPostsAdmin({ search: sp.q, status: statusParam }),
    getPostStats(),
  ]);

  const rows: PostRow[] = items.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title,
    status: p.status,
    publishedAt: p.publishedAt,
    category: p.category,
    updatedAt: p.updatedAt,
  }));

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader
        title={t("nav.blog")}
        description={tBlog("description")}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label={tBlog("stats.drafts")} value={String(stats.totalDrafts)} />
        <KpiCard
          label={tBlog("stats.published")}
          value={String(stats.totalPublished)}
        />
        <KpiCard
          label={tBlog("stats.archived")}
          value={String(stats.totalArchived)}
        />
        <KpiCard
          label={tBlog("stats.categories")}
          value={String(stats.totalCategories)}
        />
      </div>

      <PostsList posts={rows} />
      {total === 0 && sp.q && (
        <p className="text-xs text-on-surface-variant">
          Búsqueda: &ldquo;{sp.q}&rdquo; (0 resultados)
        </p>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
        {label}
      </p>
      <p className="mt-1 font-headline-md text-headline-md text-on-surface">
        {value}
      </p>
    </div>
  );
}
