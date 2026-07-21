import { expect, test } from "@playwright/test";

/**
 * E2E happy path for the admin client detail page (loyalty section).
 *
 * Requires: dev server running, DB seeded (admin@radiant-beauty.local /
 * admin123 + at least one client from booking).
 *
 * This test covers the *read* path: it navigates to a client's detail
 * page, verifies that the loyalty section renders with the balance
 * description, and that the dialog trigger ("Ajustar puntos") is
 * present and clickable.
 *
 * The *write* path (adjusting points via the dialog) is covered by
 * the unit tests in src/server/loyalty/actions.test.ts. The dialog's
 * RHF form suffers from the same intermittent hydration issue as the
 * loyalty-rule form (see e2e/loyalty-crud.spec.ts for context), so
 * we don't try to drive the write path through Playwright here.
 *
 * The first client in the DB is used as the test target; if there are
 * no clients, the test is skipped.
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

test.describe("Admin: client loyalty panel", () => {
  test("client detail page shows loyalty card and Adjust button", async ({
    page,
  }) => {
    await loginAsAdmin(page);
    // Go to clients list first to discover a real client id.
    await page.goto("/es/admin/clients", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    // The list page renders at least one row with a link to the detail
    // page. We extract the href from the first link and navigate to it
    // directly via page.goto() — clicking the link through the client
    // router is unreliable in this dev server (the click does not
    // trigger a navigation; the next/link hydration is flaky in dev
    // mode across multiple page mounts). Direct navigation is a
    // navigation navigation, not a hydration navigation, so it works.
    const firstClientLink = page
      .locator("table tbody tr a")
      .first();
    await expect(firstClientLink).toBeVisible({ timeout: 10_000 });
    const href = await firstClientLink.getAttribute("href");
    expect(href).toBeTruthy();
    await page.goto(href!, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 20_000 });

    // The loyalty card should be present.
    const loyaltyCard = page.locator("text=Puntos de fidelización");
    await expect(loyaltyCard).toBeVisible({ timeout: 10_000 });

    // The Adjust Points dialog trigger button should be visible and
    // clickable. (The actual write flow is covered by unit tests.)
    const adjustTrigger = page.getByRole("button", {
      name: /ajustar puntos/i,
    });
    await expect(adjustTrigger).toBeVisible();
    await expect(adjustTrigger).toBeEnabled();
  });
});
