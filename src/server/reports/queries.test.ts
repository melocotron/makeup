import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      aggregate: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    appointment: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    client: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    loyaltyTransaction: {
      findMany: vi.fn(),
    },
    invoiceItem: {
      findMany: vi.fn(),
    },
    couponUsage: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

import {
  getAppointmentsSummary,
  getCouponRedemptions,
  getCustomersSummary,
  getDailyRevenueSeries,
  getLoyaltySummary,
  getRecentAppointments,
  getRecentInvoices,
  getRevenueSummary,
  getTopClients,
  getTopServices,
} from "./queries";

const prismaMock = prisma as unknown as {
  invoice: {
    aggregate: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  appointment: {
    groupBy: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  client: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  loyaltyTransaction: { findMany: ReturnType<typeof vi.fn> };
  invoiceItem: { findMany: ReturnType<typeof vi.fn> };
  couponUsage: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

const RANGE = {
  from: new Date("2026-07-01T00:00:00Z"),
  to: new Date("2026-07-31T23:59:59.999Z"),
  groupBy: "day" as const,
  preset: "last30" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// getRevenueSummary
// ============================================================================

describe("getRevenueSummary", () => {
  it("devuelve 0s cuando no hay facturas", async () => {
    prismaMock.invoice.aggregate.mockResolvedValue({
      _sum: { total: null, discountAmount: null, loyaltyDiscount: null },
    });
    prismaMock.invoice.count.mockResolvedValue(0);

    const result = await getRevenueSummary(RANGE);

    expect(result).toEqual({
      totalRevenue: 0,
      couponDiscount: 0,
      loyaltyDiscount: 0,
      netRevenue: 0,
      invoiceCount: 0,
      averageTicket: 0,
    });
  });

  it("suma totales y descuentos en número", async () => {
    // Prisma devuelve Decimal como objeto con toNumber() o como string.
    prismaMock.invoice.aggregate.mockResolvedValue({
      _sum: {
        total: { toNumber: () => 1234.5 },
        discountAmount: { toNumber: () => 50 },
        loyaltyDiscount: { toNumber: () => 25 },
      },
    });
    prismaMock.invoice.count.mockResolvedValue(10);

    const result = await getRevenueSummary(RANGE);

    expect(result.totalRevenue).toBeCloseTo(1234.5);
    expect(result.couponDiscount).toBe(50);
    expect(result.loyaltyDiscount).toBe(25);
    expect(result.invoiceCount).toBe(10);
    expect(result.averageTicket).toBeCloseTo(123.45);
  });

  it("acepta _sum como string (fallback de decimalToNumber)", async () => {
    prismaMock.invoice.aggregate.mockResolvedValue({
      _sum: {
        total: "500",
        discountAmount: "20",
        loyaltyDiscount: "10",
      },
    });
    prismaMock.invoice.count.mockResolvedValue(2);

    const result = await getRevenueSummary(RANGE);

    expect(result.totalRevenue).toBe(500);
    expect(result.couponDiscount).toBe(20);
    expect(result.loyaltyDiscount).toBe(10);
    expect(result.averageTicket).toBe(250);
  });

  it("filtra por status=PAID y paidAt en el rango", async () => {
    prismaMock.invoice.aggregate.mockResolvedValue({ _sum: {} });
    prismaMock.invoice.count.mockResolvedValue(0);

    await getRevenueSummary(RANGE);

    expect(prismaMock.invoice.aggregate).toHaveBeenCalledWith({
      where: {
        status: "PAID",
        paidAt: { gte: RANGE.from, lte: RANGE.to },
      },
      _sum: { total: true, discountAmount: true, loyaltyDiscount: true },
    });
  });
});

// ============================================================================
// getAppointmentsSummary
// ============================================================================

describe("getAppointmentsSummary", () => {
  it("agrupa por status y calcula tasas", async () => {
    prismaMock.appointment.groupBy.mockResolvedValue([
      { status: "PENDING", _count: { _all: 2 } },
      { status: "CONFIRMED", _count: { _all: 3 } },
      { status: "COMPLETED", _count: { _all: 10 } },
      { status: "CANCELLED", _count: { _all: 1 } },
      { status: "NO_SHOW", _count: { _all: 1 } },
    ]);

    const result = await getAppointmentsSummary(RANGE);

    expect(result.total).toBe(17);
    expect(result.completed).toBe(10);
    expect(result.cancelled).toBe(1);
    expect(result.noShow).toBe(1);
    expect(result.completionRate).toBeCloseTo(10 / 17);
    expect(result.cancellationRate).toBeCloseTo(1 / 17);
    expect(result.noShowRate).toBeCloseTo(1 / 17);
  });

  it("devuelve 0s cuando no hay citas", async () => {
    prismaMock.appointment.groupBy.mockResolvedValue([]);

    const result = await getAppointmentsSummary(RANGE);

    expect(result.total).toBe(0);
    expect(result.completionRate).toBe(0);
    expect(result.cancellationRate).toBe(0);
    expect(result.noShowRate).toBe(0);
  });

  it("maneja status faltantes como 0", async () => {
    prismaMock.appointment.groupBy.mockResolvedValue([
      { status: "COMPLETED", _count: { _all: 5 } },
    ]);

    const result = await getAppointmentsSummary(RANGE);

    expect(result.total).toBe(5);
    expect(result.completed).toBe(5);
    expect(result.cancelled).toBe(0);
    expect(result.noShow).toBe(0);
  });
});

// ============================================================================
// getCustomersSummary
// ============================================================================

describe("getCustomersSummary", () => {
  it("cuenta clientes nuevos y agrupa por clientId para recurrentes", async () => {
    prismaMock.client.count.mockResolvedValue(8);
    prismaMock.appointment.groupBy.mockResolvedValue([
      { clientId: "c1", _count: { _all: 1 } },
      { clientId: "c2", _count: { _all: 3 } },
      { clientId: "c3", _count: { _all: 2 } },
      { clientId: "c4", _count: { _all: 1 } },
    ]);

    const result = await getCustomersSummary(RANGE);

    expect(result.newCustomers).toBe(8);
    expect(result.totalActive).toBe(4);
    expect(result.returningCustomers).toBe(2); // c2 y c3 con >=2
  });

  it("devuelve 0s sin datos", async () => {
    prismaMock.client.count.mockResolvedValue(0);
    prismaMock.appointment.groupBy.mockResolvedValue([]);

    const result = await getCustomersSummary(RANGE);

    expect(result).toEqual({
      newCustomers: 0,
      returningCustomers: 0,
      totalActive: 0,
    });
  });
});

// ============================================================================
// getLoyaltySummary
// ============================================================================

describe("getLoyaltySummary", () => {
  it("suma puntos ganados y canjeados por separado", async () => {
    prismaMock.loyaltyTransaction.findMany.mockResolvedValue([
      { type: "EARNED", points: 100 },
      { type: "EARNED", points: 50 },
      { type: "REDEEMED", points: -30 },
      { type: "REDEEMED", points: -20 },
      { type: "ADJUSTED", points: 5 }, // ignorado
    ]);
    prismaMock.invoice.aggregate.mockResolvedValue({
      _sum: { loyaltyDiscount: { toNumber: () => 50 } },
    });

    const result = await getLoyaltySummary(RANGE);

    expect(result.pointsEarned).toBe(150);
    expect(result.pointsRedeemed).toBe(50); // valor absoluto
    expect(result.redemptionCount).toBe(2);
    expect(result.redemptionValue).toBe(50);
  });

  it("ignora tipos distintos de EARNED/REDEEMED", async () => {
    prismaMock.loyaltyTransaction.findMany.mockResolvedValue([
      { type: "EXPIRED", points: -10 },
      { type: "ADJUSTED", points: 5 },
    ]);
    prismaMock.invoice.aggregate.mockResolvedValue({ _sum: {} });

    const result = await getLoyaltySummary(RANGE);

    expect(result.pointsEarned).toBe(0);
    expect(result.pointsRedeemed).toBe(0);
    expect(result.redemptionCount).toBe(0);
  });
});

// ============================================================================
// getDailyRevenueSeries
// ============================================================================

describe("getDailyRevenueSeries", () => {
  it("rellena los días sin facturas con 0", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([
      {
        paidAt: new Date("2026-07-02T10:00:00Z"),
        total: { toNumber: () => 100 },
      },
      {
        paidAt: new Date("2026-07-02T15:00:00Z"),
        total: { toNumber: () => 50 },
      },
      {
        paidAt: new Date("2026-07-10T10:00:00Z"),
        total: { toNumber: () => 200 },
      },
    ]);

    const result = await getDailyRevenueSeries(RANGE);

    // Primer día, último día y los intermedios.
    expect(result[0]?.date).toBe("2026-07-01");
    expect(result[0]?.revenue).toBe(0);
    expect(result[0]?.invoiceCount).toBe(0);

    const day2 = result.find((p) => p.date === "2026-07-02");
    expect(day2?.revenue).toBe(150);
    expect(day2?.invoiceCount).toBe(2);

    expect(result[result.length - 1]?.date).toBe("2026-07-31");
    expect(result[result.length - 1]?.revenue).toBe(0);
  });

  it("omite facturas sin paidAt", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([
      { paidAt: null, total: 999 },
      {
        paidAt: new Date("2026-07-05T10:00:00Z"),
        total: "100",
      },
    ]);

    const result = await getDailyRevenueSeries(RANGE);

    const totalRevenue = result.reduce((s, p) => s + p.revenue, 0);
    expect(totalRevenue).toBe(100);
  });
});

// ============================================================================
// getTopServices
// ============================================================================

describe("getTopServices", () => {
  it("suma revenue por servicio y ordena descendente", async () => {
    prismaMock.invoiceItem.findMany.mockResolvedValue([
      {
        serviceId: "s1",
        total: { toNumber: () => 100 },
        service: { id: "s1", name: { es: "Maquillaje social", en: "" } },
      },
      {
        serviceId: "s1",
        total: { toNumber: () => 50 },
        service: { id: "s1", name: { es: "Maquillaje social", en: "" } },
      },
      {
        serviceId: "s2",
        total: { toNumber: () => 300 },
        service: { id: "s2", name: { es: "Peinado", en: "Hair" } },
      },
    ]);
    prismaMock.appointment.groupBy.mockResolvedValue([
      { serviceId: "s1", _count: { _all: 4 } },
      { serviceId: "s2", _count: { _all: 1 } },
    ]);

    const result = await getTopServices(RANGE, 5);

    expect(result[0]?.serviceId).toBe("s2");
    expect(result[0]?.revenue).toBe(300);
    expect(result[0]?.appointmentCount).toBe(1);

    expect(result[1]?.serviceId).toBe("s1");
    expect(result[1]?.revenue).toBe(150);
    expect(result[1]?.appointmentCount).toBe(4);
    expect(result[1]?.invoiceCount).toBe(2);
  });

  it("respeta el limit y trunca el resultado", async () => {
    prismaMock.invoiceItem.findMany.mockResolvedValue([
      {
        serviceId: "a",
        total: { toNumber: () => 100 },
        service: { id: "a", name: { es: "A" } },
      },
      {
        serviceId: "b",
        total: { toNumber: () => 80 },
        service: { id: "b", name: { es: "B" } },
      },
      {
        serviceId: "c",
        total: { toNumber: () => 60 },
        service: { id: "c", name: { es: "C" } },
      },
    ]);
    prismaMock.appointment.groupBy.mockResolvedValue([]);

    const result = await getTopServices(RANGE, 2);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.serviceId)).toEqual(["a", "b"]);
  });

  it("extrae nombre en español con fallback a inglés", async () => {
    prismaMock.invoiceItem.findMany.mockResolvedValue([
      {
        serviceId: "x",
        total: { toNumber: () => 50 },
        service: { id: "x", name: { es: "", en: "Hair" } },
      },
    ]);
    prismaMock.appointment.groupBy.mockResolvedValue([]);

    const result = await getTopServices(RANGE, 5);

    expect(result[0]?.serviceName).toBe("Hair");
  });
});

