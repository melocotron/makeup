"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";

import {
  bulkActionSchema,
  changePostStatusSchema,
  createCategorySchema,
  createPostSchema,
  deletePostSchema,
  updateCategorySchema,
  updatePostSchema,
  type BulkActionInput,
  type ChangePostStatusInput,
  type CreateCategoryInput,
  type CreatePostInput,
  type DeletePostInput,
  type UpdateCategoryInput,
  type UpdatePostInput,
} from "./validators";

// ============================================================================
// SHARED TYPES
// ============================================================================

type ActionResult<T = void> =
  | { success: true; data?: T; id?: string }
  | { success: false; error: string };

async function requireAdmin(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "No autenticado" };
  }
  return { success: true };
}

/**
 * Errores de negocio (distinguidos de excepciones inesperadas de DB).
 * Permite mensajes específicos en lugar del genérico.
 */
class ActionError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ActionError";
  }
}

// ============================================================================
// HELPER: build post update payload
// ============================================================================

/**
 * Construye el payload de prisma.update desde un input de updatePostSchema.
 * Solo incluye los campos que vinieron definidos (no undefined).
 * Esto permite updates parciales: si el admin solo cambia el title,
 * el slug, excerpt, content, etc. mantienen su valor anterior.
 */
function buildPostUpdatePayload(
  data: UpdatePostInput,
  extras: { publishedAt?: Date | null; status?: string } = {},
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (data.slug !== undefined) payload.slug = data.slug;
  if (data.title !== undefined) payload.title = data.title;
  if (data.excerpt !== undefined) payload.excerpt = data.excerpt;
  if (data.content !== undefined) payload.content = data.content;
  if (data.image !== undefined) payload.image = data.image;
  if (data.publishedAt !== undefined) {
    payload.publishedAt = data.publishedAt;
  }
  if (data.categoryId !== undefined) {
    payload.categoryId = data.categoryId;
  }
  if (data.tags !== undefined) payload.tags = data.tags;
  if (data.metaTitle !== undefined) payload.metaTitle = data.metaTitle;
  if (data.metaDesc !== undefined) payload.metaDesc = data.metaDesc;
  // Extras que se setean en transiciones de status.
  // status: solo se incluye si el action lo setea explícitamente
  // (ej. updatePost pasando parsed.data.status, o changePostStatus).
  // publishedAt: solo se incluye si el action lo determina (ej. setear
  // a now() cuando se publica por primera vez). El helper NO debe
  // incluir el publishedAt actual como default — eso preservaría
  // el valor pero impediría limpiarlo (null) en otros flujos.
  if (extras.status !== undefined) payload.status = extras.status;
  if (extras.publishedAt !== undefined) {
    payload.publishedAt = extras.publishedAt;
  }
  return payload;
}

// ============================================================================
// ACTION 1: createPost
// ============================================================================

/**
 * Crea un post.
 *
 * Validaciones:
 * - slug único (constraint + check).
 * - categoryId existe si se provee.
 * - Si status === "PUBLISHED" y no se provee publishedAt, se setea a now().
 * - Si status === "PUBLISHED" y se provee publishedAt inválido, falla.
 */
export async function createPost(
  input: CreatePostInput,
): Promise<ActionResult<string>> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = createPostSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar slug único
      const existing = await tx.post.findUnique({
        where: { slug: parsed.data.slug },
        select: { id: true },
      });
      if (existing) {
        throw new ActionError(
          "SLUG_ALREADY_EXISTS",
          `Ya existe un post con el slug "${parsed.data.slug}"`,
        );
      }

      // 2. Verificar que la categoría existe si se provee
      if (parsed.data.categoryId) {
        const cat = await tx.postCategory.findUnique({
          where: { id: parsed.data.categoryId },
          select: { id: true },
        });
        if (!cat) {
          throw new ActionError(
            "CATEGORY_NOT_FOUND",
            "La categoría seleccionada no existe",
          );
        }
      }

      // 3. Si status=PUBLISHED, asegurar publishedAt
      let publishedAt = parsed.data.publishedAt ?? null;
      if (parsed.data.status === "PUBLISHED" && !publishedAt) {
        publishedAt = new Date();
      }

      // 4. Crear el post. Los campos Json opcionales (content, metaTitle,
      // metaDesc) se castean a InputJsonValue porque Prisma 6 tiene
      // tipos estrictos para Json. Si el admin no los provee, se
      // omiten en el create.
      const post = await tx.post.create({
        data: {
          slug: parsed.data.slug,
          title: parsed.data.title as object,
          excerpt: parsed.data.excerpt as object,
          content: parsed.data.content as object,
          image: parsed.data.image ?? null,
          status: parsed.data.status,
          publishedAt,
          categoryId: parsed.data.categoryId ?? null,
          tags: parsed.data.tags ?? null,
          metaTitle: parsed.data.metaTitle as object | undefined,
          metaDesc: parsed.data.metaDesc as object | undefined,
        },
        select: { id: true },
      });

      return post;
    });

    revalidatePath("/[locale]/admin/blog", "page");
    if (parsed.data.status === "PUBLISHED") {
      revalidatePath("/[locale]/blog", "page");
    }
    return { success: true, id: result.id };
  } catch (err) {
    if (err instanceof ActionError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Error al crear el post",
    };
  }
}

// ============================================================================
// ACTION 2: updatePost
// ============================================================================

/**
 * Actualiza un post existente. Solo los campos provistos se modifican.
 *
 * Validaciones:
 * - El post existe.
 * - Si slug cambia, debe ser único.
 * - Si status cambia a PUBLISHED por primera vez, se setea publishedAt
 *   a now() si era null. Cambios posteriores no modifican publishedAt.
 */
export async function updatePost(
  input: UpdatePostInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = updatePostSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar que el post existe y cargar status actual
      const current = await tx.post.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, slug: true, status: true, publishedAt: true },
      });
      if (!current) {
        throw new ActionError("POST_NOT_FOUND", "El post no existe");
      }

      // 2. Si slug cambia, verificar unicidad
      if (parsed.data.slug && parsed.data.slug !== current.slug) {
        const dup = await tx.post.findUnique({
          where: { slug: parsed.data.slug },
          select: { id: true },
        });
        if (dup) {
          throw new ActionError(
            "SLUG_ALREADY_EXISTS",
            `Ya existe un post con el slug "${parsed.data.slug}"`,
          );
        }
      }

      // 3. Si categoryId cambia, verificar que la nueva categoría existe
      if (parsed.data.categoryId) {
        const cat = await tx.postCategory.findUnique({
          where: { id: parsed.data.categoryId },
          select: { id: true },
        });
        if (!cat) {
          throw new ActionError(
            "CATEGORY_NOT_FOUND",
            "La categoría seleccionada no existe",
          );
        }
      }

      // 4. Determinar status y publishedAt.
      const newStatus =
        parsed.data.status !== undefined ? parsed.data.status : current.status;

      // publishedAt: solo se incluye en el payload si el admin lo proveyó
      // explícitamente, o si el post está pasando a PUBLISHED por primera
      // vez (transición DRAFT/null → PUBLISHED sin publishedAt previo).
      // En cualquier otro caso, se omite para preservar el valor original.
      let explicitPublishedAt: Date | null | undefined;
      if (parsed.data.publishedAt !== undefined) {
        // Admin lo proveyó explícitamente (puede ser null para "despublicar").
        explicitPublishedAt = parsed.data.publishedAt;
      } else if (
        newStatus === "PUBLISHED" &&
        current.status !== "PUBLISHED" &&
        !current.publishedAt
      ) {
        // Transición DRAFT/null → PUBLISHED: setear fecha de primera publicación.
        explicitPublishedAt = new Date();
      }
      // else: publishedAt no se incluye en el payload (preserva el original).

      // 5. Build payload y update
      const payload = buildPostUpdatePayload(parsed.data, {
        status: parsed.data.status,
        ...(explicitPublishedAt !== undefined && {
          publishedAt: explicitPublishedAt,
        }),
      });

      await tx.post.update({
        where: { id: parsed.data.id },
        data: payload,
      });
    });

    revalidatePath("/[locale]/admin/blog", "page");
    revalidatePath(`/[locale]/admin/blog/${parsed.data.id}`, "page");
    revalidatePath("/[locale]/blog", "page");
    // Si cambia el slug, revalidar también la URL vieja y la nueva.
    // Por simplicidad solo revalidamos el index público; el detail del
    // público es por slug, no por id.
    return { success: true, id: parsed.data.id };
  } catch (err) {
    if (err instanceof ActionError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Error al actualizar el post",
    };
  }
}

// ============================================================================
// ACTION 3: changePostStatus
// ============================================================================

/**
 * Cambia solo el status de un post. Atajo de updatePost.
 * Si pasa a PUBLISHED y no tiene publishedAt, lo setea.
 */
export async function changePostStatus(
  input: ChangePostStatusInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = changePostStatusSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  try {
    const current = await prisma.post.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, status: true, publishedAt: true },
    });
    if (!current) {
      return { success: false, error: "El post no existe" };
    }

    const data: Record<string, unknown> = {
      status: parsed.data.status,
    };
    if (
      parsed.data.status === "PUBLISHED" &&
      current.status !== "PUBLISHED" &&
      !current.publishedAt
    ) {
      data.publishedAt = new Date();
    }

    await prisma.post.update({
      where: { id: parsed.data.id },
      data,
    });

    revalidatePath("/[locale]/admin/blog", "page");
    revalidatePath(`/[locale]/admin/blog/${parsed.data.id}`, "page");
    revalidatePath("/[locale]/blog", "page");
    return { success: true, id: parsed.data.id };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Error al cambiar el estado",
    };
  }
}

// ============================================================================
// ACTION 4: deletePost
// ============================================================================

/**
 * Elimina un post. Si el post está PUBLISHED, requiere `force: true`
 * para evitar borrado accidental de contenido público.
 */
export async function deletePost(
  input: DeletePostInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = deletePostSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, status: true, slug: true },
    });
    if (!post) {
      return { success: false, error: "El post no existe" };
    }
    if (post.status === "PUBLISHED" && !parsed.data.force) {
      return {
        success: false,
        error:
          "No se puede eliminar un post publicado. Use force=true o primero archívelo.",
      };
    }

    await prisma.post.delete({ where: { id: parsed.data.id } });

    revalidatePath("/[locale]/admin/blog", "page");
    revalidatePath("/[locale]/blog", "page");
    return { success: true, id: parsed.data.id };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Error al eliminar el post",
    };
  }
}

// ============================================================================
// ACTION 5: bulkPublish
// ============================================================================

/**
 * Publica varios posts en lote. Setea publishedAt a now() para los que
 * no lo tengan. Actualización en un solo updateMany.
 */
export async function bulkPublish(
  input: BulkActionInput,
): Promise<ActionResult<{ count: number }>> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = bulkActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  try {
    // UpdateMany no soporta diferentes publishedAt por row. Usamos una
    // transacción con un loop para setear publishedAt solo a los que
    // no lo tengan (preservando el original de los que ya estaban
    // publicados).
    const result = await prisma.$transaction(async (tx) => {
      // Primero, publicar todos los DRAFT/ARCHIVED en la lista
      await tx.post.updateMany({
        where: {
          id: { in: parsed.data.postIds },
          status: { not: "PUBLISHED" },
        },
        data: { status: "PUBLISHED" },
      });

      // Para los que ya estaban PUBLISHED pero sin publishedAt (estado
      // inconsistente), setearles publishedAt.
      const needsPublishedAt = await tx.post.findMany({
        where: {
          id: { in: parsed.data.postIds },
          status: "PUBLISHED",
          publishedAt: null,
        },
        select: { id: true },
      });
      const now = new Date();
      for (const p of needsPublishedAt) {
        await tx.post.update({
          where: { id: p.id },
          data: { publishedAt: now },
        });
      }

      return { count: parsed.data.postIds.length };
    });

    revalidatePath("/[locale]/admin/blog", "page");
    revalidatePath("/[locale]/blog", "page");
    return { success: true, data: result };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Error al publicar en lote",
    };
  }
}

// ============================================================================
// ACTION 6: bulkArchive
// ============================================================================

/**
 * Archiva varios posts en lote. No modifica publishedAt (queda como
 * histórico).
 */
export async function bulkArchive(
  input: BulkActionInput,
): Promise<ActionResult<{ count: number }>> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = bulkActionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  try {
    const result = await prisma.post.updateMany({
      where: {
        id: { in: parsed.data.postIds },
        status: { not: "ARCHIVED" },
      },
      data: { status: "ARCHIVED" },
    });

    revalidatePath("/[locale]/admin/blog", "page");
    revalidatePath("/[locale]/blog", "page");
    return { success: true, data: { count: result.count } };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error ? err.message : "Error al archivar en lote",
    };
  }
}

