import "server-only";

import { prisma } from "@/lib/prisma";

export async function listCarouselSlides() {
  return prisma.homeCarousel.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
}

export async function listActiveCarouselSlides() {
  return prisma.homeCarousel.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
  });
}

export async function getCarouselSlideById(id: string) {
  return prisma.homeCarousel.findUnique({ where: { id } });
}
