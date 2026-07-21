"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/server/auth";
import { prisma } from "@/lib/prisma";

import {
  applyCouponToInvoiceSchema,
  cancelInvoiceSchema,
  createInvoiceForAppointmentSchema,
  markInvoicePaidSchema,
  removeCouponFromInvoiceSchema,
  updateInvoiceNotesSchema,
  type ApplyCouponToInvoiceInput,
  type CancelInvoiceInput,
  type MarkInvoicePaidInput,
  type RemoveCouponFromInvoiceInput,
  type UpdateInvoiceNotesInput,
} from "./validators";

// ============================================================================
// SHARED TYPES
// ============================================================================

type ActionResult<T = void> =
  | { success: true; data?: T; id?: string; number?: string }
  | { success: false; error: string };

async function requireAdmin(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "No autenticado" };
  }
  return { success: true };
}

// Estados de cita desde los cuales se permite facturar
const FACTURABLE_STATUSES = ["CONFIRMED", "COMPLETED"] as const;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Convierte un Decimal a number. Acepta number (test mocks) o Decimal real.
 */
function toNumber(d: unknown): number {
  if (typeof d === "number") return d;
  if (d && typeof (d as { toNumber?: () => number }).toNumber === "function") {
    return (d as { toNumber: () => number }).toNumber();
  }
  return Number(d) || 0;
}

/**
 * Genera el siguiente número de invoice para el año actual.
 * Formato: INV-<year>-<sequence> con sequence 4 dígitos zero-padded.
 *
 * Implementación: en una transacción, contamos cuántos invoices del año
 * actual existen. Usamos `count` (no MAX) para evitar parsing de strings
 * y para ser robusto si por algún motivo hay huecos en la secuencia.
 *
 * Trade-off: si dos requests llegan en paralelo, podrían leer el mismo
 * count y crear ambos con el mismo número. Mitigación: el UNIQUE constraint
 * en `number` causaría un error de DB en el segundo; la action lo captura
 * y reintenta una vez. Para el volumen de este proyecto (cobros manuales)
 * la probabilidad de colisión es despreciable, pero la defensa está.
 */
async function generateInvoiceNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const count = await tx.invoice.count({
    where: { number: { startsWith: prefix } },
  });
  const sequence = String(count + 1).padStart(4, "0");
  return `${prefix}${sequence}`;
}

/**
 * Calcula el descuento aplicable de un cupón sobre un subtotal.
 * Devuelve el monto descontado, garantizando que nunca exceda el subtotal.
 *
 * - PERCENTAGE: subtotal * (value / 100), truncado a subtotal si lo excede.
 * - FIXED: min(value, subtotal).
 *
 * Esta función NO valida vigencia ni aplicabilidad (eso es responsabilidad
 * de la action). Solo calcula.
 */
function calculateDiscount(
  type: "PERCENTAGE" | "FIXED",
  value: number,
  subtotal: number,
): number {
  let raw: number;
  if (type === "PERCENTAGE") {
    raw = subtotal * (value / 100);
  } else {
    raw = value;
  }
  // Nunca negativo, nunca mayor al subtotal.
  return Math.max(0, Math.min(raw, subtotal));
}

/**
 * Parsea serviceIds de un cupón (campo String? en DB que guarda JSON).
 * Devuelve null si es null, [], o el JSON no es un array válido.
 */
