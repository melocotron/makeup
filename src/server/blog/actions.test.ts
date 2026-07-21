import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePathMock, authMock, prismaMock } = vi.hoisted(() => {
  const revalidatePathMock = vi.fn();
  const authMock = vi.fn();
  const prismaMock = {
    post: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    postCategory: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { revalidatePathMock, authMock, prismaMock };
});

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  bulkArchive,
  bulkPublish,
  changePostStatus,
  createPost,
  deleteCategory,
  deletePost,
  updatePost,
  upsertCategory,
} from "./actions";

const validTiptapDoc = {
  type: "doc" as const,
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Hola" }],
    },
  ],
};

const baseCreateInput = {
  slug: "mi-post",
  title: { es: "Título", en: "Title" },
  excerpt: { es: "Resumen", en: "Summary" },
  content: validTiptapDoc,
  image: null,
  status: "DRAFT" as const,
  publishedAt: null,
  categoryId: null,
  tags: null,
  metaTitle: null,
  metaDesc: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "admin-1" } });
  prismaMock.$transaction.mockImplementation(
    async (cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock),
  );
});

// ============================================================================
// createPost
// ============================================================================

describe("createPost", () => {
  it("rechaza si no hay sesión", async () => {
    authMock.mockResolvedValue(null);

    const result = await createPost(baseCreateInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autenticado");
    }
  });

  it("rechaza si el slug está duplicado", async () => {
    prismaMock.post.findUnique.mockResolvedValue({ id: "existing" });

    const result = await createPost(baseCreateInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Ya existe un post con el slug");
    }
  });

  it("rechaza si la categoría no existe", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);
    prismaMock.postCategory.findUnique.mockResolvedValue(null);

    const result = await createPost({
      ...baseCreateInput,
      categoryId: "cat-missing",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("La categoría seleccionada no existe");
    }
  });

  it("crea post DRAFT sin publishedAt", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);
    prismaMock.post.create.mockResolvedValue({ id: "post-new" });

    const result = await createPost(baseCreateInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe("post-new");
    }
    expect(prismaMock.post.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "mi-post",
          status: "DRAFT",
          publishedAt: null,
        }),
      }),
    );
  });

  it("crea post PUBLISHED y setea publishedAt a now()", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);
    prismaMock.post.create.mockResolvedValue({ id: "post-new" });

    const before = Date.now();
    const result = await createPost({ ...baseCreateInput, status: "PUBLISHED" });
    const after = Date.now();

    expect(result.success).toBe(true);
    const createCall = prismaMock.post.create.mock.calls[0]?.[0];
    const publishedAt = (createCall as { data: { publishedAt: Date } })
      .data.publishedAt;
    expect(publishedAt).toBeInstanceOf(Date);
    const pubTime = publishedAt.getTime();
    expect(pubTime).toBeGreaterThanOrEqual(before);
    expect(pubTime).toBeLessThanOrEqual(after);
  });

  it("revalida /admin/blog y /blog (si PUBLISHED)", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);
    prismaMock.post.create.mockResolvedValue({ id: "post-new" });

    await createPost({ ...baseCreateInput, status: "PUBLISHED" });

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/blog",
      "page",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/blog",
      "page",
    );
  });
});

// ============================================================================
// updatePost
// ============================================================================

describe("updatePost", () => {
  it("rechaza si el post no existe", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);

    const result = await updatePost({ id: "missing" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("El post no existe");
    }
  });

  it("rechaza si el slug nuevo ya existe en otro post", async () => {
    prismaMock.post.findUnique
      .mockResolvedValueOnce({ id: "post-1", slug: "old", status: "DRAFT" })
      .mockResolvedValueOnce({ id: "post-2" });

    const result = await updatePost({ id: "post-1", slug: "new-slug" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Ya existe un post con el slug");
    }
  });

  it("permite update con el mismo slug (no es duplicado contra sí mismo)", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      slug: "same",
      status: "DRAFT",
      publishedAt: null,
    });
    prismaMock.post.update.mockResolvedValue({});

    const result = await updatePost({ id: "post-1", slug: "same" });

    expect(result.success).toBe(true);
  });

  it("setea publishedAt a now() cuando pasa a PUBLISHED por primera vez", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      slug: "p",
      status: "DRAFT",
      publishedAt: null,
    });
    prismaMock.post.update.mockResolvedValue({});

    const before = Date.now();
    await updatePost({ id: "post-1", status: "PUBLISHED" });
    const after = Date.now();

    expect(prismaMock.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PUBLISHED",
          publishedAt: expect.any(Date),
        }),
      }),
    );
    const updateCall = prismaMock.post.update.mock.calls[0]?.[0];
    const publishedAt = (updateCall as { data: { publishedAt: Date } })
      .data.publishedAt;
    expect(publishedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(publishedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("no modifica publishedAt si ya estaba publicado", async () => {
    const originalPublishedAt = new Date("2026-01-15T10:00:00Z");
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      slug: "p",
      status: "PUBLISHED",
      publishedAt: originalPublishedAt,
    });
    prismaMock.post.update.mockResolvedValue({});

    await updatePost({ id: "post-1", title: { es: "Nuevo", en: "New" } });

    const updateCall = prismaMock.post.update.mock.calls[0]?.[0];
    const payload = (updateCall as { data: Record<string, unknown> }).data;
    // El payload no debe incluir publishedAt (preserva el original)
    expect(payload).not.toHaveProperty("publishedAt");
  });

  it("respeta publishedAt explícito (incluso null para despublicar)", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      slug: "p",
      status: "PUBLISHED",
      publishedAt: new Date("2026-01-15"),
    });
    prismaMock.post.update.mockResolvedValue({});

    await updatePost({ id: "post-1", publishedAt: null });

    const updateCall = prismaMock.post.update.mock.calls[0]?.[0];
    const payload = (updateCall as { data: Record<string, unknown> }).data;
    expect(payload).toHaveProperty("publishedAt", null);
  });

  it("revalida /admin/blog y /blog", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      slug: "p",
      status: "DRAFT",
      publishedAt: null,
    });
    prismaMock.post.update.mockResolvedValue({});

    await updatePost({ id: "post-1", title: { es: "T", en: "T" } });

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/blog",
      "page",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/blog",
      "page",
    );
  });
});