// ============================================================================
// getTopClients
// ============================================================================

describe("getTopClients", () => {
  it("devuelve lista vacía sin clientes activos", async () => {
    prismaMock.appointment.groupBy.mockResolvedValue([]);
    prismaMock.invoice.findMany.mockResolvedValue([]);

    const result = await getTopClients(RANGE);

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
  });

  it("combina appointments groupBy con invoice findMany para revenue", async () => {
    prismaMock.appointment.groupBy.mockResolvedValue([
      { clientId: "c1", _count: { _all: 3 } },
      { clientId: "c2", _count: { _all: 1 } },
    ]);
    prismaMock.invoice.findMany.mockResolvedValue([
      {
        total: { toNumber: () => 500 },
        appointment: { clientId: "c1" },
      },
      {
        total: { toNumber: () => 200 },
        appointment: { clientId: "c1" },
      },
      {
        total: { toNumber: () => 100 },
        appointment: { clientId: "c2" },
      },
    ]);
    prismaMock.client.findMany.mockResolvedValue([
      {
        id: "c1",
        name: "Ana",
        email: "ana@example.com",
        loyaltyPoints: 150,
      },
      {
        id: "c2",
        name: "Beto",
        email: "beto@example.com",
        loyaltyPoints: 0,
      },
    ]);

    const result = await getTopClients(RANGE);

    expect(result.total).toBe(2);
    expect(result.items[0]?.clientId).toBe("c1");
    expect(result.items[0]?.revenue).toBe(700);
    expect(result.items[0]?.appointmentCount).toBe(3);
    expect(result.items[0]?.invoiceCount).toBe(2);
    expect(result.items[0]?.loyaltyPoints).toBe(150);

    expect(result.items[1]?.clientId).toBe("c2");
    expect(result.items[1]?.revenue).toBe(100);
  });

  it("ordena por nombre cuando sortBy=name", async () => {
    prismaMock.appointment.groupBy.mockResolvedValue([
      { clientId: "c1", _count: { _all: 1 } },
      { clientId: "c2", _count: { _all: 1 } },
    ]);
    prismaMock.invoice.findMany.mockResolvedValue([]);
    prismaMock.client.findMany.mockResolvedValue([
      { id: "c1", name: "Zoe", email: "z@e.com", loyaltyPoints: 0 },
      { id: "c2", name: "Ana", email: "a@e.com", loyaltyPoints: 0 },
    ]);

    const result = await getTopClients(RANGE, { sortBy: "name" });

    expect(result.items.map((r) => r.clientName)).toEqual(["Ana", "Zoe"]);
  });

  it("pagina los resultados", async () => {
    const appts = Array.from({ length: 25 }, (_, i) => ({
      clientId: `c${i}`,
      _count: { _all: 1 },
    }));
    prismaMock.appointment.groupBy.mockResolvedValue(appts);
    prismaMock.invoice.findMany.mockResolvedValue([]);
    prismaMock.client.findMany.mockResolvedValue(
      appts.map((a) => ({
        id: a.clientId,
        name: `Client ${a.clientId}`,
        email: `${a.clientId}@example.com`,
        loyaltyPoints: 0,
      })),
    );

    const result = await getTopClients(RANGE, { page: 2, pageSize: 10 });

    expect(result.total).toBe(25);
    expect(result.totalPages).toBe(3);
    expect(result.items).toHaveLength(10);
    expect(result.page).toBe(2);
  });
});

