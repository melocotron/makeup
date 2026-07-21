import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/**
 * E2E happy path for the admin invoices CRUD.
 *
 * Requires: dev server running, DB seeded (admin@radiant-beauty.local /
 * admin123 + at least one Service in the catalog).
 *
 * Flow: setup a CONFIRMED appointment directly via Prisma \u2192 login
 * admin \u2192 open the appointment detail \u2192 click 'Crear factura' \u2192
 * land on invoice detail \u2192 verify number + status PENDING \u2192 open
 * 'Marcar como pagada' dialog \u2192 fill payment method \u2192 submit \u2192
 * verify status PAID.
 *
 * Cleanup: hard-deletes the test appointment (and its invoice) in
 * afterAll so the next run starts clean. The test is self-contained
 * \u2014 it does not depend on a specific seed appointment.
 */

const ADMIN_EMAIL = "admin@radiant-beauty.local";
const ADMIN_PASSWORD = "admin123";

// Module-scoped state shared between beforeAll \u2192 test \u2192 afterAll.
let testAppointmentId: string | null = null;
let testInvoiceId: string | null = null;

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/es/admin/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /enviar|entrar|iniciar|submit/i }).click();
  await page.waitForURL(/\/es\/admin(?!\/login)/, { timeout: 15_000 });
}

test.beforeAll(async () => {
  // Create a CONFIRMED appointment directly via Prisma. This makes the
  // test independent of seed state.
  const prisma = new PrismaClient();
  try {
    // Get the first active service and an existing client.
    const service = await prisma.service.findFirst({
      where: { isActive: true },
      orderBy: { order: "asc" },
    });
    const client = await prisma.client.findFirst({
      orderBy: { registeredAt: "asc" },
    });
    if (!service || !client) {
      throw new Error("Seed incomplete: need at least one service and one client");
    }

    // Schedule for 2 days from now at 10:00 UTC to be safely in the future.
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
        notes: "E2E test appointment (auto-created by billing-crud.spec.ts)",
      },
    });
    testAppointmentId = appt.id;
    console.log(`[billing-crud] Created appointment ${appt.id} (client=${client.name}, service=${JSON.stringify(service.name)})`);
  } finally {
    await prisma.$disconnect();
  }
});

test.afterAll(async () => {
  // Cleanup: delete the invoice (if any) and the appointment.
  // Invoice cascades from appointment deletion only if there's a FK cascade;
  // looking at the schema, Invoice.appointmentId is @unique (not @relation
  // with onDelete: Cascade), so we delete the invoice explicitly first.
  if (!testAppointmentId) return;
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
    await prisma.appointment.delete({ where: { id: testAppointmentId } });
    console.log(`[billing-crud] Cleaned up appointment ${testAppointmentId}`);
  } catch (e) {
    console.warn(`[billing-crud] Cleanup failed: ${e instanceof Error ? e.message : e}`);
  } finally {
    await prisma.$disconnect();
  }
});

test.describe("Admin: invoices CRUD", () => {
  test("create invoice from appointment, mark as paid", async ({ page }) => {
    expect(testAppointmentId).toBeTruthy();

    await loginAsAdmin(page);

    // Navigate to the appointment detail
    await page.goto(`/es/admin/appointments/${testAppointmentId}`, {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    // The BillingSection should show the 'Crear factura' button because
    // status is CONFIRMED and no invoice exists yet.
    const createButton = page.getByRole("button", { name: /crear factura/i });
    await expect(createButton).toBeVisible({ timeout: 10_000 });
    await createButton.click();

    // The button calls createInvoiceForAppointment and router.pushes to
    // the new invoice detail page.
    await page.waitForURL(/\/admin\/facturas\/[a-z0-9]+/, { timeout: 15_000 });
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    // The detail page shows the invoice number as the page header title.
    // The number has the form INV-YYYY-NNNN.
    await expect(
      page.getByRole("heading", { name: /^INV-\d{4}-\d{4}$/ }),
    ).toBeVisible({ timeout: 15_000 });

    // Extract the invoice id from the URL for cleanup
    const url = page.url();
    const match = url.match(/\/admin\/facturas\/([a-z0-9]+)/);
    if (match && match[1]) testInvoiceId = match[1];

    // Status badge should be PENDING (uppercase, in the PageHeader)
    await expect(page.getByText(/^PENDING$/i).first()).toBeVisible();

    // Click "Marcar como pagada" \u2192 fill the form \u2192 submit
    await page.getByRole("button", { name: /marcar como pagada/i }).click();
    // Dialog: paymentMethod (efectivo default), paidAt (today), notes (optional)
    // The form has a select for paymentMethod already pre-filled.
    // Just submit. If the dialog requires fields, the submit will toast the error.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 5_000 });
    await dialog.getByRole("button", { name: /marcar como pagada/i }).click();

    // Wait for the dialog to close (action completed)
    await expect(dialog).not.toBeVisible({ timeout: 10_000 });

    // Status badge should now be PAID
    await expect(page.getByText(/^PAID$/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
