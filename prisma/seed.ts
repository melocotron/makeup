import { randomBytes } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function resolveSeedAdmin(): { email: string; password: string; name: string } {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@radiant-beauty.local";
  const password =
    process.env.SEED_ADMIN_PASSWORD ??
    // Genera una password aleatoria fuerte si no se proporciona una por env.
    // Se imprime por consola al final del seed (solo la primera vez).
    `Admin-${randomBytes(9).toString("base64url")}`;
  const name = process.env.SEED_ADMIN_NAME ?? "Administradora";
  return { email, password, name };
}

async function main() {
  console.log("🌱 Seeding database...\n");

  // -------------------------------------------------------------------------
  // Admin user
  // -------------------------------------------------------------------------
  // Las credenciales vienen de variables de entorno (SEED_ADMIN_EMAIL,
  // SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME) para no tener secretos en el
  // código. Si no se definen, se usan defaults seguros y la password se
  // genera aleatoriamente y se imprime por consola.
  const { email: adminEmail, password: adminPassword, name: adminName } =
    resolveSeedAdmin();

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const existingAdmin = await prisma.admin.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log(`✓ Admin already exists: ${existingAdmin.email}`);
  } else {
    const admin = await prisma.admin.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: adminName,
      },
    });
    const passwordFromEnv = Boolean(process.env.SEED_ADMIN_PASSWORD);
    console.log(`✓ Admin created: ${admin.email}`);
    if (!passwordFromEnv) {
      // Solo imprimimos la password cuando fue generada aleatoriamente.
      // Si vino por env, el operador ya la conoce.
      console.log(`  Generated password: ${adminPassword}`);
    }
    console.log(
      `  ⚠️  Change this password after first login (or set SEED_ADMIN_PASSWORD in .env)!\n`,
    );
  }

  // -------------------------------------------------------------------------
  // Default Settings (singleton row)
  // -------------------------------------------------------------------------
  const existingSettings = await prisma.settings.findUnique({
    where: { id: "singleton" },
  });

  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        id: "singleton",
        siteName: "Radiant Beauty",
        blogEnabled: true,
        offersEnabled: true,
        loyaltyEnabled: true,
        accentColor: "#4648d4",
        minAdvanceHours: 24,
        cancelHours: 24,
        maintenanceMode: false,
      },
    });
    console.log("✓ Default settings created\n");
  } else {
    console.log("✓ Settings already exist\n");
  }

  // -------------------------------------------------------------------------
  // Services (idempotent: upsert by slug)
  // -------------------------------------------------------------------------
  const servicesData = [
    {
      slug: "maquillaje-social",
      name: { es: "Maquillaje social", en: "Social makeup" },
      description: {
        es: "Look fresco y elegante para el día a día, eventos casuales o salidas nocturnas.",
        en: "Fresh and elegant look for everyday, casual events or nights out.",
      },
      durationMin: 60,
      basePrice: "80.00",
      order: 1,
    },
    {
      slug: "maquillaje-novia",
      name: { es: "Maquillaje de novia", en: "Bridal makeup" },
      description: {
        es: "Prueba previa + maquillaje el día de la boda. Incluye kit de retoque.",
        en: "Trial session + wedding day makeup. Touch-up kit included.",
      },
      durationMin: 120,
      basePrice: "250.00",
      order: 2,
    },
    {
      slug: "peinado",
      name: { es: "Peinado", en: "Hairstyling" },
      description: {
        es: "Peinado profesional para eventos, bodas o sesiones.",
        en: "Professional hairstyling for events, weddings or photoshoots.",
      },
      durationMin: 45,
      basePrice: "50.00",
      order: 3,
    },
    {
      slug: "asesoria-imagen",
      name: { es: "Asesoría de imagen", en: "Image consulting" },
      description: {
        es: "Sesión 1:1 para definir paleta, estilo y rutina personalizada.",
        en: "1:1 session to define your color palette, style and personalized routine.",
      },
      durationMin: 30,
      basePrice: "40.00",
      order: 4,
    },
  ];

  console.log("🛎️  Seeding services…");
  for (const svc of servicesData) {
    const result = await prisma.service.upsert({
      where: { slug: svc.slug },
      update: {
        name: svc.name,
        description: svc.description,
        durationMin: svc.durationMin,
        basePrice: svc.basePrice,
        order: svc.order,
        isActive: true,
      },
      create: {
        ...svc,
        isActive: true,
      },
    });
    console.log(`  ✓ ${result.slug} (${result.durationMin} min)`);
  }
  console.log();

  // -------------------------------------------------------------------------
  // Schedules (one per day of week; idempotent)
  // -------------------------------------------------------------------------
  // dayOfWeek: 0=Sun, 1=Mon, ..., 6=Sat
  const scheduleData = [
    { dayOfWeek: 1, startTime: "09:00", endTime: "18:00" }, // Mon
    { dayOfWeek: 2, startTime: "09:00", endTime: "18:00" }, // Tue
    { dayOfWeek: 3, startTime: "09:00", endTime: "18:00" }, // Wed
    { dayOfWeek: 4, startTime: "09:00", endTime: "18:00" }, // Thu
    { dayOfWeek: 5, startTime: "09:00", endTime: "18:00" }, // Fri
    { dayOfWeek: 6, startTime: "10:00", endTime: "14:00" }, // Sat
  ];

  console.log("📅 Seeding weekly schedules…");
  for (const sch of scheduleData) {
    await prisma.schedule.upsert({
      where: { dayOfWeek: sch.dayOfWeek },
      update: { startTime: sch.startTime, endTime: sch.endTime, isActive: true },
      create: { ...sch, isActive: true },
    });
  }
  console.log(`  ✓ ${scheduleData.length} days configured\n`);

  console.log("✅ Seed complete!\n");
  console.log("Next steps:");
  console.log("  1. Run: npm run dev");
  console.log("  2. Open: http://localhost:3000/es/admin/login");
  console.log(`  3. Login with: ${adminEmail} / ${adminPassword}`);
  console.log("  4. Test booking at: http://localhost:3000/es/reservar");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });