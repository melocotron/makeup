# Design 002 — Auth Admin + Dashboard Base

## Auth Strategy

### NextAuth v5 (beta pero usado en producción)

NextAuth v5 (auth.js) ofrece:
- API más limpia que v4
- Soporte nativo de App Router
- JWT y database sessions
- Type-safe con `next-auth.d.ts`

Aunque está en beta, es la opción recomendada para Next.js 15 actualmente.

### Credentials Provider

```ts
Credentials({
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  authorize: async (credentials) => {
    // Validar con Zod
    // Buscar admin por email
    // Comparar bcrypt
    // Retornar { id, email, name } o null
  },
})
```

### Sesión JWT

```ts
session: { strategy: "jwt" }
callbacks: {
  jwt: ({ token, user }) => {
    if (user) token.id = user.id
    return token
  },
  session: ({ session, token }) => {
    if (token.id) session.user.id = token.id
    return session
  }
}
```

Más simple que database sessions para 1 admin.

### Middleware

Actualiza `src/middleware.ts` para:
1. (Ya hace) detectar locale
2. (Nuevo) verificar sesión en rutas `/[locale]/admin/**` excepto `/[locale]/admin/login`
3. Redirigir a `/login` si no hay sesión
4. Redirigir a `/admin` si está en `/login` y ya tiene sesión

```ts
import { auth } from "@/server/auth"
// ...
const session = await auth()
const isAdminRoute = pathname.includes("/admin") && !pathname.includes("/admin/login")
if (isAdminRoute && !session) {
  return NextResponse.redirect(new URL(`/${locale}/admin/login`, request.url))
}
```

### Pages

`/[locale]/admin/login/page.tsx`:
- Server component que verifica sesión → si existe, redirige a `/admin`
- Renderiza `<LoginForm />` (client component)

`<LoginForm />`:
- react-hook-form + zodResolver
- Input email, Input password
- Button submit con loading state
- Mensaje de error con sonner toast
- Redirect en success vía `useRouter`

### Logout

Server Action:
```ts
"use server"
export async function logout() {
  await signOut({ redirectTo: "/login" })
}
```

Llamada desde el UserMenu dropdown.

## Admin Shell Design

Basado en el HTML de Stitch del dashboard.

### Sidebar (desktop ≥1024px)

- Fixed position, w-64, h-screen
- Background `bg-inverse-surface` (#2d3133)
- Logo + título en header
- Botón primario "Nuevo servicio" en header (placeholder)
- Nav items con iconos (lucide) + label
- Active state: `border-l-4 border-primary bg-on-secondary-fixed-variant/20`
- Hover: `hover:bg-primary/10`
- Footer con: "Ayuda" + "Cerrar sesión"

### Sidebar (mobile <1024px)

- Hidden por defecto
- Hamburger button en topbar lo abre
- Drawer desde la izquierda (usar shadcn `sheet` cuando esté, o custom)
- Overlay oscuro detrás

### Topbar

- h-16, sticky top-0
- Border bottom
- Left: hamburger (mobile) + breadcrumb (server-rendered)
- Right: theme toggle + language switcher + user menu

### Breadcrumb dinámico

Por ahora hardcoded en cada página. Cuando crezca, se puede extraer a un componente que use la ruta.

## Dashboard

### StatCard

```tsx
<Card>
  <CardHeader>
    <p className="text-xs uppercase">{label}</p>
    <Badge variant="success">+12%</Badge>
  </CardHeader>
  <CardContent>
    <p className="font-display text-display">{value}</p>
  </CardContent>
  <CardFooter>
    <span className="text-xs">{comparison}</span>
    <Link>Ver más →</Link>
  </CardFooter>
</Card>
```

### Empty State

Componente reutilizable:
- Icono grande centrado
- Título + descripción
- CTA opcional

## Conventions

- **Password requirements**: mínimo 8 caracteres (validado en seed, no en login)
- **Email**: case-insensitive (lowercase en DB)
- **Logout**: siempre vía Server Action (nunca link a `/api/auth/signout` directamente)

## Risks

| Riesgo | Mitigación |
|---|---|
| NextAuth v5 es beta | Fijar versión exacta, monitorear updates |
| Bcrypt en Node vs Edge | Usar `bcryptjs` (pure JS, funciona en Edge runtime del middleware) |
| Sesión muy larga | JWT expira en 7 días, se puede extender |
| Login brute force | Sin rate limit por ahora (1 admin, IP conocida en prod). Documentado como follow-up |