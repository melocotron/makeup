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

    // Step 2: anclamos por el stepper ("Fecha y hora") en vez de un heading
    // que no existe hasta elegir fecha.
    await expect(page.getByText(/Fecha y hora/i)).toBeVisible();

    // Buscar un día con slots disponibles. Si la primera fecha no tiene,
    // avanzamos al mes siguiente. Límite: 3 meses.
    const firstSlot = page.locator("button:not([disabled])").filter({ hasText: /^\d{1,2}:\d{2}$/ }).first();
    for (let attempt = 0; attempt < 3; attempt++) {
      const availableDay = page.locator("button:not([disabled])").filter({ hasText: /^\d+$/ }).first();
      await availableDay.click();
      try {
        await expect(firstSlot).toBeVisible({ timeout: 5_000 });
        break;
      } catch {
        // El día no tiene slots (p.ej. por minAdvanceHours). Avanzar al
        // próximo mes y reintentar.
        await page.getByRole("button", { name: /mes siguiente/i }).click();
        if (attempt === 2) {
          throw new Error("No se encontraron días con slots disponibles en 3 meses");
        }
      }
    }
    await firstSlot.click();

    // Step 3: customer form
    await page.getByLabel(/nombre/i).fill("Cliente E2E");
    await page.getByLabel(/correo|email/i).fill(customerEmail);
    await page.getByLabel(/tel[eé]fono/i).fill("5512345678");
    await page.getByRole("button", { name: /continuar|siguiente/i }).click();

    // Step 4: confirm
    await expect(page.getByRole("heading", { name: /confirma tu reserva/i })).toBeVisible();
    await page.getByRole("button", { name: /confirmar|reservar/i }).click();

    // Success screen
    await expect(page.getByText(/reserv|cita|éxito|exito|gracias/i).first()).toBeVisible({ timeout: 15_000 });
  });
});
