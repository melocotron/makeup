import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    post: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    postCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

import {
  getCategoryById,
  getCategoryBySlug,
  getPostById,
  getPostBySlug,
  getPostStats,
  getRelatedPosts,
  listCategories,
  listPostsAdmin,
  listPostsPublic,
} from "./queries";

const prismaMock = prisma as unknown as {
  post: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  postCategory: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const samplePost = {
  id: "post-1",
  slug: "mi-primer-post",
  title: { es: "Mi primer post", en: "My first post" },
  excerpt: { es: "Resumen ES", en: "Summary EN" },
  content: { type: "doc", content: [] },
  image: "https://example.com/img.jpg",
  status: "PUBLISHED" as const,
  publishedAt: new Date("2026-07-15T10:00:00Z"),
  categoryId: "cat-1",
  tags: "tutorial,nextjs,prisma",
  metaTitle: { es: "Meta título", en: "Meta title" },
  metaDesc: { es: "Meta desc", en: "Meta desc" },
  createdAt: new Date("2026-07-10T09:00:00Z"),
  updatedAt: new Date("2026-07-15T10:00:00Z"),
  category: {
    id: "cat-1",
    slug: "tutoriales",
    name: { es: "Tutoriales", en: "Tutorials" },
  },
};

const sampleDraft = {
  ...samplePost,
  id: "post-2",
  slug: "draft-post",
  status: "DRAFT" as const,
  publishedAt: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// listPostsAdmin
// ============================================================================

describe("listPostsAdmin", () => {
  it("retorna lista vacía y total 0", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);
    prismaMock.post.count.mockResolvedValue(0);

    const result = await listPostsAdmin();

    expect(result).toEqual({ items: [], total: 0 });
  });

  it("mapea el shape completo incluyendo i18n, category, tags", async () => {
    prismaMock.post.findMany.mockResolvedValue([samplePost]);
    prismaMock.post.count.mockResolvedValue(1);

    const result = await listPostsAdmin();

    expect(result.items[0]).toMatchObject({
      id: "post-1",
      slug: "mi-primer-post",
      title: { es: "Mi primer post", en: "My first post" },
      excerpt: { es: "Resumen ES", en: "Summary EN" },
      image: "https://example.com/img.jpg",
      status: "PUBLISHED",
      publishedAt: "2026-07-15T10:00:00.000Z",
      category: {
        id: "cat-1",
        slug: "tutoriales",
        name: { es: "Tutoriales", en: "Tutorials" },
      },
      tags: ["tutorial", "nextjs", "prisma"],
    });
    expect(result.items[0]?.createdAt).toBe("2026-07-10T09:00:00.000Z");
  });

  it("parsea tags como array vacío cuando es null", async () => {
    prismaMock.post.findMany.mockResolvedValue([{ ...samplePost, tags: null }]);
    prismaMock.post.count.mockResolvedValue(1);

    const result = await listPostsAdmin();

    expect(result.items[0]?.tags).toEqual([]);
  });

  it("parsea tags eliminando entries vacíos", async () => {
    prismaMock.post.findMany.mockResolvedValue([
      { ...samplePost, tags: "a,,b,  c  ," },
    ]);
    prismaMock.post.count.mockResolvedValue(1);

    const result = await listPostsAdmin();

    expect(result.items[0]?.tags).toEqual(["a", "b", "c"]);
  });

  it("filtra por status", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);
    prismaMock.post.count.mockResolvedValue(0);

    await listPostsAdmin({ status: "DRAFT" });

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "DRAFT" }),
      }),
    );
  });

  it("con status='all' no agrega filtro de status", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);
    prismaMock.post.count.mockResolvedValue(0);

    await listPostsAdmin({ status: "all" });

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ status: expect.anything() }),
      }),
    );
  });

  it("filtra por categoryId", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);
    prismaMock.post.count.mockResolvedValue(0);

    await listPostsAdmin({ categoryId: "cat-1" });

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ categoryId: "cat-1" }),
      }),
    );
  });

  it("busca por término en slug y title", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);
    prismaMock.post.count.mockResolvedValue(0);

    await listPostsAdmin({ search: "nextjs" });

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ slug: expect.any(Object) }),
            expect.objectContaining({ title: expect.any(Object) }),
          ]),
        }),
      }),
    );
  });

  it("omite search vacío", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);
    prismaMock.post.count.mockResolvedValue(0);

    await listPostsAdmin({ search: "   " });

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ OR: expect.anything() }),
      }),
    );
  });

  it("respeta paginación (skip, take)", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);
    prismaMock.post.count.mockResolvedValue(0);

    await listPostsAdmin({ skip: 20, take: 10 });

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it("mapea category null cuando el post no tiene categoría", async () => {
    prismaMock.post.findMany.mockResolvedValue([
      { ...samplePost, categoryId: null, category: null },
    ]);
    prismaMock.post.count.mockResolvedValue(1);

    const result = await listPostsAdmin();

    expect(result.items[0]?.category).toBeNull();
  });
});

