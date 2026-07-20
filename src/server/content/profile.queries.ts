import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

export const getAboutContent = cache(async () => {
  return prisma.aboutContent.upsert({
    where: { id: "singleton" },
    create: { id: "singleton" },
    update: {},
  });
});