import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePathMock, authMock, prismaMock } = vi.hoisted(() => {
  const revalidatePathMock = vi.fn();
  const authMock = vi.fn();
  const prismaMock = {
    invoice: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    appointment: {
      findUnique: vi.fn(),
    },
    service: {
      findUnique: vi.fn(),
    },
    coupon: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    couponUsage: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
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
  applyCouponToInvoice,
  cancelInvoice,
  createInvoiceForAppointment,
  markInvoicePaid,
  removeCouponFromInvoice,
  updateInvoiceNotes,
} from "./actions";

const dec = (n: number) =>
  ({ toString: () => String(n), toNumber: () => n }) as unknown as {
    toString(): string;
  };

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "admin-1" } });
  // Por default, $transaction ejecuta el callback con el mismo mock como tx.
  prismaMock.$transaction.mockImplementation(
    async (cb: (tx: typeof prismaMock) => Promise<unknown>) => cb(prismaMock),
  );
});

// ============================================================================
// createInvoiceForAppointment
// ============================================================================

describe("createInvoiceForAppointment", () => {
  const baseInput = { appointmentId: "apt-1" };

  it("rechaza si no hay sesión", async () => {
    authMock.mockResolvedValue(null);

    const result = await createInvoiceForAppointment(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autenticado");
    }
  });

  it("rechaza si appointmentId está vacío", async () => {
    const result = await createInvoiceForAppointment({ appointmentId: "" });

    expect(result.success).toBe(false);
  });

  it("rechaza si la cita no existe", async () => {
    prismaMock.appointment.findUnique.mockResolvedValue(null);

    const result = await createInvoiceForAppointment(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("La cita no existe");
    }
  });

  it("rechaza si la cita está en PENDING", async () => {
    prismaMock.appointment.findUnique.mockResolvedValue({
      id: "apt-1",
      status: "PENDING",
      service: { id: "svc-1", name: { es: "S" }, basePrice: dec(500), extras: [] },
    });

    const result = await createInvoiceForAppointment(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("confirmadas o completadas");
    }
  });

  it("rechaza si la cita está en CANCELLED", async () => {
    prismaMock.appointment.findUnique.mockResolvedValue({
      id: "apt-1",
      status: "CANCELLED",
      service: { id: "svc-1", name: { es: "S" }, basePrice: dec(500), extras: [] },
    });

    const result = await createInvoiceForAppointment(baseInput);

    expect(result.success).toBe(false);
  });

  it("rechaza si la cita ya tiene invoice", async () => {
    prismaMock.appointment.findUnique.mockResolvedValue({
      id: "apt-1",
      status: "CONFIRMED",
      service: { id: "svc-1", name: { es: "S" }, basePrice: dec(500), extras: [] },
    });
    prismaMock.invoice.findUnique.mockResolvedValue({ id: "inv-existing" });

    const result = await createInvoiceForAppointment(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Esta cita ya tiene una factura");
    }
  });

  it("crea invoice con subtotal = basePrice cuando no hay extras", async () => {
    prismaMock.appointment.findUnique.mockResolvedValue({
      id: "apt-1",
      status: "CONFIRMED",
      service: {
        id: "svc-1",
        name: { es: "Maquillaje social", en: "Social makeup" },
        basePrice: dec(500),
        extras: [],
      },
    });
    prismaMock.invoice.findUnique.mockResolvedValue(null); // sin invoice previa
    prismaMock.invoice.count.mockResolvedValue(0); // primer invoice del año
    prismaMock.invoice.create.mockResolvedValue({
      id: "inv-new",
      number: "INV-2026-0001",
    });

    const result = await createInvoiceForAppointment(baseInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.number).toBe("INV-2026-0001");
    }
    expect(prismaMock.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          number: expect.stringMatching(/^INV-\d{4}-\d{4}$/),
          status: "PENDING",
          subtotal: 500,
          discountAmount: 0,
          loyaltyDiscount: 0,
          total: 500,
          items: {
            create: [
              expect.objectContaining({
                serviceId: "svc-1",
                description: "Maquillaje social",
                quantity: 1,
                unitPrice: 500,
                total: 500,
              }),
            ],
          },
        }),
      }),
    );
  });

  it("calcula subtotal = basePrice + sum(extras activos)", async () => {
    prismaMock.appointment.findUnique.mockResolvedValue({
      id: "apt-1",
      status: "COMPLETED",
      service: {
        id: "svc-1",
        name: { es: "Maquillaje" },
        basePrice: dec(500),
        extras: [
          { id: "ext-1", name: { es: "Pestañas" }, price: dec(50), isActive: true },
          { id: "ext-2", name: { es: "Labial" }, price: dec(30), isActive: true },
        ],
      },
    });
    prismaMock.invoice.findUnique.mockResolvedValue(null);
    prismaMock.invoice.count.mockResolvedValue(5);
    prismaMock.invoice.create.mockResolvedValue({ id: "inv-new", number: "INV-2026-0006" });

    const result = await createInvoiceForAppointment(baseInput);

    expect(result.success).toBe(true);
    expect(prismaMock.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotal: 580, // 500 + 50 + 30
          total: 580,
        }),
      }),
    );
  });

  it("genera número de invoice con sequence correcto basado en count", async () => {
    prismaMock.appointment.findUnique.mockResolvedValue({
      id: "apt-1",
      status: "CONFIRMED",
      service: { id: "svc-1", name: { es: "S" }, basePrice: dec(100), extras: [] },
    });
    prismaMock.invoice.findUnique.mockResolvedValue(null);
    prismaMock.invoice.count.mockResolvedValue(42); // 42 ya existen este año
    prismaMock.invoice.create.mockResolvedValue({ id: "inv-new", number: "INV-2026-0043" });

    await createInvoiceForAppointment(baseInput);

    expect(prismaMock.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ number: "INV-2026-0043" }),
      }),
    );
  });

  it("revalida las rutas de facturas y cita", async () => {
    prismaMock.appointment.findUnique.mockResolvedValue({
      id: "apt-1",
      status: "CONFIRMED",
      service: { id: "svc-1", name: { es: "S" }, basePrice: dec(100), extras: [] },
    });
    prismaMock.invoice.findUnique.mockResolvedValue(null);
    prismaMock.invoice.count.mockResolvedValue(0);
    prismaMock.invoice.create.mockResolvedValue({ id: "inv-new", number: "INV-2026-0001" });

    await createInvoiceForAppointment(baseInput);

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/facturas",
      "page",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/citas/apt-1",
      "page",
    );
  });
});

