import { describe, expect, it } from "vitest";

import {
  createAppointmentSchema,
  scheduleExceptionSchema,
  scheduleSchema,
  updateAppointmentSchema,
  updateAppointmentStatusSchema,
} from "./validators";

describe("createAppointmentSchema", () => {
  const validInput = {
    serviceId: "svc_123",
    date: "2026-12-15",
    time: "14:30",
    customer: {
      name: "Ana Pérez",
      email: "ana@example.com",
      phone: "55 1234 5678",
      notes: "Prefiere maquillaje natural",
    },
  };

  it("accepts a valid payload", () => {
    const result = createAppointmentSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("accepts customer without notes", () => {
    const { notes: _notes, ...customer } = validInput.customer;
    const result = createAppointmentSchema.safeParse({ ...validInput, customer });
    expect(result.success).toBe(true);
  });

  it("rejects date in wrong format (DD-MM-YYYY)", () => {
    const result = createAppointmentSchema.safeParse({ ...validInput, date: "15-12-2026" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid time (25:00)", () => {
    const result = createAppointmentSchema.safeParse({ ...validInput, time: "25:00" });
    expect(result.success).toBe(false);
  });

  it("rejects single-digit hour (9:00)", () => {
    const result = createAppointmentSchema.safeParse({ ...validInput, time: "9:00" });
    expect(result.success).toBe(false);
  });

  it("rejects phone with letters", () => {
    const result = createAppointmentSchema.safeParse({
      ...validInput,
      customer: { ...validInput.customer, phone: "abc12345" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty serviceId", () => {
    const result = createAppointmentSchema.safeParse({ ...validInput, serviceId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects customer name shorter than 2 characters", () => {
    const result = createAppointmentSchema.safeParse({
      ...validInput,
      customer: { ...validInput.customer, name: "A" },
    });
    expect(result.success).toBe(false);
  });
});

describe("updateAppointmentStatusSchema", () => {
  const base = { id: "appt_123", status: "CONFIRMED" as const };

  it("accepts CONFIRMED without cancelReason", () => {
    const result = updateAppointmentStatusSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("accepts CANCELLED with cancelReason", () => {
    const result = updateAppointmentStatusSchema.safeParse({
      ...base,
      status: "CANCELLED",
      cancelReason: "Cliente canceló por enfermedad",
    });
    expect(result.success).toBe(true);
  });

  it("rejects CANCELLED without cancelReason (refine)", () => {
    const result = updateAppointmentStatusSchema.safeParse({ ...base, status: "CANCELLED" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "cancelReason")).toBe(true);
    }
  });

  it("rejects CANCELLED with whitespace-only cancelReason (refine)", () => {
    const result = updateAppointmentStatusSchema.safeParse({
      ...base,
      status: "CANCELLED",
      cancelReason: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status enum", () => {
    const result = updateAppointmentStatusSchema.safeParse({ ...base, status: "WHATEVER" });
    expect(result.success).toBe(false);
  });
});

describe("updateAppointmentSchema", () => {
  it("accepts partial update (only internalNotes)", () => {
    const result = updateAppointmentSchema.safeParse({
      id: "appt_123",
      internalNotes: "Cliente pidió retoque a las 15:00",
    });
    expect(result.success).toBe(true);
  });

  it("accepts partial customer update (only phone)", () => {
    const result = updateAppointmentSchema.safeParse({
      id: "appt_123",
      customer: { phone: "5598765432" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects internalNotes longer than 2000", () => {
    const result = updateAppointmentSchema.safeParse({
      id: "appt_123",
      internalNotes: "x".repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe("scheduleSchema", () => {
  it("accepts a valid weekday", () => {
    const result = scheduleSchema.safeParse({
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "18:00",
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  it("rejects dayOfWeek out of range (7)", () => {
    const result = scheduleSchema.safeParse({
      dayOfWeek: 7,
      startTime: "09:00",
      endTime: "18:00",
      isActive: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-integer dayOfWeek", () => {
    const result = scheduleSchema.safeParse({
      dayOfWeek: 1.5,
      startTime: "09:00",
      endTime: "18:00",
      isActive: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("scheduleExceptionSchema", () => {
  it("accepts a valid blocked date", () => {
    const result = scheduleExceptionSchema.safeParse({
      date: "2026-12-25",
      reason: "Navidad",
      isBlocked: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts a date with no reason (optional)", () => {
    const result = scheduleExceptionSchema.safeParse({
      date: "2026-12-25",
      isBlocked: true,
    });
    expect(result.success).toBe(true);
  });
});
