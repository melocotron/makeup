# Design 001 — Foundation

## Decisiones técnicas

### Framework: Next.js 15 (App Router) sin backend separado

**Por qué**: Trae SSR/ISR out-of-the-box (SEO crítico para landing), Route Handlers para API, Server Actions para mutaciones admin, y middleware. Un solo proceso Node, un solo deploy en Hostinger.

**Trade-offs aceptados**:
- Acoplamos frontend y backend al mismo deploy → mitigado con arquitectura por bounded contexts
- Si crece muchísimo, migración a backend separado es un refactor (no rewrite) gracias a la estructura de carpetas

### TypeScript estricto

`tsconfig.json` con `strict: true`, `noUncheckedIndexedAccess: true`. Cero `any`.

### Estilos: Tailwind v4 con design tokens

Tailwind v4 trae CSS-first config (más limpio) y mejor tree-shaking. Los tokens del design system se mapean directo a variables CSS para soportar temas dinámicos (light/dark).

### UI Base: shadcn/ui + Radix UI

shadcn/ui no es una librería: copia los componentes a tu repo. Resultado:
- Cero dependencias runtime ocultas
- 100% customizable con Tailwind
- Accesibilidad nativa (Radix Primitives)
- No se rompe con updates de Tailwind

### ORM: Prisma

Migraciones versionadas, type-safety, generador de cliente. Schema en `prisma/schema.prisma` es la única fuente de verdad de la DB.

### DB: MySQL 8

- Universal en hosting compartido
- Misma versión en dev (Docker) y prod (Hostinger) → sin sorpresas
- Volumen Docker nominado `mysql_data` para persistencia entre reinicios

### i18n: next-intl

Estándar actual de Next.js para i18n. Soporta routing con prefijos (`/es/...`, `/en/...`), messages en JSON, y type-safety.

### Tema: next-themes

Persiste en localStorage, soporta `system` / `light` / `dark`, evita flash de tema incorrecto (FOUC) con un script inline antes de hidratar.

### Iconos: lucide-react + Material Symbols

- `lucide-react` para el admin (más "engineered")
- `Material Symbols` ya viene en los HTML de Stitch → lo mantenemos donde ya existe

### Rich text: Tiptap

Headless, moderno, JSON storage, sanitizable en server. Reemplaza la dependencia de un editor embebido pesado.

### Email: Nodemailer + React Email

- Nodemailer: estándar de facto en Node
- React Email: plantillas React tipadas y estilizadas con Tailwind, renderizadas a HTML email-safe

### Estructura de carpetas

```
.
├── docker-compose.dev.yml         # MySQL + phpMyAdmin local
├── openspec/                       # SDD
├── prisma/
│   ├── schema.prisma               # modelos
│   ├── migrations/                 # SQL versionado
│   └── seed.ts                     # datos iniciales
├── public/                         # assets estáticos
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── [locale]/               # i18n routing
│   │   │   ├── (public)/           # grupo para landing
│   │   │   └── (admin)/            # grupo para /admin
│   │   ├── api/                    # Route Handlers (webhooks, cron)
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                     # shadcn components (copiados)
│   │   ├── admin/                  # específicos admin
│   │   └── public/                 # específicos landing
│   ├── lib/                        # utils, helpers
│   ├── server/                     # backend por bounded contexts
│   │   ├── auth/
│   │   ├── catalog/                # servicios, paquetes
│   │   ├── booking/
│   │   ├── clients/
│   │   ├── billing/
│   │   ├── promotions/
│   │   ├── loyalty/
│   │   ├── content/
│   │   ├── blog/
│   │   ├── media/
│   │   ├── notifications/
│   │   └── system/
│   ├── i18n/                       # config next-intl
│   ├── styles/                     # tokens, themes
│   └── types/                      # tipos compartidos
├── messages/                       # i18n messages
│   ├── es.json
│   └── en.json
├── tailwind.config.ts
├── components.json                 # shadcn config
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

### Bounded contexts (backend)

Cada contexto tiene su propia carpeta con:
- `services/` — lógica de negocio
- `repositories/` — acceso a datos (Prisma)
- `validators/` — schemas Zod
- `actions.ts` — Server Actions (admin) o
- `route.ts` — Route Handlers (API pública)

Los contextos se comunican SOLO por services expuestos, nunca acceden a la DB de otro contexto directamente.

### Validación: Zod end-to-end

Un schema Zod por entidad:
- Define tipo TS (via `z.infer`)
- Valida en Server Action / Route Handler
- Se reusa en formularios cliente (react-hook-form + `@hookform/resolvers`)

### Auth

- **Admin**: Auth.js v5 con Credentials Provider, bcrypt para hash
- **Cliente**: magic link con token hasheado en DB, expira 30 min
- Sesiones: JWT cookie httpOnly, SameSite=Lax

### Deploy

- **Dev local**: `npm run dev` (Next.js) + `docker compose up -d` (MySQL)
- **Prod Hostinger**: `npm run build && pm2 start` con archivo `ecosystem.config.cjs`

## Convenciones

- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branches**: `main` (protegida), `feature/<id>-<desc>`, `fix/<desc>`
- **PRs**: uno por cambio OpenSpec, con descripción y checklist

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Stitch no cubre todas las pantallas | Vamos pidiéndolas pantalla por pantalla; mientras tanto, mockups ASCII rápidos |
| Tailwind v4 es nuevo (puede haber bugs) | shadcn soporta v4 desde su CLI actualizado; fallback a v3 documentado |
| Imágenes de IA pueden no ser consistentes | Las regeneramos con mismo prompt + seed; o dejamos placeholders grises mientras la clienta aporta las suyas |
| Hostinger limita CPU/RAM | Next.js con `output: standalone` reduce peso; monitorizar con PM2 |