// ============================================================================
// getRecentAppointments
// ============================================================================

describe("getRecentAppointments", () => {
  it("mapea los includes a un shape plano", async () => {
    prismaMock.appointment.count.mockResolvedValue(1);
    prismaMock.appointment.findMany.mockResolvedValue([
      {
        id: "a1",
        scheduledAt: new Date("2026-07-15T10:00:00Z"),
        status: "COMPLETED",
        durationMin: 60,
        client: { name: "Ana", email: "ana@example.com" },
        service: { name: { es: "Maquillaje" } },
        invoice: { status: "PAID" },
      },
    ]);

    const result = await getRecentAppointments(RANGE);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: "a1",
      status: "COMPLETED",
      clientName: "Ana",
      clientEmail: "ana@example.com",
      serviceName: "Maquillaje",
      hasInvoice: true,
      invoiceStatus: "PAID",
    });
    expect(result.items[0]?.durationMin).toBe(60);
  });

  it("marca hasInvoice=false cuando no hay invoice", async () => {
    prismaMock.appointment.count.mockResolvedValue(1);
    prismaMock.appointment.findMany.mockResolvedValue([
      {
        id: "a2",
        scheduledAt: new Date("2026-07-16T10:00:00Z"),
        status: "PENDING",
        durationMin: 30,
        client: { name: "Beto", email: "b@e.com" },
        service: { name: { es: "Peinado" } },
        invoice: null,
      },
    ]);

    const result = await getRecentAppointments(RANGE);

    expect(result.items[0]?.hasInvoice).toBe(false);
    expect(result.items[0]?.invoiceStatus).toBeNull();
  });

  it("pasa el filtro de status al where", async () => {
    prismaMock.appointment.count.mockResolvedValue(0);
    prismaMock.appointment.findMany.mockResolvedValue([]);

    await getRecentAppointments(RANGE, { status: "CANCELLED" });

    expect(prismaMock.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "CANCELLED" }),
      }),
    );
  });
});

