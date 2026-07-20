import "server-only";

import { prisma } from "@/lib/prisma";

// ============================================================================
// LOYALTY — read-only queries
// ============================================================================

export type LoyaltyRuleItem = {
  id: string;
  name: string;
  pointsPerAmount: number;
  pointsToRedeem: number;
  redeemValue: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function toRuleItem(r: {
  id: string;
  name: string;
  pointsPerAmount: { toString(): string };
  pointsToRedeem: number;
  redeemValue: { toString(): string };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): LoyaltyRuleItem {
  return {
    id: r.id,
    name: r.name,
    pointsPerAmount: Number(r.pointsPerAmount),
    pointsToRedeem: r.pointsToRedeem,
    redeemValue: Number(r.redeemValue),
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

/**
 * Devuelve la regla activa. Como diseñamos 1-solo-activa-a-la-vez, este es
 * el método que consume la app para saber cuántos puntos dar por $X y cómo
 * se redimen.
 */
export async function getActiveLoyaltyRule(): Promise<LoyaltyRuleItem | null> {
  const r = await prisma.loyaltyRule.findFirst({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
  });
  return r ? toRuleItem(r) : null;
}

/**
 * Histórico de reglas (incluyendo inactivas). Útil para auditoría.
 */
export async function listLoyaltyRules(options: {
  includeInactive?: boolean;
} = {}): Promise<{ items: LoyaltyRuleItem[] }> {
  const { includeInactive = true } = options;
  const where = includeInactive ? {} : { isActive: true };
  const rows = await prisma.loyaltyRule.findMany({
    where,
    orderBy: { updatedAt: "desc" },
  });
  return { items: rows.map(toRuleItem) };
}

// ============================================================================
// LOYALTY TRANSACTIONS — por cliente
// ============================================================================

export type LoyaltyTransactionItem = {
  id: string;
  type: "EARNED" | "REDEEMED" | "EXPIRED" | "ADJUSTED";
  points: number;
  reason: string | null;
  invoiceId: string | null;
  createdAt: string;
};

export type ClientLoyalty = {
  balance: number;
  totalEarned: number;
  totalRedeemed: number;
  recent: LoyaltyTransactionItem[];
};

/**
 * Devuelve el balance de puntos y las últimas N transacciones de un cliente.
 */
export async function getClientLoyalty(
  clientId: string,
  limit = 20,
): Promise<ClientLoyalty> {
  const [client, recent] = await Promise.all([
    prisma.client.findUnique({
      where: { id: clientId },
      select: { loyaltyPoints: true },
    }),
    prisma.loyaltyTransaction.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  if (!client) {
    return { balance: 0, totalEarned: 0, totalRedeemed: 0, recent: [] };
  }

  // Para los totales históricos, agregamos en SQL en vez de traer todo.
  const [earned, redeemed] = await Promise.all([
    prisma.loyaltyTransaction.aggregate({
      where: { clientId, points: { gt: 0 } },
      _sum: { points: true },
    }),
    prisma.loyaltyTransaction.aggregate({
      where: { clientId, points: { lt: 0 } },
      _sum: { points: true },
    }),
  ]);

  return {
    balance: client.loyaltyPoints,
    totalEarned: earned._sum.points ?? 0,
    totalRedeemed: Math.abs(redeemed._sum.points ?? 0),
    recent: recent.map((t) => ({
      id: t.id,
      type: t.type as "EARNED" | "REDEEMED" | "EXPIRED" | "ADJUSTED",
      points: t.points,
      reason: t.reason,
      invoiceId: t.invoiceId,
      createdAt: t.createdAt.toISOString(),
    })),
  };
}
