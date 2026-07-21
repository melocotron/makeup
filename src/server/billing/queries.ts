import "server-only";

import { prisma } from "@/lib/prisma";

import type { Locale } from "@/i18n/routing";

// ============================================================================
// BILLING — read-only queries (writes go through actions.ts)
// ============================================================================

/**
 * Tipo derivado para el listado de invoices. Usa la cita asociada
 * para mostrar cliente y servicio sin hacer N+1 (todo se carga en
 * un único findMany con includes).
 */
export type InvoiceListItem = {
  id: string;
  number: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  // Datos del cliente (de la cita)
  clientName: string;
  clientEmail: string;
  // Datos de la cita
  appointmentId: string;
  appointmentDate: string;
  serviceName: string;
  serviceId: string;
  // Montos
  subtotal: number;
  discountAmount: number;
  loyaltyDiscount: number;
  total: number;
  // Pago
  paymentMethod: string | null;
  paidAt: string | null;
  // Metadata
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
  couponUsagesCount: number;
};

/**
 * Tipo derivado para el detalle de una invoice. Incluye las relations
 * completas: appointment (con service), items (con extras), couponUsages
 * (con coupon).
 */
export type InvoiceDetail = InvoiceListItem & {
  appointment: {
    id: string;
    scheduledAt: string;
    durationMin: number;
    status: string;
    notes: string | null;
    internalNotes: string | null;
  };
  items: InvoiceItemDetail[];
  couponUsages: InvoiceCouponUsageDetail[];
};

export type InvoiceItemDetail = {
  id: string;
  serviceId: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  extras: {
    id: string;
    extraId: string | null;
    description: string;
    price: number;
  }[];
};

export type InvoiceCouponUsageDetail = {
  id: string;
  couponId: string;
  amount: number;
  usedAt: string;
  coupon: {
    id: string;
    code: string;
    type: "PERCENTAGE" | "FIXED";
    value: number;
  };
};

/**
 * Tipo para las stats del header de /admin/facturas.
 */
export type InvoiceStats = {
  totalPending: number;
  totalPaidThisMonth: number;
  revenueThisMonth: number;
  couponsRedeemedThisMonth: number;
};

/**
 * Tipo exportado del filtro (consistente con el schema Zod).
 * Re-exportado aquí para que los consumers no tengan que importar de validators.
 */
export type InvoiceStatus = "PENDING" | "PAID" | "CANCELLED";

// ============================================================================
// Helpers
// ============================================================================

/**
 * Extrae el nombre del servicio en el locale dado, con fallback.
 */
function getServiceName(
  raw: unknown,
  locale: string,
): string {
  const obj = raw as Record<string, string> | null;
  return obj?.[locale] ?? obj?.es ?? obj?.en ?? "—";
}

/**
 * Convierte un Decimal de Prisma a number. Prisma retorna Decimal
 * en runtime pero en tests retorna number directamente; ambos casos
 * se manejan.
 */
