import { describe, expect, it } from "vitest";

import {
  bulkActionSchema,
  changePostStatusSchema,
  createCategorySchema,
  createPostSchema,
  deletePostSchema,
  postFilterSchema,
  updateCategorySchema,
  updatePostSchema,
} from "./validators";

// ============================================================================
// Helpers
// ============================================================================

const validTiptapDoc = {
  type: "doc" as const,
  content: [
    {
      type: "paragraph",
      content: [{ type: "text", text: "Hola mundo" }],
    },
  ],
};

const baseValidPost = {
  slug: "mi-primer-post",
  title: { es: "Mi primer post", en: "My first post" },
  excerpt: {
    es: "Un resumen del post en español",
    en: "A summary of the post in English",
  },
  content: validTiptapDoc,
  image: null,
  status: "DRAFT" as const,
  publishedAt: null,
  categoryId: null,
  tags: null,
  metaTitle: null,
  metaDesc: null,
};

// ============================================================================
// createPostSchema
// ============================================================================

describe("createPostSchema", () => {
  it("acepta un post DRAFT válido", () => {
    const result = createPostSchema.safeParse(baseValidPost);
    expect(result.success).toBe(true);
  });

  it("acepta un post PUBLISHED válido con publishedAt", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      status: "PUBLISHED",
      publishedAt: new Date("2026-08-01T10:00:00Z"),
    });
    expect(result.success).toBe(true);
  });

  it("normaliza slug a lowercase", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      slug: "  Mi-Primer-Post  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("mi-primer-post");
    }
  });

  it("rechaza slug con caracteres no permitidos", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      slug: "mi primer post!",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza slug vacío", () => {
    const result = createPostSchema.safeParse({ ...baseValidPost, slug: "" });
    expect(result.success).toBe(false);
  });

  it("rechaza slug demasiado largo (>80)", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      slug: "a".repeat(81),
    });
    expect(result.success).toBe(false);
  });

  it("rechaza title vacío en alguno de los idiomas", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      title: { es: "", en: "Title" },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza title demasiado largo (>200)", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      title: { es: "a".repeat(201), en: "Title" },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza excerpt demasiado largo (>500)", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      excerpt: { es: "a".repeat(501), en: "Excerpt" },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza content que no es un Tiptap doc", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      content: { type: "not-doc", content: [] },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza content que no es un objeto", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      content: "esto es un string, no un doc",
    });
    expect(result.success).toBe(false);
  });

  it("acepta content Tiptap sin content array (doc vacío)", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      content: { type: "doc" },
    });
    expect(result.success).toBe(true);
  });

  it("acepta content Tiptap con nodes extra (passthrough)", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      content: {
        type: "doc",
        content: [],
        customField: "ok",
      },
    });
    // Passthrough permite campos extra sin romper la validación
    expect(result.success).toBe(true);
  });

  it("rechaza status desconocido", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      status: "PUBLISHED_BUT_PRIVATE",
    });
    expect(result.success).toBe(false);
  });

  it("acepta status default DRAFT cuando se omite", () => {
    const { status: _ignored, ...withoutStatus } = baseValidPost;
    const result = createPostSchema.safeParse(withoutStatus);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("DRAFT");
    }
  });

  it("acepta metaTitle y metaDesc opcionales", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      metaTitle: { es: "Meta título", en: "Meta title" },
      metaDesc: { es: "Meta desc", en: "Meta desc" },
    });
    expect(result.success).toBe(true);
  });

  it("acepta solo uno de los locales en metaTitle/metaDesc (parcial)", () => {
    const result = createPostSchema.safeParse({
      ...baseValidPost,
      metaTitle: { es: "Solo español" },
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// updatePostSchema
// ============================================================================

describe("updatePostSchema", () => {
  it("acepta solo id (todos los demás opcionales)", () => {
    const result = updatePostSchema.safeParse({ id: "post-1" });
    expect(result.success).toBe(true);
  });

  it("acepta actualización parcial con un campo", () => {
    const result = updatePostSchema.safeParse({
      id: "post-1",
      slug: "nuevo-slug",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza id faltante", () => {
    const result = updatePostSchema.safeParse({ slug: "algo" });
    expect(result.success).toBe(false);
  });

  it("acepta content Tiptap actualizado", () => {
    const result = updatePostSchema.safeParse({
      id: "post-1",
      content: validTiptapDoc,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza content inválido en update", () => {
    const result = updatePostSchema.safeParse({
      id: "post-1",
      content: { type: "wrong" },
    });
    expect(result.success).toBe(false);
  });

  it("acepta publishedAt null (para limpiar el campo)", () => {
    const result = updatePostSchema.safeParse({
      id: "post-1",
      publishedAt: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// changePostStatusSchema
// ============================================================================

describe("changePostStatusSchema", () => {
  it("acepta transición DRAFT → PUBLISHED", () => {
    const result = changePostStatusSchema.safeParse({
      id: "post-1",
      status: "PUBLISHED",
    });
    expect(result.success).toBe(true);
  });

  it("acepta transición PUBLISHED → ARCHIVED", () => {
    const result = changePostStatusSchema.safeParse({
      id: "post-1",
      status: "ARCHIVED",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza status desconocido", () => {
    const result = changePostStatusSchema.safeParse({
      id: "post-1",
      status: "DELETED",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza id faltante", () => {
    const result = changePostStatusSchema.safeParse({ status: "DRAFT" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// deletePostSchema
// ============================================================================

describe("deletePostSchema", () => {
  it("acepta delete sin force (default false)", () => {
    const result = deletePostSchema.safeParse({ id: "post-1" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.force).toBe(false);
    }
  });

  it("acepta delete con force: true", () => {
    const result = deletePostSchema.safeParse({
      id: "post-1",
      force: true,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// bulkActionSchema
// ============================================================================

describe("bulkActionSchema", () => {
  it("acepta array de 1 id", () => {
    const result = bulkActionSchema.safeParse({ postIds: ["post-1"] });
    expect(result.success).toBe(true);
  });

  it("acepta array de 50 ids", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `post-${i}`);
    const result = bulkActionSchema.safeParse({ postIds: ids });
    expect(result.success).toBe(true);
  });

  it("rechaza array vacío", () => {
    const result = bulkActionSchema.safeParse({ postIds: [] });
    expect(result.success).toBe(false);
  });

  it("rechaza array demasiado grande (>50)", () => {
    const ids = Array.from({ length: 51 }, (_, i) => `post-${i}`);
    const result = bulkActionSchema.safeParse({ postIds: ids });
    expect(result.success).toBe(false);
  });

  it("rechaza ids vacíos en el array", () => {
    const result = bulkActionSchema.safeParse({ postIds: ["post-1", ""] });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// postFilterSchema
// ============================================================================

describe("postFilterSchema", () => {
  it("acepta filtros vacíos (defaults: status=all, skip=0, take=50)", () => {
    const result = postFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("all");
      expect(result.data.skip).toBe(0);
      expect(result.data.take).toBe(50);
    }
  });

  it("acepta todos los status", () => {
    for (const status of ["all", "DRAFT", "PUBLISHED", "ARCHIVED"]) {
      const result = postFilterSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rechaza status desconocido", () => {
    const result = postFilterSchema.safeParse({ status: "PRIVATE" });
    expect(result.success).toBe(false);
  });

  it("rechaza take > 100", () => {
    const result = postFilterSchema.safeParse({ take: 101 });
    expect(result.success).toBe(false);
  });

  it("coerce skip desde string (query param)", () => {
    const result = postFilterSchema.safeParse({ skip: "20" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skip).toBe(20);
    }
  });

  it("acepta categoryId opcional", () => {
    const result = postFilterSchema.safeParse({ categoryId: "cat-1" });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// createCategorySchema
// ============================================================================

describe("createCategorySchema", () => {
  const baseValidCategory = {
    slug: "tutoriales",
    name: { es: "Tutoriales", en: "Tutorials" },
    order: 0,
  };

  it("acepta categoría válida", () => {
    const result = createCategorySchema.safeParse(baseValidCategory);
    expect(result.success).toBe(true);
  });

  it("normaliza slug a lowercase", () => {
    const result = createCategorySchema.safeParse({
      ...baseValidCategory,
      slug: "  TUTORIALES  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.slug).toBe("tutoriales");
    }
  });

  it("rechaza slug con caracteres no permitidos", () => {
    const result = createCategorySchema.safeParse({
      ...baseValidCategory,
      slug: "tutoriales!",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza name vacío en alguno de los idiomas", () => {
    const result = createCategorySchema.safeParse({
      ...baseValidCategory,
      name: { es: "", en: "Tutorials" },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza name demasiado largo (>60)", () => {
    const result = createCategorySchema.safeParse({
      ...baseValidCategory,
      name: { es: "a".repeat(61), en: "Tutorials" },
    });
    expect(result.success).toBe(false);
  });

  it("acepta order default 0 cuando se omite", () => {
    const { order: _ignored, ...withoutOrder } = baseValidCategory;
    const result = createCategorySchema.safeParse(withoutOrder);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(0);
    }
  });

  it("rechaza order negativo", () => {
    const result = createCategorySchema.safeParse({
      ...baseValidCategory,
      order: -1,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updateCategorySchema
// ============================================================================

describe("updateCategorySchema", () => {
  it("acepta solo id (todo opcional)", () => {
    const result = updateCategorySchema.safeParse({ id: "cat-1" });
    expect(result.success).toBe(true);
  });

  it("acepta actualización de un campo", () => {
    const result = updateCategorySchema.safeParse({
      id: "cat-1",
      slug: "nuevo-slug",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza id faltante", () => {
    const result = updateCategorySchema.safeParse({ slug: "algo" });
    expect(result.success).toBe(false);
  });
});
