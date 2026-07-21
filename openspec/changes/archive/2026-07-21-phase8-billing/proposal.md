# Proposal — Fase 8: Billing (facturas + integración de cupones)

## Why

La capa de persistencia de billing ya existe desde Fase 5/6: los modelos `Invoice`, `InvoiceItem`, `InvoiceItemExtra` y `CouponUsage` están migrados en `prisma/schema.prisma`. Sin embargo, **no hay lógica de servidor ni UI** — la carpeta `src/server/billing/` está vacía salvo por un `.gitkeep`, y no existe ninguna ruta `/admin/facturas` ni `/admin/invoices`.

Sin billing, el ciclo comercial está incompleto: el cliente reserva, el admin confirma la cita, pero no hay manera de registrar el cobro. Esto bloquea la monetización real del producto y, de forma derivada, impide medir ingresos en el dashboard.

Adicionalmente, los cupones implementados en Fase 7 (`src/server/promotions/`) son administrativos: el admin los crea, pero nadie los usa todavía. Sin un punto donde aplicarlos, son un CRUD sin propósito funcional.

Esta fase cierra ambos huecos: crea el módulo de facturación manual (sin pasarela de pago todavía) e integra los cupones al flujo de facturar.

## What Changes

### 1. Backend: capa de servidor para billing (`src/server/billing/`)

- **`validators.ts`** — Zod schemas:
  - `createInvoiceForAppointmentSchema` — solo requiere `appointmentId`; valida que no exista ya una invoice para esa cita.
  - `applyCouponToInvoiceSchema` — `{ invoiceId, couponCode }`; valida que el cupón sea canjeable (activo, vigente, no agotado, aplicable al servicio de la cita, no usado ya en esta invoice).
  - `markInvoicePaidSchema` — `{ invoiceId, paymentMethod: "efectivo" | "transferencia" | "otro", paidAt?: Date, notes?: string }`.
  - `cancelInvoiceSchema` — `{ invoiceId, reason: string }` (requerido para auditoría).

- **`queries.ts`** — funciones de lectura:
  - `listInvoices({ search?, status?, skip?, take? })` — paginada, con búsqueda por número o nombre de cliente, filtro por status.
  - `getInvoiceById(id)` — incluye `appointment`, `items` (con `extras`), `couponUsages` (con `coupon`).
  - `getInvoiceStats()` — totales: PENDING, PAID del mes, ingresos del mes, cupones canjeados del mes.
  - `getInvoiceForAppointment(appointmentId)` — para verificar duplicados y para la integración con la vista de cita.

- **`actions.ts`** — Server Actions (auth-gated, `requireAdmin`):
  - `createInvoiceForAppointment(appointmentId)` — en transacción:
    1. Verificar que la cita no tenga ya invoice.
    2. Generar número de invoice (`INV-<year>-<sequence>`) con contador atómico (último número del año + 1, dentro de la transacción).
    3. Calcular `subtotal` y `total` desde el servicio (precio base) y sus extras.
    4. Crear `Invoice` + `InvoiceItem` + `InvoiceItemExtra` (snapshots).
  - `applyCouponToInvoice(invoiceId, couponCode)` — en transacción:
    1. Validar cupón (existe, activo, vigente, no agotado, no usado ya en esta invoice, aplicable al servicio).
    2. Calcular `discountAmount` según `type` (PERCENTAGE → `subtotal * value/100`; FIXED → `min(value, subtotal)`).
    3. Actualizar `Invoice.discountAmount` y `total = subtotal - discountAmount - loyaltyDiscount`.
    4. Crear `CouponUsage` (registro histórico del canje).
    5. Incrementar `Coupon.usedCount`.
  - `removeCouponFromInvoice(invoiceId, couponUsageId)` — revierte el canje: borra el `CouponUsage`, decrementa `usedCount`, recalcula `total`.
  - `markInvoicePaid(input)` — actualiza status a PAID, setea `paymentMethod`, `paidAt`, `notes`.
  - `cancelInvoice(invoiceId, reason)` — actualiza status a CANCELLED, guarda `notes` con el motivo. No elimina físicamente (preserva auditoría).
  - `updateInvoiceNotes(invoiceId, notes)` — edición libre de notas (campo `notes` ya existe en el modelo).

### 2. Frontend admin: rutas y UI (`src/app/[locale]/(admin)/admin/facturas/`)

