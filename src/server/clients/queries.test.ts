import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    client: {
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getClientById, listClients } from "./queries";

const prismaMock = prisma as unknown as {
  client: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listClients", () => {
  it("returns empty list when no clients exist", async () => {
    prismaMock.client.findMany.mockResolvedValue([]);
    prismaMock.client.count.mockResolvedValue(0);

    const result = await listClients();

    expect(result).toEqual({ items: [], total: 0 });
    expect(prismaMock.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, skip: 0, take: 50 }),
    );
  });

  it("respects search, skip, and take options", async () => {
    prismaMock.client.findMany.mockResolvedValue([]);
    prismaMock.client.count.mockResolvedValue(0);

    await listClients({ search: "maria", skip: 10, take: 25 });

    expect(prismaMock.client.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            { name: { contains: "maria", mode: "insensitive" } },
            { email: { contains: "maria", mode: "insensitive" } },
          ]),
        },
        skip: 10,
        take: 25,
      }),
    );
  });

  it("formats dates as ISO strings", async () => {
    const registeredAt = new Date("2026-01-15T10:30:00Z");
    const updatedAt = new Date("2026-02-20T14:00:00Z");
    prismaMock.client.findMany.mockResolvedValue([
      {
        id: "c1",
        email: "a@x.com",
        name: "Ana",
        phone: "5511111111",
        registeredAt,
        updatedAt,
        loyaltyPoints: 100,
        appointments: [],
      },
    ]);
    prismaMock.client.count.mockResolvedValue(1);

    const result = await listClients();
    expect(result.items[0]!.registeredAt).toBe("2026-01-15T10:30:00.000Z");
    expect(result.items[0]!.updatedAt).toBe("2026-02-20T14:00:00.000Z");
  });

  it("counts PENDING, CONFIRMED, and COMPLETED appointments in appointmentCount", async () => {
    prismaMock.client.findMany.mockResolvedValue([
      {
        id: "c1",
        email: "a@x.com",
        name: "Ana",
        phone: null,
        registeredAt: new Date(),
        updatedAt: new Date(),
        loyaltyPoints: 0,
        appointments: [
          { scheduledAt: new Date("2026-03-01"), status: "PENDING" },
          { scheduledAt: new Date("2026-02-01"), status: "CONFIRMED" },
          { scheduledAt: new Date("2026-01-01"), status: "COMPLETED" },
          { scheduledAt: new Date("2025-12-01"), status: "CANCELLED" },
          { scheduledAt: new Date("2025-11-01"), status: "NO_SHOW" },
        ],
      },
    ]);
    prismaMock.client.count.mockResolvedValue(1);

    const result = await listClients();
    // All non-cancelled/non-no-show count
    expect(result.items[0]!.appointmentCount).toBe(3);
  });

  it("lastVisit is the most recent appointment date or null", async () => {
    // Prisma query is orderBy: { scheduledAt: "desc" } — the mock must
    // return appointments already sorted, matching what the DB would do.
    prismaMock.client.findMany.mockResolvedValue([
      {
        id: "c1",
        email: "a@x.com",
        name: "Ana",
        phone: null,
        registeredAt: new Date(),
        updatedAt: new Date(),
        loyaltyPoints: 0,
        appointments: [
          { scheduledAt: new Date("2026-06-15T14:00:00Z"), status: "CONFIRMED" },
          { scheduledAt: new Date("2026-05-01T10:00:00Z"), status: "COMPLETED" },
        ],
      },
    ]);
    prismaMock.client.count.mockResolvedValue(1);

    const result = await listClients();
    expect(result.items[0]!.lastVisit).toBe("2026-06-15T14:00:00.000Z");
  });

  it("lastVisit is null when client has no appointments", async () => {
    prismaMock.client.findMany.mockResolvedValue([
      {
        id: "c1",
        email: "a@x.com",
        name: "Ana",
        phone: null,
        registeredAt: new Date(),
        updatedAt: new Date(),
        loyaltyPoints: 0,
        appointments: [],
      },
    ]);
    prismaMock.client.count.mockResolvedValue(1);

    const result = await listClients();
    expect(result.items[0]!.lastVisit).toBeNull();
    expect(result.items[0]!.appointmentCount).toBe(0);
  });
});

describe("getClientById", () => {
  it("returns null when client does not exist", async () => {
    prismaMock.client.findUnique.mockResolvedValue(null);
    const result = await getClientById("missing");
    expect(result).toBeNull();
  });

  it("returns full detail with stats for an existing client", async () => {
    prismaMock.client.findUnique.mockResolvedValue({
      id: "c1",
      email: "a@x.com",
      name: "Ana",
      phone: "5511111111",
      notes: "VIP",
      registeredAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-02-01T00:00:00Z"),
      loyaltyPoints: 50,
      appointments: [
        {
          id: "a1",
          scheduledAt: new Date("2026-03-15T14:00:00Z"),
          durationMin: 60,
          status: "COMPLETED",
          service: { name: { es: "Maquillaje social", en: "Social makeup" }, basePrice: "80.00" },
        },
        {
          id: "a2",
          scheduledAt: new Date("2026-04-20T10:00:00Z"),
          durationMin: 60,
          status: "CANCELLED",
          service: { name: { es: "Maquillaje social", en: "Social makeup" }, basePrice: "80.00" },
        },
        {
          id: "a3",
          scheduledAt: new Date("2026-05-25T16:00:00Z"),
          durationMin: 120,
          status: "COMPLETED",
          service: { name: { en: "Bridal makeup" }, basePrice: "250.00" },
        },
      ],
    });

    const result = await getClientById("c1");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("c1");
    expect(result!.appointments).toHaveLength(3);
    expect(result!.stats).toEqual({
      totalAppointments: 3,
      completed: 2,
      cancelled: 1,
      totalSpent: 330, // 80 + 250 (only COMPLETED)
    });
  });

  it("localizes service name to es, falls back to '—'", async () => {
    prismaMock.client.findUnique.mockResolvedValue({
      id: "c1",
      email: "a@x.com",
      name: "Ana",
      phone: null,
      notes: null,
      registeredAt: new Date(),
      updatedAt: new Date(),
      loyaltyPoints: 0,
      appointments: [
        {
          id: "a1",
          scheduledAt: new Date(),
          durationMin: 60,
          status: "COMPLETED",
          service: { name: { en: "Bridal makeup" }, basePrice: "250.00" }, // no `es` key
        },
        {
          id: "a2",
          scheduledAt: new Date(),
          durationMin: 60,
          status: "COMPLETED",
          service: { name: null, basePrice: "50.00" }, // null
        },
      ],
    });

    const result = await getClientById("c1");
    // First appointment: no `es` → fallback "—"
    expect(result!.appointments[0]!.serviceName).toBe("—");
    // Second appointment: name is null → "—"
    expect(result!.appointments[1]!.serviceName).toBe("—");
  });
});