// ============================================================================
// applyCouponToInvoice
// ============================================================================

describe("applyCouponToInvoice", () => {
  const baseInput = { invoiceId: "inv-1", couponCode: "SUMMER20" };

  const baseInvoice = {
    id: "inv-1",
    status: "PENDING" as const,
    subtotal: dec(500),
    discountAmount: dec(0),
    loyaltyDiscount: dec(0),
    appointment: { serviceId: "svc-1" },
  };

  const baseCoupon = {
    id: "cpn-1",
    code: "SUMMER20",
    type: "PERCENTAGE" as const,
    value: dec(20),
    minPurchase: null,
    maxUses: null,
    usedCount: 0,
    isActive: true,
    validFrom: new Date("2026-01-01"),
    validUntil: new Date("2026-12-31"),
    serviceIds: null,
  };

  it("rechaza si no hay sesión", async () => {
    authMock.mockResolvedValue(null);

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("No autenticado");
    }
  });

  it("rechaza si la invoice no existe", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(null);

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("La factura no existe");
    }
  });

  it("rechaza si la invoice no está PENDING", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      ...baseInvoice,
      status: "PAID",
    });

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("pendientes");
    }
  });

  it("rechaza si el cupón no existe", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(baseInvoice);
    prismaMock.coupon.findUnique.mockResolvedValue(null);

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("El cupón no existe");
    }
  });

  it("rechaza si el cupón está inactivo", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(baseInvoice);
    prismaMock.coupon.findUnique.mockResolvedValue({
      ...baseCoupon,
      isActive: false,
    });

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("El cupón está inactivo");
    }
  });

  it("rechaza si el cupón está fuera de vigencia (antes de validFrom)", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(baseInvoice);
    prismaMock.coupon.findUnique.mockResolvedValue({
      ...baseCoupon,
      validFrom: new Date("2099-01-01"),
    });

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("El cupón está fuera de vigencia");
    }
  });

  it("rechaza si el cupón está agotado (usedCount >= maxUses)", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(baseInvoice);
    prismaMock.coupon.findUnique.mockResolvedValue({
      ...baseCoupon,
      maxUses: 5,
      usedCount: 5,
    });

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("El cupón ya alcanzó su máximo de usos");
    }
  });

  it("rechaza si subtotal < minPurchase", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      ...baseInvoice,
      subtotal: dec(50),
    });
    prismaMock.coupon.findUnique.mockResolvedValue({
      ...baseCoupon,
      minPurchase: dec(100),
    });

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("compra mínima");
    }
  });

  it("rechaza si el cupón no aplica al servicio (serviceIds restrictivo)", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(baseInvoice);
    prismaMock.coupon.findUnique.mockResolvedValue({
      ...baseCoupon,
      serviceIds: JSON.stringify(["svc-2", "svc-3"]),
    });

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("El cupón no aplica a este servicio");
    }
  });

  it("rechaza si el cupón ya está aplicado a esta invoice", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(baseInvoice);
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon);
    prismaMock.couponUsage.findFirst.mockResolvedValue({ id: "cu-1" });

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Este cupón ya está aplicado a esta factura");
    }
  });

  it("aplica cupón PERCENTAGE: descuento = subtotal * value/100", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(baseInvoice);
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon);
    prismaMock.couponUsage.findFirst.mockResolvedValue(null);

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.discountAmount).toBe(100); // 500 * 20%
      expect(result.data?.newTotal).toBe(400);
    }
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { discountAmount: 100, total: 400 },
      }),
    );
    expect(prismaMock.couponUsage.create).toHaveBeenCalled();
    expect(prismaMock.coupon.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { usedCount: { increment: 1 } },
      }),
    );
  });

  it("aplica cupón FIXED: descuento = min(value, subtotal)", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(baseInvoice);
    prismaMock.coupon.findUnique.mockResolvedValue({
      ...baseCoupon,
      type: "FIXED",
      value: dec(75),
    });
    prismaMock.couponUsage.findFirst.mockResolvedValue(null);

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.discountAmount).toBe(75);
      expect(result.data?.newTotal).toBe(425);
    }
  });

  it("trunca el descuento al subtotal si el cupón es mayor", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(baseInvoice);
    prismaMock.coupon.findUnique.mockResolvedValue({
      ...baseCoupon,
      type: "FIXED",
      value: dec(1000), // descuento > subtotal
    });
    prismaMock.couponUsage.findFirst.mockResolvedValue(null);

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(true);
    if (result.success) {
      // El descuento se trunca a 500 (el subtotal), no a 1000
      expect(result.data?.discountAmount).toBe(500);
      expect(result.data?.newTotal).toBe(0);
    }
  });

  it("resta loyaltyDiscount del total", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      ...baseInvoice,
      loyaltyDiscount: dec(50),
    });
    prismaMock.coupon.findUnique.mockResolvedValue(baseCoupon);
    prismaMock.couponUsage.findFirst.mockResolvedValue(null);

    const result = await applyCouponToInvoice(baseInput);

    expect(result.success).toBe(true);
    if (result.success) {
      // subtotal(500) - cupón(100) - loyalty(50) = 350
      expect(result.data?.newTotal).toBe(350);
    }
  });
});

