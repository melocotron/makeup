import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // -------------------------------------------------------------------------
  // Admin user
  // -------------------------------------------------------------------------
  const adminEmail = "admin@radiant-beauty.local";
  const adminPassword = "admin123";
  const adminName = "Administradora";

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
    console.log(`✓ Admin created: ${admin.email}`);
    console.log(`  Password: ${adminPassword}`);
    console.log(`  ⚠️  Change this password after first login!\n`);
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

  console.log("✅ Seed complete!\n");
  console.log("Next steps:");
  console.log("  1. Run: npm run dev");
  console.log("  2. Open: http://localhost:3000/es/admin/login");
  console.log(`  3. Login with: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });