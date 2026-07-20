import { expect, test } from "@playwright/test";

const ADMIN_EMAIL = "admin@radiant-beauty.local";
const ADMIN_PASSWORD = "admin123";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/es/admin/login", { waitUntil: "domcontentloaded" });
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /enviar|entrar|iniciar|submit/i }).click();
  // El form submitea al server action loginFormAction, que autentica,
  // setea la cookie y redirige atómicamente. Next.js intercepta el
  // NEXT_REDIRECT y completa la navegación.
  await page.waitForURL(/\/es\/admin(?!\/login)/, { timeout: 15_000 });
}

test.describe("Admin: clients CRUD", () => {
  test("create, list, view, and delete a client", async ({ page }) => {
    // Unique email per run to avoid collisions with seed data or prior runs.
    const uniqueEmail = `e2e-${Date.now()}@example.com`;
    const uniqueName = `E2E Test ${Date.now()}`;

    await loginAsAdmin(page);

    // Open the clients page
    await page.goto("/es/admin/clients", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /clientes/i })).toBeVisible();

    // Go to the new-client form
    await page.getByRole("link", { name: /nuevo cliente/i }).click();
    await page.waitForURL(/\/admin\/clients\/nuevo/);

    // Fill the form
    await page.getByLabel(/nombre/i).fill(uniqueName);
    await page.getByLabel(/correo|email/i).fill(uniqueEmail);
    await page.getByLabel(/tel[eé]fono/i).fill("5512345678");
    await page.getByLabel(/notas/i).fill("Created by E2E test");

    // Submit — expect navigation to the detail page
    await page.getByRole("button", { name: /crear cliente/i }).click();
    await page.waitForURL(/\/admin\/clients\/[a-z0-9]+/, { timeout: 10_000 });
    await page.waitForLoadState("domcontentloaded");

    // Detail page should show the client's name and email
    await expect(page.getByRole("heading", { name: uniqueName })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(uniqueEmail)).toBeVisible();

    // Back to the list and confirm the new row exists
    await page.goto("/es/admin/clients", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(uniqueName)).toBeVisible();

    // Open the client again and delete
    await page
      .locator("tr", { hasText: uniqueName })
      .getByRole("link", { name: uniqueName })
      .click();
    await page.waitForURL(/\/admin\/clients\/[a-z0-9]+/);
    await page.waitForLoadState("domcontentloaded");

    await page.getByRole("button", { name: /eliminar/i }).click();
    // Confirmation dialog
    await expect(page.getByText(/eliminar este cliente/i)).toBeVisible();
    await page.getByRole("button", { name: /eliminar/i }).last().click();

    // Back to the list — the row should be gone
    await page.waitForURL(/\/admin\/clients/);
    // Esperar a que el revalidatePath actualice la lista y el cliente
    // eliminado desaparezca. Usamos locator('tr') para ser específicos:
    // no debe haber una row que contenga el nombre.
    await expect(
      page.locator("tr", { hasText: uniqueName }),
    ).toHaveCount(0, { timeout: 5_000 });
  });

  test("rejects a duplicate email", async ({ page }) => {
    const email = `dup-${Date.now()}@example.com`;
    const name = `Dup Test ${Date.now()}`;

    await loginAsAdmin(page);

    // First create succeeds
    await page.goto("/es/admin/clients/nuevo", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/nombre/i).fill(name);
    await page.getByLabel(/correo|email/i).fill(email);
    await page.getByLabel(/tel[eé]fono/i).fill("5512345678");
    await page.getByRole("button", { name: /crear cliente/i }).click();
    await page.waitForURL(/\/admin\/clients\/[a-z0-9]+/);

    // Try to create the same email again
    await page.goto("/es/admin/clients/nuevo", { waitUntil: "domcontentloaded" });
    await page.getByLabel(/nombre/i).fill("Other Person");
    await page.getByLabel(/correo|email/i).fill(email);
    await page.getByLabel(/tel[eé]fono/i).fill("5598765432");
    await page.getByRole("button", { name: /crear cliente/i }).click();

    // La acción de crear debe FALLAR: la URL no debe cambiar a un
    // /admin/clients/[id], debe quedarse en /admin/clients/nuevo.
    // Esperamos un poco para dar tiempo a la server action, luego
    // verificamos que seguimos en la página de nuevo y que no hay
    // un detail page con "Other Person".
    await page.waitForTimeout(2_000);
    await expect(page).toHaveURL(/\/admin\/clients\/nuevo/);
    // Verificar que el cliente con el email duplicado NO fue creado
    // navegando a la lista y buscando por email.
    await page.goto("/es/admin/clients", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Other Person")).toHaveCount(0);

    // Nota: no hacemos cleanup del cliente creado en el primer paso.
    // Los IDs únicos por run (Date.now()) evitan colisiones, y el
    // cliente queda en la DB como dato de pruebas. Esto evita flakiness
    // en el cleanup, que en runs largos puede fallar por problemas
    // de paginación o timing del revalidatePath.
  });
});