- **`/admin/facturas`** — lista de invoices:
  - PageHeader con título "Facturas" y stats (4 KPI cards: Pendientes, Pagadas del mes, Ingresos del mes, Cupones canjeados del mes).
  - Filtros: status (PENDING / PAID / CANCELLED / all), búsqueda por número o nombre de cliente.
  - Tabla con: número, cliente, fecha, total, status (badge), acciones (Ver).
  - Estado vacío si no hay invoices.

- **`/admin/facturas/[id]`** — detalle de invoice:
  - PageHeader con número, status badge, y datos del cliente.
  - Card "Resumen": subtotal, descuento, total, método de pago, fecha de pago, notas.
  - Card "Cita asociada": link a `/admin/citas/[appointmentId]` con fecha, servicio, duración.
  - Card "Cupones aplicados": si hay, lista con código y monto descontado + botón "Quitar". Si no hay y status es PENDING, formulario para aplicar cupón (input + botón "Aplicar").
  - Acciones según status:
    - PENDING: "Marcar como pagada" (abre dialog con método de pago + notas), "Cancelar factura" (confirma motivo).
    - PAID: solo "Editar notas".
    - CANCELLED: solo lectura.

- **`/admin/citas/[id]`** — agregar sección "Facturación" en la cita:
  - Si la cita tiene invoice, mostrar resumen + link al detalle.
  - Si no, botón "Crear factura" (solo si la cita está en CONFIRMED o COMPLETED; PENDING no es facturable).

### 3. Frontend admin: ruta de creación rápida desde cita

La acción `createInvoiceForAppointment` se invoca desde un botón en `/admin/citas/[id]`. Al terminar, redirige a `/admin/facturas/[id]`.

### 4. i18n

Namespace nuevo `billing.*` en `es.json` y `en.json`:
- `billing.title` — "Facturas" / "Invoices"
- `billing.kpi.*` — labels de los 4 KPIs
- `billing.table.*` — columnas (número, cliente, fecha, total, status)
- `billing.status.*` — PENDING, PAID, CANCELLED
- `billing.detail.*` — labels de la vista de detalle
- `billing.actions.*` — Marcar pagada, Cancelar, Crear factura, Aplicar cupón
- `billing.dialogs.*` — textos de los dialogs
- `billing.coupon.*` — mensajes de error (no existe, expirado, agotado, ya aplicado, no aplica al servicio)
- `billing.empty.*` — estados vacíos

### 5. E2E

- `e2e/billing-crud.spec.ts` — recorrido admin:
  1. Login admin.
  2. Ir a `/admin/facturas` (debe estar vacío o tener invoices preexistentes del seed).
  3. Ir a una cita existente en estado CONFIRMED (usar el seed) → click "Crear factura" → verificar redirect a `/admin/facturas/[id]`.
  4. En el detalle: verificar número (`INV-2026-XXXX`), cliente, servicio, subtotal, total.
  5. Click "Marcar como pagada" → llenar método (efectivo) → submit.
  6. Verificar status = PAID, `paymentMethod`, `paidAt` populated.
  7. Volver a la lista y verificar que la invoice aparece con badge PAID.

- `e2e/billing-coupon.spec.ts` — aplicación de cupón en invoice:
  1. Login admin.
  2. Crear cupón PERCENTAGE 20% en `/admin/promotions/nuevo` con código único.
  3. Ir a una cita CONFIRMED → crear factura.
  4. En el detalle: input de cupón → escribir el código → click "Aplicar".
  5. Verificar que el descuento se aplica: `discountAmount` = 20% del subtotal, `total` reducido.
  6. Verificar badge de cupón con el código.
  7. Click "Quitar cupón" → verificar que `total` vuelve al subtotal original.

## Architecture Decisions

### Generación del número de invoice

`INV-<year>-<sequence>` (ej: `INV-2026-0001`). El `<sequence>` es el contador dentro del año. Se obtiene en transacción con un lock de fila (vía `UPDATE invoices SET number = ...` atómico o equivalente). En MySQL, `SELECT ... FOR UPDATE` dentro de la transacción.

Alternativa descartada: `cuid()` como número — feo para humanos y ordenable por timestamp pero no por secuencia. Descartado por UX (el admin quiere ver `INV-2026-0001`, no un slug aleatorio).

### Cupones: el cupón se aplica en la invoice, no en la cita

Decisión: la cita se crea sin descuento. El descuento se aplica al **crear o editar la invoice**, no en el paso 4 del wizard de booking público. Justificación:

- El wizard de booking público muestra un resumen con el precio del servicio, no necesita saber de cupones.
- El cliente puede llegar con un cupón impreso o de memoria, o el admin puede aplicarlo retroactivamente.
- El cupón se "quema" (`CouponUsage` + `usedCount++`) al aplicarlo a la invoice, no al validar en booking. Esto evita cupones "reservados" que nunca se usaron.
- Si en el futuro se quiere canjear en booking, basta con mover la lógica de `applyCouponToInvoice` al wizard y crear la invoice en PENDING ahí mismo (no rompe el modelo actual).

### Cálculo del descuento

`PERCENTAGE`: `discountAmount = subtotal * (value / 100)`. Si el resultado es mayor al subtotal, se trunca a `subtotal`.

`FIXED`: `discountAmount = min(value, subtotal)`. No se permiten descuentos que resulten en total negativo.

`minPurchase` se valida contra el subtotal: si `subtotal < minPurchase`, el cupón no aplica (error "Compra mínima no alcanzada").

`serviceIds`: si el cupón tiene `serviceIds` no vacío, debe incluir el `serviceId` de la cita. Si no, error "El cupón no aplica a este servicio".

### Snapshots de items

Los `InvoiceItem` y `InvoiceItemExtra` guardan `description`, `unitPrice` y `price` como snapshot al momento de facturar. Si después cambia el precio del servicio, la invoice histórica mantiene el valor original. Esto es intencional y es la práctica estándar de facturación.

### Estado de la invoice

`PENDING` → `PAID` (con `paymentMethod` + `paidAt`).
`PENDING` → `CANCELLED` (con `notes` = motivo).
`PAID` → no transita (no hay devoluciones en esta fase; ver Out of Scope).
`CANCELLED` → no transita (terminal).

El cupón se puede aplicar/quitar solo cuando `status = PENDING`. Después de PAID o CANCELLED, la invoice es inmutable.

### Concurrencia

`createInvoiceForAppointment` y `applyCouponToInvoice` corren en `prisma.$transaction` con re-check del estado (idempotencia: si ya hay invoice para la cita, retornar error "La cita ya tiene una factura" en vez de crear duplicado). Esto es paralelo al patrón de `createAppointment` (re-check de slot en transacción).

### Cálculo de `loyaltyDiscount`

El campo `loyaltyDiscount` existe en el modelo pero no se usa en esta fase. La idea es que en una fase posterior (Fase 9 o 10) el admin pueda aplicar puntos de fidelidad al facturar (`pointsToRedeem * redeemValue / pointsToRedeem` = `redeemValue` por bloque). Por ahora se queda en 0 siempre. Reservar el campo es forward-compatible.

## Impact

- **Áreas afectadas**: `billing` (nueva), `promotions` (integración con `CouponUsage`), `booking` (UI de cita con link a invoice), `admin` (rutas), `i18n` (namespace nuevo), `db` (no schema change, todo ya está en el modelo).
- **Archivos nuevos estimados**:
  - Backend: 3 (validators, queries, actions).
  - Frontend: ~6 (lista, detalle, card de facturación en cita, dialogs, components auxiliares).
  - i18n: 2 (es, en).
  - Tests: 2 unit test files (validators + actions con Prisma mockeado) + 2 E2E specs.
  - OpenSpec: 1 proposal + 1 tasks.
- **Riesgo**: MEDIO. La generación de número de invoice con concurrencia es la parte más sensible. La integración con cupones requiere cuidado con la consistencia transaccional (CouponUsage + Invoice.discountAmount + Coupon.usedCount).
- **Performance**: las queries de lista están indexadas por `status` y `createdAt` (índices ya existen en el schema).

## Out of scope (fases futuras)

- **Pasarela de pago online** (Stripe, Mercado Pago, Conekta) — esta fase es solo cobro manual.
- **Facturación electrónica** (CFDI para México / SAT) — la invoice es interna, no tiene valor fiscal todavía.
- **Reembolsos** (`PAID → REFUNDED`) — el modelo no incluye `REFUNDED`; si hace falta, se agrega en una fase posterior con su migración.
- **Redención de puntos de fidelidad al facturar** (`loyaltyDiscount` siempre 0) — el campo se reserva; la lógica va en una fase posterior.
- **Re-impresión / PDF** de la invoice — solo vista en pantalla por ahora.
- **Reporte de ingresos avanzado** (por servicio, por periodo, por método de pago) — el dashboard de Fase 3 ya tiene un placeholder, se conecta en una fase posterior.
- **Notificaciones automáticas al cliente** cuando se marca PAID — Fase 10.
- **Canjear cupón en el wizard público de booking** — ver "Cupones: el cupón se aplica en la invoice" arriba; es factible sin romper nada si más adelante se quiere mover.
