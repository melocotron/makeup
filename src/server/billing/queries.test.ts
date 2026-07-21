import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    invoice: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      aggregate: vi.fn(),
    },
    couponUsage: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

import {
  getInvoiceById,
  getInvoiceForAppointment,
  getInvoiceStats,
  listInvoices,
} from "./queries";

const prismaMock = prisma as unknown as {
  invoice: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
  };
  couponUsage: {
    count: ReturnType<typeof vi.fn>;
  };
};

// Helpers para simular Decimals de Prisma
const dec = (n: number) =>
  ({ toString: () => String(n), toNumber: () => n }) as unknown as {
    toString(): string;
  };

const sampleInvoice = {
  id: "inv-1",
  number: "INV-2026-0001",
  status: "PENDING" as const,
  subtotal: dec(500),
  discountAmount: dec(0),
  loyaltyDiscount: dec(0),
  total: dec(500),
  paymentMethod: null,
  paidAt: null,
  notes: null,
  createdAt: new Date("2026-07-15T10:00:00Z"),
  updatedAt: new Date("2026-07-15T10:00:00Z"),
  appointment: {
    id: "apt-1",
    scheduledAt: new Date("2026-07-20T14:00:00Z"),
    durationMin: 60,
    status: "CONFIRMED" as const,
    notes: null,
    internalNotes: null,
    client: { name: "Ana Cliente", email: "ana@example.com" },
    service: { id: "svc-1", name: { es: "Maquillaje social", en: "Social makeup" } },
  },
  _count: { items: 1, couponUsages: 0 },
  // Relations vacías por default; los tests que las necesitan las setean.
  items: [],
  couponUsages: [],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// listInvoices
// ============================================================================

describe("listInvoices", () => {
  it("retorna lista vacía y total 0", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([]);
    prismaMock.invoice.count.mockResolvedValue(0);

    const result = await listInvoices();

    expect(result).toEqual({ items: [], total: 0 });
  });

  it("mapea Decimal a number, fechas a ISO, y extrae nombre del servicio del locale", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([sampleInvoice]);
    prismaMock.invoice.count.mockResolvedValue(1);

    const result = await listInvoices({ locale: "es" });

    expect(result.items[0]).toMatchObject({
      id: "inv-1",
      number: "INV-2026-0001",
      status: "PENDING",
      clientName: "Ana Cliente",
      clientEmail: "ana@example.com",
      serviceId: "svc-1",
      serviceName: "Maquillaje social",
      subtotal: 500,
      discountAmount: 0,
      loyaltyDiscount: 0,
      total: 500,
      paymentMethod: null,
      paidAt: null,
      itemsCount: 1,
      couponUsagesCount: 0,
    });
    expect(result.items[0]?.createdAt).toBe("2026-07-15T10:00:00.000Z");
  });

  it("usa locale 'en' para el nombre del servicio", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([sampleInvoice]);
    prismaMock.invoice.count.mockResolvedValue(1);

    const result = await listInvoices({ locale: "en" });

    expect(result.items[0]?.serviceName).toBe("Social makeup");
  });

  it("filtra por status", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([]);
    prismaMock.invoice.count.mockResolvedValue(0);

    await listInvoices({ status: "PAID" });

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PAID" }),
      }),
    );
  });

  it("con status='all' no agrega filtro de status al where", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([]);
    prismaMock.invoice.count.mockResolvedValue(0);

    await listInvoices({ status: "all" });

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ status: expect.anything() }),
      }),
    );
  });

  it("busca por número cuando hay search", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([]);
    prismaMock.invoice.count.mockResolvedValue(0);

    await listInvoices({ search: "INV-2026" });

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ number: expect.any(Object) }),
          ]),
        }),
      }),
    );
  });

  it("omite search vacío (whitespace)", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([]);
    prismaMock.invoice.count.mockResolvedValue(0);

    await listInvoices({ search: "   " });

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.not.objectContaining({ OR: expect.anything() }),
      }),
    );
  });

  it("respeta paginación (skip, take)", async () => {
    prismaMock.invoice.findMany.mockResolvedValue([]);
    prismaMock.invoice.count.mockResolvedValue(0);

    await listInvoices({ skip: 20, take: 10 });

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });
});

// ============================================================================
// getInvoiceById
// ============================================================================

