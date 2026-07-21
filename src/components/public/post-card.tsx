import { Calendar, Clock, FileText } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { formatPostDate } from "@/lib/blog-utils";

export interface PublicPostCardData {
  id: string;
  slug: string;
  title: { es: string; en: string };
  excerpt: { es: string; en: string };
  image: string | null;
  publishedAt: string;
  category: { id: string; slug: string; name: { es: string; en: string } } | null;
  tags: string[];
  readingTime?: number;
}

function pickLocalized(
  field: { es: string; en: string },
  locale: string,
): string {
  return field[locale as "es" | "en"] ?? field.es ?? field.en ?? "";
}

export function PostCard({
  post,
  locale,
  href,
}: {
  post: PublicPostCardData;
  locale: string;
  href?: string;
}) {
  const t = useTranslations("public.blog");
  const title = pickLocalized(post.title, locale);
  const excerpt = pickLocalized(post.excerpt, locale);
  const categoryName = post.category
    ? pickLocalized(post.category.name, locale)
    : null;
  const postHref = href ?? `/${locale}/blog/${post.slug}`;
  const date = formatPostDate(post.publishedAt, locale);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest transition-shadow hover:shadow-[var(--shadow-level-2)]">
      <Link
        href={postHref}
        className="relative block aspect-[16/9] bg-surface-container"
        aria-label={title}
      >
        {post.image ? (
          <Image
            src={post.image}
            alt={title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileText className="h-16 w-16 text-outline" />
          </div>
        )}
        {categoryName && (
          <Badge
            variant="secondary"
            className="absolute left-3 top-3 bg-surface-container-lowest/90 backdrop-blur-sm"
          >
            {categoryName}
          </Badge>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <h3 className="font-serif-headline text-xl leading-snug text-on-surface">
          <Link
            href={postHref}
            className="transition-colors hover:text-primary"
          >
            {title}
          </Link>
        </h3>

        {excerpt && (
          <p className="line-clamp-3 text-sm leading-relaxed text-on-surface-variant">
            {excerpt}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-outline-variant pt-4 text-xs text-on-surface-variant">
          {date && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {date}
            </span>
          )}
          {post.readingTime !== undefined && (
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {t("readingTime", { minutes: post.readingTime })}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