// ============================================================================
// listPostsPublic
// ============================================================================

describe("listPostsPublic", () => {
  it("filtra por status=PUBLISHED", async () => {
    prismaMock.post.findMany.mockResolvedValue([samplePost]);
    prismaMock.post.count.mockResolvedValue(1);

    await listPostsPublic();

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PUBLISHED" }),
      }),
    );
  });

  it("filtra por categorySlug si se provee", async () => {
    prismaMock.post.findMany.mockResolvedValue([]);
    prismaMock.post.count.mockResolvedValue(0);

    await listPostsPublic({ categorySlug: "tutoriales" });

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: { slug: "tutoriales" },
        }),
      }),
    );
  });

  it("excluye posts sin publishedAt aunque tengan status=PUBLISHED (defense in depth)", async () => {
    // Un post con status=PUBLISHED pero publishedAt=null es inconsistente
    // en DB pero posible. La query lo filtra como defense in depth.
    prismaMock.post.findMany.mockResolvedValue([
      samplePost,
      { ...samplePost, id: "post-2", publishedAt: null },
    ]);
    prismaMock.post.count.mockResolvedValue(2);

    const result = await listPostsPublic();

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("post-1");
  });

  it("mapea el shape público (sin createdAt/updatedAt)", async () => {
    prismaMock.post.findMany.mockResolvedValue([samplePost]);
    prismaMock.post.count.mockResolvedValue(1);

    const result = await listPostsPublic();

    expect(result.items[0]).not.toHaveProperty("createdAt");
    expect(result.items[0]).not.toHaveProperty("updatedAt");
    expect(result.items[0]).toHaveProperty("publishedAt");
  });
});

// ============================================================================
// getPostById
// ============================================================================

describe("getPostById", () => {
  it("retorna null si no existe", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);

    const result = await getPostById("nonexistent");

    expect(result).toBeNull();
  });

  it("retorna el detalle completo con content y meta", async () => {
    prismaMock.post.findUnique.mockResolvedValue(samplePost);

    const result = await getPostById("post-1");

    expect(result).toMatchObject({
      id: "post-1",
      slug: "mi-primer-post",
      content: { type: "doc", content: [] },
      metaTitle: { es: "Meta título", en: "Meta title" },
      metaDesc: { es: "Meta desc", en: "Meta desc" },
    });
  });

  it("mapea metaTitle null cuando no existe en DB", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      ...samplePost,
      metaTitle: null,
      metaDesc: null,
    });

    const result = await getPostById("post-1");

    expect(result?.metaTitle).toBeNull();
    expect(result?.metaDesc).toBeNull();
  });
});

// ============================================================================
// getPostBySlug
// ============================================================================

describe("getPostBySlug", () => {
  it("retorna null si no existe", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);

    const result = await getPostBySlug("nonexistent");

    expect(result).toBeNull();
  });

  it("retorna null si existe pero no está PUBLISHED", async () => {
    prismaMock.post.findUnique.mockResolvedValue(sampleDraft);

    const result = await getPostBySlug("draft-post");

    expect(result).toBeNull();
  });

  it("retorna el detalle si existe y está PUBLISHED", async () => {
    prismaMock.post.findUnique.mockResolvedValue(samplePost);

    const result = await getPostBySlug("mi-primer-post");

    expect(result).not.toBeNull();
    expect(result?.slug).toBe("mi-primer-post");
  });
});

// ============================================================================
// getRelatedPosts
// ============================================================================