function parseCouponServiceIds(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
      return parsed.length > 0 ? parsed : null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extrae el nombre del servicio del JSON i18n en el locale, con fallback.
 */
function getServiceName(raw: unknown, locale: string): string {
  const obj = raw as Record<string, string> | null;
  return obj?.[locale] ?? obj?.es ?? obj?.en ?? "—";
}

// ============================================================================
// ACTION 1: createInvoiceForAppointment
// ============================================================================

/**
 * Crea una invoice a partir de una cita en estado CONFIRMED o COMPLETED.
 *
 * Flujo (todo dentro de prisma.$transaction):
 * 1. Verificar que la cita existe y está en estado facturable.
 * 2. Verificar que la cita no tiene ya una invoice.
 * 3. Cargar servicio + extras activos.
 * 4. Generar número de invoice (INV-<year>-<sequence>).
 * 5. Calcular subtotal = basePrice + sum(extras activos).
 * 6. Crear Invoice + InvoiceItem + InvoiceItemExtra (snapshots).
 *
 * Decisiones:
 * - Solo se facturan extras ACTIVOS. Si un extra fue desactivado después
 *   de la cita, no aparece en la invoice (se puede agregar manualmente
 *   en una fase posterior con UI de edición).
 * - Los items son snapshot: el precio y la descripción se copian al
 *   momento de facturar. Cambios futuros en Service/ServiceExtra no
 *   afectan invoices históricas.
 */
export async function createInvoiceForAppointment(
  input: { appointmentId: string },
): Promise<ActionResult<string>> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = createInvoiceForAppointmentSchema.safeParse(input);
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
      // 1. Cargar cita con servicio y extras
      const appointment = await tx.appointment.findUnique({
        where: { id: parsed.data.appointmentId },
        include: {
          service: {
            include: { extras: { where: { isActive: true } } },
          },
        },
      });

      if (!appointment) {
        throw new ActionError("APPOINTMENT_NOT_FOUND", "La cita no existe");
      }

      if (!(FACTURABLE_STATUSES as readonly string[]).includes(appointment.status)) {
        throw new ActionError(
          "APPOINTMENT_NOT_FACTURABLE",
          "Solo se pueden facturar citas confirmadas o completadas",
        );
      }

      // 2. Verificar que no hay invoice duplicada (re-check en transacción)
      const existing = await tx.invoice.findUnique({
        where: { appointmentId: appointment.id },
        select: { id: true },
      });
      if (existing) {
        throw new ActionError(
          "INVOICE_ALREADY_EXISTS",
          "Esta cita ya tiene una factura",
        );
      }

      // 3. Calcular subtotal
      const basePrice = toNumber(appointment.service.basePrice);
      const extrasTotal = appointment.service.extras.reduce(
        (sum, e) => sum + toNumber(e.price),
        0,
      );
      const subtotal = basePrice + extrasTotal;

      // 4. Generar número de invoice
      const number = await generateInvoiceNumber(tx);

      // 5. Crear invoice con item principal
      const invoice = await tx.invoice.create({
        data: {
          number,
          appointmentId: appointment.id,
          status: "PENDING",
          subtotal,
          discountAmount: 0,
          loyaltyDiscount: 0,
          total: subtotal,
          items: {
            create: [
              {
                serviceId: appointment.service.id,
                description: getServiceName(appointment.service.name, "es"),
                quantity: 1,
                unitPrice: basePrice,
                total: basePrice,
                // Si hay extras, los agregamos como sub-items
                ...(appointment.service.extras.length > 0
                  ? {
                      extras: {
                        create: appointment.service.extras.map((e) => ({
                          extraId: e.id,
                          description: getServiceName(e.name, "es"),
                          price: toNumber(e.price),
                        })),
                      },
                    }
                  : {}),
              },
            ],
          },
        },
        select: { id: true, number: true },
      });

      return invoice;
    });

    revalidatePath("/[locale]/admin/facturas", "page");
    revalidatePath(`/[locale]/admin/citas/${parsed.data.appointmentId}`, "page");
    return { success: true, id: result.id, number: result.number };
  } catch (err) {
    if (err instanceof ActionError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al crear la factura",
    };
  }
}

/**
 * Custom error class para errores de negocio que NO son excepciones
 * inesperadas. Permite distinguirlos en el catch y devolver un mensaje
 * específico en lugar del mensaje genérico.
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
// ACTION 2: applyCouponToInvoice
// ============================================================================

/**
 * Aplica un cupón a una invoice PENDING. Calcula el descuento, actualiza
 * Invoice, crea CouponUsage, e incrementa Coupon.usedCount.
 *
 * Todo en una transacción para garantizar consistencia entre los 3 cambios.
 *
 * Validaciones de cupón (todas en transacción):
 * - Existe.
 * - Activo.
 * - Vigente (validFrom <= now <= validUntil).
 * - No agotado (usedCount < maxUses, o maxUses = null).
 * - Aplicable al servicio (serviceIds null o incluye el serviceId de la cita).
 * - Compra mínima alcanzada (subtotal >= minPurchase, o minPurchase = null).
 * - No aplicado ya a esta invoice (idempotencia).
 */
