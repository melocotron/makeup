import { describe, expect, it } from "vitest";

import {
  appointmentsFilterSchema,
  couponRedemptionsFilterSchema,
  exportQuerySchema,
  invoicesFilterSchema,
  reportFiltersSchema,
  resolveDateRange,
  topClientsFilterSchema,
} from "./validators";

// ============================================================================
// reportFiltersSchema
// ============================================================================

describe("reportFiltersSchema", () => {
  it("acepta filtros vacíos (default preset=last30)", () => {
    const result = reportFiltersSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preset).toBe("last30");
    }
  });

  it("acepta todos los presets que no requieren fechas explícitas", () => {
    for (const preset of [
      "today",
      "last7",
      "last30",
      "last90",
      "ytd",
    ] as const) {
      const result = reportFiltersSchema.safeParse({ preset });
      expect(result.success, `preset ${preset}`).toBe(true);
    }
  });

  it("rechaza un preset inválido", () => {
    const result = reportFiltersSchema.safeParse({ preset: "yesterday" });
    expect(result.success).toBe(false);
  });

  it("rechaza una fecha en formato incorrecto", () => {
    const result = reportFiltersSchema.safeParse({ from: "01-01-2026" });
    expect(result.success).toBe(false);
  });

  it("rechaza from > to", () => {
    const result = reportFiltersSchema.safeParse({
      preset: "custom",
      from: "2026-06-15",
      to: "2026-06-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("inicio"))).toBe(true);
    }
  });

  it("rechaza un rango mayor a 2 años", () => {
    const result = reportFiltersSchema.safeParse({
      preset: "custom",
      from: "2020-01-01",
      to: "2026-01-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages.some((m) => m.includes("2 años"))).toBe(true);
    }
  });

  it("exige from y to cuando preset=custom", () => {
    const result1 = reportFiltersSchema.safeParse({ preset: "custom" });
    expect(result1.success).toBe(false);

    const result2 = reportFiltersSchema.safeParse({
      preset: "custom",
      from: "2026-01-01",
    });
    expect(result2.success).toBe(false);

    const result3 = reportFiltersSchema.safeParse({
      preset: "custom",
      to: "2026-01-01",
    });
    expect(result3.success).toBe(false);
  });

  it("acepta preset=custom con from y to válidos", () => {
    const result = reportFiltersSchema.safeParse({
      preset: "custom",
      from: "2026-01-01",
      to: "2026-01-31",
      groupBy: "day",
    });
    expect(result.success).toBe(true);
  });

  it("acepta groupBy explícito", () => {
    const result = reportFiltersSchema.safeParse({
      preset: "last30",
      groupBy: "week",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.groupBy).toBe("week");
    }
  });
});

// ============================================================================
// Schemas derivados
// ============================================================================

describe("topClientsFilterSchema", () => {
  it("extiende reportFiltersSchema con sortBy y paginación", () => {
    const result = topClientsFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBe("revenue");
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
    }
  });

  it("rechaza un sortBy inválido", () => {
    const result = topClientsFilterSchema.safeParse({ sortBy: "invalid" });
    expect(result.success).toBe(false);
  });

  it("rechaza pageSize > 100", () => {
    const result = topClientsFilterSchema.safeParse({ pageSize: 200 });
    expect(result.success).toBe(false);
  });

  it("coerce strings a números en page y pageSize", () => {
    const result = topClientsFilterSchema.safeParse({
      page: "3",
      pageSize: "50",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(50);
    }
  });
});

