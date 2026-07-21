import { Tag as TagIcon } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * Lista horizontal de tags al pie de un post.
 * Cada tag es un link a /blog?tag=… (filtrado en una iteración futura;
 * por ahora solo navega al listado general).
 */
export function TagList({
  tags,
  locale,
}: {
  tags: string[];
  locale: string;
}) {
  const t = useTranslations("public.blog");

  if (tags.length === 0) return null;

  return (
    <div>
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
        <TagIcon className="h-3.5 w-3.5" />
        {t("tagsLabel")}
      </p>
      <ul className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <li key={tag}>
            <Link
              href={`/${locale}/blog?tag=${encodeURIComponent(tag)}`}
              className="inline-flex items-center rounded-full border border-outline-variant bg-surface-container-low px-3 py-1 text-xs text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            >
              #{tag}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