// ============================================================================
// changePostStatus
// ============================================================================

describe("changePostStatus", () => {
  it("rechaza si el post no existe", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);

    const result = await changePostStatus({ id: "missing", status: "DRAFT" });

    expect(result.success).toBe(false);
  });

  it("setea publishedAt al pasar a PUBLISHED por primera vez", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: "DRAFT",
      publishedAt: null,
    });
    prismaMock.post.update.mockResolvedValue({});

    await changePostStatus({ id: "post-1", status: "PUBLISHED" });

    expect(prismaMock.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PUBLISHED",
          publishedAt: expect.any(Date),
        }),
      }),
    );
  });

  it("no setea publishedAt si ya estaba publicado", async () => {
    const originalDate = new Date("2026-01-15");
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: "PUBLISHED",
      publishedAt: originalDate,
    });
    prismaMock.post.update.mockResolvedValue({});

    await changePostStatus({ id: "post-1", status: "ARCHIVED" });

    const updateCall = prismaMock.post.update.mock.calls[0]?.[0];
    const payload = (updateCall as { data: Record<string, unknown> }).data;
    expect(payload).toEqual({ status: "ARCHIVED" });
    expect(payload).not.toHaveProperty("publishedAt");
  });
});

// ============================================================================
// deletePost
// ============================================================================

describe("deletePost", () => {
  it("rechaza si el post no existe", async () => {
    prismaMock.post.findUnique.mockResolvedValue(null);

    const result = await deletePost({ id: "missing", force: false });

    expect(result.success).toBe(false);
  });

  it("rechaza borrar PUBLISHED sin force", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: "PUBLISHED",
      slug: "p",
    });

    const result = await deletePost({ id: "post-1", force: false });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("No se puede eliminar un post publicado");
    }
  });

  it("permite borrar PUBLISHED con force=true", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: "PUBLISHED",
      slug: "p",
    });
    prismaMock.post.delete.mockResolvedValue({});

    const result = await deletePost({ id: "post-1", force: true });

    expect(result.success).toBe(true);
    expect(prismaMock.post.delete).toHaveBeenCalledWith({
      where: { id: "post-1" },
    });
  });

  it("permite borrar DRAFT sin force", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: "DRAFT",
      slug: "p",
    });
    prismaMock.post.delete.mockResolvedValue({});

    const result = await deletePost({ id: "post-1", force: false });

    expect(result.success).toBe(true);
  });

  it("revalida /admin/blog y /blog", async () => {
    prismaMock.post.findUnique.mockResolvedValue({
      id: "post-1",
      status: "DRAFT",
      slug: "p",
    });
    prismaMock.post.delete.mockResolvedValue({});

    await deletePost({ id: "post-1", force: false });

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/blog",
      "page",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/blog",
      "page",
    );
  });
});

// ============================================================================
// bulkPublish
// ============================================================================

describe("bulkPublish", () => {
  it("rechaza array vacío", async () => {
    const result = await bulkPublish({ postIds: [] });

    expect(result.success).toBe(false);
  });

  it("publica todos los posts en una transacción", async () => {
    prismaMock.post.updateMany.mockResolvedValue({ count: 2 });
    prismaMock.post.findMany.mockResolvedValue([]);

    const result = await bulkPublish({ postIds: ["p1", "p2"] });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.count).toBe(2);
    }
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it("setea publishedAt a los que ya estaban PUBLISHED pero sin fecha", async () => {
    prismaMock.post.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.post.findMany.mockResolvedValue([{ id: "p1" }]);
    prismaMock.post.update.mockResolvedValue({});

    await bulkPublish({ postIds: ["p1", "p2"] });

    // updateMany (publicar) + findMany (buscar sin publishedAt) + update (setear)
    expect(prismaMock.post.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.post.findMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "p1" },
        data: expect.objectContaining({ publishedAt: expect.any(Date) }),
      }),
    );
  });
});

