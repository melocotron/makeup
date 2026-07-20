import { expect, test } from "@playwright/test";

/**
 * E2E happy path for the public booking wizard.
 *
 * Requires: DB seeded (npm run db:seed) so services and schedules exist.
 * The wizard goes through 4 steps before showing the success screen.
 */
test.describe("Public booking wizard", () => {
  test("completes a booking from service selection to confirmation", async ({ page }) => {
    const customerEmail = `book-${Date.now()}@example.com`;

    await page.goto("/es/reservar");

    // Step 1: select the first service
    await expect(page.getByRole("heading", { name: /servicio/i })).toBeVisible();
    await page.getByRole("button").filter({ hasText: /maquillaje|peinado|asesor/i }).first().click();

    // Step 2: pick an available date (first non-disabled day in the current month)
    await expect(page.getByRole("heading", { name: /disponibilidad|horario|selecciona/i })).toBeVisible();
    const availableDay = page.locator("button:not([disabled])").filter({ hasText: /^\d+$/ }).first();
    await availableDay.click();

    // Wait for slots to load and click the first available one
    const firstSlot = page.locator("button:not([disabled])").filter({ hasText: /^\d{1,2}:\d{2}$/ }).first();
    await expect(firstSlot).toBeVisible({ timeout: 10_000 });
    await firstSlot.click();

    // Step 3: customer form
    await page.getByLabel(/nombre/i).fill("Cliente E2E");
    await page.getByLabel(/email/i).fill(customerEmail);
    await page.getByLabel(/tel[eé]fono/i).fill("5512345678");
    await page.getByRole("button", { name: /continuar|siguiente/i }).click();

    // Step 4: confirm
    await expect(page.getByText(/resumen|confirma/i)).toBeVisible();
    await page.getByRole("button", { name: /confirmar|reservar/i }).click();

    // Success screen
    await expect(page.getByText(/reserv|cita|éxito|exito|gracias/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
