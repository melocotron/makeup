# Tasks: Fase 7 — Promociones + Fidelización

## 1. Backend: validators

- [ ] Crear `src/server/promotions/validators.ts` con `createCouponSchema`,
      `updateCouponSchema`, `couponFilterSchema` (para list/search).
- [ ] Crear `src/server/loyalty/validators.ts` con `upsertLoyaltyRuleSchema`
      y `adjustPointsSchema` (points + reason obligatorios).
- [ ] Tests en `validators.test.ts` para ambos archivos.

## 2. Backend: queries

- [ ] `src/server/promotions/queries.ts`:
      - `listCoupons({ search, skip, take, status })` con filtros
        (active|expired|exhausted|inactive) y total.
      - `getCouponById(id)` con include de `usages` (últimas 50).
      - `getCouponStats()` — counters globales (total activas, total
        usos este mes).
- [ ] `src/server/loyalty/queries.ts`:
      - `getActiveLoyaltyRule()`.
      - `listLoyaltyRules({ includeInactive })`.
      - `getClientLoyalty(clientId)` con balance + últimas 20 transactions.
- [ ] Tests con Prisma mockeado.

## 3. Backend: actions

- [ ] `src/server/promotions/actions.ts`:
      - `createCouponAction` (auth check, validación, hash code a uppercase,
        prisma.create).
      - `updateCouponAction`.
      - `deactivateCouponAction` (soft delete).
      - `deleteCouponAction` (rechaza si usedCount > 0).
      - `revalidatePath` para `/admin/promotions` en éxito.
- [ ] `src/server/loyalty/actions.ts`:
      - `upsertLoyaltyRuleAction` (transacción: desactivar todas, crear
        o reactivar la nueva).
      - `adjustPointsAction` (auth + reason, crea `LoyaltyTransaction`
        y actualiza `client.loyaltyPoints` en transacción atómica).
- [ ] Tests con auth + Prisma mockeados.

## 4. UI admin: cupones

- [ ] `src/components/admin/coupons-list.tsx` — tabla con badges de
      estado (active, expired, exhausted, inactive). Botón "Nueva".
- [ ] `src/components/admin/coupon-form.tsx` — form con todos los campos
      del schema, validación inline, date pickers.
- [ ] `src/components/admin/coupon-form-dialog.tsx` — modal wrapper.
- [ ] Refactor `src/app/[locale]/(admin)/admin/promotions/page.tsx` —
      usar `coupons-list.tsx`.
- [ ] Crear `src/app/[locale]/(admin)/admin/promotions/nuevo/page.tsx`.
- [ ] Crear `src/app/[locale]/(admin)/admin/promotions/[id]/page.tsx` —
      form de edición + lista de `CouponUsage`.

## 5. UI admin: fidelización

- [ ] `src/components/admin/loyalty-rule-form.tsx` — formulario único
      para la regla activa.
- [ ] `src/components/admin/loyalty-rules-list.tsx` — histórico de
      reglas pasadas.
- [ ] `src/components/admin/loyalty-transactions-list.tsx` — tabla de
      transacciones (reusada en cliente detail).
- [ ] Refactor `src/app/[locale]/(admin)/admin/loyalty/page.tsx` —
      form arriba + histórico abajo.
- [ ] Refactor `src/app/[locale]/(admin)/admin/clients/[id]/page.tsx` —
      añadir tab "Puntos" con `loyalty-transactions-list.tsx` +
      botón "Ajustar puntos" (modal con reason obligatorio).

## 6. i18n

- [ ] Añadir a `messages/es.json` y `messages/en.json`:
      - `admin.promotions.*` (lista, form, validations, badges,
        empty, errors).
      - `admin.loyalty.*` (regla activa, histórico, ajustes, razones
        predefinidas: gift, correction, complaint, other).
      - `admin.clients.loyalty.*` (tab en cliente detail).

## 7. Verificación

- [ ] `npm run typecheck` limpio.
- [ ] `npm run lint` sin warnings nuevos.
- [ ] `npm test` — 56 actuales + ~30 nuevos = ~86 pasan.
- [ ] Verificación manual en dev server:
      - Crear cupón PERCENTAGE 20% con maxUses 50 → aparece en lista.
      - Desactivar cupón → badge cambia.
      - Intentar borrar cupón con usedCount > 0 → rechaza.
      - Crear regla de fidelidad → reglas anteriores se desactivan.
      - Ajustar puntos a un cliente con reason "gift" → transacción
        aparece en historial y el balance del cliente se actualiza.
- [ ] Verificar que la búsqueda en `/admin/promotions` filtra por code.
- [ ] Verificar que `/admin/loyalty` muestra la regla activa destacada.

## 8. Commit + merge

- [ ] `git add . && git commit -m "feat(promotions+loyalty): CRUD admin for
      Fase 7"`
- [ ] Verificar typecheck + lint + tests una última vez.
- [ ] `git switch develop && git merge --no-ff
      feat/phase7-promotions-loyalty`.
- [ ] `git branch -d feat/phase7-promotions-loyalty`.
- [ ] `openspec archive phase7-promotions-loyalty --yes --skip-specs`.

## 9. Push

- [ ] `git push origin develop`.
