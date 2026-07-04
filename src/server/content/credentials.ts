"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { credentialSchema, type CredentialFormData } from "./validators";

export async function listCredentials() {
  return prisma.credential.findMany({
    orderBy: [{ order: "asc" }, { year: "desc" }],
  });
}

export async function getCredentialById(id: string) {
  return prisma.credential.findUnique({ where: { id } });
}

export async function createCredentialAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "No autenticado" };
  }

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  const parsed = credentialSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
    };
  }

  try {
    const data: CredentialFormData = parsed.data;
    const cred = await prisma.credential.create({
      data: {
        title: { es: data.titleEs, en: data.titleEn },
        institution: data.institution,
        year: data.year === "" || data.year === undefined ? null : Number(data.year),
        image: data.image || null,
        order: data.order,
      },
    });
    revalidatePath("/[locale]/admin/profile/credentials", "page");
    return { success: true as const, id: cred.id };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al crear",
    };
  }
}

export async function updateCredentialAction(id: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "No autenticado" };
  }

  const raw: Record<string, unknown> = Object.fromEntries(formData.entries());
  const parsed = credentialSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(", "),
    };
  }

  try {
    const data: CredentialFormData = parsed.data;
    await prisma.credential.update({
      where: { id },
      data: {
        title: { es: data.titleEs, en: data.titleEn },
        institution: data.institution,
        year: data.year === "" || data.year === undefined ? null : Number(data.year),
        image: data.image || null,
        order: data.order,
      },
    });
    revalidatePath("/[locale]/admin/profile/credentials", "page");
    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al actualizar",
    };
  }
}

export async function deleteCredentialAction(id: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false as const, error: "No autenticado" };
  }

  try {
    await prisma.credential.delete({ where: { id } });
    revalidatePath("/[locale]/admin/profile/credentials", "page");
    return { success: true as const };
  } catch (err) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : "Error al eliminar",
    };
  }
}