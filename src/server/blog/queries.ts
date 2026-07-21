import "server-only";

import { prisma } from "@/lib/prisma";

import type { Locale } from "@/i18n/routing";

// ============================================================================
// BLOG — read-only queries (writes go through actions.ts)
// ============================================================================

/**
 * Tipo derivado para el listado admin de posts. Carga el category y el
 * count via _count. Los campos i18n (title, excerpt) se cargan en el
 * locale actual en runtime (en la action o en el componente).
 */
export type PostListItem = {
  id: string;
  slug: string;
  title: { es: string; en: string };
  excerpt: { es: string; en: string };
  image: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  category: { id: string; slug: string; name: { es: string; en: string } } | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

/**
 * Tipo derivado para el listado público de posts. Solo se incluyen
 * posts con status=PUBLISHED, y los campos son los que el público
 * necesita (sin metadata interna como createdAt/updatedAt).
 */
export type PostListPublicItem = {
  id: string;
  slug: string;
  title: { es: string; en: string };
  excerpt: { es: string; en: string };
  image: string | null;
  publishedAt: string;
  category: { id: string; slug: string; name: { es: string; en: string } } | null;
  tags: string[];
};

/**
 * Tipo derivado para el detalle (admin o público). Incluye el content
 * completo (Tiptap JSON) y los metaTitle/metaDesc para SEO.
 */
export type PostDetail = PostListItem & {
  content: unknown; // Tiptap JSON, shape flexible
  metaTitle: { es: string; en: string } | null;
  metaDesc: { es: string; en: string } | null;
};

/**
 * Tipo para categoría.
 */
export type CategoryItem = {
  id: string;
  slug: string;
  name: { es: string; en: string };
  order: number;
};

/**
 * Stats globales para el header de /admin/blog.
 */
export type PostStats = {
  totalDrafts: number;
  totalPublished: number;
  totalArchived: number;
  totalCategories: number;
};

/**
 * Tipo para los tags parseados de un post (string CSV → string[]).
 */
export type PostWithTags = Omit<PostListItem, "tags"> & { tags: string[] };

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extrae el nombre del JSON i18n en el locale, con fallback.
 * Mismo patrón que en otras queries (promotions, billing).
 */
function getLocalized(
  raw: unknown,
  locale: string,
  fallback = "es",
): string {
  const obj = raw as Record<string, string> | null;
  if (!obj) return "";
  return obj[locale] ?? obj[fallback] ?? obj.en ?? Object.values(obj)[0] ?? "";
}

/**
 * Extrae el objeto i18n completo, sin fallback por key individual.
 * Devuelve `{ es: string, en: string }` con valores vacíos si faltan.
 */
function getI18nObject(raw: unknown): { es: string; en: string } {
  const obj = raw as Record<string, string> | null;
  return {
    es: obj?.es ?? "",
    en: obj?.en ?? "",
  };
}

/**
 * Parsea el campo `tags` (CSV string) a string[].
 * Devuelve [] si el string es null/empty.
 */
function parseTags(raw: string | null | undefined): string[] {
  if (!raw || raw.trim().length === 0) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

// ============================================================================
// Queries (admin)
// ============================================================================

/**
 * Lista posts para el admin con filtros opcionales.
 * search busca en slug, title.es y title.en (case insensitive).
 * Orden por updatedAt desc (más reciente primero).
 */
export async function listPostsAdmin(options: {
  search?: string;
  status?: "all" | "DRAFT" | "PUBLISHED" | "ARCHIVED";
  categoryId?: string;
  skip?: number;
  take?: number;
} = {}): Promise<{ items: PostListItem[]; total: number }> {
  const { search, status = "all", categoryId, skip = 0, take = 50 } = options;

  const where: Record<string, unknown> = {};
  if (status !== "all") {
    where.status = status;
  }
  if (categoryId) {
    where.categoryId = categoryId;
  }
  if (search && search.trim().length > 0) {
    const term = search.trim();
    // Search en slug, title (es, en). MySQL no soporta mode: insensitive
    // en Json, así que usamos contains que es case-insensitive por default
    // en MySQL utf8mb4_general_ci (el collation default del proyecto).
    where.OR = [
      { slug: { contains: term } },
      // Para Json, contains hace substring match sobre el JSON serializado,
      // que es lo que queremos para buscar "Mi Post" en title.es.
      { title: { string_contains: term } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      include: {
        category: {
          select: { id: true, slug: true, name: true },
        },
      },
    }),
    prisma.post.count({ where }),
  ]);

  const items: PostListItem[] = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: getI18nObject(r.title),
    excerpt: getI18nObject(r.excerpt),
    image: r.image,
    status: r.status as PostListItem["status"],
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    category: r.category
      ? {
          id: r.category.id,
          slug: r.category.slug,
          name: getI18nObject(r.category.name),
        }
      : null,
    tags: parseTags(r.tags),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return { items, total };
}

/**
 * Lista posts publicados para el público.
 * Solo status=PUBLISHED, orden por publishedAt desc.
 * Search por categorySlug opcional.
 */
export async function listPostsPublic(options: {
  locale?: Locale;
  categorySlug?: string;
  skip?: number;
  take?: number;
} = {}): Promise<{ items: PostListPublicItem[]; total: number }> {
  const { locale: _locale, categorySlug, skip = 0, take = 20 } = options;

  const where: Record<string, unknown> = { status: "PUBLISHED" };
  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  const [rows, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip,
      take,
      include: {
        category: { select: { id: true, slug: true, name: true } },
      },
    }),
    prisma.post.count({ where }),
  ]);

  const items: PostListPublicItem[] = rows
    .filter((r) => r.publishedAt !== null)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: getI18nObject(r.title),
      excerpt: getI18nObject(r.excerpt),
      image: r.image,
      publishedAt: r.publishedAt!.toISOString(),
      category: r.category
        ? {
            id: r.category.id,
            slug: r.category.slug,
            name: getI18nObject(r.category.name),
          }
        : null,
      tags: parseTags(r.tags),
    }));

  return { items, total };
}

