# Tasks: Fase 8 — Billing (facturas + integración de cupones)

## 1. Backend: validators (`src/server/billing/validators.ts`)

- [ ] `createInvoiceForAppointmentSchema` — `{ appointmentId: string }`. Valida formato de `cuid` (regex simple).
- [ ] `applyCouponToInvoiceSchema` — `{ invoiceId: string, couponCode: string }`. `code` se normaliza a uppercase antes de validar.
- [ ] `removeCouponFromInvoiceSchema` — `{ invoiceId: string, couponUsageId: string }`.
- [ ] `markInvoicePaidSchema` — `{ invoiceId: string, paymentMethod: "efectivo" | "transferencia" | "otro", paidAt?: Date, notes?: string }`. `paidAt` se coerce a Date.
- [ ] `cancelInvoiceSchema` — `{ invoiceId: string, reason: string }`. `reason` min 3, max 500.
- [ ] `updateInvoiceNotesSchema` — `{ invoiceId: string, notes: string | null }`. `notes` max 1000.
- [ ] Enum exportado `PaymentMethod` con los 3 valores.
- [ ] Tests unitarios en `validators.test.ts` cubriendo casos válidos e inválidos (incluyendo: invoice no existe, cupón no existe, fecha de pago futura, motivo corto).

## 2. Backend: queries (`src/server/billing/queries.ts`)

- [ ] Tipo exportado `InvoiceListItem` con: id, number, clientName, clientEmail, scheduledAt (de la cita), subtotal, discountAmount, loyaltyDiscount, total, status, paidAt, createdAt, itemsCount.
- [ ] Tipo exportado `InvoiceDetail` con todo lo de `InvoiceListItem` + `appointment` (id, scheduledAt, service.name, durationMin) + `items` (con `extras`) + `couponUsages` (con `coupon.code`).
- [ ] Tipo exportado `InvoiceStats` con: totalPending, totalPaidThisMonth, revenueThisMonth, couponsRedeemedThisMonth.
- [ ] `listInvoices({ search?, status?, skip?, take? })` — query con `where` dinámico. `search` busca en `number` o `client.name`/`client.email` (case insensitive). `status` filtra por `InvoiceStatus`. Orden por `createdAt desc`. Devuelve `{ items, total }`.
- [ ] `getInvoiceById(id)` — incluye relations necesarias. Devuelve `null` si no existe.
- [ ] `getInvoiceForAppointment(appointmentId)` — para chequear duplicados antes de crear.
- [ ] `getInvoiceStats()` — agregados con `count` + `sum`.
- [ ] Helper privado `parseDecimal(d: Decimal)` que retorna `number`.
- [ ] Tests unitarios con Prisma mockeado: `listInvoices` con search, filtros, paginación; `getInvoiceById` con y sin relations; `getInvoiceStats` con valores agregados.

## 3. Backend: actions (`src/server/billing/actions.ts`)

- [ ] Helper `requireAdmin()` (mismo patrón que `src/server/promotions/actions.ts`).
- [ ] `createInvoiceForAppointment(appointmentId)`:
  - En `prisma.$transaction`:
    - Verificar cita existe y no tiene invoice (re-check con `appointmentId` único).
    - Verificar cita está en `CONFIRMED` o `COMPLETED` (no PENDING, no CANCELLED, no NO_SHOW).
    - Cargar servicio + extras activos.
    - Generar número: `SELECT MAX(number) FROM invoices WHERE number LIKE 'INV-<year>-%' FOR UPDATE`; si no hay, empezar en 1. Formato `INV-2026-0001`.
    - Crear `Invoice` con `subtotal = sum(unitPrice * quantity)`, `discountAmount = 0`, `loyaltyDiscount = 0`, `total = subtotal`.
    - Crear `InvoiceItem` (uno por servicio base) + `InvoiceItemExtra` (uno por extra).
    - `revalidatePath('/admin/facturas')` y `revalidatePath('/admin/citas/[id]', 'page')`.
  - Retorna `{ success: true, id, number }`.
  - Errores específicos: `APPOINTMENT_NOT_FOUND`, `APPOINTMENT_NOT_FACTURABLE`, `INVOICE_ALREADY_EXISTS`, `SERVICE_NOT_FOUND`.