// ============================================================================
// getRecentInvoices
// ============================================================================

describe("getRecentInvoices", () => {
  it("resume el primer item y convierte decimals a number", async () => {
    prismaMock.invoice.count.mockResolvedValue(1);
    prismaMock.invoice.findMany.mockResolvedValue([
      {
        id: "i1",
        number: "INV-2026-0001",
        status: "PAID",
        total: { toNumber: () => 150 },
        subtotal: { toNumber: () => 180 },
        discountAmount: { toNumber: () => 20 },
        loyaltyDiscount: { toNumber: () => 10 },
        paidAt: new Date("2026-07-15T11:00:00Z"),
        createdAt: new Date("2026-07-15T10:00:00Z"),
        appointment: {
          client: { name: "Ana" },
          service: { name: { es: "Maquillaje" } },
        },
        items: [{ description: "Maquillaje social", quantity: 1 }],
      },
    ]);

    const result = await getRecentInvoices(RANGE);

    expect(result.items[0]).toMatchObject({
      number: "INV-2026-0001",
      status: "PAID",
      total: 150,
      subtotal: 180,
      clientName: "Ana",
      serviceSummary: "Maquillaje social",
    });
  });

  it("agrega sufijo de cantidad cuando quantity > 1", async () => {
    prismaMock.invoice.count.mockResolvedValue(1);
    prismaMock.invoice.findMany.mockResolvedValue([
      {
        id: "i2",
        number: "INV-2026-0002",
        status: "PENDING",
        total: "50",
        subtotal: "50",
        discountAmount: "0",
        loyaltyDiscount: "0",
        paidAt: null,
        createdAt: new Date("2026-07-10T10:00:00Z"),
        appointment: {
          client: { name: "Beto" },
          service: { name: { es: "Servicio" } },
        },
        items: [{ description: "Limpieza", quantity: 3 }],
      },
    ]);

    const result = await getRecentInvoices(RANGE);

    expect(result.items[0]?.serviceSummary).toBe("Limpieza (×3)");
  });

  it("filtra por status cuando se pasa", async () => {
    prismaMock.invoice.count.mockResolvedValue(0);
    prismaMock.invoice.findMany.mockResolvedValue([]);

    await getRecentInvoices(RANGE, { status: "CANCELLED" });

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "CANCELLED" }),
      }),
    );
  });
});

