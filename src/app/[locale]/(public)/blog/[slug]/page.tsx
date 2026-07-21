import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Clock, FileText } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PostContent } from "@/components/public/post-content";
import { RelatedPosts } from "@/components/public/related-posts";
import { TagList } from "@/components/public/tag-list";
import { getPostBySlug, getRelatedPosts } from "@/server/blog/queries";
import { getSettings } from "@/server/system/queries";
import {
  calculateReadingTime,
  formatPostDateLong,
} from "@/lib/blog-utils";
import { routing, type Locale } from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

type RouteParams = { locale: string; slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<RouteParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) {
    return {};
  }
  const typedLocale = locale as Locale;

  const post = await getPostBySlug(slug, typedLocale);
  if (!post) return {};

  const t = await getTranslations({ locale, namespace: "public.blog" });
  const title = post.metaTitle?.[typedLocale] ?? post.title[typedLocale] ?? post.title.es;
  const description =
    post.metaDesc?.[typedLocale] ??
    post.excerpt[typedLocale] ??
    post.excerpt.es;
  const canonical = `${SITE_URL}/${locale}/blog/${post.slug}`;
  const ogImage = post.image ?? undefined;

  // JSON-LD: schema.org BlogPosting
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description,
    image: ogImage ? [ogImage] : undefined,
    datePublished: post.publishedAt ?? undefined,
    dateModified: post.updatedAt,
    inLanguage: locale,
    keywords: post.tags.join(", ") || undefined,
    articleSection: post.category
      ? post.category.name[typedLocale] ?? post.category.name.es
      : undefined,
    url: canonical,
    publisher: {
      "@type": "Organization",
      name: "Radiant Beauty",
    },
  };

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        es: `${SITE_URL}/es/blog/${post.slug}`,
        en: `${SITE_URL}/en/blog/${post.slug}`,
      },
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      siteName: "Radiant Beauty",
      locale: locale === "es" ? "es_ES" : "en_US",
      alternateLocale: locale === "es" ? ["en_US"] : ["es_ES"],
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      authors: ["Radiant Beauty"],
      tags: post.tags,
      images: ogImage ? [{ url: ogImage, alt: title }] : undefined,
    },
    twitter: {
      card: ogImage ? "summary_large_image" : "summary",
      title,
      description,
      images: ogImage ? [ogImage] : undefined,
    },
    other: {
      "application/ld+json": JSON.stringify(jsonLd),
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { locale, slug } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }
  const typedLocale = locale as Locale;
  setRequestLocale(typedLocale);

  const [t, settings, post] = await Promise.all([
    getTranslations({ locale, namespace: "public.blog" }),
    getSettings(),
    getPostBySlug(slug, typedLocale),
  ]);

  if (!settings.blogEnabled || !post) {
    notFound();
  }

  const relatedPosts = await getRelatedPosts(post.id, typedLocale, 3);

  const title = post.title[typedLocale] ?? post.title.es;
  const excerpt = post.excerpt[typedLocale] ?? post.excerpt.es;
  const readingTime = calculateReadingTime(post.content);
  const publishedLabel = formatPostDateLong(post.publishedAt, typedLocale);

  return (
    <>
      <article className="mx-auto max-w-3xl px-4 py-12 md:px-0 md:py-16">
        {/* Back link */}
        <Link
          href={`/${locale}/blog`}
          className="mb-8 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-on-surface-variant transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t("backToList")}
        </Link>

        {/* Category badge */}
        {post.category && (
          <div className="mb-3">
            <Link
              href={`/${locale}/blog?category=${post.category.slug}`}
              className="text-xs font-semibold uppercase tracking-widest text-primary hover:underline"
            >
              {post.category.name[typedLocale] ?? post.category.name.es}
            </Link>
          </div>
        )}

        {/* Title */}
        <h1 className="font-serif-display mb-5 text-3xl leading-tight text-on-surface md:text-5xl">
          {title}
        </h1>

        {/* Excerpt */}
        {excerpt && (
          <p className="mb-6 text-lg leading-relaxed text-on-surface-variant md:text-xl">
            {excerpt}
          </p>
        )}

        {/* Meta row */}
        <div className="mb-10 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs uppercase tracking-widest text-on-surface-variant">
          {publishedLabel && (
            <span className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {publishedLabel}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {t("readingTime", { minutes: readingTime })}
          </span>
        </div>

        {/* Cover image */}
        {post.image ? (
          <div className="relative mb-10 aspect-[16/9] overflow-hidden rounded-xl bg-surface-container">
            <Image
              src={post.image}
              alt={title}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        ) : (
          <div className="mb-10 flex aspect-[16/9] items-center justify-center rounded-xl bg-surface-container">
            <FileText className="h-24 w-24 text-outline" />
          </div>
        )}

        {/* Body */}
        <PostContent json={post.content} />

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="mt-10 border-t border-outline-variant pt-8">
            <TagList tags={post.tags} locale={locale} />
          </div>
        )}
      </article>

      {/* Posts relacionados */}
      {relatedPosts.length > 0 && (
        <RelatedPosts posts={relatedPosts} locale={locale} />
      )}
    </>
  );
}
