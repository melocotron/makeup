import { useTranslations } from "next-intl";

import { PostCard, type PublicPostCardData } from "./post-card";

/**
 * Bloque "Posts relacionados" al final del detalle de un post.
 * Si no hay posts relacionados, el componente devuelve `null` y la
 * sección no se renderiza.
 */
export function RelatedPosts({
  posts,
  locale,
}: {
  posts: PublicPostCardData[];
  locale: string;
}) {
  const t = useTranslations("public.blog");

  if (posts.length === 0) return null;

  return (
    <section className="border-t border-outline-variant bg-surface-container-lowest py-16">
      <div className="mx-auto max-w-[1440px] px-4 md:px-16">
        <h2 className="font-serif-display mb-8 text-2xl text-on-surface md:text-3xl">
          {t("relatedTitle")}
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} locale={locale} />
          ))}
        </div>
      </div>
    </section>
  );
}
