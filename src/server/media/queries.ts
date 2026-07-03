import "server-only";

import { prisma } from "@/lib/prisma";

import { deleteImageFile } from "./upload";

export async function listMedia(options: {
  folder?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 24;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {};
  if (options.folder) where.folder = options.folder;
  if (options.search) {
    where.filename = { contains: options.search };
  }

  const [items, total] = await Promise.all([
    prisma.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.media.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

export async function getMediaById(id: string) {
  return prisma.media.findUnique({ where: { id } });
}

export async function deleteMedia(id: string) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) return null;

  await deleteImageFile(media.url.replace(/^\//, ""));
  await prisma.media.delete({ where: { id } });
  return media;
}

export async function getStorageStats() {
  const total = await prisma.media.count();
  const agg = await prisma.media.aggregate({
    _sum: { size: true },
  });
  return {
    count: total,
    totalBytes: agg._sum.size ?? 0,
    totalMB: Math.round(((agg._sum.size ?? 0) / (1024 * 1024)) * 100) / 100,
  };
}