import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { DeletePostButton } from "@/components/admin/delete-post-button";
import { PageHeader } from "@/components/admin/page-header";
import { PostForm } from "@/components/admin/post-form";
import { PostStatusActions } from "@/components/admin/post-status-actions";
import { getPostById, listCategories } from "@/server/blog/queries";
import { parseTagsClient } from "@/lib/blog-utils";
import type { Locale } from "@/i18n/routing";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const tBlog = await getTranslations({
    locale,
    namespace: "admin.blog",
  });

  const [post, categories] = await Promise.all([
    getPostById(id, locale as Locale),
    listCategories(),
  ]);

  if (!post) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <PageHeader
        title={post.title[locale as Locale] || post.title.es}
        description={`/${post.slug}`}
        actions={
          <div className="flex items-center gap-2">
            <PostStatusActions
              postId={post.id}
              currentStatus={post.status}
            />
            <DeletePostButton postId={post.id} status={post.status} />
          </div>
        }
      />
      <PostForm
        mode="edit"
        initialData={{
          id: post.id,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          content: post.content,
          image: post.image,
          status: post.status,
          publishedAt: post.publishedAt,
          categoryId: post.category?.id ?? null,
          tags: parseTagsClient(post.tags),
        }}
        categories={categories}
        locale={locale as Locale}
      />
    </div>
  );
}
