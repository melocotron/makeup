import { expect, test } from "@playwright/test";

/**
 * E2E for the reports export endpoints (Fase 10, block 9).
 *
 * Requires: dev server running, DB seeded, and a logged-in admin
 * session.
 *
 * Scope: verify the API endpoints respond correctly with admin auth:
 *   1. Login as admin
 *   2. GET /api/admin/reports/export.csv?preset=last30 → 200, content-type
 *      text/csv, contains the header "Ingresos totales"
 *   3. GET /api/admin/reports/export.pdf?preset=last30 → 200,
 *      content-type application/pdf, body starts with %PDF
 *
 * The unauth path is covered implicitly by the auth gate in the
 * route handler (a 401 on /api/admin/reports/* when no session is
 * active).
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

test.describe("Admin: reports export", () => {
  test("CSV endpoint returns a valid CSV with the expected sections", async ({
    page,
    request,
  }) => {
    await loginAsAdmin(page);

    // Forward the session cookies from the browser context to the
    // API request context.
    const cookies = await page.context().cookies();
    const cookieHeader = cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await request.get(
      "http://localhost:3000/api/admin/reports/export.csv?preset=last30",
      {
        headers: { cookie: cookieHeader },
      },
    );

    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("text/csv");
    expect(res.headers()["content-disposition"]).toMatch(/attachment/);

    const body = await res.text();
    // The CSV always includes the metadata header and the KPI section.
    expect(body).toContain("Reporte");
    expect(body).toContain("Ingresos totales");
    // The series section has a "Fecha" column header.
    expect(body).toContain("Fecha");
  });

  test("PDF endpoint returns a valid PDF (starts with %PDF)", async ({
    page,
    request,
  }) => {
    await loginAsAdmin(page);

    const cookies = await page.context().cookies();
    const cookieHeader = cookies
      .map((c) => `${c.name}=${c.value}`)
      .join("; ");

    const res = await request.get(
      "http://localhost:3000/api/admin/reports/export.pdf?preset=last30",
      {
        headers: { cookie: cookieHeader },
      },
    );

    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/pdf");

    const buffer = await res.body();
    // PDF files start with the magic bytes %PDF.
    expect(buffer.subarray(0, 4).toString("latin1")).toBe("%PDF");
  });

  test("API rejects unauthenticated requests with 401", async ({ request }) => {
    // No login: a fresh request context has no session cookies.
    const res = await request.get(
      "http://localhost:3000/api/admin/reports/export.csv?preset=last30",
    );
    expect(res.status()).toBe(401);
  });
});
