import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = "admin@radiant-beauty.local";
const ADMIN_PASSWORD = "admin123";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/es/admin/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel(/contrase|password/i).first().fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /entrar|submit|iniciar/i }).click();
  await page.waitForURL(/\/es\/admin(?!\/login)/, { timeout: 10_000 });
}

test.describe("Admin: clients CRUD", () => {
  test("create, list, view, and delete a client", async ({ page }) => {
    // Unique email per run to avoid collisions with seed data or prior runs.
    const uniqueEmail = `e2e-${Date.now()}@example.com`;
    const uniqueName = `E2E Test ${Date.now()}`;

    await loginAsAdmin(page);

    // Open the clients page
    await page.goto("/es/admin/clients");
    await expect(page.getByRole("heading", { name: /clientes/i })).toBeVisible();

    // Go to the new-client form
    await page.getByRole("link", { name: /nuevo cliente/i }).click();
    await page.waitForURL(/\/admin\/clients\/nuevo/);

    // Fill the form
    await page.getByLabel(/nombre/i).fill(uniqueName);
    await page.getByLabel(/email/i).fill(uniqueEmail);
    await page.getByLabel(/tel[eé]fono/i).fill("5512345678");
    await page.getByLabel(/notas/i).fill("Created by E2E test");

    // Submit — expect navigation to the detail page
    await page.getByRole("button", { name: /crear cliente/i }).click();
    await page.waitForURL(/\/admin\/clients\/[a-z0-9]+/);

    // Detail page should show the client's name and email
    await expect(page.getByText(uniqueName)).toBeVisible();
    await expect(page.getByText(uniqueEmail)).toBeVisible();

    // Back to the list and confirm the new row exists
    await page.goto("/es/admin/clients");
    await expect(page.getByText(uniqueName)).toBeVisible();

    // Open the client again and delete
    await page.getByRole("row", { name: new RegExp(uniqueName) }).click();
    await page.waitForURL(/\/admin\/clients\/[a-z0-9]+/);

    await page.getByRole("button", { name: /eliminar/i }).click();
    // Confirmation dialog
    await expect(page.getByText(/eliminar este cliente/i)).toBeVisible();
    await page.getByRole("button", { name: /eliminar/i }).last().click();

    // Back to the list — the row should be gone
    await page.waitForURL(/\/admin\/clients/);
    await expect(page.getByText(uniqueName)).not.toBeVisible();
  });

  test("rejects a duplicate email", async ({ page }) => {
    const email = `dup-${Date.now()}@example.com`;
    const name = `Dup Test ${Date.now()}`;

    await loginAsAdmin(page);

    // First create succeeds
    await page.goto("/es/admin/clients/nuevo");
    await page.getByLabel(/nombre/i).fill(name);
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/tel[eé]fono/i).fill("5512345678");
    await page.getByRole("button", { name: /crear cliente/i }).click();
    await page.waitForURL(/\/admin\/clients\/[a-z0-9]+/);

    // Try to create the same email again
    await page.goto("/es/admin/clients/nuevo");
    await page.getByLabel(/nombre/i).fill("Other Person");
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/tel[eé]fono/i).fill("5598765432");
    await page.getByRole("button", { name: /crear cliente/i }).click();

    // Toast should show the duplicate error
    await expect(page.getByText(/ya existe un cliente con este email/i)).toBeVisible();

    // Clean up
    await page.goto("/es/admin/clients");
    await page.getByRole("row", { name: new RegExp(name) }).click();
    await page.getByRole("button", { name: /eliminar/i }).click();
    await page.getByRole("button", { name: /eliminar/i }).last().click();
    await page.waitForURL(/\/admin\/clients/);
  });
});
