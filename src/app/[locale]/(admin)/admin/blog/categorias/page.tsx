import { setRequestLocale, getTranslations } from "next-intl/server";

import { CategoriesManager } from "@/components/admin/categories-manager";
import { PageHeader } from "@/components/admin/page-header";
import { listCategories } from "@/server/blog/queries";

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tBlog = await getTranslations({
    locale,
    namespace: "admin.blog",
  });
  const categories = await listCategories();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={tBlog("category.title")}
        description={tBlog("category.description")}
      />
      <CategoriesManager categories={categories} />
    </div>
  );
}
