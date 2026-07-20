import "server-only";

import { prisma } from "@/lib/prisma";

export type ClientListItem = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  registeredAt: string; // ISO
  updatedAt: string; // ISO
  appointmentCount: number;
  lastVisit: string | null; // ISO or null
  loyaltyPoints: number;
};

export async function listClients(options: {
  search?: string;
  skip?: number;
  take?: number;
} = {}): Promise<{ items: ClientListItem[]; total: number }> {
  const { search, skip = 0, take = 50 } = options;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search.toLowerCase(), mode: "insensitive" as const } },
        ],
      }
    : {};

  const [clients, total] = await Promise.all([
    prisma.client.findMany({
      where,
      orderBy: { registeredAt: "desc" },
      skip,
      take,
      include: {
        appointments: {
          select: { scheduledAt: true, status: true },
          orderBy: { scheduledAt: "desc" },
        },
      },
    }),
    prisma.client.count({ where }),
  ]);

  const items: ClientListItem[] = clients.map((c) => {
    const completed = c.appointments.filter(
      (a) => a.status === "COMPLETED" || a.status === "CONFIRMED" || a.status === "PENDING",
    );
    return {
      id: c.id,
      email: c.email,
      name: c.name,
      phone: c.phone,
      registeredAt: c.registeredAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      appointmentCount: completed.length,
      lastVisit: c.appointments[0]?.scheduledAt.toISOString() ?? null,
      loyaltyPoints: c.loyaltyPoints,
    };
  });

  return { items, total };
}

export type ClientDetail = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  notes: string | null;
  registeredAt: string;
  updatedAt: string;
  loyaltyPoints: number;
  appointments: {
    id: string;
    scheduledAt: string;
    durationMin: number;
    status: string;
    serviceName: string; // localized to es
    servicePrice: number;
  }[];
  stats: {
    totalAppointments: number;
    completed: number;
    cancelled: number;
    totalSpent: number;
  };
};

export async function getClientById(id: string): Promise<ClientDetail | null> {
  const c = await prisma.client.findUnique({
    where: { id },
    include: {
      appointments: {
        orderBy: { scheduledAt: "desc" },
        include: {
          service: { select: { name: true, basePrice: true } },
        },
      },
    },
  });

  if (!c) return null;

  const totalSpent = c.appointments
    .filter((a) => a.status === "COMPLETED")
    .reduce((acc, a) => acc + Number(a.service.basePrice), 0);

  return {
    id: c.id,
    email: c.email,
    name: c.name,
    phone: c.phone,
    notes: c.notes,
    registeredAt: c.registeredAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    loyaltyPoints: c.loyaltyPoints,
    appointments: c.appointments.map((a) => ({
      id: a.id,
      scheduledAt: a.scheduledAt.toISOString(),
      durationMin: a.durationMin,
      status: a.status,
      serviceName:
        ((a.service.name as Record<string, string> | null)?.es ?? null) || "—",
      servicePrice: Number(a.service.basePrice),
    })),
    stats: {
      totalAppointments: c.appointments.length,
      completed: c.appointments.filter((a) => a.status === "COMPLETED").length,
      cancelled: c.appointments.filter((a) => a.status === "CANCELLED").length,
      totalSpent,
    },
  };
}
