import { describe, expect, it } from "vitest";

import {
  couponFilterSchema,
  createCouponSchema,
  updateCouponSchema,
} from "./validators";

const baseValid = {
  code: "summer20",
  description: { es: "Promo verano", en: "Summer sale" },
  type: "PERCENTAGE" as const,
  value: 20,
  minPurchase: null,
  maxUses: 100,
  validFrom: new Date("2026-07-01T00:00:00Z"),
  validUntil: new Date("2026-08-31T23:59:59Z"),
  isActive: true,
  serviceIds: null,
};

describe("createCouponSchema", () => {
  it("acepta un cupón PERCENTAGE válido", () => {
    const result = createCouponSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it("acepta un cupón FIXED válido", () => {
    const result = createCouponSchema.safeParse({
      ...baseValid,
      code: "fixed5",
      type: "FIXED",
      value: 5,
      minPurchase: 50,
      maxUses: null,
    });
    expect(result.success).toBe(true);
  });

  it("normaliza el code a uppercase", () => {
    const result = createCouponSchema.safeParse({ ...baseValid, code: "  summer20  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.code).toBe("SUMMER20");
    }
  });

  it("rechaza code con caracteres no permitidos", () => {
    const result = createCouponSchema.safeParse({ ...baseValid, code: "summer 20!" });
    expect(result.success).toBe(false);
  });

  it("rechaza code demasiado corto", () => {
    const result = createCouponSchema.safeParse({ ...baseValid, code: "AB" });
    expect(result.success).toBe(false);
  });

  it("rechaza code demasiado largo", () => {
    const result = createCouponSchema.safeParse({ ...baseValid, code: "A".repeat(33) });
    expect(result.success).toBe(false);
  });

  it("rechaza PERCENTAGE > 100", () => {
    const result = createCouponSchema.safeParse({ ...baseValid, value: 150 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("value"))).toBe(true);
    }
  });

  it("permite FIXED > 100 (no es porcentaje)", () => {
    const result = createCouponSchema.safeParse({
      ...baseValid,
      type: "FIXED",
      value: 500,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza value <= 0", () => {
    const result = createCouponSchema.safeParse({ ...baseValid, value: 0 });
    expect(result.success).toBe(false);
  });

  it("rechaza value negativo", () => {
    const result = createCouponSchema.safeParse({ ...baseValid, value: -10 });
    expect(result.success).toBe(false);
  });

  it("rechaza validUntil <= validFrom", () => {
    const result = createCouponSchema.safeParse({
      ...baseValid,
      validFrom: new Date("2026-07-01"),
      validUntil: new Date("2026-07-01"),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("validUntil")),
      ).toBe(true);
    }
  });

  it("rechaza minPurchase negativo", () => {
    const result = createCouponSchema.safeParse({ ...baseValid, minPurchase: -5 });
    expect(result.success).toBe(false);
  });

  it("rechaza maxUses < 1", () => {
    const result = createCouponSchema.safeParse({ ...baseValid, maxUses: 0 });
    expect(result.success).toBe(false);
  });

  it("rechaza maxUses no entero", () => {
    const result = createCouponSchema.safeParse({ ...baseValid, maxUses: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rechaza descripción vacía en español", () => {
    const result = createCouponSchema.safeParse({
      ...baseValid,
      description: { es: "", en: "Sale" },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza descripción vacía en inglés", () => {
    const result = createCouponSchema.safeParse({
      ...baseValid,
      description: { es: "Promo", en: "" },
    });
    expect(result.success).toBe(false);
  });

  it("acepta serviceIds como array de strings", () => {
    const result = createCouponSchema.safeParse({
      ...baseValid,
      serviceIds: ["svc-1", "svc-2"],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza serviceIds con string vacío", () => {
    const result = createCouponSchema.safeParse({
      ...baseValid,
      serviceIds: ["", "svc-2"],
    });
    expect(result.success).toBe(false);
  });

  it("acepta fechas como string ISO (coerce)", () => {
    const result = createCouponSchema.safeParse({
      ...baseValid,
      validFrom: "2026-07-01" as unknown as Date,
      validUntil: "2026-08-31" as unknown as Date,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza fechas inválidas", () => {
    const result = createCouponSchema.safeParse({
      ...baseValid,
      validFrom: "not-a-date" as unknown as Date,
    });
    expect(result.success).toBe(false);
  });
});

describe("updateCouponSchema", () => {
  it("requiere id", () => {
    const result = updateCouponSchema.safeParse({ value: 30 });
    expect(result.success).toBe(false);
  });

  it("acepta update con solo id", () => {
    const result = updateCouponSchema.safeParse({ id: "cpn-1" });
    expect(result.success).toBe(true);
  });

  it("valida validUntil > validFrom si ambos se actualizan", () => {
    const result = updateCouponSchema.safeParse({
      id: "cpn-1",
      validFrom: new Date("2026-07-01"),
      validUntil: new Date("2026-06-30"),
    });
    expect(result.success).toBe(false);
  });

  it("permite validUntil sin validFrom (no compara)", () => {
    const result = updateCouponSchema.safeParse({
      id: "cpn-1",
      validUntil: new Date("2026-08-31"),
    });
    expect(result.success).toBe(true);
  });

  it("rechaza value <= 0", () => {
    const result = updateCouponSchema.safeParse({ id: "cpn-1", value: -1 });
    expect(result.success).toBe(false);
  });
});

describe("couponFilterSchema", () => {
  it("aplica defaults", () => {
    const result = couponFilterSchema.parse({});
    expect(result.status).toBe("all");
    expect(result.skip).toBe(0);
    expect(result.take).toBe(50);
  });

  it("acepta search como string", () => {
    const result = couponFilterSchema.parse({ search: "summer" });
    expect(result.search).toBe("summer");
  });

  it("rechaza take > 100", () => {
    const result = couponFilterSchema.safeParse({ take: 200 });
    expect(result.success).toBe(false);
  });

  it("acepta status personalizados", () => {
    const result = couponFilterSchema.parse({ status: "expired" });
    expect(result.status).toBe("expired");
  });

  it("rechaza status inválido", () => {
    const result = couponFilterSchema.safeParse({ status: "deleted" });
    expect(result.success).toBe(false);
  });
});