/**
 * Detalle completo de un post por id (admin o público).
 * Devuelve null si no existe.
 */
export async function getPostById(
  id: string,
  _locale: Locale = "es",
): Promise<PostDetail | null> {
  const r = await prisma.post.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, slug: true, name: true } },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    title: getI18nObject(r.title),
    excerpt: getI18nObject(r.excerpt),
    image: r.image,
    status: r.status as PostListItem["status"],
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    category: r.category
      ? {
          id: r.category.id,
          slug: r.category.slug,
          name: getI18nObject(r.category.name),
        }
      : null,
    tags: parseTags(r.tags),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    content: r.content,
    metaTitle: r.metaTitle ? getI18nObject(r.metaTitle) : null,
    metaDesc: r.metaDesc ? getI18nObject(r.metaDesc) : null,
  };
}

/**
 * Detalle público de un post por slug.
 * Devuelve null si no existe o no está publicado.
 */
export async function getPostBySlug(
  slug: string,
  _locale: Locale = "es",
): Promise<PostDetail | null> {
  const r = await prisma.post.findUnique({
    where: { slug },
    include: {
      category: { select: { id: true, slug: true, name: true } },
    },
  });
  if (!r) return null;
  if (r.status !== "PUBLISHED") return null;

  return {
    id: r.id,
    slug: r.slug,
    title: getI18nObject(r.title),
    excerpt: getI18nObject(r.excerpt),
    image: r.image,
    status: r.status,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
    category: r.category
      ? {
          id: r.category.id,
          slug: r.category.slug,
          name: getI18nObject(r.category.name),
        }
      : null,
    tags: parseTags(r.tags),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    content: r.content,
    metaTitle: r.metaTitle ? getI18nObject(r.metaTitle) : null,
    metaDesc: r.metaDesc ? getI18nObject(r.metaDesc) : null,
  };
}

/**
 * Posts relacionados: misma categoría, excluye el actual, solo publicados.
 * Si el post no tiene categoría, devuelve [].
 */
export async function getRelatedPosts(
  postId: string,
  locale: Locale = "es",
  limit: number = 3,
): Promise<PostListPublicItem[]> {
  const current = await prisma.post.findUnique({
    where: { id: postId },
    select: { categoryId: true, status: true },
  });
  if (!current || !current.categoryId || current.status !== "PUBLISHED") {
    return [];
  }

  const rows = await prisma.post.findMany({
    where: {
      categoryId: current.categoryId,
      status: "PUBLISHED",
      id: { not: postId },
    },
    orderBy: { publishedAt: "desc" },
    take: limit,
    include: {
      category: { select: { id: true, slug: true, name: true } },
    },
  });

  return rows
    .filter((r) => r.publishedAt !== null)
    .map((r) => ({
      id: r.id,
      slug: r.slug,
      title: getI18nObject(r.title),
      excerpt: getI18nObject(r.excerpt),
      image: r.image,
      publishedAt: r.publishedAt!.toISOString(),
      category: r.category
        ? {
            id: r.category.id,
            slug: r.category.slug,
            name: getI18nObject(r.category.name),
          }
        : null,
      tags: parseTags(r.tags),
    }));
}

/**
 * Stats globales: count por status + count de categorías.
 */
export async function getPostStats(): Promise<PostStats> {
  const [totalDrafts, totalPublished, totalArchived, totalCategories] =
    await Promise.all([
      prisma.post.count({ where: { status: "DRAFT" } }),
      prisma.post.count({ where: { status: "PUBLISHED" } }),
      prisma.post.count({ where: { status: "ARCHIVED" } }),
      prisma.postCategory.count(),
    ]);
  return { totalDrafts, totalPublished, totalArchived, totalCategories };
}

// ============================================================================
// Categories
// ============================================================================

/**
 * Lista todas las categorías, orden por order asc, name asc.
 */
export async function listCategories(): Promise<CategoryItem[]> {
  const rows = await prisma.postCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: getI18nObject(r.name),
    order: r.order,
  }));
}

/**
 * Detalle de una categoría por slug. null si no existe.
 */
export async function getCategoryBySlug(
  slug: string,
): Promise<CategoryItem | null> {
  const r = await prisma.postCategory.findUnique({ where: { slug } });
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    name: getI18nObject(r.name),
    order: r.order,
  };
}

/**
 * Detalle de una categoría por id. null si no existe.
 */
export async function getCategoryById(
  id: string,
): Promise<CategoryItem | null> {
  const r = await prisma.postCategory.findUnique({ where: { id } });
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    name: getI18nObject(r.name),
    order: r.order,
  };
}