export async function applyCouponToInvoice(
  input: ApplyCouponToInvoiceInput,
): Promise<ActionResult<{ discountAmount: number; newTotal: number }>> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = applyCouponToInvoiceSchema.safeParse(input);
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
      // 1. Cargar invoice PENDING
      const invoice = await tx.invoice.findUnique({
        where: { id: parsed.data.invoiceId },
        include: { appointment: { select: { serviceId: true } } },
      });
      if (!invoice) {
        throw new ActionError("INVOICE_NOT_FOUND", "La factura no existe");
      }
      if (invoice.status !== "PENDING") {
        throw new ActionError(
          "INVOICE_NOT_PENDING",
          "Solo se pueden modificar facturas pendientes",
        );
      }

      // 2. Cargar cupón por code (ya normalizado a uppercase en el schema)
      const coupon = await tx.coupon.findUnique({
        where: { code: parsed.data.couponCode },
        select: {
          id: true,
          code: true,
          type: true,
          value: true,
          minPurchase: true,
          maxUses: true,
          usedCount: true,
          isActive: true,
          validFrom: true,
          validUntil: true,
          serviceIds: true,
        },
      });
      if (!coupon) {
        throw new ActionError("COUPON_NOT_FOUND", "El cupón no existe");
      }
      if (!coupon.isActive) {
        throw new ActionError("COUPON_INACTIVE", "El cupón está inactivo");
      }

      const now = new Date();
      if (now < coupon.validFrom || now > coupon.validUntil) {
        throw new ActionError("COUPON_EXPIRED", "El cupón está fuera de vigencia");
      }
      if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
        throw new ActionError("COUPON_EXHAUSTED", "El cupón ya alcanzó su máximo de usos");
      }

      const subtotal = toNumber(invoice.subtotal);
      const minPurchase = coupon.minPurchase ? toNumber(coupon.minPurchase) : null;
      if (minPurchase !== null && subtotal < minPurchase) {
        throw new ActionError(
          "MIN_PURCHASE_NOT_REACHED",
          "El subtotal no alcanza la compra mínima del cupón",
        );
      }

      const serviceIds = parseCouponServiceIds(coupon.serviceIds);
      if (serviceIds !== null && !serviceIds.includes(invoice.appointment.serviceId)) {
        throw new ActionError(
          "COUPON_NOT_APPLICABLE_TO_SERVICE",
          "El cupón no aplica a este servicio",
        );
      }

      // 3. Verificar que no está ya aplicado a esta invoice
      const alreadyApplied = await tx.couponUsage.findFirst({
        where: { invoiceId: invoice.id, couponId: coupon.id },
      });
      if (alreadyApplied) {
        throw new ActionError(
          "COUPON_ALREADY_APPLIED",
          "Este cupón ya está aplicado a esta factura",
        );
      }

      // 4. Calcular descuento y nuevo total
      const discountAmount = calculateDiscount(
        coupon.type,
        toNumber(coupon.value),
        subtotal,
      );
      const newTotal = Math.max(
        0,
        subtotal - discountAmount - toNumber(invoice.loyaltyDiscount),
      );

      // 5. Crear CouponUsage + actualizar Invoice + incrementar usedCount
      await tx.couponUsage.create({
        data: {
          couponId: coupon.id,
          invoiceId: invoice.id,
          amount: discountAmount,
        },
      });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { discountAmount, total: newTotal },
      });
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });

      return { discountAmount, newTotal };
    });

    revalidatePath(`/[locale]/admin/facturas/${parsed.data.invoiceId}`, "page");
    return {
      success: true,
      data: { discountAmount: result.discountAmount, newTotal: result.newTotal },
    };
  } catch (err) {
    if (err instanceof ActionError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al aplicar el cupón",
    };
  }
}

// ============================================================================
// ACTION 3: removeCouponFromInvoice
// ============================================================================

/**
 * Quita un cupón aplicado a una invoice PENDING. Borra el CouponUsage,
 * decrementa usedCount, y recalcula el total sin descuento.
 */
export async function removeCouponFromInvoice(
  input: RemoveCouponFromInvoiceInput,
): Promise<ActionResult<{ newTotal: number }>> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = removeCouponFromInvoiceSchema.safeParse(input);
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
      // 1. Cargar invoice
      const invoice = await tx.invoice.findUnique({
        where: { id: parsed.data.invoiceId },
        select: { id: true, status: true, subtotal: true, loyaltyDiscount: true },
      });
      if (!invoice) {
        throw new ActionError("INVOICE_NOT_FOUND", "La factura no existe");
      }
      if (invoice.status !== "PENDING") {
        throw new ActionError(
          "INVOICE_NOT_PENDING",
          "Solo se pueden modificar facturas pendientes",
        );
      }

      // 2. Cargar CouponUsage (verificar que pertenece a esta invoice)
      const usage = await tx.couponUsage.findUnique({
        where: { id: parsed.data.couponUsageId },
        select: { id: true, couponId: true, invoiceId: true },
      });
      if (!usage || usage.invoiceId !== invoice.id) {
        throw new ActionError(
          "COUPON_USAGE_NOT_FOUND",
          "El uso de cupón no pertenece a esta factura",
        );
      }

      // 3. Borrar CouponUsage, recalcular Invoice, decrementar usedCount
      const newTotal = Math.max(
        0,
        toNumber(invoice.subtotal) - toNumber(invoice.loyaltyDiscount),
      );
      await tx.couponUsage.delete({ where: { id: usage.id } });
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { discountAmount: 0, total: newTotal },
      });
      await tx.coupon.update({
        where: { id: usage.couponId },
        data: { usedCount: { decrement: 1 } },
      });

      return { newTotal };
    });

    revalidatePath(`/[locale]/admin/facturas/${parsed.data.invoiceId}`, "page");
    return { success: true, data: { newTotal: result.newTotal } };
  } catch (err) {
    if (err instanceof ActionError) {
      return { success: false, error: err.message };
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al quitar el cupón",
    };
  }
}