// ============================================================================
// removeCouponFromInvoice
// ============================================================================

describe("removeCouponFromInvoice", () => {
  const baseInput = { invoiceId: "inv-1", couponUsageId: "cu-1" };

  it("rechaza si la invoice no existe", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(null);

    const result = await removeCouponFromInvoice(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("La factura no existe");
    }
  });

  it("rechaza si la invoice no está PENDING", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PAID",
      subtotal: dec(500),
      loyaltyDiscount: dec(0),
    });

    const result = await removeCouponFromInvoice(baseInput);

    expect(result.success).toBe(false);
  });

  it("rechaza si el CouponUsage no pertenece a esta invoice", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      subtotal: dec(500),
      loyaltyDiscount: dec(0),
    });
    prismaMock.couponUsage.findUnique.mockResolvedValue({
      id: "cu-1",
      couponId: "cpn-1",
      invoiceId: "inv-OTRA", // no coincide
    });

    const result = await removeCouponFromInvoice(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("El uso de cupón no pertenece a esta factura");
    }
  });

  it("rechaza si el CouponUsage no existe", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      subtotal: dec(500),
      loyaltyDiscount: dec(0),
    });
    prismaMock.couponUsage.findUnique.mockResolvedValue(null);

    const result = await removeCouponFromInvoice(baseInput);

    expect(result.success).toBe(false);
  });

  it("revierte el cupón: borra usage, decrementa usedCount, recalcula total", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      subtotal: dec(500),
      loyaltyDiscount: dec(0),
    });
    prismaMock.couponUsage.findUnique.mockResolvedValue({
      id: "cu-1",
      couponId: "cpn-1",
      invoiceId: "inv-1",
    });

    const result = await removeCouponFromInvoice(baseInput);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data?.newTotal).toBe(500);
    }
    expect(prismaMock.couponUsage.delete).toHaveBeenCalledWith({
      where: { id: "cu-1" },
    });
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { discountAmount: 0, total: 500 },
      }),
    );
    expect(prismaMock.coupon.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { usedCount: { decrement: 1 } },
      }),
    );
  });
});

