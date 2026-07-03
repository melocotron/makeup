import "server-only";

import { prisma } from "@/lib/prisma";

export async function getSettings() {
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
}