describe("getInvoiceById", () => {
  it("retorna null si no existe", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(null);

    const result = await getInvoiceById("nonexistent");

    expect(result).toBeNull();
  });

  it("mapea la invoice completa con items, extras y couponUsages", async () => {
    const fullInvoice = {
      ...sampleInvoice,
      items: [
        {
          id: "item-1",
          serviceId: "svc-1",
          description: "Maquillaje social",
          quantity: 1,
          unitPrice: dec(500),
          total: dec(500),
          extras: [
            {
              id: "extra-1",
              extraId: "ext-1",
              description: "Pestañas",
              price: dec(50),
            },
          ],
        },
      ],
      couponUsages: [
        {
          id: "cu-1",
          couponId: "cpn-1",
          amount: dec(50),
          usedAt: new Date("2026-07-15T11:00:00Z"),
          coupon: { id: "cpn-1", code: "SUMMER20", type: "PERCENTAGE", value: dec(10) },
        },
      ],
    };
    prismaMock.invoice.findUnique.mockResolvedValue(fullInvoice);

    const result = await getInvoiceById("inv-1");

    expect(result).not.toBeNull();
    expect(result?.items).toHaveLength(1);
    expect(result?.items[0]).toMatchObject({
      description: "Maquillaje social",
      quantity: 1,
      unitPrice: 500,
      total: 500,
    });
    expect(result?.items[0]?.extras).toHaveLength(1);
    expect(result?.items[0]?.extras[0]).toMatchObject({
      description: "Pestañas",
      price: 50,
    });
    expect(result?.couponUsages).toHaveLength(1);
    expect(result?.couponUsages[0]).toMatchObject({
      couponId: "cpn-1",
      amount: 50,
      coupon: { code: "SUMMER20", type: "PERCENTAGE", value: 10 },
    });
    expect(result?.couponUsages[0]?.usedAt).toBe("2026-07-15T11:00:00.000Z");
  });

  it("maneja paidAt null correctamente", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(sampleInvoice);

    const result = await getInvoiceById("inv-1");

    expect(result?.paidAt).toBeNull();
    expect(result?.paymentMethod).toBeNull();
  });
});

// ============================================================================
// getInvoiceForAppointment
// ============================================================================

describe("getInvoiceForAppointment", () => {
  it("retorna null si la cita no tiene invoice", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(null);

    const result = await getInvoiceForAppointment("apt-no-invoice");

    expect(result).toBeNull();
  });

  it("retorna resumen básico si la cita tiene invoice", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      number: "INV-2026-0001",
      status: "PENDING",
      total: dec(500),
    });

    const result = await getInvoiceForAppointment("apt-1");

    expect(result).toEqual({
      id: "inv-1",
      number: "INV-2026-0001",
      status: "PENDING",
      total: 500,
    });
  });
});

// ============================================================================
// getInvoiceStats
// ============================================================================

describe("getInvoiceStats", () => {
  it("agrega los 4 KPIs correctamente", async () => {
    prismaMock.invoice.count
      .mockResolvedValueOnce(7) // totalPending
      .mockResolvedValueOnce(12); // totalPaidThisMonth
    prismaMock.invoice.aggregate.mockResolvedValue({
      _sum: { total: dec(3450.50) },
    });
    prismaMock.couponUsage.count.mockResolvedValue(4);

    const stats = await getInvoiceStats();

    expect(stats).toEqual({
      totalPending: 7,
      totalPaidThisMonth: 12,
      revenueThisMonth: 3450.5,
      couponsRedeemedThisMonth: 4,
    });
  });

  it("maneja revenueThisMonth=0 cuando no hay ventas", async () => {
    prismaMock.invoice.count.mockResolvedValue(0);
    prismaMock.invoice.aggregate.mockResolvedValue({ _sum: { total: null } });
    prismaMock.couponUsage.count.mockResolvedValue(0);

    const stats = await getInvoiceStats();

    expect(stats).toEqual({
      totalPending: 0,
      totalPaidThisMonth: 0,
      revenueThisMonth: 0,
      couponsRedeemedThisMonth: 0,
    });
  });

  it("llama a invoice.count dos veces (pending + paidThisMonth) y aggregate una vez", async () => {
    prismaMock.invoice.count.mockResolvedValue(0);
    prismaMock.invoice.aggregate.mockResolvedValue({ _sum: { total: null } });
    prismaMock.couponUsage.count.mockResolvedValue(0);

    await getInvoiceStats();

    expect(prismaMock.invoice.count).toHaveBeenCalledTimes(2);
    expect(prismaMock.invoice.aggregate).toHaveBeenCalledTimes(1);
    expect(prismaMock.couponUsage.count).toHaveBeenCalledTimes(1);
  });
});
