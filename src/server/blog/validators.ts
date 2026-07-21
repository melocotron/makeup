import { z } from "zod";

// ============================================================================
// BLOG
// ============================================================================

/**
 * Estados posibles de un post.
 * - DRAFT: en preparación, no aparece en /blog público.
 * - PUBLISHED: visible en /blog público. publishedAt se setea la primera vez.
 * - ARCHIVED: oculto del listado público pero la URL directa sigue accesible
 *   (decisión: archive ≠ 404, para que links viejos sigan funcionando).
 */
export const POST_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];

/**
 * Schema del JSON de Tiptap. Validamos solo el shape mínimo
 * (debe ser un objeto con `type: 'doc'`) — el contenido de los
 * nodos queda a la responsabilidad de Tiptap.
 *
 * Decisión: no usamos z.record/z.any porque queremos detectar payloads
 * corruptos (e.g. un string en lugar de un objeto). Pero no validamos
 * la estructura interna porque cambia entre versiones de Tiptap y eso
 * bloquearía migraciones futuras.
 */
const tiptapDocSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.unknown()).optional(),
  })
  .passthrough();

const i18nStringSchema = z.string().trim().min(1).max(200);
const i18nStringLongSchema = z.string().trim().min(1).max(500);
const i18nStringOptionalSchema = z
  .object({ es: z.string().trim().max(200), en: z.string().trim().max(200) })
  .partial()
  .nullish();

/**
 * Schema para crear un post.
 *
 * Restricciones:
 * - slug se normaliza a lowercase.
 * - title/excerpt son { es, en } con min 1, max 200/500.
 * - content es JSON Tiptap con shape mínimo (debe tener `type: "doc"`).
 * - image es URL opcional (validación: max 500 chars; el formato lo
 *   verifica la action al subir a media si es necesario).
 * - status default DRAFT.
 * - publishedAt se setea automáticamente en la action si status=PUBLISHED
 *   y no se provee. Aquí solo validamos que sea una fecha válida.
 */
export const createPostSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Slug requerido")
    .max(80, "Slug demasiado largo")
    .regex(
      /^[a-z0-9-]+$/,
      "Solo letras minúsculas, números y guiones",
    ),
  title: z.object({ es: i18nStringSchema, en: i18nStringSchema }),
  excerpt: z.object({
    es: i18nStringLongSchema,
    en: i18nStringLongSchema,
  }),
  content: tiptapDocSchema,
  image: z.string().trim().max(500).optional().nullable(),
  status: z.enum(POST_STATUSES).default("DRAFT"),
  publishedAt: z
    .coerce
    .date({ errorMap: () => ({ message: "Fecha de publicación inválida" }) })
    .nullish(),
  categoryId: z.string().min(1).optional().nullable(),
  // tags como string CSV. La action hace el split y validación
  // adicional (max 10 tags, cada uno max 30 chars).
  tags: z.string().trim().max(500).optional().nullable(),
  metaTitle: i18nStringOptionalSchema,
  metaDesc: i18nStringOptionalSchema,
});

export type CreatePostInput = z.infer<typeof createPostSchema>;

/**
 * Schema para editar un post. Todos los campos son opcionales excepto
 * el id. Si no se envía un campo, se mantiene el valor anterior (eso
 * lo resuelve la action con un prisma.update explícito por campo).
 */
export const updatePostSchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  title: z
    .object({ es: i18nStringSchema, en: i18nStringSchema })
    .optional(),
  excerpt: z
    .object({
      es: i18nStringLongSchema,
      en: i18nStringLongSchema,
    })
    .optional(),
  content: tiptapDocSchema.optional(),
  image: z.string().trim().max(500).optional().nullable(),
  status: z.enum(POST_STATUSES).optional(),
  publishedAt: z.coerce.date().nullish(),
  categoryId: z.string().min(1).optional().nullable(),
  tags: z.string().trim().max(500).optional().nullable(),
  metaTitle: i18nStringOptionalSchema,
  metaDesc: i18nStringOptionalSchema,
});

export type UpdatePostInput = z.infer<typeof updatePostSchema>;

/**
 * Schema para cambiar solo el status (atajo de la action principal).
 * Útil para los botones rápidos en la lista admin: "Publicar",
 * "Archivar", "Volver a borrador".
 */
export const changePostStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(POST_STATUSES),
});

export type ChangePostStatusInput = z.infer<typeof changePostStatusSchema>;

/**
 * Schema para eliminar un post. `force` es necesario si el post está
 * PUBLISHED (defensa contra borrado accidental de contenido público).
 */
export const deletePostSchema = z.object({
  id: z.string().min(1),
  force: z.boolean().default(false),
});

export type DeletePostInput = z.infer<typeof deletePostSchema>;

/**
 * Schema para acciones en lote (publish/archive de varios posts a la vez).
 * min 1, max 50 (evita acciones masivas accidentales).
 */
export const bulkActionSchema = z.object({
  postIds: z.array(z.string().min(1)).min(1).max(50),
});

export type BulkActionInput = z.infer<typeof bulkActionSchema>;

/**
 * Schema para los filtros del listado admin.
 * skip/take aceptan string (compatibilidad con query params).
 */
export const postFilterSchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(["all", ...POST_STATUSES]).default("all"),
  categoryId: z.string().min(1).optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(100).default(50),
});

export type PostFilterInput = z.infer<typeof postFilterSchema>;

/**
 * Schema para crear/editar categoría.
 * El name es { es, en } igual que los demás i18n del proyecto.
 */
export const createCategorySchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Slug requerido")
    .max(40, "Slug demasiado largo")
    .regex(/^[a-z0-9-]+$/, "Solo letras minúsculas, números y guiones"),
  name: z.object({
    es: z.string().trim().min(1, "Nombre en español requerido").max(60),
    en: z.string().trim().min(1, "Nombre en inglés requerido").max(60),
  }),
  order: z.number().int().min(0).default(0),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = z.object({
  id: z.string().min(1),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  name: z
    .object({
      es: z.string().trim().min(1).max(60),
      en: z.string().trim().min(1).max(60),
    })
    .optional(),
  order: z.number().int().min(0).optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
