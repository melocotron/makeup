# makeup-site

Sitio web con landing pública y panel administrativo para profesional de maquillaje/belleza.

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Estilos**: Tailwind CSS v4 + design tokens custom
- **UI base**: shadcn/ui (Radix primitives + Tailwind)
- **DB**: MySQL 8 (Prisma ORM)
- **Auth**: Auth.js v5 (admin) + magic link (clientes)
- **i18n**: next-intl (es/en)
- **Tema**: next-themes (light/dark)
- **Email**: Nodemailer + SMTP
- **Deploy objetivo**: Hostinger Business+ (Node.js + MySQL nativos, PM2)

## Requisitos

- Node.js 18+ (probado en 24)
- Docker Desktop (para MySQL local)
- Git

## Setup local (primera vez)

```powershell
# 1. Clonar repo e instalar deps
npm install

# 2. Levantar MySQL en Docker
npm run db:up

# 3. Copiar variables de entorno
Copy-Item .env.example .env
# (editar .env si quieres; los defaults ya funcionan)

# 4. Generar cliente Prisma y correr migración inicial
npx prisma migrate dev --name init

# 5. (Opcional) Cargar datos seed
npm run db:seed

# 6. Arrancar dev server
npm run dev
```

App disponible en `http://localhost:3000`
phpMyAdmin en `http://localhost:8080`

## Estructura del proyecto

```
.
├── docker-compose.dev.yml      # MySQL + phpMyAdmin local
├── openspec/                    # SDD (Specification-Driven Development)
│   ├── README.md
│   ├── specs/                  # Specs VIVAS (estado actual)
│   └── changes/                # Features en progreso
├── prisma/
│   ├── schema.prisma           # Modelos de DB
│   ├── migrations/             # SQL versionado
│   └── seed.ts                 # Datos iniciales
├── messages/                    # i18n (es.json, en.json)
├── public/                      # Assets estáticos + uploads
└── src/
    ├── app/                     # Next.js App Router
    │   ├── [locale]/            # Routing por idioma
    │   │   ├── (admin)/admin/   # Panel admin
    │   │   └── page.tsx         # Landing pública
    │   └── globals.css          # Design tokens + Tailwind
    ├── components/
    │   ├── ui/                  # shadcn/ui copiados
    │   ├── admin/               # específicos admin
    │   ├── public/              # específicos landing
    │   └── theme/               # ThemeToggle, LanguageSwitcher
    ├── lib/                     # utils, prisma client
    ├── server/                  # Backend por bounded contexts
    │   ├── auth/
    │   ├── catalog/
    │   ├── booking/
    │   ├── clients/
    │   ├── billing/
    │   ├── promotions/
    │   ├── loyalty/
    │   ├── content/
    │   ├── blog/
    │   ├── media/
    │   ├── notifications/
    │   └── system/
    ├── i18n/                    # next-intl config
    └── types/                   # tipos compartidos
```

## Scripts npm

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con Turbopack |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run format` | Prettier |
| `npm run db:up` | Levanta MySQL + phpMyAdmin |
| `npm run db:down` | Para los contenedores |
| `npm run db:logs` | Ver logs de MySQL |
| `npm run db:reset` | Borra volumen y reaplica migraciones |
| `npm run db:migrate` | Crea/aplica migración en dev |
| `npm run db:migrate:deploy` | Aplica migraciones en prod |
| `npm run db:studio` | GUI de Prisma |
| `npm run db:seed` | Carga datos seed |

## OpenSpec (SDD)

Este proyecto usa **OpenSpec** como metodología de specification-driven development. Cada feature pasa por:

```
proposal → specs → tasks → archive
```

- Documentación: [`openspec/README.md`](./openspec/README.md)
- Specs vivas: [`openspec/specs/`](./openspec/specs/)
- Cambios en progreso: [`openspec/changes/`](./openspec/changes/)

## Fases del proyecto

1. **Foundation** (esta fase) — Stack, tokens, i18n, tema, Docker, Prisma
2. Auth admin + Dashboard base
3. Contenido editable base (perfil, contacto, media, carrusel)
4. Landing pública completa
5. Servicios y paquetes
6. Sistema de reservas
7. Clientes
8. Promociones, descuentos y fidelidad
9. Cobros manuales
10. Blog
11. Pulido + deploy a Hostinger

## Convenciones

- **Commits**: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- **Branches**: `main` (protegida), `feature/<id>-<desc>`
- **PRs**: uno por cambio OpenSpec

## Soporte

- Issues: https://github.com/anomalyco/opencode/issues
- Documentación OpenSpec: https://openspec.dev