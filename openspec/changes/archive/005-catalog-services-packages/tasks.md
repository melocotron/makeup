# Tasks 005 — Servicios + Paquetes

## OpenSpec

- [x] Crear change folder con proposal/design/tasks
- [ ] Crear specs (opcional)

## Backend — Catalog

- [ ] Crear `src/server/catalog/queries.ts` (listServices, getServiceById, listPackages, getPackageById)
- [ ] Crear `src/server/catalog/validators.ts` (Zod schemas)
- [ ] Crear `src/server/catalog/services.ts` (create, update, delete, toggleActive)
- [ ] Crear `src/server/catalog/packages.ts` (create, update, delete, toggleActive)

## Admin components

- [ ] `src/components/admin/service-form.tsx` (form completo con extras)
- [ ] `src/components/admin/service-extras-manager.tsx` (gestión dinámica de extras)
- [ ] `src/components/admin/service-list.tsx` (tabla con acciones)
- [ ] `src/components/admin/package-form.tsx` (form con service picker)
- [ ] `src/components/admin/package-items-picker.tsx` (selección múltiple de servicios)
- [ ] `src/components/admin/package-list.tsx` (cards)

## Admin pages

- [ ] `/admin/servicios` (lista)
- [ ] `/admin/servicios/nuevo` (crear)
- [ ] `/admin/servicios/[id]` (editar + extras)
- [ ] `/admin/paquetes` (lista)
- [ ] `/admin/paquetes/nuevo` (crear)
- [ ] `/admin/paquetes/[id]` (editar + items)

## i18n

- [ ] Agregar keys catalog.services y catalog.packages a es.json
- [ ] Mismos keys a en.json

## Verificación

- [ ] `npm run typecheck` pasa
- [ ] `npm run build` compila
- [ ] Crear servicio funciona
- [ ] Editar servicio con extras funciona
- [ ] Eliminar servicio funciona
- [ ] Toggle activo funciona
- [ ] Crear paquete con items funciona
- [ ] Editar paquete funciona

## Commit final

- [ ] `feat(catalog): services + extras + packages`