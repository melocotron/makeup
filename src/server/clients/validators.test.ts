import { describe, expect, it } from "vitest";

import { createClientSchema, updateClientSchema } from "./validators";

describe("createClientSchema", () => {
  const validInput = {
    email: "  Maria.Lopez@Example.COM  ",
    name: "  María López  ",
    phone: "  55 1234 5678  ",
    notes: "  VIP client  ",
  };

  it("accepts a valid payload and normalizes whitespace/case", () => {
    const result = createClientSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("maria.lopez@example.com");
      expect(result.data.name).toBe("María López");
      expect(result.data.phone).toBe("55 1234 5678");
      expect(result.data.notes).toBe("VIP client");
    }
  });

  it("accepts empty notes string", () => {
    const result = createClientSchema.safeParse({ ...validInput, notes: "" });
    expect(result.success).toBe(true);
  });

  it("accepts missing notes", () => {
    const { notes: _notes, ...rest } = validInput;
    const result = createClientSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it("rejects malformed email", () => {
    const result = createClientSchema.safeParse({ ...validInput, email: "not-an-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "email")).toBe(true);
    }
  });

  it("rejects email longer than 254 characters", () => {
    const longLocal = "a".repeat(250);
    const result = createClientSchema.safeParse({ ...validInput, email: `${longLocal}@x.com` });
    expect(result.success).toBe(false);
  });

  it("rejects name shorter than 2 characters", () => {
    const result = createClientSchema.safeParse({ ...validInput, name: "A" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 characters", () => {
    const result = createClientSchema.safeParse({ ...validInput, name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("rejects phone shorter than 8 characters", () => {
    const result = createClientSchema.safeParse({ ...validInput, phone: "1234567" });
    expect(result.success).toBe(false);
  });

  it("rejects phone longer than 20 characters", () => {
    const result = createClientSchema.safeParse({ ...validInput, phone: "1".repeat(21) });
    expect(result.success).toBe(false);
  });

  it("rejects notes longer than 500 characters", () => {
    const result = createClientSchema.safeParse({ ...validInput, notes: "a".repeat(501) });
    expect(result.success).toBe(false);
  });

  it("rejects empty payload", () => {
    const result = createClientSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe("updateClientSchema", () => {
  const validInput = {
    id: "client_123",
    email: "maria@example.com",
    name: "María López",
    phone: "5512345678",
  };

  it("accepts a valid payload with id", () => {
    const result = updateClientSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects empty id", () => {
    const result = updateClientSchema.safeParse({ ...validInput, id: "" });
    expect(result.success).toBe(false);
  });

  it("inherits all create validations", () => {
    const result = updateClientSchema.safeParse({ ...validInput, email: "bad" });
    expect(result.success).toBe(false);
  });
});
