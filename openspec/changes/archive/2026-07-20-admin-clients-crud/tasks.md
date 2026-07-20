# Tasks 012 — Admin Clients CRUD

## Server (3 files)

- [ ] `src/server/clients/queries.ts`
  - `listClients({ search?, skip, take })` — paginated, optional search by name/email
  - `getClientById(id)` — single client
  - `getClientWithAppointments(id)` — client + appointments ordered desc + service info
  - `getClientStats(id)` — total appointments, last visit, total spent (sum of completed appointments × service.basePrice)
- [ ] `src/server/clients/validators.ts`
  - `createClientSchema` — email (required, valid), name (required, 2-100), phone (required, 8-20), notes (optional, max 500)
  - `updateClientSchema` — same + id
- [ ] `src/server/clients/actions.ts`
  - `createClientAction(formData)` — admin only, validates, creates, returns result
  - `updateClientAction(formData)` — admin only, validates, updates, returns result
  - `deleteClientAction(id)` — admin only, refuses if appointments exist

## Pages (3 files)

- [ ] `src/app/[locale]/(admin)/admin/clients/page.tsx` — replaces stub, lists clients
- [ ] `src/app/[locale]/(admin)/admin/clients/nuevo/page.tsx` — create form
- [ ] `src/app/[locale]/(admin)/admin/clients/[id]/page.tsx` — edit form + history

## Components (3 files)

- [ ] `src/components/admin/client-list.tsx` — table, search input, "nuevo" button, row click → detail
- [ ] `src/components/admin/client-form.tsx` — create/edit form (mode prop)
- [ ] `src/components/admin/client-history.tsx` — appointment history table

## i18n (2 files)

- [ ] `messages/es.json` — add `admin.clients` namespace
- [ ] `messages/en.json` — same in English

Keys needed:
- `title`, `description`, `newClient`, `search`
- `columns.name`, `columns.email`, `columns.phone`, `columns.appointments`, `columns.lastVisit`, `columns.loyalty`
- `form.name`, `form.email`, `form.phone`, `form.notes`
- `form.save`, `form.cancel`, `form.create`, `form.edit`
- `empty.noClients`, `empty.noClientsDesc`
- `errors.emailExists`, `errors.hasAppointments`, `errors.required`, `errors.invalidEmail`
- `history.title`, `history.empty`

## Verification

- [ ] `npx tsc --noEmit` clean
- [ ] All 3 routes return 200
- [ ] Form validation works (try invalid email → error)
- [ ] Delete with appointments refuses
- [ ] Browser console: 0 errors
- [ ] Manual e2e: create → list shows it → edit → delete (no appts)
