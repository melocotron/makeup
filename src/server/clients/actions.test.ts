import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidatePathMock, authMock, prismaMock } = vi.hoisted(() => {
  const revalidatePathMock = vi.fn();
  const authMock = vi.fn();
  const prismaMock = {
    client: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    appointment: {
      count: vi.fn(),
    },
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
  createClientAction,
  deleteClientAction,
  updateClientAction,
} from "./actions";

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

const validInput = {
  email: "maria@example.com",
  name: "María López",
  phone: "5512345678",
  notes: "",
};

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ user: { id: "admin_1", email: "admin@x.com" } });
  revalidatePathMock.mockClear();
});

describe("createClientAction", () => {
  it("rejects when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const result = await createClientAction(makeFormData(validInput));
    expect(result).toEqual({ success: false, error: "No autenticado" });
    expect(prismaMock.client.create).not.toHaveBeenCalled();
  });

  it("rejects invalid payload with field-pathed error", async () => {
    const result = await createClientAction(
      makeFormData({ ...validInput, email: "not-an-email" }),
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/email/i);
    }
    expect(prismaMock.client.create).not.toHaveBeenCalled();
  });

  it("rejects when email already exists", async () => {
    prismaMock.client.findUnique.mockResolvedValue({ id: "existing_id" });
    const result = await createClientAction(makeFormData(validInput));
    expect(result).toEqual({
      success: false,
      error: "Ya existe un cliente con este email",
    });
    expect(prismaMock.client.create).not.toHaveBeenCalled();
  });

  it("creates the client and revalidates the path", async () => {
    prismaMock.client.findUnique.mockResolvedValue(null);
    prismaMock.client.create.mockResolvedValue({ id: "new_id" });

    const result = await createClientAction(makeFormData(validInput));

    expect(result).toEqual({ success: true, id: "new_id" });
    expect(prismaMock.client.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "maria@example.com",
          name: "María López",
        }),
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/clients");
  });

  it("returns error message on DB failure", async () => {
    prismaMock.client.findUnique.mockResolvedValue(null);
    prismaMock.client.create.mockRejectedValue(new Error("FK violation"));

    const result = await createClientAction(makeFormData(validInput));
    expect(result).toEqual({ success: false, error: "FK violation" });
  });
});

describe("updateClientAction", () => {
  const updateInput = { id: "c1", ...validInput };

  it("rejects when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const result = await updateClientAction(makeFormData(updateInput));
    expect(result).toEqual({ success: false, error: "No autenticado" });
  });

  it("rejects when another client already uses the email", async () => {
    prismaMock.client.findFirst.mockResolvedValue({ id: "other_id" });
    const result = await updateClientAction(makeFormData(updateInput));
    expect(result).toEqual({
      success: false,
      error: "Otro cliente ya usa este email",
    });
    expect(prismaMock.client.update).not.toHaveBeenCalled();
  });

  it("updates successfully and revalidates list + detail", async () => {
    prismaMock.client.findFirst.mockResolvedValue(null);
    prismaMock.client.update.mockResolvedValue({ id: "c1" });

    const result = await updateClientAction(makeFormData(updateInput));
    expect(result).toEqual({ success: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/clients");
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/clients/c1");
  });
});

describe("deleteClientAction", () => {
  it("rejects when not authenticated", async () => {
    authMock.mockResolvedValueOnce(null);
    const result = await deleteClientAction("c1");
    expect(result).toEqual({ success: false, error: "No autenticado" });
  });

  it("rejects when client has appointments", async () => {
    prismaMock.appointment.count.mockResolvedValue(3);
    const result = await deleteClientAction("c1");
    expect(result).toEqual({
      success: false,
      error: "No se puede eliminar: el cliente tiene 3 cita(s). Cancela las citas primero.",
    });
    expect(prismaMock.client.delete).not.toHaveBeenCalled();
  });

  it("deletes successfully and revalidates the list", async () => {
    prismaMock.appointment.count.mockResolvedValue(0);
    prismaMock.client.delete.mockResolvedValue({ id: "c1" });

    const result = await deleteClientAction("c1");
    expect(result).toEqual({ success: true });
    expect(prismaMock.client.delete).toHaveBeenCalledWith({ where: { id: "c1" } });
    expect(revalidatePathMock).toHaveBeenCalledWith("/admin/clients");
  });

  it("returns error message on DB failure", async () => {
    prismaMock.appointment.count.mockResolvedValue(0);
    prismaMock.client.delete.mockRejectedValue(new Error("Record not found"));

    const result = await deleteClientAction("c1");
    expect(result).toEqual({ success: false, error: "Record not found" });
  });
});
