import "server-only";

import { prisma } from "@/lib/prisma";

// Helper: convert Prisma Decimal to plain number (required for Client Components)
function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  // Prisma.Decimal has toNumber() method
  if (typeof value === "object" && "toNumber" in value && typeof (value as { toNumber: () => number }).toNumber === "function") {
    return (value as { toNumber: () => number }).toNumber();
  }
  return Number(value);
}

// Serialize service to plain object with Decimals as numbers
function serializeService<T extends { basePrice: unknown }>(service: T) {
  return {
    ...service,
    basePrice: toNumber(service.basePrice),
  };
}

function serializeServiceWithExtras<T extends { basePrice: unknown; extras?: Array<{ price: unknown }> }>(service: T) {
  return {
    ...service,
    basePrice: toNumber(service.basePrice),
    extras: (service.extras ?? []).map((e) => ({
      ...e,
      price: toNumber(e.price),
    })),
  };
}

// Serialize package to plain object
function serializePackage<T extends { totalPrice: unknown; items?: Array<{ quantity: unknown }> }>(pkg: T) {
  return {
    ...pkg,
    totalPrice: toNumber(pkg.totalPrice),
    items: (pkg.items ?? []).map((item) => ({
      ...item,
      quantity: typeof item.quantity === "number" ? item.quantity : Number(item.quantity),
    })),
  };
}

export async function listServices(options: { includeInactive?: boolean } = {}) {
  const services = await prisma.service.findMany({
    where: options.includeInactive ? {} : { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      extras: {
        where: { isActive: true },
        orderBy: { id: "asc" },
      },
    },
  });
  return services.map(serializeServiceWithExtras);
}

export async function listAllServices() {
  const services = await prisma.service.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { extras: true, packageItems: true } },
    },
  });
  return services.map((s) => ({
    ...serializeService(s),
    _count: s._count,
  }));
}

export async function getServiceById(id: string) {
  const service = await prisma.service.findUnique({
    where: { id },
    include: { extras: { orderBy: { id: "asc" } } },
  });
  if (!service) return null;
  return serializeServiceWithExtras(service);
}

export async function listPackages(options: { includeInactive?: boolean } = {}) {
  const packages = await prisma.package.findMany({
    where: options.includeInactive ? {} : { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      items: {
        include: {
          service: { select: { id: true, name: true } },
        },
      },
    },
  });
  return packages.map(serializePackage);
}

export async function listAllPackages() {
  const packages = await prisma.package.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { items: true } },
    },
  });
  return packages.map((p) => ({
    ...serializePackage(p),
    _count: p._count,
  }));
}

export async function getPackageById(id: string) {
  const pkg = await prisma.package.findUnique({
    where: { id },
    include: {
      items: {
        include: { service: true },
        orderBy: { id: "asc" },
      },
    },
  });
  if (!pkg) return null;
  return serializePackage(pkg);
}