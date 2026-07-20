# Tasks

## 1. Setup Vitest
- [ ] Instalar `vitest`, `@vitest/coverage-v8`, `happy-dom` como devDependencies
- [ ] Crear `vitest.config.ts` con alias `@/*` y entorno `happy-dom`
- [ ] Agregar scripts `test`, `test:watch`, `test:cov` a `package.json`

## 2. Unit tests — clients/validators
- [ ] `src/server/clients/validators.test.ts`
  - [ ] createClientSchema: caso válido completo
  - [ ] createClientSchema: email malformado → error
  - [ ] createClientSchema: email se trimea y baja a minúsculas
  - [ ] createClientSchema: name de 1 carácter → error
  - [ ] createClientSchema: phone de 7 caracteres → error
  - [ ] createClientSchema: notes > 500 → error
  - [ ] createClientSchema: notes vacío string → ok
  - [ ] updateClientSchema: requiere `id` mínimo 1 carácter
  - [ ] updateClientSchema: hereda todas las validaciones de create

## 3. Unit tests — clients/queries
- [ ] `src/server/clients/queries.test.ts`
  - [ ] Mockear `@/lib/prisma` con `vi.mock`
  - [ ] listClients sin search: pasa where vacío, take=50, skip=0
  - [ ] listClients con search: aplica OR clause sobre name/email
  - [ ] listClients: formatea fechas a ISO string
  - [ ] listClients: cuenta citas completadas (PENDING/CONFIRMED/COMPLETED) — verifica bug histórico
  - [ ] listClients: lastVisit es la cita más reciente o null
  - [ ] getClientById: retorna null si no existe
  - [ ] getClientById: totalSpent solo cuenta COMPLETED
  - [ ] getClientById: serviceName localiza `es` o cae a "—"

## 4. Unit tests — clients/actions
- [ ] `src/server/clients/actions.test.ts`
  - [ ] Mockear `@/server/auth` y `@/lib/prisma`
  - [ ] createClientAction: rechaza si no autenticado
  - [ ] createClientAction: rechaza si validación Zod falla (mapea mensajes por path)
  - [ ] createClientAction: rechaza si email ya existe
  - [ ] createClientAction: crea exitosamente, revalida path, retorna id
  - [ ] updateClientAction: rechaza si email pertenece a otro cliente
  - [ ] updateClientAction: actualiza exitosamente
  - [ ] deleteClientAction: rechaza si cliente tiene citas
  - [ ] deleteClientAction: elimina exitosamente

## 5. Unit tests — booking/validators
- [ ] `src/server/booking/validators.test.ts`
  - [ ] createAppointmentSchema: caso válido
  - [ ] dateString: rechaza "01-01-2026" (formato incorrecto)
  - [ ] timeString: rechaza "25:00" y "9:00" (formato incorrecto)
  - [ ] customerSchema: phone "abc123" falla regex
  - [ ] updateAppointmentStatusSchema: status CANCELLED sin reason → refine falla
  - [ ] updateAppointmentStatusSchema: status CANCELLED con reason → ok
  - [ ] updateAppointmentStatusSchema: status CONFIRMED sin reason → ok

## 6. Setup Playwright
- [ ] Instalar `@playwright/test` como devDependency
- [ ] `npx playwright install --with-deps chromium` (solo chromium para mantener el footprint bajo)
- [ ] Crear `playwright.config.ts` con webServer, baseURL, projects (chromium), retries
- [ ] Crear `e2e/` con `.gitignore` que ignore `test-results/` y `playwright-report/`
- [ ] Agregar scripts `test:e2e` y `test:e2e:ui` a `package.json`

## 7. E2E test — clients CRUD
- [ ] `e2e/clients-crud.spec.ts`
  - [ ] beforeAll: `npm run db:seed` si la DB está vacía (chequear con query)
  - [ ] beforeEach: login admin vía UI
  - [ ] Test 1: crear cliente nuevo con email único (timestamp), verlo en lista, abrir detalle, borrar
  - [ ] Test 2: crear cliente con email inválido → ver mensaje de error
  - [ ] Test 3: crear cliente con email duplicado → ver mensaje de error

## 8. E2E test — booking wizard
- [ ] `e2e/booking-wizard.spec.ts`
  - [ ] Test 1 (happy path): ir a `/es/reservar` → seleccionar servicio → seleccionar primer slot disponible → llenar customer → confirmar → ver pantalla de éxito con appointment id
  - [ ] Test 2: step 2 sin servicio seleccionado → no debería ocurrir (smoke check)

## 9. Actualizar AGENTS.md
- [ ] Sección "Testing" después de "Conventional Commits"
  - [ ] Convenciones de ubicación (unit: junto al código; E2E: `e2e/`)
  - [ ] Comandos principales
  - [ ] Flujo antes de merge (typecheck + lint + test + e2e)
  - [ ] Cómo correr Playwright en modo UI para debug

## 10. Verificación final
- [ ] `npm run typecheck` limpio
- [ ] `npm run lint` sin warnings nuevos
- [ ] `npm test` — todos los unit tests pasan
- [ ] `npm run test:e2e` — todos los E2E tests pasan (con DB levantada + seeded)
- [ ] Working tree limpio