- [ ] `applyCouponToInvoice(invoiceId, couponCode)`:
  - En `prisma.$transaction`:
    - Cargar invoice (PENDING), cupón por code (uppercase), verificar que no está ya usado en esta invoice.
    - Validar cupón: `isActive`, `validFrom <= now <= validUntil`, `usedCount < maxUses` (o `maxUses = null`), `serviceIds` incluye el servicio de la cita (o es null), `subtotal >= minPurchase` (o `minPurchase = null`).
    - Calcular `discountAmount` según tipo. `total = subtotal - discountAmount - loyaltyDiscount`.
    - Actualizar `Invoice.discountAmount` y `total`.
    - Crear `CouponUsage` con `amount = discountAmount`.
    - Incrementar `Coupon.usedCount`.
    - `revalidatePath('/admin/facturas/[id]', 'page')`.
  - Retorna `{ success: true, discountAmount }`.
  - Errores: `INVOICE_NOT_FOUND`, `INVOICE_NOT_PENDING`, `COUPON_NOT_FOUND`, `COUPON_INACTIVE`, `COUPON_EXPIRED`, `COUPON_EXHAUSTED`, `COUPON_ALREADY_APPLIED`, `COUPON_NOT_APPLICABLE_TO_SERVICE`, `MIN_PURCHASE_NOT_REACHED`.
- [ ] `removeCouponFromInvoice(invoiceId, couponUsageId)`:
  - En `prisma.$transaction`:
    - Verificar invoice está PENDING.
    - Borrar `CouponUsage` (verificar que pertenece a esta invoice).
    - Decrementar `Coupon.usedCount`.
    - Recalcular `Invoice.discountAmount = 0` y `total = subtotal - loyaltyDiscount`.
  - Errores: `INVOICE_NOT_FOUND`, `INVOICE_NOT_PENDING`, `COUPON_USAGE_NOT_FOUND`.
- [ ] `markInvoicePaid(input)`:
  - Verificar invoice está PENDING.
  - Update: `status = PAID`, `paymentMethod`, `paidAt = paidAt ?? new Date()`, `notes = notes ?? existing.notes`.
  - `revalidatePath('/admin/facturas/[id]', 'page')` y `revalidatePath('/admin/facturas', 'page')`.
- [ ] `cancelInvoice(invoiceId, reason)`:
  - Verificar invoice está PENDING.
  - Update: `status = CANCELLED`, `notes = (existing ?? "") + "\n[CANCELLED] " + reason`.
- [ ] `updateInvoiceNotes(invoiceId, notes)`:
  - Sin restricción de status.
- [ ] Tests unitarios con Prisma + auth mockeados: cada action con casos happy + error. **Críticos**: la lógica de cálculo de descuento, la consistencia de `CouponUsage` con `usedCount`, la generación de número en transacción.

## 4. i18n (`messages/es.json`, `messages/en.json`)

Namespace `billing.*` con keys según la propuesta:
- [ ] `billing.title`, `billing.kpi.*` (pending, paidThisMonth, revenueThisMonth, couponsRedeemedThisMonth)
- [ ] `billing.table.*` (number, client, date, total, status, actions)
- [ ] `billing.status.*` (PENDING, PAID, CANCELLED con label amigable)
- [ ] `billing.detail.*` (labels de los cards)
- [ ] `billing.actions.*` (markPaid, cancel, createInvoice, applyCoupon, removeCoupon, editNotes)
- [ ] `billing.dialogs.*` (markPaidTitle, markPaidDesc, cancelTitle, cancelReasonPlaceholder, applyCouponPlaceholder, applyCouponButton)
- [ ] `billing.coupon.*` (errores: notFound, inactive, expired, exhausted, alreadyApplied, notApplicableToService, minPurchaseNotReached)
- [ ] `billing.empty.*` (noInvoices, noInvoicesDesc)
- [ ] `billing.invoice.*` (number, subtotal, discount, total, paymentMethod, paidAt, notes, client, appointment)

## 5. Frontend: UI admin (`src/app/[locale]/(admin)/admin/facturas/`)

### Lista — `page.tsx` + `invoice-list.tsx`

- [ ] `page.tsx` (server component): carga `getInvoiceStats()` y `listInvoices({ skip, take: 50 })` + searchParams (q, status).
- [ ] `invoice-list.tsx` (client component): tabla con columnas (número, cliente, fecha, total, status, acciones). Filtros: status select (all/PENDING/PAID/CANCELLED) + search input (con debounce 300ms que actualiza URL).
- [ ] KPI cards arriba: 4 cards con stats.
- [ ] Status badges: PENDING (gris), PAID (verde), CANCELLED (rojo).
- [ ] Estado vacío cuando no hay invoices.

### Detalle — `[id]/page.tsx` + componentes auxiliares

- [ ] `page.tsx` (server component): carga `getInvoiceById(id)`. Si no existe, `notFound()`.
- [ ] PageHeader con número de invoice + status badge + client name como subtítulo.
- [ ] Card "Resumen": subtotal, descuento, total, payment method (si PAID), paidAt (si PAID), notes.
- [ ] Card "Cita asociada": link a `/admin/citas/[appointmentId]` con fecha formateada, nombre del servicio, duración.
- [ ] Card "Cupones aplicados":
  - Si hay couponUsages: lista con código + monto descontado + botón "Quitar" (con confirm).
  - Si no hay y status es PENDING: input + botón "Aplicar cupón".
  - Si no hay y status es PAID/CANCELLED: mensaje "Esta factura no tiene cupones aplicados".
- [ ] Acciones según status:
  - PENDING: botón "Marcar como pagada" (abre dialog con `MarkInvoicePaidDialog`), botón "Cancelar factura" (abre dialog con `CancelInvoiceDialog`).
  - PAID: solo "Editar notas" (botón que abre un dialog editable).
  - CANCELLED: solo lectura.

### Dialogs (`src/components/billing/`)

- [ ] `mark-invoice-paid-dialog.tsx`: form con `paymentMethod` (radio: efectivo / transferencia / otro), `paidAt` (date, default hoy), `notes` (textarea opcional). Submit → `markInvoicePaidAction` + `router.refresh()`.
- [ ] `cancel-invoice-dialog.tsx`: form con `reason` (textarea, required min 3). Submit → `cancelInvoiceAction` + `router.refresh()`.
- [ ] `apply-coupon-form.tsx`: input + botón "Aplicar". Submit → `applyCouponToInvoiceAction` con `useTransition` + toast de éxito/error (mensaje de error localizado desde `billing.coupon.*`).

## 6. Frontend: integración con cita (`src/app/[locale]/(admin)/admin/citas/[id]/page.tsx`)

- [ ] Después del card de información de la cita, agregar Card "Facturación":
  - Si cita tiene invoice: mostrar resumen (número, status, total) + link "Ver factura" → `/admin/facturas/[id]`.
  - Si cita no tiene invoice y status es `CONFIRMED` o `COMPLETED`: botón "Crear factura" (form action que llama a `createInvoiceForAppointmentAction(appointmentId)` y redirige al detalle de la invoice).
  - Si cita es PENDING/CANCELLED/NO_SHOW: mostrar mensaje "Esta cita no es facturable en su estado actual".
- [ ] El botón "Crear factura" usa `useTransition` para mostrar loading y deshabilitar mientras procesa. Errores se muestran como toast.

## 7. E2E

- [ ] `e2e/billing-crud.spec.ts`: recorrido completo de crear factura desde cita CONFIRMED, marcar pagada, verificar status en lista.
- [ ] `e2e/billing-coupon.spec.ts`: crear cupón, crear invoice, aplicar cupón, verificar descuento, quitar cupón, verificar reversión.
- [ ] Ambos specs siguen los patrones aprendidos en Fase 7:
  - `getByLabel` con labels que tengan `htmlFor`.
  - `page.once("dialog")` ANTES del click para confirmaciones nativas.
  - `await page.waitForLoadState("networkidle")` después de navegación client-side.
  - `expect(...).toBeVisible({ timeout: 10_000 })` con timeouts generosos.
  - Si el bug de hidratación del dev server reaparece, simplificar el test a read-path en lugar de end-to-end (ya documentado en `docs/handoff-2026-07-20.md`).

## 8. Commit + merge + tag

- [ ] Commit por bloque siguiendo conventional commits:
  - `feat(billing): backend layer (validators + queries + actions)` — con los tests unitarios.
  - `feat(billing): admin UI for invoices list and detail`.
  - `feat(billing): integrate invoice creation from appointment detail`.
  - `test(billing): E2E for invoice CRUD and coupon application`.
  - `chore(openspec): archive phase8-billing after release`.
- [ ] Pre-merge: `npm run typecheck && npm run lint && npm test && npm run test:e2e` (al menos 1 corrida de E2E).
- [ ] Merge `--no-ff` a `develop` desde rama `feat/phase8-billing`.
- [ ] Push a `origin/develop`.
- [ ] Release: merge `develop` → `main` con `--no-ff` + tag `v0.4.0` + push `--follow-tags`.
- [ ] Archivar change con `openspec archive phase8-billing --yes --skip-specs`.

## 9. Verificación final

- [ ] `npm run typecheck` limpio.
- [ ] `npm run lint` limpio.
- [ ] `npm test` — todos los tests pasan (los 158 previos + los nuevos de billing).
- [ ] `npm run test:e2e` — los 6 specs previos + 2 nuevos de billing pasan en 3 corridas.
- [ ] Smoke manual: crear una cita manualmente desde el seed, ir a la cita, crear factura, aplicar cupón, marcar pagada, verificar flujo completo.
- [ ] Actualizar `docs/handoff-YYYY-MM-DD.md` con el resumen de la fase cerrada.
