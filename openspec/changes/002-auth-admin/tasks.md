# Tasks 002 — Auth Admin + Dashboard Base

## OpenSpec

- [x] Crear `changes/002-auth-admin/{proposal,design,tasks}.md`
- [x] Crear `specs/auth/spec.md` con scenarios Given/When/Then

## Auth backend

- [ ] Instalar dependencia `next-auth` (ya en package.json) - verificar
- [ ] Crear `src/server/auth/config.ts` con NextAuth config
- [ ] Crear `src/server/auth/index.ts` exportando `auth`, `signIn`, `signOut`
- [ ] Crear `src/types/next-auth.d.ts` para type augmentation
- [ ] Crear `src/app/api/auth/[...nextauth]/route.ts` con handlers GET y POST
- [ ] Implementar `Credentials.authorize` con Zod + Prisma + bcrypt
- [ ] Implementar callbacks `jwt` y `session`
- [ ] Crear Server Action `logout()` en `src/server/auth/actions.ts`

## Middleware

- [ ] Actualizar `src/middleware.ts` para proteger `/admin/**` (excepto login)
- [ ] Importar `auth` desde `@/server/auth`
- [ ] Verificar sesión y redirigir según caso

## Login page

- [ ] Refactorizar `src/app/[locale]/(admin)/admin/login/page.tsx`:
  - Server component verifica sesión → redirige si ya hay
  - Renderiza `<LoginForm />` client
- [ ] Crear `src/app/[locale]/(admin)/admin/login/login-form.tsx`:
  - react-hook-form + Zod schema
  - Input email + Input password
  - Submit con loading state
  - Sonner toast en error
  - Redirect en success

## Admin shell

- [ ] Crear `src/app/[locale]/(admin)/layout.tsx`:
  - Verifica sesión en server
  - Renderiza `<AdminShell>` con sidebar + topbar + children
- [ ] Crear `src/components/admin/admin-shell.tsx` (client component para mobile drawer)
- [ ] Crear `src/components/admin/sidebar.tsx`:
  - Lista de nav items
  - Active state via usePathname
  - Versión mobile via Sheet
- [ ] Crear `src/components/admin/topbar.tsx`:
  - Hamburger (mobile)
  - Breadcrumb
  - Theme toggle
  - Language switcher
  - User menu
- [ ] Crear `src/components/admin/user-menu.tsx`:
  - Avatar con iniciales
  - Dropdown con "Mi cuenta" + "Cerrar sesión"
- [ ] Crear `src/components/admin/stat-card.tsx` (reutilizable)

## Dashboard page

- [ ] Refactorizar `src/app/[locale]/(admin)/admin/page.tsx`:
  - Header con título + descripción
  - Grid de 4 StatCards (placeholder "—" por ahora)
  - Sección "Próximas citas" (EmptyState)
  - Sección "Accesos rápidos" (grid de botones con iconos)

## Seed

- [ ] Crear `prisma/seed.ts`:
  - Hashea password "admin123" con bcrypt
  - Crea 1 Admin: email "admin@radiant-beauty.local", name "Administradora"
  - Idempotente: si ya existe, no duplica
- [ ] Verificar `package.json` tiene `"prisma": { "seed": "tsx prisma/seed.ts" }`
- [ ] Probar `npm run db:seed`

## Verificación

- [ ] `npm run typecheck` pasa
- [ ] `npm run lint` pasa
- [ ] `npm run build` compila
- [ ] Sin DB: `npm run dev` arranca, intentar `/es/admin` redirige a `/es/admin/login`
- [ ] Con DB y seed: login con admin@radiant-beauty.local / admin123 → redirige a `/es/admin`
- [ ] Logout desde user menu → vuelve a `/es/admin/login`
- [ ] Theme toggle funciona dentro del admin
- [ ] Sidebar colapsa en mobile (hamburger → drawer)
- [ ] Breadcrumb se actualiza en cada página admin

## Commit final

- [ ] `feat(admin): auth + dashboard base`