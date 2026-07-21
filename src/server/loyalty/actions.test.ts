import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePathMock, authMock, prismaMock } = vi.hoisted(() => {
  const revalidatePathMock = vi.fn();
  const authMock = vi.fn();
  const prismaMock = {
    loyaltyRule: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    loyaltyTransaction: {
      create: vi.fn(),
    },
    client: {
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  return { revalidatePathMock, authMock, prismaMock };
});

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

vi.mock("@/server/auth", () => ({
  auth: authMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

import {
  adjustPointsAction,
  upsertLoyaltyRuleAction,
} from "./actions";

const baseRuleInput = {
  name: "Regla 2026",
  pointsPerAmount: 1,
  pointsToRedeem: 100,
  redeemValue: 10,
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "admin-1" } });
  // Por default, $transaction ejecuta el callback.
  prismaMock.$transaction.mockImplementation(
    async (cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock),
  );
});

describe("upsertLoyaltyRuleAction", () => {
  it("rechaza si no hay sesión", async () => {
    authMock.mockResolvedValue(null);

    const result = await upsertLoyaltyRuleAction(baseRuleInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autenticado");
    }
  });

  it("rechaza validations fallidas (redención > $10k)", async () => {
    const result = await upsertLoyaltyRuleAction({
      ...baseRuleInput,
      pointsToRedeem: 1000,
      redeemValue: 50,
    });

    expect(result.success).toBe(false);
  });

  it("create path: desactiva reglas existentes y crea la nueva", async () => {
    prismaMock.loyaltyRule.create.mockResolvedValue({ id: "rule-new" });

    const result = await upsertLoyaltyRuleAction(baseRuleInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe("rule-new");
    }
    expect(prismaMock.loyaltyRule.updateMany).toHaveBeenCalledWith({
      where: { isActive: true },
      data: { isActive: false },
    });
    expect(prismaMock.loyaltyRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Regla 2026",
          pointsPerAmount: 1,
          pointsToRedeem: 100,
          redeemValue: 10,
          isActive: true,
        }),
      }),
    );
  });

  it("update path: desactiva existentes y actualiza la regla", async () => {
    prismaMock.loyaltyRule.update.mockResolvedValue({ id: "rule-1" });

    const result = await upsertLoyaltyRuleAction({
      ...baseRuleInput,
      id: "rule-1",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.loyaltyRule.updateMany).toHaveBeenCalled();
    expect(prismaMock.loyaltyRule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "rule-1" },
        data: expect.objectContaining({ isActive: true }),
      }),
    );
    expect(prismaMock.loyaltyRule.create).not.toHaveBeenCalled();
  });

  it("revalida /admin/loyalty y /admin/clients", async () => {
    prismaMock.loyaltyRule.create.mockResolvedValue({ id: "rule-1" });

    await upsertLoyaltyRuleAction(baseRuleInput);

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/loyalty",
      "page",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/clients",
      "page",
    );
  });

  it("rollback si la DB falla", async () => {
    prismaMock.$transaction.mockRejectedValue(new Error("DB dead"));
    prismaMock.loyaltyRule.create.mockRejectedValue(new Error("DB dead"));

    const result = await upsertLoyaltyRuleAction(baseRuleInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("DB dead");
    }
  });
});

describe("adjustPointsAction", () => {
  it("rechaza si no hay sesión", async () => {
    authMock.mockResolvedValue(null);

    const result = await adjustPointsAction({
      clientId: "cli-1",
      points: 50,
      reason: "Regalo",
    });

    expect(result.success).toBe(false);
  });

  it("rechaza validations fallidas (points = 0)", async () => {
    const result = await adjustPointsAction({
      clientId: "cli-1",
      points: 0,
      reason: "Regalo",
    });

    expect(result.success).toBe(false);
  });

  it("ajuste positivo crea EARNED e incrementa loyaltyPoints", async () => {
    prismaMock.loyaltyTransaction.create.mockResolvedValue({});
    prismaMock.client.update.mockResolvedValue({});

    const result = await adjustPointsAction({
      clientId: "cli-1",
      points: 50,
      reason: "Regalo de bienvenida",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clientId: "cli-1",
        type: "EARNED",
        points: 50,
        reason: "Regalo de bienvenida",
      }),
    });
    expect(prismaMock.client.update).toHaveBeenCalledWith({
      where: { id: "cli-1" },
      data: { loyaltyPoints: { increment: 50 } },
    });
  });

  it("ajuste negativo crea REDEEMED y decrementa", async () => {
    prismaMock.loyaltyTransaction.create.mockResolvedValue({});
    prismaMock.client.update.mockResolvedValue({});

    const result = await adjustPointsAction({
      clientId: "cli-1",
      points: -30,
      reason: "Redención",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "REDEEMED", points: -30 }),
    });
    expect(prismaMock.client.update).toHaveBeenCalledWith({
      where: { id: "cli-1" },
      data: { loyaltyPoints: { increment: -30 } },
    });
  });

  it("respeta type explícito (EARNED con puntos negativos)", async () => {
    prismaMock.loyaltyTransaction.create.mockResolvedValue({});
    prismaMock.client.update.mockResolvedValue({});

    await adjustPointsAction({
      clientId: "cli-1",
      points: -10,
      type: "EARNED",
      reason: "Corrección",
    });

    expect(prismaMock.loyaltyTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: "EARNED" }),
    });
  });

  it("usa prisma.$transaction para atomicidad", async () => {
    prismaMock.loyaltyTransaction.create.mockResolvedValue({});
    prismaMock.client.update.mockResolvedValue({});

    await adjustPointsAction({
      clientId: "cli-1",
      points: 25,
      reason: "test",
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("revalida el detalle del cliente y /admin/loyalty", async () => {
    prismaMock.loyaltyTransaction.create.mockResolvedValue({});
    prismaMock.client.update.mockResolvedValue({});

    await adjustPointsAction({
      clientId: "cli-1",
      points: 10,
      reason: "test",
    });

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/clients/cli-1",
      "page",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/loyalty",
      "page",
    );
  });
});
