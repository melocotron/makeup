import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/server/system/queries";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Sitemap global. Combina:
 * - Páginas estáticas del sitio público (home, reservar).
 * - Posts publicados del blog (en ambos locales).
 *
 * El blog genera dinámicamente porque el listado puede crecer.
 * Solo se incluyen posts con status=PUBLISHED; los DRAFT y ARCHIVED
 * se omiten (los ARCHIVED mantienen URL accesible para SEO, pero
 * el sitemap los oculta — son contenido "fuera de circulación").
 *
 * El flag `blogEnabled` en settings controla si la sección se incluye.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const settings = await getSettings();
  const blogEnabled = settings.blogEnabled;

  // Estáticos: la home y la página de reservar en cada locale
  const staticPages: MetadataRoute.Sitemap = routing.locales.flatMap(
    (locale) => [
      {
        url: `${SITE_URL}/${locale}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 1.0,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => [l, `${SITE_URL}/${l}`]),
          ),
        },
      },
      {
        url: `${SITE_URL}/${locale}/reservar`,
        lastModified: new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.7,
        alternates: {
          languages: Object.fromEntries(
            routing.locales.map((l) => [l, `${SITE_URL}/${l}/reservar`]),
          ),
        },
      },
    ],
  );

  if (!blogEnabled) {
    return staticPages;
  }

  // Posts: una entrada por locale (es, en) con hreflang al otro locale
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
  });

  const blogEntries: MetadataRoute.Sitemap = posts.flatMap((post) => {
    const esUrl = `${SITE_URL}/es/blog/${post.slug}`;
    const enUrl = `${SITE_URL}/en/blog/${post.slug}`;
    const lastMod = post.updatedAt;
    return [
      {
        url: esUrl,
        lastModified: lastMod,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: { languages: { es: esUrl, en: enUrl } },
      },
      {
        url: enUrl,
        lastModified: lastMod,
        changeFrequency: "monthly" as const,
        priority: 0.6,
        alternates: { languages: { es: esUrl, en: enUrl } },
      },
    ];
  });

  return [...staticPages, ...blogEntries];
}
