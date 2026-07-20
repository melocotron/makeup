# Tasks: Estabilizar suite E2E

## 1. Investigación previa (bloqueante)

- [ ] Confirmar Docker + MySQL levantados (`docker ps`, `npm run db:status` o equivalente)
- [ ] `curl http://localhost:3000/api/booking/slots?serviceId=<id-del-seed>&date=2026-07-20` y ver qué devuelve (slots, `[]`, o error)
- [ ] Inspeccionar `prisma/seed.ts` para entender qué horarios genera y para qué rango de fechas
- [ ] Confirmar manualmente en el browser que un login + ir a `/es/admin` sí completa la navegación (vs. quedarse en login)

## 2. Fix de navegación post-login

- [ ] Editar `src/app/[locale]/(admin)/admin/login/login-form.tsx`: reemplazar `router.push + router.refresh` por `window.location.assign(callbackUrl)` en el branch de éxito
- [ ] Verificar que el toast de éxito sigue mostrándose
- [ ] Verificar que el callback de error (toast de credenciales inválidas) sigue funcionando
- [ ] `npm run typecheck && npm run lint`

## 3. Investigación y fix del endpoint de slots

Depende del resultado de la investigación:

- [ ] **Si el seed no genera horarios para el mes actual:** ajustar `prisma/seed.ts` para que use `new Date()` como base. Documentar en el seed mismo que es "relativo al día de ejecución".
- [ ] **Si el endpoint falla:** arreglar el bug. Log de la request y response esperada en `src/app/api/booking/slots/route.ts`.
- [ ] **Si el seed está bien pero la DB no los tiene en este momento:** re-ejecutar `npm run db:seed` y re-validar.
- [ ] Re-correr `curl` para confirmar que devuelve slots

## 4. Ajuste de selectores E2E

- [ ] `e2e/clients-crud.spec.ts`: cambiar `getByLabel(/contrase|password/i).first()` por `getByLabel("Contraseña")`, y ampliar el regex del botón a `/enviar|entrar|iniciar|submit/i`
- [ ] `e2e/booking-wizard.spec.ts`: cambiar la aserción del paso 2 de `getByRole("heading", ...)` a `getByText(/Fecha y hora/i)` (stepper). Mantener el resto del flujo.
- [ ] **Bonus de robustez en booking-wizard:** si la primera fecha no-pasada no devuelve slots, hacer click en "Mes siguiente" y reintentar (loop con límite 2).

## 5. Verificación final

- [ ] `npm run typecheck` limpio
- [ ] `npm run lint` limpio
- [ ] `npm test` — 56/56 unit tests siguen pasando
- [ ] `npm run test:e2e` — 3/3 specs E2E pasan
- [ ] Capturar el output de los E2E verdes para incluir en el commit body

## 6. Commit + merge

- [ ] `git add . && git commit -m "chore(testing): stabilize E2E suite + fix login post-flow"`
- [ ] `git switch develop && git merge --no-ff chore/stabilize-e2e`
- [ ] `git branch -d chore/stabilize-e2e`
- [ ] `openspec archive stabilize-e2e --yes --skip-specs`
