import { setRequestLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { PostForm } from "@/components/admin/post-form";
import { listCategories } from "@/server/blog/queries";
import type { Locale } from "@/i18n/routing";

export default async function NewPostPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const tBlog = await getTranslations({
    locale,
    namespace: "admin.blog",
  });
  const categories = await listCategories();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title={tBlog("newPost")}
        description={tBlog("newPostDesc")}
      />
      <PostForm
        mode="create"
        categories={categories}
        locale={locale as Locale}
      />
    </div>
  );
}