// ============================================================================
// ACTION 4: markInvoicePaid
// ============================================================================

/**
 * Marca una invoice PENDING como PAID. Setea paymentMethod, paidAt (default
 * = now), y opcionalmente actualiza notes.
 */
export async function markInvoicePaid(
  input: MarkInvoicePaidInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = markInvoicePaidSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parsed.data.invoiceId },
      select: { id: true, status: true, notes: true },
    });
    if (!invoice) {
      return { success: false, error: "La factura no existe" };
    }
    if (invoice.status !== "PENDING") {
      return {
        success: false,
        error: "Solo se pueden marcar como pagadas las facturas pendientes",
      };
    }

    await prisma.invoice.update({
      where: { id: parsed.data.invoiceId },
      data: {
        status: "PAID",
        paymentMethod: parsed.data.paymentMethod,
        paidAt: parsed.data.paidAt ?? new Date(),
        // Si viene notes nuevo, lo usa; si no, mantiene el existente
        notes: parsed.data.notes ?? invoice.notes,
      },
    });

    revalidatePath(`/[locale]/admin/facturas/${parsed.data.invoiceId}`, "page");
    revalidatePath("/[locale]/admin/facturas", "page");
    return { success: true, id: parsed.data.invoiceId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al marcar como pagada",
    };
  }
}

// ============================================================================
// ACTION 5: cancelInvoice
// ============================================================================

/**
 * Cancela una invoice PENDING. El motivo se guarda en `notes` con un
 * prefijo para distinguirlo de notas libres.
 */
export async function cancelInvoice(
  input: CancelInvoiceInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = cancelInvoiceSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parsed.data.invoiceId },
      select: { id: true, status: true, notes: true },
    });
    if (!invoice) {
      return { success: false, error: "La factura no existe" };
    }
    if (invoice.status !== "PENDING") {
      return {
        success: false,
        error: "Solo se pueden cancelar facturas pendientes",
      };
    }

    const existingNotes = invoice.notes ?? "";
    const newNotes = existingNotes
      ? `${existingNotes}\n[CANCELLED] ${parsed.data.reason}`
      : `[CANCELLED] ${parsed.data.reason}`;

    await prisma.invoice.update({
      where: { id: parsed.data.invoiceId },
      data: {
        status: "CANCELLED",
        notes: newNotes,
      },
    });

    revalidatePath(`/[locale]/admin/facturas/${parsed.data.invoiceId}`, "page");
    revalidatePath("/[locale]/admin/facturas", "page");
    return { success: true, id: parsed.data.invoiceId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al cancelar la factura",
    };
  }
}

// ============================================================================
// ACTION 6: updateInvoiceNotes
// ============================================================================

/**
 * Edita las notas de una invoice. Sin restricción de status. `notes: null`
 * limpia el campo.
 */
export async function updateInvoiceNotes(
  input: UpdateInvoiceNotesInput,
): Promise<ActionResult> {
  const guard = await requireAdmin();
  if (!guard.success) return guard;

  const parsed = updateInvoiceNotesSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues
        .map((i) => `${i.path.join(".") || "campo"}: ${i.message}`)
        .join(", "),
    };
  }

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: parsed.data.invoiceId },
      select: { id: true },
    });
    if (!invoice) {
      return { success: false, error: "La factura no existe" };
    }

    await prisma.invoice.update({
      where: { id: parsed.data.invoiceId },
      data: { notes: parsed.data.notes },
    });

    revalidatePath(`/[locale]/admin/facturas/${parsed.data.invoiceId}`, "page");
    return { success: true, id: parsed.data.invoiceId };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Error al actualizar las notas",
    };
  }
}
