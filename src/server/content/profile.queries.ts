import "server-only";

import { prisma } from "@/lib/prisma";

export async function getAboutContent() {
  return prisma.aboutContent.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
}