function toNumber(d: unknown): number {
  if (typeof d === "number") return d;
  if (d && typeof (d as { toNumber?: () => number }).toNumber === "function") {
    return (d as { toNumber: () => number }).toNumber();
  }
  return Number(d) || 0;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Lista invoices con búsqueda opcional y filtro por status.
 * Devuelve `{ items, total }` para soportar paginación en la UI.
 */
export async function listInvoices(options: {
  search?: string;
  status?: "all" | InvoiceStatus;
  skip?: number;
  take?: number;
  locale?: Locale;
} = {}): Promise<{ items: InvoiceListItem[]; total: number }> {
  const { search, status = "all", skip = 0, take = 50, locale = "es" } = options;

  // Construir el where clause
  const where: Record<string, unknown> = {};
  if (status !== "all") {
    where.status = status;
  }
  if (search && search.trim().length > 0) {
    // Buscar por número de invoice o por nombre/email del cliente (vía cita)
    const term = search.trim();
    where.OR = [
      { number: { contains: term } },
      { appointment: { client: { name: { contains: term } } } },
      { appointment: { client: { email: { contains: term } } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        appointment: {
          include: {
            client: { select: { name: true, email: true } },
            service: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { items: true, couponUsages: true },
        },
      },
    }),
    prisma.invoice.count({ where }),
  ]);

  const items: InvoiceListItem[] = rows.map((r) => ({
    id: r.id,
    number: r.number,
    status: r.status as InvoiceStatus,
    clientName: r.appointment.client.name,
    clientEmail: r.appointment.client.email,
    appointmentId: r.appointment.id,
    appointmentDate: r.appointment.scheduledAt.toISOString(),
    serviceId: r.appointment.service.id,
    serviceName: getServiceName(r.appointment.service.name, locale),
    subtotal: toNumber(r.subtotal),
    discountAmount: toNumber(r.discountAmount),
    loyaltyDiscount: toNumber(r.loyaltyDiscount),
    total: toNumber(r.total),
    paymentMethod: r.paymentMethod,
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    itemsCount: r._count.items,
    couponUsagesCount: r._count.couponUsages,
  }));

  return { items, total };
}

/**
 * Detalle de una invoice por id, con todas las relations.
 * Devuelve `null` si no existe.
 */
export async function getInvoiceById(
  id: string,
  locale: Locale = "es",
): Promise<InvoiceDetail | null> {
  const r = await prisma.invoice.findUnique({
    where: { id },
    include: {
      appointment: {
        include: {
          client: { select: { id: true, name: true, email: true } },
          service: { select: { id: true, name: true } },
        },
      },
      items: {
        orderBy: { id: "asc" },
        include: {
          extras: {
            orderBy: { id: "asc" },
          },
        },
      },
      couponUsages: {
        orderBy: { usedAt: "asc" },
        include: {
          coupon: {
            select: { id: true, code: true, type: true, value: true },
          },
        },
      },
    },
  });

  if (!r) return null;

  return {
    id: r.id,
    number: r.number,
    status: r.status as InvoiceStatus,
    clientName: r.appointment.client.name,
    clientEmail: r.appointment.client.email,
    appointmentId: r.appointment.id,
    appointmentDate: r.appointment.scheduledAt.toISOString(),
    serviceId: r.appointment.service.id,
    serviceName: getServiceName(r.appointment.service.name, locale),
    subtotal: toNumber(r.subtotal),
    discountAmount: toNumber(r.discountAmount),
    loyaltyDiscount: toNumber(r.loyaltyDiscount),
    total: toNumber(r.total),
    paymentMethod: r.paymentMethod,
    paidAt: r.paidAt ? r.paidAt.toISOString() : null,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    itemsCount: r.items.length,
    couponUsagesCount: r.couponUsages.length,
    appointment: {
      id: r.appointment.id,
      scheduledAt: r.appointment.scheduledAt.toISOString(),
      durationMin: r.appointment.durationMin,
      status: r.appointment.status,
      notes: r.appointment.notes,
      internalNotes: r.appointment.internalNotes,
    },
    items: r.items.map((it) => ({
      id: it.id,
      serviceId: it.serviceId,
      description: it.description,
      quantity: it.quantity,
      unitPrice: toNumber(it.unitPrice),
      total: toNumber(it.total),
      extras: it.extras.map((ex) => ({
        id: ex.id,
        extraId: ex.extraId,
        description: ex.description,
        price: toNumber(ex.price),
      })),
    })),
    couponUsages: r.couponUsages.map((cu) => ({
      id: cu.id,
      couponId: cu.couponId,
      amount: toNumber(cu.amount),
      usedAt: cu.usedAt.toISOString(),
      coupon: {
        id: cu.coupon.id,
        code: cu.coupon.code,
        type: cu.coupon.type as "PERCENTAGE" | "FIXED",
        value: toNumber(cu.coupon.value),
      },
    })),
  };
}

/**
 * Devuelve la invoice asociada a una cita (si existe).
 * Usado para chequear duplicados antes de crear y para mostrar
 * el resumen en la vista de cita.
 */
export async function getInvoiceForAppointment(
  appointmentId: string,
): Promise<{ id: string; number: string; status: InvoiceStatus; total: number } | null> {
  const r = await prisma.invoice.findUnique({
    where: { appointmentId },
    select: {
      id: true,
      number: true,
      status: true,
      total: true,
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    number: r.number,
    status: r.status as InvoiceStatus,
    total: toNumber(r.total),
  };
}

/**
 * Stats globales para el header de /admin/facturas.
 * 4 KPIs: pending, paidThisMonth, revenueThisMonth, couponsRedeemedThisMonth.
 */
export async function getInvoiceStats(): Promise<InvoiceStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalPending,
    totalPaidThisMonth,
    revenueAgg,
    couponsRedeemedThisMonth,
  ] = await Promise.all([
    prisma.invoice.count({ where: { status: "PENDING" } }),
    prisma.invoice.count({
      where: { status: "PAID", paidAt: { gte: startOfMonth } },
    }),
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { status: "PAID", paidAt: { gte: startOfMonth } },
    }),
    prisma.couponUsage.count({ where: { usedAt: { gte: startOfMonth } } }),
  ]);

  return {
    totalPending,
    totalPaidThisMonth,
    revenueThisMonth: toNumber(revenueAgg._sum.total),
    couponsRedeemedThisMonth,
  };
}
