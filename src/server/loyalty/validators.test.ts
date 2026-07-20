import { describe, expect, it } from "vitest";

import {
  adjustPointsSchema,
  upsertLoyaltyRuleSchema,
} from "./validators";

describe("upsertLoyaltyRuleSchema", () => {
  it("acepta regla válida (id opcional)", () => {
    const result = upsertLoyaltyRuleSchema.safeParse({
      name: "Regla 2026",
      pointsPerAmount: 1,
      pointsToRedeem: 100,
      redeemValue: 10,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza pointsPerAmount <= 0", () => {
    const result = upsertLoyaltyRuleSchema.safeParse({
      name: "Regla",
      pointsPerAmount: 0,
      pointsToRedeem: 100,
      redeemValue: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza pointsToRedeem < 1", () => {
    const result = upsertLoyaltyRuleSchema.safeParse({
      name: "Regla",
      pointsPerAmount: 1,
      pointsToRedeem: 0,
      redeemValue: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza redeemValue <= 0", () => {
    const result = upsertLoyaltyRuleSchema.safeParse({
      name: "Regla",
      pointsPerAmount: 1,
      pointsToRedeem: 100,
      redeemValue: 0,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza redención máxima > $10,000", () => {
    const result = upsertLoyaltyRuleSchema.safeParse({
      name: "Regla",
      pointsPerAmount: 1,
      pointsToRedeem: 1000,
      redeemValue: 50, // 1000 * 50 = 50,000
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.error.issues.some((i) => i.path.includes("redeemValue")),
      ).toBe(true);
    }
  });

  it("acepta redención justo en el límite", () => {
    const result = upsertLoyaltyRuleSchema.safeParse({
      name: "Regla",
      pointsPerAmount: 1,
      pointsToRedeem: 1000,
      redeemValue: 10, // 1000 * 10 = 10,000 exacto
    });
    expect(result.success).toBe(true);
  });

  it("rechaza name vacío", () => {
    const result = upsertLoyaltyRuleSchema.safeParse({
      name: "",
      pointsPerAmount: 1,
      pointsToRedeem: 100,
      redeemValue: 10,
    });
    expect(result.success).toBe(false);
  });

  it("rechaza name > 80 chars", () => {
    const result = upsertLoyaltyRuleSchema.safeParse({
      name: "a".repeat(81),
      pointsPerAmount: 1,
      pointsToRedeem: 100,
      redeemValue: 10,
    });
    expect(result.success).toBe(false);
  });

  it("acepta id existente para update", () => {
    const result = upsertLoyaltyRuleSchema.safeParse({
      id: "rule-1",
      name: "Regla 2026",
      pointsPerAmount: 1,
      pointsToRedeem: 100,
      redeemValue: 10,
    });
    expect(result.success).toBe(true);
  });
});

describe("adjustPointsSchema", () => {
  const baseValid = {
    clientId: "cli-1",
    points: 50,
    reason: "Regalo de bienvenida",
  };

  it("acepta ajuste positivo (EARNED)", () => {
    const result = adjustPointsSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("ADJUSTED"); // default
    }
  });

  it("acepta ajuste negativo (REDEEMED)", () => {
    const result = adjustPointsSchema.safeParse({
      ...baseValid,
      points: -100,
      type: "REDEEMED",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza points = 0", () => {
    const result = adjustPointsSchema.safeParse({ ...baseValid, points: 0 });
    expect(result.success).toBe(false);
  });

  it("rechaza points no entero", () => {
    const result = adjustPointsSchema.safeParse({ ...baseValid, points: 1.5 });
    expect(result.success).toBe(false);
  });

  it("rechaza reason vacío", () => {
    const result = adjustPointsSchema.safeParse({ ...baseValid, reason: "" });
    expect(result.success).toBe(false);
  });

  it("rechaza reason < 3 chars", () => {
    const result = adjustPointsSchema.safeParse({ ...baseValid, reason: "ok" });
    expect(result.success).toBe(false);
  });

  it("rechaza reason > 200 chars", () => {
    const result = adjustPointsSchema.safeParse({
      ...baseValid,
      reason: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rechaza clientId vacío", () => {
    const result = adjustPointsSchema.safeParse({ ...baseValid, clientId: "" });
    expect(result.success).toBe(false);
  });

  it("acepta type explícito EARNED", () => {
    const result = adjustPointsSchema.safeParse({
      ...baseValid,
      type: "EARNED",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza type inválido", () => {
    const result = adjustPointsSchema.safeParse({
      ...baseValid,
      type: "EXPIRED",
    });
    expect(result.success).toBe(false);
  });
});