// ============================================================================
// getCouponRedemptions
// ============================================================================

describe("getCouponRedemptions", () => {
  it("mapea los includes y convierte amounts", async () => {
    prismaMock.couponUsage.count.mockResolvedValue(1);
    prismaMock.couponUsage.findMany.mockResolvedValue([
      {
        id: "u1",
        couponId: "cp1",
        amount: { toNumber: () => 25 },
        usedAt: new Date("2026-07-15T10:00:00Z"),
        coupon: { code: "VERANO20" },
        invoice: {
          number: "INV-2026-0001",
          status: "PAID",
          appointment: { client: { name: "Ana" } },
        },
      },
    ]);

    const result = await getCouponRedemptions(RANGE);

    expect(result.items[0]).toMatchObject({
      couponCode: "VERANO20",
      amount: 25,
      invoiceNumber: "INV-2026-0001",
      clientName: "Ana",
    });
  });

  it("devuelve '—' si el invoice no tiene appointment asociada", async () => {
    prismaMock.couponUsage.count.mockResolvedValue(1);
    prismaMock.couponUsage.findMany.mockResolvedValue([
      {
        id: "u2",
        couponId: "cp1",
        amount: "10",
        usedAt: new Date("2026-07-10T10:00:00Z"),
        coupon: { code: "PROMO" },
        invoice: {
          number: "INV-2026-0009",
          status: "PENDING",
          appointment: null,
        },
      },
    ]);

    const result = await getCouponRedemptions(RANGE);

    expect(result.items[0]?.clientName).toBe("—");
  });

  it("ordena por amount por defecto", async () => {
    prismaMock.couponUsage.count.mockResolvedValue(0);
    prismaMock.couponUsage.findMany.mockResolvedValue([]);

    await getCouponRedemptions(RANGE);

    expect(prismaMock.couponUsage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { amount: "desc" },
      }),
    );
  });
});
