import "server-only";

import { prisma } from "@/lib/prisma";

// ============================================================================
// COUPONS — read-only queries (writes go through actions.ts)
// ============================================================================

export type CouponStatus = "active" | "expired" | "exhausted" | "inactive";

export type CouponListItem = {
  id: string;
  code: string;
  description: { es: string; en: string };
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minPurchase: number | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  serviceIds: string[] | null;
  createdAt: string;
  updatedAt: string;
  // derivado: estado efectivo (no se guarda, se calcula on-the-fly)
  status: CouponStatus;
};

export type CouponDetail = CouponListItem & {
  usages: {
    id: string;
    invoiceId: string;
    amount: number;
    usedAt: string;
  }[];
};

function deriveStatus(
  c: { isActive: boolean; usedCount: number; maxUses: number | null; validUntil: Date },
  now: Date = new Date(),
): CouponStatus {
  if (!c.isActive) return "inactive";
  if (c.validUntil.getTime() < now.getTime()) return "expired";
  if (c.maxUses !== null && c.usedCount >= c.maxUses) return "exhausted";
  return "active";
}

function parseServiceIds(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((s) => typeof s === "string")) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function toListItem(c: {
  id: string;
  code: string;
  description: unknown;
  type: "PERCENTAGE" | "FIXED";
  value: { toString(): string };
  minPurchase: { toString(): string } | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  serviceIds: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CouponListItem {
  return {
    id: c.id,
    code: c.code,
    description: c.description as { es: string; en: string },
    type: c.type,
    value: Number(c.value),
    minPurchase: c.minPurchase ? Number(c.minPurchase) : null,
    maxUses: c.maxUses,
    usedCount: c.usedCount,
    validFrom: c.validFrom.toISOString(),
    validUntil: c.validUntil.toISOString(),
    isActive: c.isActive,
    serviceIds: parseServiceIds(c.serviceIds),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    status: deriveStatus(c),
  };
}

/**
 * Lista cupones con búsqueda por code y filtro por status derivado.
 * Soporta paginación.
 */
export async function listCoupons(options: {
  search?: string;
  status?: "all" | CouponStatus;
  skip?: number;
  take?: number;
} = {}): Promise<{ items: CouponListItem[]; total: number }> {
  const { search, status = "all", skip = 0, take = 50 } = options;

  const where = search
    ? {
        code: { contains: search.toUpperCase(), mode: "insensitive" as const },
      }
    : {};

  const [rows, total] = await Promise.all([
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take,
    }),
    prisma.coupon.count({ where }),
  ]);

  const items = rows
    .map(toListItem)
    .filter((c) => (status === "all" ? true : c.status === status));

  return { items, total };
}

/**
 * Detalle de un cupón con sus usos recientes (últimos 50).
 */
export async function getCouponById(id: string): Promise<CouponDetail | null> {
  const c = await prisma.coupon.findUnique({
    where: { id },
    include: {
      usages: {
        orderBy: { usedAt: "desc" },
        take: 50,
      },
    },
  });
  if (!c) return null;

  const base = toListItem(c);
  return {
    ...base,
    usages: c.usages.map((u) => ({
      id: u.id,
      invoiceId: u.invoiceId,
      amount: Number(u.amount),
      usedAt: u.usedAt.toISOString(),
    })),
  };
}

/**
 * Stats globales para mostrar en el header de /admin/promotions.
 */
export type CouponStats = {
  totalActive: number;
  totalExhausted: number;
  totalUsagesThisMonth: number;
};

export async function getCouponStats(): Promise<CouponStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalActive, totalExhausted, monthlyUsages] = await Promise.all([
    prisma.coupon.count({
      where: { isActive: true, validUntil: { gte: now } },
    }),
    prisma.coupon.count({
      where: { isActive: true, usedCount: { gte: 1 } },
    }),
    prisma.couponUsage.count({
      where: { usedAt: { gte: startOfMonth } },
    }),
  ]);

  return {
    totalActive,
    totalExhausted,
    totalUsagesThisMonth: monthlyUsages,
  };
}