// ============================================================================
// ACTION 7: upsertCategory
// ============================================================================

/**
 * Crea o actualiza una categoría. Si el id no se provee o no existe,
 * crea; si existe, actualiza.
 *
 * Como el schema tiene un solo createCategorySchema y un updateCategorySchema,
 * este action unifica los dos. Si en el futuro se quiere separar
 * estrictamente, se puede partir en dos actions.
 */
export async function upsertCategory(
  input: CreateCategoryInput | (UpdateCategoryInput & { id?: string }),
): Promise<ActionResult<string>> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  // Si tiene id, es update; si no, create
  const isUpdate = "id" in input && typeof input.id === "string";

  if (isUpdate) {
    const parsed = updateCategorySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues
          .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
          .join(", "),
      };
    }
    return await performUpdateCategory(parsed.data);
  }

  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }
  return await performCreateCategory(parsed.data);
}

async function performCreateCategory(
  input: CreateCategoryInput,
): Promise<ActionResult<string>> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // Verificar slug único
      const existing = await tx.postCategory.findUnique({
        where: { slug: input.slug },
        select: { id: true },
      });
      if (existing) {
        throw new ActionError(
          "SLUG_ALREADY_EXISTS",
          `Ya existe una categoría con el slug "${input.slug}"`,
        );
      }
      return tx.postCategory.create({
        data: {
          slug: input.slug,
          name: input.name,
          order: input.order,
        },
        select: { id: true },
      });
    });

    revalidatePath("/[locale]/admin/blog", "page");
    revalidatePath("/[locale]/admin/blog/categorias", "page");
    revalidatePath("/[locale]/blog", "page");
    return { success: true, id: result.id };
  } catch (err) {
    if (err instanceof ActionError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Error al crear la categoría",
    };
  }
}

async function performUpdateCategory(
  input: UpdateCategoryInput,
): Promise<ActionResult<string>> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.postCategory.findUnique({
        where: { id: input.id },
        select: { id: true, slug: true },
      });
      if (!current) {
        throw new ActionError(
          "CATEGORY_NOT_FOUND",
          "La categoría no existe",
        );
      }
      if (input.slug && input.slug !== current.slug) {
        const dup = await tx.postCategory.findUnique({
          where: { slug: input.slug },
          select: { id: true },
        });
        if (dup) {
          throw new ActionError(
            "SLUG_ALREADY_EXISTS",
            `Ya existe una categoría con el slug "${input.slug}"`,
          );
        }
      }

      const payload: Record<string, unknown> = {};
      if (input.slug !== undefined) payload.slug = input.slug;
      if (input.name !== undefined) payload.name = input.name;
      if (input.order !== undefined) payload.order = input.order;

      return tx.postCategory.update({
        where: { id: input.id },
        data: payload,
        select: { id: true },
      });
    });

    revalidatePath("/[locale]/admin/blog", "page");
    revalidatePath("/[locale]/admin/blog/categorias", "page");
    revalidatePath("/[locale]/blog", "page");
    return { success: true, id: result.id };
  } catch (err) {
    if (err instanceof ActionError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Error al actualizar la categoría",
    };
  }
}

// ============================================================================
// ACTION 8: deleteCategory
// ============================================================================

/**
 * Elimina una categoría. Bloqueado si hay posts usándola (defensa en
 * profundidad; el FK ya está con `onDelete: SetNull`, pero el admin
 * debería decidir explícitamente desvincular antes de borrar).
 */
export async function deleteCategory(
  id: string,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const cat = await tx.postCategory.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!cat) {
        throw new ActionError(
          "CATEGORY_NOT_FOUND",
          "La categoría no existe",
        );
      }
      const postsCount = await tx.post.count({
        where: { categoryId: id },
      });
      if (postsCount > 0) {
        throw new ActionError(
          "CATEGORY_HAS_POSTS",
          `No se puede eliminar: ${postsCount} post(s) usan esta categoría. Desvincúlelos primero.`,
        );
      }
      await tx.postCategory.delete({ where: { id } });
    });

    revalidatePath("/[locale]/admin/blog", "page");
    revalidatePath("/[locale]/admin/blog/categorias", "page");
    return { success: true, id };
  } catch (err) {
    if (err instanceof ActionError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Error al eliminar la categoría",
    };
  }
}
