import "server-only";

import { prisma } from "@/lib/prisma";

export async function listServices(options: { includeInactive?: boolean } = {}) {
  return prisma.service.findMany({
    where: options.includeInactive ? {} : { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      extras: {
        where: { isActive: true },
        orderBy: { id: "asc" },
      },
    },
  });
}

export async function listAllServices() {
  return prisma.service.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { extras: true, packageItems: true } },
    },
  });
}

export async function getServiceById(id: string) {
  return prisma.service.findUnique({
    where: { id },
    include: { extras: { orderBy: { id: "asc" } } },
  });
}

export async function listPackages(options: { includeInactive?: boolean } = {}) {
  return prisma.package.findMany({
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
}

export async function listAllPackages() {
  return prisma.package.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: {
      _count: { select: { items: true } },
    },
  });
}

export async function getPackageById(id: string) {
  return prisma.package.findUnique({
    where: { id },
    include: {
      items: {
        include: { service: true },
        orderBy: { id: "asc" },
      },
    },
  });
}