// ============================================================================
// markInvoicePaid
// ============================================================================

describe("markInvoicePaid", () => {
  const baseInput = {
    invoiceId: "inv-1",
    paymentMethod: "efectivo" as const,
  };

  it("rechaza si la invoice no existe", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(null);

    const result = await markInvoicePaid(baseInput);

    expect(result.success).toBe(false);
  });

  it("rechaza si la invoice ya está PAID", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PAID",
      notes: null,
    });

    const result = await markInvoicePaid(baseInput);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain("pendientes");
    }
  });

  it("marca como pagada con paidAt = now por default", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      notes: null,
    });

    const result = await markInvoicePaid(baseInput);

    expect(result.success).toBe(true);
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PAID",
          paymentMethod: "efectivo",
          paidAt: expect.any(Date),
          notes: null,
        }),
      }),
    );
  });

  it("respeta paidAt custom y notes custom", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      notes: "notas viejas",
    });

    const customDate = new Date("2026-07-15T10:00:00Z");
    const result = await markInvoicePaid({
      ...baseInput,
      paidAt: customDate,
      notes: "Pago completo",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paidAt: customDate,
          notes: "Pago completo", // no conserva las viejas
        }),
      }),
    );
  });

  it("revalida la ruta de la invoice y la lista", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      notes: null,
    });

    await markInvoicePaid(baseInput);

    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/facturas/inv-1",
      "page",
    );
    expect(revalidatePathMock).toHaveBeenCalledWith(
      "/[locale]/admin/facturas",
      "page",
    );
  });
});

// ============================================================================
// cancelInvoice
// ============================================================================

describe("cancelInvoice", () => {
  const baseInput = {
    invoiceId: "inv-1",
    reason: "Cliente canceló la cita",
  };

  it("rechaza si la invoice no está PENDING", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PAID",
      notes: null,
    });

    const result = await cancelInvoice(baseInput);

    expect(result.success).toBe(false);
  });

  it("cancela con motivo en notes (prefix [CANCELLED])", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      notes: null,
    });

    const result = await cancelInvoice(baseInput);

    expect(result.success).toBe(true);
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CANCELLED",
          notes: "[CANCELLED] Cliente canceló la cita",
        }),
      }),
    );
  });

  it("preserva notas existentes y agrega el motivo al final", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({
      id: "inv-1",
      status: "PENDING",
      notes: "Notas previas del admin",
    });

    await cancelInvoice(baseInput);

    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CANCELLED",
          notes: "Notas previas del admin\n[CANCELLED] Cliente canceló la cita",
        }),
      }),
    );
  });
});

// ============================================================================
// updateInvoiceNotes
// ============================================================================

describe("updateInvoiceNotes", () => {
  it("edita notas con string", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({ id: "inv-1" });

    const result = await updateInvoiceNotes({
      invoiceId: "inv-1",
      notes: "Notas editadas",
    });

    expect(result.success).toBe(true);
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { notes: "Notas editadas" },
      }),
    );
  });

  it("permite notes null (limpiar)", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue({ id: "inv-1" });

    const result = await updateInvoiceNotes({
      invoiceId: "inv-1",
      notes: null,
    });

    expect(result.success).toBe(true);
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { notes: null },
      }),
    );
  });

  it("rechaza si la invoice no existe", async () => {
    prismaMock.invoice.findUnique.mockResolvedValue(null);

    const result = await updateInvoiceNotes({
      invoiceId: "inv-1",
      notes: "notas",
    });

    expect(result.success).toBe(false);
  });
});
