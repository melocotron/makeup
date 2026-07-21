import { describe, expect, it } from "vitest";

import {
  applyCouponToInvoiceSchema,
  cancelInvoiceSchema,
  createInvoiceForAppointmentSchema,
  invoiceFilterSchema,
  markInvoicePaidSchema,
  paymentMethodSchema,
  removeCouponFromInvoiceSchema,
  updateInvoiceNotesSchema,
} from "./validators";

// ============================================================================
// createInvoiceForAppointmentSchema
// ============================================================================

describe("createInvoiceForAppointmentSchema", () => {
  it("acepta un appointmentId válido", () => {
    const result = createInvoiceForAppointmentSchema.safeParse({
      appointmentId: "cmrtsz6zv001i7874o7l0cl8n",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza appointmentId vacío", () => {
    const result = createInvoiceForAppointmentSchema.safeParse({
      appointmentId: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("ID de cita requerido");
    }
  });

  it("rechaza appointmentId faltante", () => {
    const result = createInvoiceForAppointmentSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// applyCouponToInvoiceSchema
// ============================================================================

describe("applyCouponToInvoiceSchema", () => {
  it("acepta invoiceId y couponCode válidos", () => {
    const result = applyCouponToInvoiceSchema.safeParse({
      invoiceId: "cmrtsz6zv001i7874o7l0cl8n",
      couponCode: "summer20",
    });
    expect(result.success).toBe(true);
  });

  it("normaliza couponCode a uppercase", () => {
    const result = applyCouponToInvoiceSchema.safeParse({
      invoiceId: "cmrtsz6zv001i7874o7l0cl8n",
      couponCode: "  summer20  ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.couponCode).toBe("SUMMER20");
    }
  });

  it("rechaza couponCode vacío", () => {
    const result = applyCouponToInvoiceSchema.safeParse({
      invoiceId: "cmrtsz6zv001i7874o7l0cl8n",
      couponCode: "",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza couponCode con más de 32 caracteres", () => {
    const result = applyCouponToInvoiceSchema.safeParse({
      invoiceId: "cmrtsz6zv001i7874o7l0cl8n",
      couponCode: "A".repeat(33),
    });
    expect(result.success).toBe(false);
  });

  it("rechaza invoiceId faltante", () => {
    const result = applyCouponToInvoiceSchema.safeParse({
      couponCode: "SUMMER20",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// removeCouponFromInvoiceSchema
// ============================================================================

describe("removeCouponFromInvoiceSchema", () => {
  it("acepta invoiceId y couponUsageId válidos", () => {
    const result = removeCouponFromInvoiceSchema.safeParse({
      invoiceId: "cmrtsz6zv001i7874o7l0cl8n",
      couponUsageId: "cmrtsz6zv002j7874o7l0cl8o",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza couponUsageId vacío", () => {
    const result = removeCouponFromInvoiceSchema.safeParse({
      invoiceId: "cmrtsz6zv001i7874o7l0cl8n",
      couponUsageId: "",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// paymentMethodSchema
// ============================================================================

describe("paymentMethodSchema", () => {
  it("acepta 'efectivo'", () => {
    expect(paymentMethodSchema.safeParse("efectivo").success).toBe(true);
  });

  it("acepta 'transferencia'", () => {
    expect(paymentMethodSchema.safeParse("transferencia").success).toBe(true);
  });

  it("acepta 'otro'", () => {
    expect(paymentMethodSchema.safeParse("otro").success).toBe(true);
  });

  it("rechaza 'tarjeta' (no es un método manual válido en esta fase)", () => {
    const result = paymentMethodSchema.safeParse("tarjeta");
    expect(result.success).toBe(false);
  });

  it("rechaza string vacío", () => {
    const result = paymentMethodSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// markInvoicePaidSchema
// ============================================================================

describe("markInvoicePaidSchema", () => {
  const baseValid = {
    invoiceId: "cmrtsz6zv001i7874o7l0cl8n",
    paymentMethod: "efectivo" as const,
  };

  it("acepta un pago válido sin paidAt ni notes", () => {
    const result = markInvoicePaidSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it("acepta un pago con paidAt y notes", () => {
    const result = markInvoicePaidSchema.safeParse({
      ...baseValid,
      paidAt: new Date("2026-07-20T15:30:00Z"),
      notes: "Pago completo en efectivo",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paidAt).toBeInstanceOf(Date);
    }
  });

  it("coerce paidAt desde string ISO", () => {
    const result = markInvoicePaidSchema.safeParse({
      ...baseValid,
      paidAt: "2026-07-20T15:30:00Z",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paidAt).toBeInstanceOf(Date);
      expect((result.data.paidAt as Date).toISOString()).toBe(
        "2026-07-20T15:30:00.000Z",
      );
    }
  });

  it("rechaza paidAt inválido", () => {
    const result = markInvoicePaidSchema.safeParse({
      ...baseValid,
      paidAt: "ayer",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza paymentMethod inválido", () => {
    const result = markInvoicePaidSchema.safeParse({
      ...baseValid,
      paymentMethod: "bitcoin",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza notes con más de 1000 caracteres", () => {
    const result = markInvoicePaidSchema.safeParse({
      ...baseValid,
      notes: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("acepta notes null", () => {
    const result = markInvoicePaidSchema.safeParse({
      ...baseValid,
      notes: null,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// cancelInvoiceSchema
// ============================================================================

describe("cancelInvoiceSchema", () => {
  const baseValid = {
    invoiceId: "cmrtsz6zv001i7874o7l0cl8n",
    reason: "Cliente canceló la cita",
  };

  it("acepta una cancelación válida", () => {
    const result = cancelInvoiceSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it("rechaza reason con menos de 3 caracteres", () => {
    const result = cancelInvoiceSchema.safeParse({
      ...baseValid,
      reason: "no",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("mínimo 3 caracteres");
    }
  });

  it("rechaza reason con más de 500 caracteres", () => {
    const result = cancelInvoiceSchema.safeParse({
      ...baseValid,
      reason: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("trim reason (whitespace alrededor no cuenta como contenido)", () => {
    const result = cancelInvoiceSchema.safeParse({
      ...baseValid,
      reason: "  si  ",
    });
    // "  si  " trimeado es "si" (2 chars) → rechazado
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// updateInvoiceNotesSchema
// ============================================================================

describe("updateInvoiceNotesSchema", () => {
  it("acepta notes string", () => {
    const result = updateInvoiceNotesSchema.safeParse({
      invoiceId: "cmrtsz6zv001i7874o7l0cl8n",
      notes: "Cliente pidió factura con RFC",
    });
    expect(result.success).toBe(true);
  });

  it("acepta notes null (limpiar el campo)", () => {
    const result = updateInvoiceNotesSchema.safeParse({
      invoiceId: "cmrtsz6zv001i7874o7l0cl8n",
      notes: null,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza notes con más de 1000 caracteres", () => {
    const result = updateInvoiceNotesSchema.safeParse({
      invoiceId: "cmrtsz6zv001i7874o7l0cl8n",
      notes: "x".repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// invoiceFilterSchema
// ============================================================================

describe("invoiceFilterSchema", () => {
  it("acepta filtros vacíos (defaults: status=all, skip=0, take=50)", () => {
    const result = invoiceFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("all");
      expect(result.data.skip).toBe(0);
      expect(result.data.take).toBe(50);
    }
  });

  it("acepta search con trim", () => {
    const result = invoiceFilterSchema.safeParse({ search: "  INV-2026  " });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.search).toBe("INV-2026");
    }
  });

  it("rechaza status desconocido", () => {
    const result = invoiceFilterSchema.safeParse({ status: "DRAFT" });
    expect(result.success).toBe(false);
  });

  it("acepta todos los status del enum", () => {
    for (const status of ["all", "PENDING", "PAID", "CANCELLED"]) {
      const result = invoiceFilterSchema.safeParse({ status });
      expect(result.success).toBe(true);
    }
  });

  it("rechaza take mayor a 100", () => {
    const result = invoiceFilterSchema.safeParse({ take: 101 });
    expect(result.success).toBe(false);
  });

  it("coerce skip desde string (query param)", () => {
    const result = invoiceFilterSchema.safeParse({ skip: "20" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.skip).toBe(20);
    }
  });
});