// ============================================================================
// bulkArchive
// ============================================================================

describe("bulkArchive", () => {
  it("archiva los posts no-ARCHIVED", async () => {
    prismaMock.post.updateMany.mockResolvedValue({ count: 3 });

    const result = await bulkArchive({ postIds: ["p1", "p2", "p3"] });

    expect(result.success).toBe(true);
    expect(prismaMock.post.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: { in: ["p1", "p2", "p3"] },
          status: { not: "ARCHIVED" },
        },
        data: { status: "ARCHIVED" },
      }),
    );
  });

  it("rechaza array vacío", async () => {
    const result = await bulkArchive({ postIds: [] });

    expect(result.success).toBe(false);
  });
});

// ============================================================================
// upsertCategory (create)
// ============================================================================

describe("upsertCategory - create", () => {
  it("rechaza slug duplicado", async () => {
    prismaMock.postCategory.findUnique.mockResolvedValue({ id: "cat-existing" });

    const result = await upsertCategory({
      slug: "tutoriales",
      name: { es: "Tutoriales", en: "Tutorials" },
      order: 0,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Ya existe una categoría con el slug");
    }
  });

  it("crea categoría con orden y nombre i18n", async () => {
    prismaMock.postCategory.findUnique.mockResolvedValue(null);
    prismaMock.postCategory.create.mockResolvedValue({ id: "cat-new" });

    const result = await upsertCategory({
      slug: "tutoriales",
      name: { es: "Tutoriales", en: "Tutorials" },
      order: 1,
    });

    expect(result.success).toBe(true);
    expect(prismaMock.postCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "tutoriales",
          name: { es: "Tutoriales", en: "Tutorials" },
          order: 1,
        }),
      }),
    );
  });
});

// ============================================================================
// upsertCategory (update)
// ============================================================================

describe("upsertCategory - update", () => {
  it("rechaza si la categoría no existe", async () => {
    prismaMock.postCategory.findUnique.mockResolvedValue(null);

    const result = await upsertCategory({
      id: "cat-missing",
      name: { es: "Nuevo", en: "New" },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("La categoría no existe");
    }
  });

  it("rechaza slug duplicado al cambiar", async () => {
    prismaMock.postCategory.findUnique
      .mockResolvedValueOnce({ id: "cat-1", slug: "old" })
      .mockResolvedValueOnce({ id: "cat-2" });

    const result = await upsertCategory({
      id: "cat-1",
      slug: "new-slug",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Ya existe una categoría con el slug");
    }
  });

  it("actualiza solo los campos provistos", async () => {
    prismaMock.postCategory.findUnique.mockResolvedValue({
      id: "cat-1",
      slug: "tutoriales",
    });
    prismaMock.postCategory.update.mockResolvedValue({ id: "cat-1" });

    const result = await upsertCategory({
      id: "cat-1",
      name: { es: "Tutoriales actualizados", en: "Tutorials updated" },
    });

    expect(result.success).toBe(true);
    expect(prismaMock.postCategory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: { es: "Tutoriales actualizados", en: "Tutorials updated" },
        }),
        // NO debe incluir slug ni order (no se proveyeron)
      }),
    );
    const updateCall = prismaMock.postCategory.update.mock.calls[0]?.[0];
    const payload = (updateCall as { data: Record<string, unknown> }).data;
    expect(payload).not.toHaveProperty("slug");
    expect(payload).not.toHaveProperty("order");
  });
});

// ============================================================================
// deleteCategory
// ============================================================================

describe("deleteCategory", () => {
  it("rechaza si la categoría no existe", async () => {
    prismaMock.postCategory.findUnique.mockResolvedValue(null);

    const result = await deleteCategory("cat-missing");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("La categoría no existe");
    }
  });

  it("rechaza si hay posts usándola", async () => {
    prismaMock.postCategory.findUnique.mockResolvedValue({ id: "cat-1" });
    prismaMock.post.count.mockResolvedValue(3);

    const result = await deleteCategory("cat-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("3 post(s) usan esta categoría");
    }
  });

  it("elimina categoría sin posts", async () => {
    prismaMock.postCategory.findUnique.mockResolvedValue({ id: "cat-1" });
    prismaMock.post.count.mockResolvedValue(0);
    prismaMock.postCategory.delete.mockResolvedValue({});

    const result = await deleteCategory("cat-1");

    expect(result.success).toBe(true);
    expect(prismaMock.postCategory.delete).toHaveBeenCalledWith({
      where: { id: "cat-1" },
    });
  });
});
