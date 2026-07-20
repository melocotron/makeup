import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePathMock, authMock, prismaMock, transactionMock } = vi.hoisted(
  () => {
    const revalidatePathMock = vi.fn();
    const authMock = vi.fn();
    const transactionMock = vi.fn();
    const prismaMock = {
      coupon: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: transactionMock,
    };
    return { revalidatePathMock, authMock, prismaMock, transactionMock };
  },
);

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
  createCouponAction,
  deactivateCouponAction,
  deleteCouponAction,
  updateCouponAction,
} from "./actions";

const baseInput = {
  code: "SUMMER20",
  description: { es: "Verano", en: "Summer" },
  type: "PERCENTAGE" as const,
  value: 20,
  minPurchase: null,
  maxUses: 100,
  validFrom: new Date("2026-07-01"),
  validUntil: new Date("2026-08-31"),
  isActive: true,
  serviceIds: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "admin-1" } });
});

describe("createCouponAction", () => {
  it("rechaza si no hay sesión", async () => {
    authMock.mockResolvedValue(null);

    const result = await createCouponAction(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autenticado");
    }
    expect(prismaMock.coupon.create).not.toHaveBeenCalled();
  });

  it("rechaza si el code ya existe", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue({ id: "cpn-existing" });

    const result = await createCouponAction(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("SUMMER20");
    }
    expect(prismaMock.coupon.create).not.toHaveBeenCalled();
  });

  it("rechaza validations fallidas", async () => {
    const result = await createCouponAction({
      ...baseInput,
      value: 150, // > 100 para PERCENTAGE
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("value");
    }
    expect(prismaMock.coupon.create).not.toHaveBeenCalled();
  });

  it("crea cupón y reválida la página admin", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(null);
    prismaMock.coupon.create.mockResolvedValue({ id: "cpn-new" });

    const result = await createCouponAction(baseInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.id).toBe("cpn-new");
    }
    expect(prismaMock.coupon.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: "SUMMER20",
          type: "PERCENTAGE",
          value: 20,
          serviceIds: null,
        }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/promotions",
      "page",
    );
  });

  it("serializa serviceIds como JSON string", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(null);
    prismaMock.coupon.create.mockResolvedValue({ id: "cpn-new" });

    await createCouponAction({
      ...baseInput,
      serviceIds: ["svc-1", "svc-2"],
    });

    expect(prismaMock.coupon.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          serviceIds: JSON.stringify(["svc-1", "svc-2"]),
        }),
      }),
    );
  });

  it("convierte serviceIds vacío a null", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(null);
    prismaMock.coupon.create.mockResolvedValue({ id: "cpn-new" });

    await createCouponAction({
      ...baseInput,
      serviceIds: [],
    });

    expect(prismaMock.coupon.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ serviceIds: null }),
      }),
    );
  });

  it("retorna error si la DB falla", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(null);
    prismaMock.coupon.create.mockRejectedValue(new Error("DB down"));

    const result = await createCouponAction(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("DB down");
    }
  });
});

describe("updateCouponAction", () => {
  it("rechaza validations fallidas", async () => {
    const result = await updateCouponAction({
      id: "cpn-1",
      value: -10,
    });

    expect(result.success).toBe(false);
  });

  it("rechaza si no hay sesión", async () => {
    authMock.mockResolvedValue(null);

    const result = await updateCouponAction({ id: "cpn-1", value: 30 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autenticado");
    }
  });

  it("rechaza si no hay campos para actualizar", async () => {
    const result = await updateCouponAction({ id: "cpn-1" });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("Nada que actualizar");
    }
    expect(prismaMock.coupon.update).not.toHaveBeenCalled();
  });

  it("actualiza solo los campos provistos", async () => {
    prismaMock.coupon.update.mockResolvedValue({});

    const result = await updateCouponAction({
      id: "cpn-1",
      isActive: false,
    });

    expect(result.success).toBe(true);
    expect(prismaMock.coupon.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cpn-1" },
        data: { isActive: false },
      }),
    );
  });

  it("revalida ambas páginas (lista + detalle)", async () => {
    prismaMock.coupon.update.mockResolvedValue({});

    await updateCouponAction({ id: "cpn-1", value: 30 });

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/promotions",
      "page",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/promotions/cpn-1",
      "page",
    );
  });
});

describe("deactivateCouponAction", () => {
  it("rechaza si no hay sesión", async () => {
    authMock.mockResolvedValue(null);

    const result = await deactivateCouponAction("cpn-1");

    expect(result.success).toBe(false);
  });

  it("marca isActive=false y revalida", async () => {
    prismaMock.coupon.update.mockResolvedValue({});

    const result = await deactivateCouponAction("cpn-1");

    expect(result.success).toBe(true);
    expect(prismaMock.coupon.update).toHaveBeenCalledWith({
      where: { id: "cpn-1" },
      data: { isActive: false },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/promotions/cpn-1",
      "page",
    );
  });
});

describe("deleteCouponAction", () => {
  it("rechaza si el cupón no existe", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(null);

    const result = await deleteCouponAction("cpn-missing");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Cupón no encontrado");
    }
  });

  it("rechaza si el cupón tiene usos", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue({
      usedCount: 5,
      code: "SUMMER20",
    });

    const result = await deleteCouponAction("cpn-1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("5 vez/veces");
    }
    expect(prismaMock.coupon.delete).not.toHaveBeenCalled();
  });

  it("elimina cupón sin usos y revalida", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue({ usedCount: 0, code: "FRESH" });
    prismaMock.coupon.delete.mockResolvedValue({});

    const result = await deleteCouponAction("cpn-1");

    expect(result.success).toBe(true);
    expect(prismaMock.coupon.delete).toHaveBeenCalledWith({ where: { id: "cpn-1" } });
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/promotions",
      "page",
    );
  });
});
