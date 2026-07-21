import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    loyaltyRule: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    loyaltyTransaction: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    client: {
      findUnique: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getActiveLoyaltyRule,
  getClientLoyalty,
  listLoyaltyRules,
} from "./queries";

const prismaMock = prisma as unknown as {
  loyaltyRule: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  loyaltyTransaction: {
    findMany: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
  client: {
    findUnique: ReturnType<typeof vi.fn>;
  };
};

const sampleRule = {
  id: "rule-1",
  name: "Regla 2026",
  pointsPerAmount: { toString: () => "1" } as unknown as { toString(): string },
  pointsToRedeem: 100,
  redeemValue: { toString: () => "10" } as unknown as { toString(): string },
  isActive: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-15"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getActiveLoyaltyRule", () => {
  it("retorna null si no hay regla activa", async () => {
    prismaMock.loyaltyRule.findFirst.mockResolvedValue(null);

    const result = await getActiveLoyaltyRule();
    expect(result).toBeNull();
  });

  it("mapea Decimal a number", async () => {
    prismaMock.loyaltyRule.findFirst.mockResolvedValue(sampleRule);

    const result = await getActiveLoyaltyRule();

    expect(result).toEqual({
      id: "rule-1",
      name: "Regla 2026",
      pointsPerAmount: 1,
      pointsToRedeem: 100,
      redeemValue: 10,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-15T00:00:00.000Z",
    });
  });

  it("filtra por isActive=true y ordena por updatedAt desc", async () => {
    prismaMock.loyaltyRule.findFirst.mockResolvedValue(sampleRule);

    await getActiveLoyaltyRule();

    expect(prismaMock.loyaltyRule.findFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });
  });
});

describe("listLoyaltyRules", () => {
  it("incluye inactivas por default", async () => {
    prismaMock.loyaltyRule.findMany.mockResolvedValue([sampleRule]);

    const result = await listLoyaltyRules();

    expect(result.items).toHaveLength(1);
    expect(prismaMock.loyaltyRule.findMany).toHaveBeenCalledWith({
      where: {},
      orderBy: { updatedAt: "desc" },
    });
  });

  it("excluye inactivas cuando includeInactive=false", async () => {
    prismaMock.loyaltyRule.findMany.mockResolvedValue([sampleRule]);

    await listLoyaltyRules({ includeInactive: false });

    expect(prismaMock.loyaltyRule.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" },
    });
  });
});

describe("getClientLoyalty", () => {
  it("retorna balance 0 si el cliente no existe", async () => {
    prismaMock.client.findUnique.mockResolvedValue(null);

    const result = await getClientLoyalty("missing");

    expect(result).toEqual({
      balance: 0,
      totalEarned: 0,
      totalRedeemed: 0,
      recent: [],
    });
  });

  it("calcula balance desde client y totales desde transacciones", async () => {
    prismaMock.client.findUnique.mockResolvedValue({ loyaltyPoints: 250 });
    prismaMock.loyaltyTransaction.findMany.mockResolvedValue([]);
    prismaMock.loyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: 400 } })
      .mockResolvedValueOnce({ _sum: { points: -150 } });

    const result = await getClientLoyalty("cli-1");

    expect(result.balance).toBe(250);
    expect(result.totalEarned).toBe(400);
    expect(result.totalRedeemed).toBe(150); // abs del negativo
  });

  it("mapea transacciones recientes a ISO strings", async () => {
    prismaMock.client.findUnique.mockResolvedValue({ loyaltyPoints: 100 });
    prismaMock.loyaltyTransaction.findMany.mockResolvedValue([
      {
        id: "tx-1",
        type: "EARNED",
        points: 50,
        reason: "Cita completada",
        invoiceId: "inv-1",
        createdAt: new Date("2026-07-15"),
      },
      {
        id: "tx-2",
        type: "REDEEMED",
        points: -30,
        reason: "Redención",
        invoiceId: null,
        createdAt: new Date("2026-08-01"),
      },
    ]);
    prismaMock.loyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: 50 } })
      .mockResolvedValueOnce({ _sum: { points: -30 } });

    const result = await getClientLoyalty("cli-1");

    expect(result.recent).toHaveLength(2);
    expect(result.recent[0]!).toMatchObject({
      id: "tx-1",
      type: "EARNED",
      points: 50,
      reason: "Cita completada",
      invoiceId: "inv-1",
    });
    expect(typeof result.recent[0]!.createdAt).toBe("string");
    expect(result.recent[1]!.points).toBe(-30);
  });

  it("usa limit por default de 20", async () => {
    prismaMock.client.findUnique.mockResolvedValue({ loyaltyPoints: 0 });
    prismaMock.loyaltyTransaction.findMany.mockResolvedValue([]);
    prismaMock.loyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: null } })
      .mockResolvedValueOnce({ _sum: { points: null } });

    await getClientLoyalty("cli-1");

    expect(prismaMock.loyaltyTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });

  it("acepta limit custom", async () => {
    prismaMock.client.findUnique.mockResolvedValue({ loyaltyPoints: 0 });
    prismaMock.loyaltyTransaction.findMany.mockResolvedValue([]);
    prismaMock.loyaltyTransaction.aggregate
      .mockResolvedValueOnce({ _sum: { points: null } })
      .mockResolvedValueOnce({ _sum: { points: null } });

    await getClientLoyalty("cli-1", 50);

    expect(prismaMock.loyaltyTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    );
  });
});
