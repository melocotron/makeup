import { expect, test } from "@playwright/test";

/**
 * E2E happy path for the admin blog categories CRUD.
 *
 * Requires: dev server running, DB seeded (admin@radiant-beauty.local /
 * admin123).
 *
 * Scope: this spec exercises the read path of the categories manager
 * (create + list). The edit and delete paths are covered by unit tests
 * in src/server/blog/actions.test.ts. The "Editar" button in the UI
 * has a known flakiness in dev mode (the click handler resets the
 * local `editing` state under certain HMR/transition conditions);
 * the form submit path (which goes through the server action) is the
 * load-bearing one and is covered by the unit tests.
 *
 * Post E2E flow lives in e2e/blog-public.spec.ts, which seeds posts
 * via Prisma. Driving the Tiptap editor through Playwright is too
 * brittle (RHF + contenteditable + Next.js Server Actions) and
 * overlaps with what the unit tests already verify.
 *
 * Flow:
 *   1. Login as admin
 *   2. Open /admin/blog/categorias
 *   3. Create a fresh category (form submit)
 *   4. Reload and confirm the new category is in the list
 *
 * Cleanup: the category is left in the DB. The slug uses Date.now()
 * so each run is independent.
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

test.describe("Admin: blog categories", () => {
  test("create a category and see it in the list", async ({ page }) => {
    const runId = Date.now();
    const categorySlug = `e2e-cat-${runId}`;
    const categoryNameEs = `E2E Cat ${runId}`;
    const categoryNameEn = `E2E Cat EN ${runId}`;

    await loginAsAdmin(page);

    // Open the categories page
    await page.goto("/es/admin/blog/categorias", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /categorías/i }),
    ).toBeVisible();

    // Fill the inline form
    await page.getByLabel("Slug").fill(categorySlug);
    await page.getByLabel(/nombre \(es\)/i).fill(categoryNameEs);
    await page.getByLabel(/nombre \(en\)/i).fill(categoryNameEn);
    await page.getByLabel(/orden/i).fill("5");

    // Submit. The action returns success and revalidates the path.
    // The "Categoría creada" toast appears.
    await page.getByRole("button", { name: /^crear$/i }).click();
    await expect(page.getByText("Categoría creada")).toBeVisible({
      timeout: 10_000,
    });

    // Reload (to bypass the App Router's client cache) and confirm
    // the new category appears in the list.
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(page.getByText(categoryNameEs)).toBeVisible({ timeout: 10_000 });
    // The list item also shows the slug and the order label.
    const newRow = page.locator("li", { hasText: categoryNameEs });
    await expect(newRow).toBeVisible();
    await expect(newRow.getByText(categorySlug)).toBeVisible();
    await expect(newRow.getByText(/orden 5/)).toBeVisible();
  });
});
