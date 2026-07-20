import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    coupon: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
    },
    couponUsage: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getCouponById,
  getCouponStats,
  listCoupons,
} from "./queries";

const prismaMock = prisma as unknown as {
  coupon: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  couponUsage: {
    count: ReturnType<typeof vi.fn>;
  };
};

const sampleCoupon = {
  id: "cpn-1",
  code: "SUMMER20",
  description: { es: "Verano", en: "Summer" },
  type: "PERCENTAGE" as const,
  value: { toString: () => "20" } as unknown as { toString(): string },
  minPurchase: { toString: () => "50" } as unknown as { toString(): string },
  maxUses: 100,
  usedCount: 5,
  validFrom: new Date("2026-07-01"),
  validUntil: new Date("2026-08-31"),
  isActive: true,
  serviceIds: JSON.stringify(["svc-1", "svc-2"]),
  createdAt: new Date("2026-06-15"),
  updatedAt: new Date("2026-06-15"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listCoupons", () => {
  it("retorna lista vacía y total 0", async () => {
    prismaMock.coupon.findMany.mockResolvedValue([]);
    prismaMock.coupon.count.mockResolvedValue(0);

    const result = await listCoupons();

    expect(result).toEqual({ items: [], total: 0 });
  });

  it("mapea Decimal a number y deriva status active", async () => {
    prismaMock.coupon.findMany.mockResolvedValue([sampleCoupon]);
    prismaMock.coupon.count.mockResolvedValue(1);

    const result = await listCoupons();

    expect(result.items[0]).toMatchObject({
      id: "cpn-1",
      code: "SUMMER20",
      type: "PERCENTAGE",
      value: 20,
      minPurchase: 50,
      maxUses: 100,
      usedCount: 5,
      isActive: true,
      serviceIds: ["svc-1", "svc-2"],
      status: "active",
    });
    expect(typeof result.items[0]!.validFrom).toBe("string");
  });

  it("deriva status=expired cuando validUntil < now", async () => {
    const expired = {
      ...sampleCoupon,
      validUntil: new Date("2020-01-01"),
    };
    prismaMock.coupon.findMany.mockResolvedValue([expired]);
    prismaMock.coupon.count.mockResolvedValue(1);

    const result = await listCoupons();
    expect(result.items[0]!.status).toBe("expired");
  });

  it("deriva status=exhausted cuando usedCount >= maxUses", async () => {
    const exhausted = { ...sampleCoupon, maxUses: 5, usedCount: 5 };
    prismaMock.coupon.findMany.mockResolvedValue([exhausted]);
    prismaMock.coupon.count.mockResolvedValue(1);

    const result = await listCoupons();
    expect(result.items[0]!.status).toBe("exhausted");
  });

  it("deriva status=inactive cuando isActive=false", async () => {
    const inactive = { ...sampleCoupon, isActive: false };
    prismaMock.coupon.findMany.mockResolvedValue([inactive]);
    prismaMock.coupon.count.mockResolvedValue(1);

    const result = await listCoupons();
    expect(result.items[0]!.status).toBe("inactive");
  });

  it("normaliza search a uppercase y filtra por code", async () => {
    prismaMock.coupon.findMany.mockResolvedValue([]);
    prismaMock.coupon.count.mockResolvedValue(0);

    await listCoupons({ search: "summer" });

    expect(prismaMock.coupon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: { contains: "SUMMER", mode: "insensitive" } },
      }),
    );
  });

  it("filtra items por status en memoria (no en SQL)", async () => {
    const active = { ...sampleCoupon, id: "cpn-1" };
    const expired = { ...sampleCoupon, id: "cpn-2", validUntil: new Date("2020-01-01") };
    prismaMock.coupon.findMany.mockResolvedValue([active, expired]);
    prismaMock.coupon.count.mockResolvedValue(2);

    const result = await listCoupons({ status: "active" });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.id).toBe("cpn-1");
  });

  it("parsea serviceIds JSON y devuelve null si inválido", async () => {
    const withBadJson = { ...sampleCoupon, serviceIds: "not-json" };
    prismaMock.coupon.findMany.mockResolvedValue([withBadJson]);
    prismaMock.coupon.count.mockResolvedValue(1);

    const result = await listCoupons();
    expect(result.items[0]!.serviceIds).toBeNull();
  });

  it("parsea serviceIds null como null", async () => {
    const withoutServices = { ...sampleCoupon, serviceIds: null };
    prismaMock.coupon.findMany.mockResolvedValue([withoutServices]);
    prismaMock.coupon.count.mockResolvedValue(1);

    const result = await listCoupons();
    expect(result.items[0]!.serviceIds).toBeNull();
  });

  it("respeta paginación", async () => {
    prismaMock.coupon.findMany.mockResolvedValue([]);
    prismaMock.coupon.count.mockResolvedValue(0);

    await listCoupons({ skip: 10, take: 25 });

    expect(prismaMock.coupon.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 25 }),
    );
  });
});

describe("getCouponById", () => {
  it("retorna null si no existe", async () => {
    prismaMock.coupon.findUnique.mockResolvedValue(null);

    const result = await getCouponById("missing");
    expect(result).toBeNull();
  });

  it("mapea detail con usages", async () => {
    const withUsages = {
      ...sampleCoupon,
      usages: [
        {
          id: "u-1",
          invoiceId: "inv-1",
          amount: { toString: () => "15" } as unknown as { toString(): string },
          usedAt: new Date("2026-07-15"),
        },
      ],
    };
    prismaMock.coupon.findUnique.mockResolvedValue(withUsages);

    const result = await getCouponById("cpn-1");

    expect(result).not.toBeNull();
    expect(result!.usages).toHaveLength(1);
    expect(result!.usages[0]).toMatchObject({
      id: "u-1",
      invoiceId: "inv-1",
      amount: 15,
    });
    expect(typeof result!.usages[0]!.usedAt).toBe("string");
  });
});

describe("getCouponStats", () => {
  it("agrega counters activos, agotados y usos del mes", async () => {
    prismaMock.coupon.count
      .mockResolvedValueOnce(5) // totalActive
      .mockResolvedValueOnce(2) // totalExhausted
      .mockResolvedValueOnce(15); // monthlyUsages (después del 2do count? no, getCouponStats hace 3 calls)

    // Actually getCouponStats uses coupon.count twice and couponUsage.count once.
    // Re-armamos:
    prismaMock.coupon.count.mockReset();
    prismaMock.coupon.count.mockResolvedValueOnce(5);
    prismaMock.coupon.count.mockResolvedValueOnce(2);
    prismaMock.couponUsage.count.mockResolvedValueOnce(15);

    const result = await getCouponStats();

    expect(result).toEqual({
      totalActive: 5,
      totalExhausted: 2,
      totalUsagesThisMonth: 15,
    });
  });
});
