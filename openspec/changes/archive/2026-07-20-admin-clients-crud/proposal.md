# Proposal 012 — Admin Clients CRUD (Fase 6)

## Why

`/admin/clients` is currently a "Coming soon" stub (commit `3af3a5c`).
The `Client` model already exists in the Prisma schema with the right
fields (`id`, `email`, `name`, `phone`, `notes`, `loyaltyPoints`,
`registeredAt`) and gets auto-populated when a client books an
appointment (`src/server/booking/services.ts:128`). But the admin
has no way to:

- See who the clients are
- Create one manually (for walk-ins or phone bookings)
- Edit their data (typos, phone changes, merging duplicates)
- See a client's appointment history

This is the last big block before the project can take real bookings
and provide customer service. The seed already creates client data
indirectly (every booking creates one), so the page is empty by
default but populates fast in dev.

## What Changes

A full CRUD for `Client` in the admin:

| Route | Purpose |
|---|---|
| `/admin/clients` | List of all clients (paginated, searchable) |
| `/admin/clients/nuevo` | Create form |
| `/admin/clients/[id]` | Edit form + appointment history + stats |

### Files added

**Server (queries/actions/validators)**:
- `src/server/clients/queries.ts` — `listClients`, `getClientById`, `getClientWithAppointments`
- `src/server/clients/actions.ts` — `createClientAction`, `updateClientAction`, `deleteClientAction` (admin-only via `auth()`)
- `src/server/clients/validators.ts` — Zod schemas for create/update

**Pages (replaces the stub)**:
- `src/app/[locale]/(admin)/admin/clients/page.tsx` — list (replaces stub)
- `src/app/[locale]/(admin)/admin/clients/nuevo/page.tsx` — create
- `src/app/[locale]/(admin)/admin/clients/[id]/page.tsx` — edit + history

**Components**:
- `src/components/admin/client-list.tsx` — table with search, sortable columns, "nuevo" button (client component, receives `initialData`)
- `src/components/admin/client-form.tsx` — create/edit form (reuses patterns from `service-form`, `package-form`, `profile-form`)
- `src/components/admin/client-history.tsx` — appointment history table for a single client (reuses patterns from `appointments-list`)

**i18n**:
- `messages/es.json` and `messages/en.json` — new namespace `admin.clients` with title, description, table headers, form labels, error messages, empty states

### Decisions

- **No `delete` for clients with appointments**: `deleteClientAction` refuses if the client has any appointment, with a clear error message. The admin must cancel all appointments first. This protects history integrity.
- **Loyalty points are read-only in this change**: the field exists in the model but there's no UI to add/subtract. That's part of Fase 7 (Promotions + Loyalty).
- **Pagination on list**: limit 50 per page (configurable). The `Client` table can grow fast.
- **Search**: simple `LIKE %q%` on `name` and `email`. Server-side, no client state.
- **No merge tool**: if a client has two accounts (different emails but same name), the admin must update one manually. Merge is a future change.
- **No magic link UI yet**: `MagicLink` model exists (used for client self-service) but no UI. Out of scope here.

### Anti-patterns avoided

- ❌ Defining components inside other components (Vercel rule `rerender-no-inline-components`)
- ❌ Sequential `await` of independent calls (rule `async-parallel` — `getTranslations` + queries in `Promise.all`, like we did in change 011)
- ❌ Uncached singleton queries (we already wrap `getSettings` / `getAboutContent` in `cache()`; `getClientById` is not singleton so doesn't need it)

## Impact

- **Áreas afectadas**: `admin` (clients module), `server` (new `clients/` module)
- **Archivos nuevos**: 9 (3 server, 3 pages, 3 components)
- **Archivos modificados**: 3 (`clients/page.tsx` reemplazado, 2 `messages/*.json`)
- **Riesgo**: MEDIO. CRUD nuevo, pero la superficie es chica y el modelo ya está validado (se usa en producción via booking).
- **Sin schema changes**: el modelo `Client` ya tiene todos los campos necesarios.

## Out of Scope

- Loyalty points UI (Fase 7)
- Merge duplicate clients
- Magic link UI (self-service para clientes)
- Exportar lista de clientes a CSV
- Filtros por fecha de registro / lealtad
- Foto del cliente (no está en el modelo)

## Verification

- [ ] `npx tsc --noEmit` limpio
- [ ] `npm run dev` y rutas nuevas devuelven 200:
  - [ ] `/es/admin/clients` lista los clientes que ya existen (los creados por booking)
  - [ ] `/es/admin/clients/nuevo` permite crear
  - [ ] `/es/admin/clients/[id]` muestra datos + historial
  - [ ] Submit de cada form persiste los cambios
- [ ] Intentar borrar un cliente con citas da error claro
- [ ] Browser console sin errores
- [ ] Si hago un booking, el nuevo cliente aparece en la lista

## Rollback

Reversible con `git revert` del merge. La rama stub original
(`admin/clients/page.tsx` antes de este change) se restaura automáticamente
al revertir el commit que la reemplaza.
