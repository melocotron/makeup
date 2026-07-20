"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";

import { createClientSchema, updateClientSchema } from "./validators";

type ActionResult<T = void> =
  | { success: true; data?: T; id?: string }
  | { success: false; error: string };

function parseFormData(fd: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    out[k] = typeof v === "string" ? v : v.name;
  }
  return out;
}

async function requireAdmin(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "No autenticado" };
  }
  return { success: true };
}

export async function createClientAction(formData: FormData): Promise<ActionResult<string>> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const raw = parseFormData(formData);
  const parsed = createClientSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  const existing = await prisma.client.findUnique({
    where: { email: parsed.data.email },
    select: { id: true },
  });
  if (existing) {
    return {
      success: false,
      error: "Ya existe un cliente con este email",
    };
  }

  try {
    const client = await prisma.client.create({
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        phone: parsed.data.phone,
        notes: parsed.data.notes || null,
      },
      select: { id: true },
    });

    revalidatePath("/admin/clients");
    return { success: true, id: client.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al crear el cliente",
    };
  }
}

export async function updateClientAction(formData: FormData): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const raw = parseFormData(formData);
  const parsed = updateClientSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  // Verify the email is not used by another client
  const conflict = await prisma.client.findFirst({
    where: {
      email: parsed.data.email,
      NOT: { id: parsed.data.id },
    },
    select: { id: true },
  });
  if (conflict) {
    return {
      success: false,
      error: "Otro cliente ya usa este email",
    };
  }

  try {
    await prisma.client.update({
      where: { id: parsed.data.id },
      data: {
        email: parsed.data.email,
        name: parsed.data.name,
        phone: parsed.data.phone,
        notes: parsed.data.notes || null,
      },
    });

    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${parsed.data.id}`);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al actualizar el cliente",
    };
  }
}

export async function deleteClientAction(id: string): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const appointmentCount = await prisma.appointment.count({
    where: { clientId: id },
  });
  if (appointmentCount > 0) {
    return {
      success: false,
      error: `No se puede eliminar: el cliente tiene ${appointmentCount} cita(s). Cancela las citas primero.`,
    };
  }

  try {
    await prisma.client.delete({ where: { id } });
    revalidatePath("/admin/clients");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al eliminar el cliente",
    };
  }
}
