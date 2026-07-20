# Chore: Estabilizar suite E2E

## Why

El change `chore-testing-infrastructure` dejó 3 specs E2E escritos y mergeados a develop, pero **ninguno pasa end-to-end** en un ambiente con Docker + DB activa. Esto significa que la suite E2E que documentamos en `AGENTS.md` y en el README del change anterior no protege nada: si CI la corriera, fallaría al 100% de los specs.

Los 3 fallos detectados al ejecutar `npm run test:e2e` en local:

1. **`e2e/clients-crud.spec.ts` × 2 specs** — el botón de submit del login dice **"Enviar"**, no "Entrar"/"Iniciar" (los selectores no matcheaban). Tras corregir el selector, el login dispara correctamente (toast "Bienvenida de vuelta" visible) pero la **navegación post-login a `/es/admin` no completa** en el timeout de Playwright. La URL se queda en `/es/admin/login` aunque la cookie de sesión sí se setea. Esto es un bug real del flujo de auth, no solo del test.

2. **`e2e/booking-wizard.spec.ts`** — al seleccionar un día del calendario, la sección "Horarios disponibles" aparece con "Cargando horarios…" indefinidamente. El `fetch('/api/booking/slots?...')` no responde (o responde con `[]` y los slots no son visibles). El primer día no-pasado es hoy (2026-07-20), que sí debería tener slots si el seed está bien.

Por qué estabilizar antes de Fase 7: cualquier feature nueva (promociones, fidelidad) va a sumar más flujos testeables, y replicar el patrón roto solo amplifica la deuda. Mejor tener los 3 specs existentes verdes como base, y luego iterar.

## What changes

Tres frentes, en este orden de impacto:

### 1. Fix de navegación post-login (`src/app/[locale]/(admin)/admin/login/login-form.tsx`)

Síntoma: tras login exitoso, `router.push(callbackUrl)` + `router.refresh()` deja al usuario en `/es/admin/login` indefinidamente. La cookie de sesión sí se setea (toast "Bienvenida de vuelta" se muestra, próximo `page.goto('/es/admin')` sí funciona), pero la navegación SPA no completa.

Causa probable: con `signIn({ redirect: false })` la cookie se setea vía `Set-Cookie` en la response de la action, pero el cliente de Next.js no siempre propaga esa cookie a la request de navegación SPA que dispara `router.push`. El `router.refresh()` ayuda a recargar el RSC, pero el redirect a una ruta protegida por middleware puede quedar colgado.

Fix: reemplazar el patrón `router.push(target); router.refresh()` por **`window.location.assign(target)`** (o `window.location.href = target`) cuando el login es exitoso. Esto fuerza un full reload, el middleware de NextAuth ve la cookie, y la navegación a `/es/admin` ocurre de forma determinística. Es el patrón recomendado por la documentación de NextAuth para `signIn({ redirect: false })` en el App Router.

Alternativa considerada: usar `redirect()` server-side en la action en vez de devolver `{ success: true, callbackUrl }`. Esto es más limpio pero requiere mover toda la lógica de error a search params y complica la UX del toast. Lo dejamos como follow-up si la solución client-side no termina de funcionar.

### 2. Investigación + fix del endpoint `/api/booking/slots`

Diagnosticar por qué el día actual no devuelve slots. Tres hipótesis a comprobar, en orden:

- **H2a:** El seed no genera horarios para la fecha actual (los `Schedule` están en el pasado o solo en un rango fijo). Solución: ajustar el seed para que sea relativo a `new Date()` o, si es por diseño, ajustar el test para que avance el calendario al próximo mes con slots.
- **H2b:** El endpoint falla con 500/404. Solución: log de server + fix del bug en `src/app/api/booking/slots/route.ts`.
- **H2c:** El endpoint devuelve `[]` correctamente porque no hay servicio activo. Solución: el test debe seleccionar un servicio que sí tenga horarios.

El test debe ser robusto al resultado: si no hay slots en el día actual, debe navegar al próximo mes y reintentar. No debe depender de un día específico.

### 3. Ajuste de selectores de los 2 specs E2E

- `e2e/clients-crud.spec.ts` — usar `getByLabel("Contraseña")` en vez del regex con tilde opcional (el label real es "Contraseña" con tilde). Usar `getByRole("button", { name: /enviar|entrar|submit/i })` (regex extendido para incluir "Enviar").
- `e2e/booking-wizard.spec.ts` — el heading del paso 2 no es "disponibilidad/horario/selecciona", es el `<h2>` con el nombre del servicio seleccionado. Usar el stepper (`getByText(/Fecha y hora/i)`) como anclaje al paso 2. El "Horarios disponibles" es un `<h3>` que solo aparece tras elegir fecha.

## Impact

- **Auth flow** (`loginAction` + `loginForm`): cambio de patrón de redirect client-side a `window.location.assign`. Sin cambio de schema, sin breaking change de API. La URL final sigue siendo la misma (`callbackUrl` saneado).
- **Booking API** (`/api/booking/slots`): si la investigación revela un bug, fix mínimo. Sin breaking change — el contrato del endpoint (params, response shape) se mantiene.
- **Seed** (`prisma/seed.ts`): si los horarios no son relativos a hoy, ajustar. Esto es deseable para E2E pero también ayuda a un dev que clone el repo y quiera probar la app: actualmente si el seed generó horarios solo para 2025, el calendario está vacío para 2026.
- **Tests E2E** (`e2e/*.spec.ts`): selectores ajustados al texto real. Sin cambio de flujo, solo robustez.

## Out of scope

- **No se introduce `axe-core/playwright`** ni tests de accesibilidad automatizados. Pendiente para cuando se estabilice la base.
- **No se agregan más specs E2E** (servicios CRUD, paquetes, blog). Una vez que los 3 existentes pasen, el siguiente paso es cubrir el admin, no expandir ahora.
- **No se cambia la estrategia de Prisma mocking** en unit tests. La suite actual (56 tests) pasa, no se toca.
- **No se refactoriza el login a server-side redirect** (con search params para errores). El fix con `window.location.assign` es suficiente; el refactor es para un change futuro si surge la necesidad.
