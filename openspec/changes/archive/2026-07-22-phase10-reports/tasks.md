# Tasks — Fase 10 Reports

## 1. OpenSpec + rama + deps
- [ ] Crear `openspec/changes/phase10-reports/{proposal.md,tasks.md}` (este archivo).
- [ ] Crear rama `feat/phase10-reports` desde `develop`.
- [ ] Instalar `recharts`, `date-fns`, `papaparse`, `@types/papaparse`, `@react-pdf/renderer`.

## 2. Validators Zod
- [ ] `src/server/reports/validators.ts` con `reportFiltersSchema` (from, to, preset, groupBy, page, pageSize).
- [ ] `exportFormatSchema` para el endpoint de export.
- [ ] `src/server/reports/validators.test.ts` con casos válidos y errores (rango invertido, fecha futura, pageSize fuera de rango).

## 3. Queries KPI
- [ ] `getRevenueSummary({ from, to })`: total facturado (PAID), descuento cupones, descuento loyalty, neto, ticket promedio.
- [ ] `getAppointmentsSummary({ from, to })`: total, por status, tasa de no-show, tasa de cancelación.
- [ ] `getCustomersSummary({ from, to })`: nuevos, recurrentes (≥2 citas), top 5 por ingresos.
- [ ] `getLoyaltySummary({ from, to })`: puntos generados, puntos canjeados, valor canjeado.
- [ ] `getDailyRevenueSeries({ from, to })`: array de `{ date, revenue }` agrupado por día.
- [ ] `getTopServices({ from, to, limit })`: top N servicios por ingresos.
- [ ] Tests con `vi.mock` sobre Prisma.

## 4. Queries detail tables
- [ ] `getTopClients({ from, to, sortBy, page, pageSize })`.
- [ ] `getRecentAppointments({ from, to, status?, page, pageSize })`.
- [ ] `getRecentInvoices({ from, to, status?, page, pageSize })`.
- [ ] `getCouponRedemptions({ from, to, page, pageSize })`.
- [ ] Tests con `vi.mock` sobre Prisma.

## 5. i18n
- [ ] Namespace `admin.reports.*` en `messages/es.json` y `messages/en.json` (titles, kpis, charts, tables, export buttons, date presets, empty states).
- [ ] Namespace `admin.dashboard.*` para los KPIs del home.
- [ ] Verificar encoding UTF-8 con diff limpio.

## 6. Charts client + DateRangePicker
- [ ] `src/components/admin/reports/date-range-picker.tsx`: client component con presets + custom range, sincroniza con URL search params.
- [ ] `src/components/admin/reports/revenue-chart.tsx`: `LineChart` de recharts.
- [ ] `src/components/admin/reports/services-chart.tsx`: `BarChart` top 5.
- [ ] `src/components/admin/reports/status-chart.tsx`: `PieChart` distribución de estados.
- [ ] Skeleton states mientras cargan.

## 7. Página /admin/reports
- [ ] `src/app/[locale]/(admin)/admin/reports/page.tsx`: server component que lee `searchParams`, llama a las queries y renderiza KPIs + charts + tablas.
- [ ] Tablas con paginación client-side usando `<a>` links con `?page=N`.
- [ ] Layout responsive (mobile, tablet, desktop).
- [ ] Sidebar link "Reportes" en `src/components/admin/sidebar.tsx`.

## 8. API routes export
- [ ] `src/app/api/admin/reports/export.csv/route.ts`: genera CSV con todas las filas del rango (facturas + citas + cupones en hojas separadas o columnas).
- [ ] `src/app/api/admin/reports/export.pdf/route.ts`: genera PDF con resumen (KPIs + top 5) usando `@react-pdf/renderer`.
- [ ] Auth check en ambas: requiere sesión admin.
- [ ] Headers correctos: `Content-Type`, `Content-Disposition` con nombre de archivo dinámico.

## 9. Botones de export
- [ ] Componente `<ExportButtons from={...} to={...} />` con dos botones: "Exportar CSV" y "Exportar PDF" (links directos a las API routes).
- [ ] Posicionado en la cabecera de la página de reports.

## 10. Dashboard /admin con KPIs reales
- [ ] `src/app/[locale]/(admin)/admin/page.tsx`: top con 4 cards de KPI (Ingresos del mes, Citas del mes, Clientes nuevos, Cupones canjeados).
- [ ] Feed de "Próximas citas" debajo (5 más cercanas).
- [ ] Link a la página de reports completa.

## 11. E2E specs
- [ ] `e2e/reports.spec.ts`: login admin + navegar a `/admin/reports` + cambiar preset de fecha + verificar que cambian los KPIs.
- [ ] `e2e/reports-export.spec.ts`: navegar a reports + click "Exportar CSV" + verificar download (status 200 + content-type text/csv).
- [ ] Cleanup de datos de seed en `finally`.

## 12. Release v0.6.0
- [ ] `npm run typecheck` clean.
- [ ] `npm run lint` clean.
- [ ] `npm test` 387+ tests passing.
- [ ] Bump `package.json` 0.5.0 → 0.6.0 (commit `chore(release): bump version to 0.6.0`).
- [ ] Merge `feat/phase10-reports` → `develop` con `--no-ff`.
- [ ] `npx openspec archive phase10-reports --yes` (commit `chore(openspec): archive phase10-reports`).
- [ ] Tag anotado `v0.6.0` apuntando al commit del archive.
- [ ] Push de develop + tag con `--follow-tags`.
- [ ] Merge `develop` → `main` con `--no-ff` para promover v0.6.0 a producción.
- [ ] Verificar con `git ls-remote` que `origin/main` y `origin/develop` están en el merge commit.

## Verificación pre-merge
- [ ] `npm run typecheck` → 0 errores.
- [ ] `npm run lint` → 0 errores.
- [ ] `npm test` → todos los tests pasando.
- [ ] Smoke test manual: `/admin/reports` carga, KPIs coherentes, export CSV descarga archivo válido, export PDF descarga archivo válido.
- [ ] i18n: `/es/admin/reports` y `/en/admin/reports` ambos renderizan correctamente.
