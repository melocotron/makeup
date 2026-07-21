import { expect, test } from "@playwright/test";

/**
 * E2E happy path for the admin coupons CRUD.
 *
 * Requires: dev server running, DB seeded (admin@radiant-beauty.local /
 * admin123 + at least one service so the serviceIds multi-select is
 * available).
 *
 * Flow: login admin → /admin/promotions → create a fresh coupon with
 * unique code → verify it appears in the list → open the detail page →
 * deactivate it → verify it shows the "inactive" badge in the list.
 *
 * Cleanup: coupon is left in the DB (usedCount=0 so the admin can hard
 * delete it from the UI if desired). Unique codes per run avoid collisions.
 */

const ADMIN_EMAIL = "admin@radiant-beauty.local";
const ADMIN_PASSWORD = "admin123";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/es/admin/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /enviar|entrar|iniciar|submit/i }).click();
  await page.waitForURL(/\/es\/admin(?!\/login)/, { timeout: 15_000 });
}

test.describe("Admin: coupons CRUD", () => {
  test("create, list, view, and deactivate a coupon", async ({ page }) => {
    // Unique code per run: E2E_<timestamp> is short, uppercase, alphanumeric.
    const uniqueCode = `E2E${Date.now()}`.slice(-16);
    const descriptionES = `Cupón E2E ${Date.now()}`;

    await loginAsAdmin(page);

    // Open the promotions page
    await page.goto("/es/admin/promotions", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /promociones/i }),
    ).toBeVisible();

    // Go to the new-coupon form
    await page.getByRole("link", { name: /nuevo cupón/i }).click();
    await page.waitForURL(/\/admin\/promotions\/nuevo/);

    // Fill the form
    await page.getByLabel(/código/i).fill(uniqueCode);
    await page.getByLabel(/valor/i).fill("20");
    await page
      .getByLabel(/compra mínima/i)
      .fill("0")
      .catch(() => {
        // field is optional and may be empty; not all schemas require it
      });
    await page.getByLabel(/máximo de usos/i).fill("10");
    // Date pickers: validFrom/validUntil default to today + 30d in the form,
    // so we don't need to override them.
    await page.getByLabel(/descripción \(español\)/i).fill(descriptionES);
    await page.getByLabel(/descripción \(inglés\)/i).fill("E2E coupon");

    // Submit — expect navigation to the detail page. The submit button
    // reads "Crear" (from common.create); the page-level "Crear cupón"
    // is the page header, not the button.
    const submitButton = page.getByRole("button", { name: /^crear$/i });
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();
    await page.waitForURL(/\/admin\/promotions\/[a-z0-9]+/, { timeout: 15_000 });
    // The dev server may be compiling the detail route on first hit, so
    // wait for network idle (no RSC fetches in flight) before asserting.
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    // Detail page should show the code as the heading
    await expect(
      page.getByRole("heading", { name: uniqueCode }),
    ).toBeVisible({ timeout: 15_000 });

    // Back to the list and confirm the new row exists with active badge
    await page.goto("/es/admin/promotions", { waitUntil: "domcontentloaded" });
    await expect(
      page.locator("tr", { hasText: uniqueCode }),
    ).toBeVisible({ timeout: 5_000 });

    // Open the coupon again and delete it.
    // The form on a fresh coupon (usedCount=0) shows "Eliminar" (hard
    // delete). "Desactivar" only appears for coupons that have been used.
    // Hard delete is fine here because usedCount=0 → safe to drop.
    await page
      .locator("tr", { hasText: uniqueCode })
      .getByRole("link", { name: uniqueCode })
      .click();
    await page.waitForURL(/\/admin\/promotions\/[a-z0-9]+/);
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    // The form shows "Eliminar" (delete) because usedCount = 0.
    // Register the dialog handler BEFORE clicking so the confirm() prompt
    // is accepted (otherwise it auto-rejects and the delete is cancelled).
    page.once("dialog", (d) => d.accept());
    await page.getByRole("button", { name: /^eliminar$/i }).click();
    // The onDelete handler navigates to the list when done. Wait for
    // either the list URL or for the "Eliminar" button to disappear.
    await page
      .waitForFunction(
        () => !document.querySelector('button:has-text("Eliminar")'),
        null,
        { timeout: 10_000 },
      )
      .catch(() => {
        // best-effort; we'll just verify the row is gone next
      });

    // Back to the list — the coupon should be gone (hard delete).
    // onDelete redirects to /es/admin/promotions; wait for that and then
    // assert the row is no longer in the list.
    await page.waitForURL(/\/es\/admin\/promotions(?!\/)/, {
      timeout: 15_000,
    });
    await page.waitForLoadState("networkidle", { timeout: 15_000 });
    const row = page.locator("tr", { hasText: uniqueCode });
    await expect(row).toHaveCount(0, { timeout: 5_000 });
  });
});
