import "server-only";

import { cache } from "react";

import { prisma } from "@/lib/prisma";

export const getSettings = cache(async () => {
  const settings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });
  if (!settings) {
    // Crear con defaults si no existe
    return prisma.settings.create({
      data: { id: "singleton" },
    });
  }
  return settings;
});