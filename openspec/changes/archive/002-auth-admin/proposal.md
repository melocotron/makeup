# Proposal 002 — Auth Admin + Dashboard Base

## Why

El sitio público ya funciona (Fase 0). Ahora la profesional dueña del negocio necesita poder entrar al panel para gestionar sus servicios, citas, contenido, etc. Sin autenticación, no podemos empezar ninguna de las features administrativas.

Esta fase establece la **puerta de entrada al admin** y el **shell visual** del panel: sidebar, topbar, dashboard base. Las páginas internas concretas (CRUD de servicios, gestión de citas, etc.) se construyen en fases posteriores, pero la navegación y la base visual quedan listas.

## What Changes

### Authentication
- NextAuth v5 con **Credentials Provider** (email + password)
- Hash de passwords con **bcrypt** (10 rounds)
- Sesiones JWT en cookie httpOnly, SameSite=Lax
- Middleware protege todas las rutas `/admin/**` excepto `/admin/login`
- Server Action para logout con redirect
- Página de login funcional con validación Zod + react-hook-form
- Mensajes de error traducibles (es/en)
- Type augmentation para `Session.user` (incluye `id` y `name`)

### Admin Shell
- **Sidebar fijo 256px** en desktop, drawer en mobile
- Sidebar dark (`bg-inverse-surface`) con active state usando border-l-4 primary
- 11 items agrupados: Dashboard, Citas, Servicios, Paquetes, Clientes, Marketing, Contenido, Blog, Reportes, Ajustes, Ayuda
- **Topbar** 64px con: hamburger (mobile), breadcrumb, theme toggle, language switcher, user menu (dropdown con "Mi cuenta" y "Cerrar sesión")
- **Avatar** circular con iniciales si no hay imagen

### Dashboard
- Página `/admin` con grid de 4 StatCards (placeholder por ahora — datos reales en Fase 5):
  - Citas hoy
  - Ingresos del mes
  - Clientes nuevos este mes
  - Servicios vendidos
- Sección "Próximas citas" (vacía por ahora)
- Sección "Accesos rápidos" con botones a las secciones principales
- Empty states bien diseñados (no solo "no data")

### Seed
- `prisma/seed.ts` crea 1 admin inicial:
  - Email: `admin@radiant-beauty.local`
  - Password: `admin123` (cambiar en primer login)
  - Nombre: "Administradora"

## Impact

- **Áreas afectadas**: `auth`, `admin`
- **Archivos nuevos**: ~12
- **Archivos modificados**: 4 (`middleware.ts`, login page, layout, dashboard page)
- **Riesgo**: MEDIO. Auth es crítico para seguridad.
- **Dependencias**: este cambio usa lo instalado en Fase 0 (NextAuth, Prisma, bcryptjs, zod, react-hook-form)

## Out of Scope

- Multi-admin con roles (solo 1 admin por ahora)
- OAuth/Google login (no se necesita)
- 2FA (no se necesita para 1 usuario)
- Password recovery por email (no se necesita — puede resetear directo en DB)
- Magic link para admin (solo clientes lo usan, en fase 5)
- Recordar sesión más de 7 días (no aplica)
- Auditoría de logins (fase final)

## Security notes

- Passwords hasheados con bcrypt (no plain text, no SHA simple)
- JWT firmado con `NEXTAUTH_SECRET` (en .env)
- Cookie `httpOnly` previene XSS stealing
- Cookie `sameSite=Lax` previene CSRF en forms normales
- Validación con Zod previene SQL injection y payloads malformados
- Rate limiting NO se implementa en esta fase (1 admin, poco riesgo) — se documenta como follow-up
- La página de login NO expone si el email existe (mensaje genérico "credenciales inválidas")