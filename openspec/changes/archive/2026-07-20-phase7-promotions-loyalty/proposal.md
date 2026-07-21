# Feat: Promociones + Fidelización (Fase 7)

## Why

El proyecto tiene el `schema.prisma` con 4 modelos relevantes
(`Coupon`, `CouponUsage`, `LoyaltyRule`, `LoyaltyTransaction`) listos desde
Fase 1, pero las áreas `server/promotions/` y `server/loyalty/` están
vacías (solo `.gitkeep`) y las páginas admin
`/admin/promotions` y `/admin/loyalty` son stubs de "Próximamente".

Esta fase entrega el **CRUD admin** de cupones y reglas de fidelización
+ la **visualización de puntos por cliente**, dejando listo el hook point
para que Fase 8 (cobros manuales) conecte ambas primitivas al flujo
de checkout de la cita.

## What changes

### Backend (nuevo)

- `src/server/promotions/validators.ts` — Zod schemas:
  - `createCouponSchema`: code (uppercase, alphanumeric, 4-32 chars),
    description (i18n JSON), type (PERCENTAGE|FIXED), value (decimal,
    > 0, ≤ 100 si PERCENTAGE), minPurchase (opcional, ≥ 0),
    maxUses (opcional, ≥ 1), validFrom, validUntil (> validFrom),
    isActive, serviceIds (array opcional).
  - `updateCouponSchema`: subset editable.
- `src/server/promotions/queries.ts` — `listCoupons()` con paginación
  y search por code, `getCouponById()`, `getCouponUsages()` (auditoría).
- `src/server/promotions/actions.ts` — server actions admin: `createCoupon`,
  `updateCoupon`, `deactivateCoupon` (soft delete via `isActive=false`,
  preserva histórico), `deleteCoupon` (hard delete solo si `usedCount=0`).
- `src/server/loyalty/validators.ts` — `upsertLoyaltyRuleSchema` (1 regla
  activa a la vez, el resto se desactiva en la misma transacción).
- `src/server/loyalty/queries.ts` — `getActiveLoyaltyRule()`,
  `listLoyaltyRules()` (histórico), `getClientLoyalty(clientId)` con
  balance + últimas N transacciones.
- `src/server/loyalty/actions.ts` — `upsertLoyaltyRuleAction`,
  `adjustPointsAction` (admin puede ajustar puntos manualmente con
  reason obligatorio: gift, correction, etc.).

### Admin UI (nuevo)

- `src/components/admin/coupons-list.tsx` — tabla con code, type, value,
  rango de validez, usos (`usedCount/maxUses`), estado (activa/expirada/
  agotada/desactivada). Badges de color según estado.
- `src/components/admin/coupon-form.tsx` — create/edit, todos los campos
  del schema, validación inline.
- `src/components/admin/coupon-form-dialog.tsx` — wrapper modal que reusa
  `coupon-form.tsx`, mismo patrón que `client-form-dialog.tsx`.
- `src/components/admin/loyalty-rule-form.tsx` — formulario único para
  crear/editar la regla activa (pointsPerAmount, pointsToRedeem,
  redeemValue).
- `src/components/admin/loyalty-transactions-list.tsx` — tabla de
  transacciones de un cliente (type, points, reason, fecha, invoiceId
  si aplica). Reusada en `/admin/clients/[id]`.
- Refactor de `src/app/[locale]/(admin)/admin/promotions/page.tsx` —
  reemplazar stub "Próximamente" con la lista real.
- Refactor de `src/app/[locale]/(admin)/admin/promotions/nuevo/page.tsx` —
  nuevo, formulario de creación.
- Refactor de `src/app/[locale]/(admin)/admin/promotions/[id]/page.tsx` —
  nuevo, edición + lista de `CouponUsage`.
- Refactor de `src/app/[locale]/(admin)/admin/loyalty/page.tsx` — reemplazar
  stub con la regla activa + histórico.
- Refactor de `src/app/[locale]/(admin)/admin/clients/[id]/page.tsx` —
  añadir tab/sección de "Puntos de fidelización" usando
  `loyalty-transactions-list.tsx`.

### i18n (extender)

- `messages/es.json` y `messages/en.json` — añadir claves:
  - `admin.promotions.*` (lista, form, validations, badges, empty)
  - `admin.loyalty.*` (regla, transacciones, ajustes, razones)
  - `admin.clients.loyalty.*` (tab en detalle de cliente)

### Tests (nuevo)

- `src/server/promotions/validators.test.ts` — Zod: code uppercase, type
  range, fecha validity, serviceIds array.
- `src/server/promotions/queries.test.ts` — Prisma mockeado: list con
  search, getById, paginación.
- `src/server/promotions/actions.test.ts` — auth, validación,
  `usedCount=0` constraint, soft delete.
- `src/server/loyalty/validators.test.ts` — Zod: solo 1 regla activa.
- `src/server/loyalty/queries.test.ts` — getActiveRule, getClientLoyalty
  con balance correcto.
- `src/server/loyalty/actions.test.ts` — upsert desactiva la anterior,
  adjustPoints requiere reason.

## Out of scope

- **Integración con booking wizard** — no se modifica el flujo público de
  reservas. Los cupones y puntos se gestionan en admin, pero el cliente
  NO puede ingresarlos durante el booking todavía. Esto queda para
  Fase 8 (cobros manuales) donde se enchufa el checkout real.
- **Public landing de /ofertas** — el modelo `Coupon` no se renderiza
  públicamente. Se mantiene la sección disabled en `Settings` por ahora.
- **Puntos por referral** — el modelo soporta adjustments manuales pero
  no referrals automáticos.
- **Expiración automática de cupones** — la lógica de "expirado" se
  evalúa en query time (validUntil < now). No se hace cron job.
- **Email notifications** cuando se aplica un cupón o se gana puntos —
  depende de Fase 8.

## Impact

- **Stack**: agrega 8 archivos nuevos en `server/`, 6 componentes admin,
  2 pages nuevas, 2 page refactors. ~600-800 LOC.
- **DB**: sin migraciones nuevas. Los modelos ya existen desde Fase 1.
- **Compatibilidad**: no rompe flujos existentes. Los stubs admin
  actuales son reemplazados por funcionalidad real; los clientes que
  visiten `/admin/promotions` o `/admin/loyalty` antes eran stubs y
  ahora ven la UI real.
- **Testing**: ~30 unit tests nuevos (6 archivos). Suma a los 56
  actuales.
- **i18n**: ~40-50 nuevas claves por idioma. Sigue el patrón actual.