describe("appointmentsFilterSchema", () => {
  it("acepta status válidos", () => {
    for (const status of [
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ] as const) {
      const result = appointmentsFilterSchema.safeParse({ status });
      expect(result.success, `status ${status}`).toBe(true);
    }
  });

  it("rechaza status inválido", () => {
    const result = appointmentsFilterSchema.safeParse({ status: "DONE" });
    expect(result.success).toBe(false);
  });

  it("status es opcional", () => {
    const result = appointmentsFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

describe("invoicesFilterSchema", () => {
  it("acepta status PAID, PENDING, CANCELLED", () => {
    for (const status of ["PAID", "PENDING", "CANCELLED"] as const) {
      const result = invoicesFilterSchema.safeParse({ status });
      expect(result.success, `status ${status}`).toBe(true);
    }
  });

  it("rechaza un status de Appointment (NO_SHOW)", () => {
    const result = invoicesFilterSchema.safeParse({ status: "NO_SHOW" });
    expect(result.success).toBe(false);
  });
});

describe("couponRedemptionsFilterSchema", () => {
  it("extiende con sortBy propio", () => {
    const result = couponRedemptionsFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sortBy).toBe("amount");
    }
  });
});

// ============================================================================
// exportQuerySchema
// ============================================================================

describe("exportQuerySchema", () => {
  it("acepta format csv y pdf", () => {
    expect(exportQuerySchema.safeParse({ format: "csv" }).success).toBe(true);
    expect(exportQuerySchema.safeParse({ format: "pdf" }).success).toBe(true);
  });

  it("format es opcional", () => {
    const result = exportQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rechaza format inválido", () => {
    const result = exportQuerySchema.safeParse({ format: "xlsx" });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// resolveDateRange
// ============================================================================

describe("resolveDateRange", () => {
  const fixedNow = new Date("2026-07-15T12:00:00Z");

  it("preset=today → from=inicio de hoy, to=fin de hoy (UTC)", () => {
    const result = resolveDateRange(
      { preset: "today" } as Parameters<typeof resolveDateRange>[0],
      fixedNow,
    );
    expect(result.from.toISOString()).toBe("2026-07-15T00:00:00.000Z");
    expect(result.to.toISOString()).toBe("2026-07-15T23:59:59.999Z");
  });

  it("preset=last7 → cubre 7 días incluido hoy", () => {
    const result = resolveDateRange(
      { preset: "last7" } as Parameters<typeof resolveDateRange>[0],
      fixedNow,
    );
    expect(result.from.toISOString()).toBe("2026-07-09T00:00:00.000Z");
    expect(result.to.toISOString()).toBe("2026-07-15T23:59:59.999Z");
  });

  it("preset=last30 → cubre 30 días incluido hoy", () => {
    const result = resolveDateRange(
      { preset: "last30" } as Parameters<typeof resolveDateRange>[0],
      fixedNow,
    );
    // Comparamos fechas exactas en UTC; el resolver usa setUTCDate
    // que sí respeta el calendario independientemente de DST local.
    expect(result.from.toISOString()).toBe("2026-06-16T00:00:00.000Z");
    expect(result.to.toISOString()).toBe("2026-07-15T23:59:59.999Z");
  });

  it("preset=last90 → cubre 90 días incluido hoy", () => {
    const result = resolveDateRange(
      { preset: "last90" } as Parameters<typeof resolveDateRange>[0],
      fixedNow,
    );
    expect(result.from.toISOString()).toBe("2026-04-17T00:00:00.000Z");
    expect(result.to.toISOString()).toBe("2026-07-15T23:59:59.999Z");
  });

  it("preset=ytd → desde 1 de enero del año en curso", () => {
    const result = resolveDateRange(
      { preset: "ytd" } as Parameters<typeof resolveDateRange>[0],
      fixedNow,
    );
    expect(result.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("preset=custom usa from y to provistos", () => {
    const result = resolveDateRange(
      {
        preset: "custom",
        from: "2026-03-01",
        to: "2026-03-31",
      },
      fixedNow,
    );
    expect(result.from.toISOString()).toBe("2026-03-01T00:00:00.000Z");
    expect(result.to.toISOString()).toBe("2026-03-31T23:59:59.999Z");
  });

  it("preset=custom sin from o to lanza error (defensa en profundidad)", () => {
    expect(() =>
      resolveDateRange(
        { preset: "custom" } as Parameters<typeof resolveDateRange>[0],
        fixedNow,
      ),
    ).toThrow();
  });

  describe("heurística de groupBy", () => {
    it("≤ 60 días → day", () => {
      const result = resolveDateRange(
        { preset: "last30" } as Parameters<typeof resolveDateRange>[0],
        fixedNow,
      );
      expect(result.groupBy).toBe("day");
    });

    it("61-180 días → week", () => {
      const result = resolveDateRange(
        { preset: "last90" } as Parameters<typeof resolveDateRange>[0],
        fixedNow,
      );
      expect(result.groupBy).toBe("week");
    });

    it("> 180 días → month", () => {
      const result = resolveDateRange(
        { preset: "ytd" } as Parameters<typeof resolveDateRange>[0],
        fixedNow,
      );
      expect(result.groupBy).toBe("month");
    });

    it("groupBy explícito tiene prioridad sobre la heurística", () => {
      const result = resolveDateRange(
        {
          preset: "last30",
          groupBy: "month",
        } as Parameters<typeof resolveDateRange>[0],
        fixedNow,
      );
      expect(result.groupBy).toBe("month");
    });
  });
});
