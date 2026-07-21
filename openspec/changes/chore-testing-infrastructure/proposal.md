# Chore: Testing infrastructure

## Why

Fases 1-6 se desarrollaron con typecheck + lint + un recorrido manual con Playwright contra el dev server. No hay tests automatizados versionados: no existen `*.test.ts` en `src/`, no hay scripts `test`/`test:e2e` en `package.json`, no hay dependencias de testing (`vitest`, `@playwright/test`, `jest`, etc.).

Esto significa:
- Las regresiones se detectan manualmente o por el typecheck.
- El recorrido CRUD que verifiqué en la sesión de Fase 6 no queda protegido: cualquier cambio futuro en `clients/actions.ts` o `clients/queries.ts` puede romperlo sin que CI lo note.
- Cualquier Fase nueva (promociones, fidelidad, blog) hereda la misma ausencia de cobertura.

Este change establece la base mínima de testing: framework unitario (Vitest) para validators + queries + actions con Prisma mockeado, framework E2E (Playwright) para flujos críticos (clients CRUD y booking wizard), y los scripts npm correspondientes.

## What changes

- **Dependencias de desarrollo**:
  - `vitest` + `@vitest/coverage-v8` para unit tests
  - `@playwright/test` para E2E
  - `happy-dom` para entorno DOM en unit tests de componentes cliente
- **Configuración**:
  - `vitest.config.ts` con alias `@/` y `happy-dom` por defecto
  - `playwright.config.ts` con `webServer` automático, base URL `http://localhost:3000`, retries en CI
  - `e2e/.gitignore` para `test-results/` y `playwright-report/`
- **Scripts npm**:
  - `test` → `vitest run`
  - `test:watch` → `vitest`
  - `test:cov` → `vitest run --coverage`
  - `test:e2e` → `playwright test`
  - `test:e2e:ui` → `playwright test --ui`
- **Unit tests** (Vitest):
  - `src/server/clients/validators.test.ts` — casos válidos e inválidos de `createClientSchema` y `updateClientSchema` (email malformado, name corto, phone corto, notes > 500, etc.)
  - `src/server/clients/queries.test.ts` — `listClients` y `getClientById` con Prisma mockeado (vi.mock), verificando shape de respuesta, normalización de `lastVisit`, conteo de estados
  - `src/server/clients/actions.test.ts` — `createClientAction`/`updateClientAction`/`deleteClientAction` con Prisma + `auth` mockeados (casos: éxito, validación fallida, email duplicado, cliente con citas no eliminable, no autenticado)
  - `src/server/booking/validators.test.ts` — `createAppointmentSchema`, `updateAppointmentStatusSchema` (refine de cancelReason), date/time regex
- **E2E tests** (Playwright):
  - `e2e/clients-crud.spec.ts` — recorrido completo: login admin → ir a `/admin/clients` → crear cliente → ver en lista → abrir detalle → borrar → confirmar que ya no aparece
  - `e2e/booking-wizard.spec.ts` — recorrido público: ir a `/reservar` → seleccionar servicio → seleccionar fecha/hora → llenar datos cliente → confirmar → ver pantalla de éxito
- **Datos de prueba**:
  - Reutilizar `prisma/seed.ts` (ya es idempotente) — `npm run db:seed` antes de los E2E
  - Generar emails únicos por run (`Date.now()`) en los tests para evitar colisiones con datos existentes
- **Documentación**:
  - Sección "Testing" en `AGENTS.md` con comandos, convenciones (archivos `*.test.ts` junto al código, E2E en `e2e/`), y el flujo para correr todo localmente

## Impact

- **Stack**: agrega dos frameworks de testing, no cambia el runtime de producción
- **CI**: si se configura GitHub Actions a futuro, los jobs correrían `npm run typecheck && npm run lint && npm run test && npm run test:e2e`
- **DX**: cualquier IA que trabaje en el proyecto (incluido yo) podrá validar cambios con `npm test` antes de cerrar una feature
- **Performance**: Vitest es rápido (ESM nativo, sin compilación intermedia); Playwright arranca el server una vez por run y reutiliza el contexto del navegador
- **Fases futuras**: Fase 7 (promociones + fidelidad) heredará automáticamente los patrones (validators + actions testados, E2E del flujo principal)

## Out of scope

- **Coverage thresholds obligatorios** — se reporta coverage pero no se bloquea el merge todavía. Endurecer cuando haya más superficie cubierta.
- **Tests visuales / snapshot** — Vitest snapshot de componentes UI se puede agregar después si hace falta.
- **Tests de accesibilidad automatizados** — `@axe-core/playwright` queda para una iteración futura.
- **Mock Service Worker / MSW** — no hay fetch desde el cliente hacia APIs externas todavía, no hace falta.
- **Refactor del seed para test data** — el seed actual sirve, no es necesario crear un seed dedicado a tests.