describe("getRelatedPosts", () => {
  it("retorna [] si el post no existe", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);

    const result = await getRelatedPosts("nonexistent");

    expect(result).toEqual([]);
  });

  it("retorna [] si el post no tiene categoría", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      categoryId: null,
      status: "PUBLISHED",
    });

    const result = await getRelatedPosts("post-1");

    expect(result).toEqual([]);
  });

  it("retorna [] si el post no está PUBLISHED", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      categoryId: "cat-1",
      status: "DRAFT",
    });

    const result = await getRelatedPosts("post-1");

    expect(result).toEqual([]);
  });

  it("retorna posts de la misma categoría, excluyendo el actual", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      categoryId: "cat-1",
      status: "PUBLISHED",
    });
    prismaMock.post.findMany.mockResolvedValue([samplePost]);

    const result = await getRelatedPosts("post-1", "es", 3);

    expect(prismaMock.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          categoryId: "cat-1",
          status: "PUBLISHED",
          id: { not: "post-1" },
        }),
        take: 3,
      }),
    );
    expect(result).toHaveLength(1);
  });
});

// ============================================================================
// getPostStats
// ============================================================================

describe("getPostStats", () => {
  it("agrega los 4 contadores en paralelo", async () => {
    prismaMock.post.count
      .mockResolvedValueOnce(5) // totalDrafts
      .mockResolvedValueOnce(12) // totalPublished
      .mockResolvedValueOnce(3); // totalArchived
    prismaMock.postCategory.count.mockResolvedValue(4); // totalCategories

    const stats = await getPostStats();

    expect(stats).toEqual({
      totalDrafts: 5,
      totalPublished: 12,
      totalArchived: 3,
      totalCategories: 4,
    });
  });

  it("maneja todos los contadores en 0", async () => {
    prismaMock.post.count.mockResolvedValue(0);
    prismaMock.postCategory.count.mockResolvedValue(0);

    const stats = await getPostStats();

    expect(stats).toEqual({
      totalDrafts: 0,
      totalPublished: 0,
      totalArchived: 0,
      totalCategories: 0,
    });
  });
});

// ============================================================================
// listCategories
// ============================================================================

describe("listCategories", () => {
  it("lista categorías ordenadas por order, name", async () => {
    prismaMock.postCategory.findMany.mockResolvedValue([
      {
        id: "cat-1",
        slug: "tutoriales",
        name: { es: "Tutoriales", en: "Tutorials" },
        order: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "cat-2",
        slug: "novedades",
        name: { es: "Novedades", en: "News" },
        order: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await listCategories();

    expect(result).toHaveLength(2);
    expect(result[0]?.slug).toBe("tutoriales");
    expect(result[0]?.name).toEqual({ es: "Tutoriales", en: "Tutorials" });
  });

  it("pasa orderBy con [order asc, name asc]", async () => {
    prismaMock.postCategory.findMany.mockResolvedValue([]);

    await listCategories();

    expect(prismaMock.postCategory.findMany).toHaveBeenCalledWith({
      orderBy: [{ order: "asc" }, { name: "asc" }],
    });
  });
});

// ============================================================================
// getCategoryBySlug / getCategoryById
// ============================================================================

describe("getCategoryBySlug", () => {
  it("retorna null si no existe", async () => {
    prismaMock.postCategory.findUnique.mockResolvedValue(null);

    const result = await getCategoryBySlug("nonexistent");

    expect(result).toBeNull();
  });

  it("retorna el item si existe", async () => {
    prismaMock.postCategory.findUnique.mockResolvedValue({
      id: "cat-1",
      slug: "tutoriales",
      name: { es: "Tutoriales", en: "Tutorials" },
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await getCategoryBySlug("tutoriales");

    expect(result).toEqual({
      id: "cat-1",
      slug: "tutoriales",
      name: { es: "Tutoriales", en: "Tutorials" },
      order: 0,
    });
  });
});

describe("getCategoryById", () => {
  it("retorna null si no existe", async () => {
    prismaMock.postCategory.findUnique.mockResolvedValue(null);

    const result = await getCategoryById("nonexistent");

    expect(result).toBeNull();
  });

  it("retorna el item si existe", async () => {
    prismaMock.postCategory.findUnique.mockResolvedValue({
      id: "cat-1",
      slug: "tutoriales",
      name: { es: "Tutoriales", en: "Tutorials" },
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await getCategoryById("cat-1");

    expect(result).not.toBeNull();
    expect(result?.id).toBe("cat-1");
  });
});
