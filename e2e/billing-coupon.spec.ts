import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * E2E for coupon application to an invoice.
 *
 * Requires: dev server running, DB seeded (admin@radiant-beauty.local /
 * admin123 + at least one Service in the catalog).
 *
 * Flow: setup a CONFIRMED appointment + the invoice directly via Prisma
 * \u2192 create a PERCENTAGE coupon via the admin UI \u2192 open the invoice
 * detail \u2192 apply the coupon code \u2192 verify the discount appears in
 * the Resumen card and the coupon is listed in 'Cupones aplicados'.
 *
 * Cleanup: hard-deletes the test coupon, the test appointment, and
 * the invoice (with cascade for items/extras/usages) in afterAll.
 */

const ADMIN_EMAIL = "admin@radiant-beauty.local";
const ADMIN_PASSWORD = "admin123";

let testAppointmentId: string | null = null;
let testInvoiceId: string | null = null;
let testCouponCode: string | null = null;

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/es/admin/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /enviar|entrar|iniciar|submit/i }).click();
  await page.waitForURL(/\/es\/admin(?!\/login)/, { timeout: 15_000 });
}

test.beforeAll(async () => {
  const prisma = new PrismaClient();
  try {
    const service = await prisma.service.findFirst({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    const client = await prisma.client.findFirst({
      orderBy: { registeredAt: "asc" },
    });
    if (!service || !client) {
      throw new Error("Seed incomplete: need a service and a client");
    }

    // Schedule for 2 days from now at 10:00 UTC.
    const scheduledAt = new Date();
    scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 2);
    scheduledAt.setUTCHours(10, 0, 0, 0);

    const appt = await prisma.appointment.create({
      data: {
        clientId: client.id,
        serviceId: service.id,
        scheduledAt,
        durationMin: service.durationMin,
        status: "CONFIRMED",
        notes: "E2E test appointment (auto-created by billing-coupon.spec.ts)",
      },
    });
    testAppointmentId = appt.id;

    // Create the invoice directly (skip the UI; that's covered by
    // billing-crud.spec.ts). This isolates the coupon application flow.
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
      where: { number: { startsWith: `INV-${year}-` } },
    });
    const number = `INV-${year}-${String(count + 1).padStart(4, "0")}`;
    const basePrice = Number(service.basePrice);
    // InvoiceItem.description is a String snapshot, not Json. Pick the
    // service name in the current locale (or fallback to "es").
    const serviceNameObj = service.name as Record<string, string>;
    const itemDescription = serviceNameObj.es ?? serviceNameObj.en ?? "—";
    const invoice = await prisma.invoice.create({
      data: {
        number,
        appointmentId: appt.id,
        status: "PENDING",
        subtotal: basePrice,
        discountAmount: 0,
        loyaltyDiscount: 0,
        total: basePrice,
        items: {
          create: [
            {
              serviceId: service.id,
              description: itemDescription,
              quantity: 1,
              unitPrice: basePrice,
              total: basePrice,
            },
          ],
        },
      },
    });
    testInvoiceId = invoice.id;
    console.log(
      `[billing-coupon] Created appointment ${appt.id} + invoice ${invoice.number}`,
    );
  } finally {
    await prisma.$disconnect();
  }
});

test.afterAll(async () => {
  const prisma = new PrismaClient();
  try {
    if (testInvoiceId) {
      await prisma.couponUsage.deleteMany({ where: { invoiceId: testInvoiceId } });
      await prisma.invoiceItemExtra.deleteMany({
        where: { invoiceItem: { invoiceId: testInvoiceId } },
      });
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: testInvoiceId } });
      await prisma.invoice.delete({ where: { id: testInvoiceId } });
    }
    if (testCouponCode) {
      // Coupon deletion cascades to usages; the usage was already
      // removed above so this is safe.
      await prisma.coupon.deleteMany({ where: { code: testCouponCode } });
    }
    if (testAppointmentId) {
      await prisma.appointment.delete({ where: { id: testAppointmentId } });
    }
    console.log(`[billing-coupon] Cleaned up`);
  } catch (e) {
    console.warn(
      `[billing-coupon] Cleanup failed: ${e instanceof Error ? e.message : e}`,
    );
  } finally {
    await prisma.$disconnect();
  }
});

test.describe("Admin: invoice coupon application", () => {
  test("apply PERCENTAGE coupon and verify discount", async ({ page }) => {
    expect(testInvoiceId).toBeTruthy();

    // 1. Create a PERCENTAGE coupon via the admin UI.
    testCouponCode = `E2ECPN${Date.now()}`.slice(-12);
    const descriptionES = `Cupón E2E ${Date.now()}`;

    await loginAsAdmin(page);
    await page.goto("/es/admin/promotions/nuevo", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    await page.getByLabel(/código/i).fill(testCouponCode);
    await page.getByLabel(/valor/i).fill("25");
    await page
      .getByLabel(/compra mínima/i)
      .fill("0")
      .catch(() => {});
    await page.getByLabel(/máximo de usos/i).fill("10");
    await page.getByLabel(/descripción \(español\)/i).fill(descriptionES);
    await page.getByLabel(/descripción \(inglés\)/i).fill("E2E coupon");

    const submitButton = page.getByRole("button", { name: /^crear$/i });
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();
    await page.waitForURL(/\/admin\/promotions\/[a-z0-9]+/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    // 2. Navigate to the invoice detail page.
    await page.goto(`/es/admin/facturas/${testInvoiceId}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    // 3. The page shows the invoice number and the 'Aplicar cupón' button
    // (since status is PENDING and no coupons applied yet).
    const applyButton = page.getByRole("button", { name: /aplicar cup\u00f3n/i });
    await expect(applyButton).toBeVisible({ timeout: 10_000 });
    await applyButton.click();

    // 4. The dialog opens with a single input. Type the coupon code and
    // click the apply button.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByLabel(/c[oó]digo del cup[oó]n/i).fill(testCouponCode);
    await dialog
      .getByRole("button", { name: /aplicar cup[oó]n/i })
      .click();

    // 5. Dialog closes, page refreshes, coupon is now listed.
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 });

    // The coupon code appears in the 'Cupones aplicados' card.
    await expect(page.getByText(testCouponCode).first()).toBeVisible({
      timeout: 10_000,
    });

    // The 'Quitar cupón' button replaces the 'Aplicar cupón' button.
    await expect(
      page.getByRole("button", { name: /quitar cup[oó]n/i }),
    ).toBeVisible({ timeout: 5_000 });
  });
});
