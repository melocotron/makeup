# Fase 10 — Reports (panel de informes del admin)

## Why

El admin hoy puede gestionar citas, facturas, cupones, clientes, blog y configuración, pero **no tiene una vista agregada del negocio**. Para tomar decisiones (qué servicio es más rentable, qué cliente es más fiel, qué cupón se canjeó más, cuál es la tendencia de ingresos), hoy hay que hacer consultas manuales a la base de datos o cruzar varios listados. Esta fase agrega una sección **/admin/reports** con KPIs, gráficos y tablas de detalle, además de un dashboard `/admin` con números reales.

## What Changes

- Nueva página `/admin/reports` (protegida, solo admin) con:
  - **Selector de rango de fechas** (presets: hoy, últimos 7 días, últimos 30 días, último trimestre, año actual, custom).
  - **KPIs** (cards): ingresos totales, ingresos por cupones, número de citas, citas completadas, ticket promedio, clientes nuevos, puntos canjeados.
  - **Gráficos** (recharts, client component):
    - Línea de ingresos diarios en el rango.
    - Barras de top 5 servicios por ingresos.
    - Pie/distribución de citas por estado.
  - **Tablas de detalle** (paginadas con filtros):
    - Top clientes (por ingresos o por número de citas).
    - Top servicios (por ingresos).
    - Citas recientes.
    - Facturas recientes.
    - Cupones canjeados.
  - **Botones de export**: CSV (todo el dataset del rango) y PDF (resumen con KPIs + top 5).
- Dashboard `/admin` actualizado para mostrar **KPIs reales** (no solo "Welcome admin").
- API routes para export: `GET /api/admin/reports/export.csv?from=...&to=...` y `GET .../export.pdf?...`.
- Namespaces i18n `admin.reports.*` y `admin.dashboard.*` en `es` y `en`.
- Tests unitarios para validators y queries; tests E2E para carga de la página y export.

## Scope

- **NO** incluye: forecasting, exportación a Excel/XLSX, comparaciones entre rangos, segmentación por canal de captación, ni atribución de marketing. Queda fuera del MVP.
- **NO** modifica el schema Prisma. Todas las agregaciones se calculan en runtime con Prisma + JS.
- **NO** agrega permisos granulares. La página es accesible a cualquier admin (mismo gate que el resto del panel).

## Out of Scope

- WebSockets / actualización en tiempo real de KPIs.
- Reportes programados por email.
- Personalización de qué columnas exportar (siempre se exportan las mismas).
- Drill-down al detalle desde el gráfico (los detalles están en las tablas debajo).

## Affected Areas

- `admin` (nueva sub-ruta `reports`, dashboard actualizado)
- `billing` (queries de facturas para KPIs)
- `booking` (queries de citas para KPIs y top)
- `loyalty` (queries de cupones canjeados)
- `clients` (top clientes)
- `catalog` (top servicios)
- `i18n` (nuevos namespaces)
- `db` (sin cambios de schema, solo agregaciones)
- `tooling` (deps nuevas: recharts, date-fns, papaparse, @react-pdf/renderer)

## Plan de implementación (12 bloques)

1. **OpenSpec + rama + deps** (esta propuesta, rama `feat/phase10-reports`, instalar `recharts`, `date-fns`, `papaparse`, `@react-pdf/renderer`).
2. **Validators Zod** (`src/server/reports/validators.ts`): `reportFiltersSchema` (from, to, preset, groupBy) + `exportFormatSchema` + tests.
3. **Queries KPI** (`src/server/reports/queries.ts`): `getRevenueSummary`, `getAppointmentsSummary`, `getCustomersSummary`, `getLoyaltySummary`, `getDailyRevenueSeries`.
4. **Queries detail tables**: `getTopClients`, `getTopServices`, `getRecentAppointments`, `getRecentInvoices`, `getCouponRedemptions` (todas con paginación/filtros).
5. **i18n** namespaces `admin.reports.*` y `admin.dashboard.*` en es y en.
6. **Charts client** (`src/components/admin/reports/charts.tsx`): `LineChart` ingresos, `BarChart` top servicios, `PieChart` estados, `DateRangePicker`.
7. **Página `/admin/reports`**: server component con KPIs + tablas, client components para charts e interactividad.
8. **API routes export**: `/api/admin/reports/export.csv` y `export.pdf` con auth + rate limit básico.
9. **Botones de export** en la página (links a las API routes con query params).
10. **Dashboard `/admin` con KPIs reales**: reusar queries del bloque 3, mostrar 4 cards arriba + feed de citas recientes.
11. **E2E specs**: `e2e/reports.spec.ts` (carga + cambio de rango) y `e2e/reports-export.spec.ts` (descarga CSV).
12. **Release v0.6.0**: bump version, merge a develop, archive OpenSpec, tag v0.6.0, merge a main.

## Considerations

- **Performance**: las queries de agregación pueden ser pesadas con muchos datos. Para MVP usamos `prisma` directo con `groupBy`. Si la BD crece, se puede cachear con `unstable_cache` o mover a una vista materializada.
- **Timezone**: las fechas se interpretan en la zona horaria del servidor (definida en `Settings` o env). El MVP no expone selector de zona horaria al admin.
- **Privacidad**: los reportes son solo para admin. Las API routes validan sesión admin antes de devolver datos.
- **Recharts bundle size**: ~80KB gzipped. Carga solo en `/admin/reports` (no en el resto del admin). Se acepta como trade-off por la funcionalidad.
- **`@react-pdf/renderer`**: ~300KB pero server-side only, no impacta el bundle del cliente.
- **i18n**: las fechas se formatean con `Intl.DateTimeFormat` usando el locale del request.
- **OpenSpec deltas vs tasks**: esta fase no usa deltas (no se agregan capabilities nuevas a `specs/`). Se mantiene el approach de tasks para tracking.
