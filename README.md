# radiant-beauty

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue)](https://www.typescriptlang.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

Sitio web con landing pública y panel administrativo para profesional de
maquillaje/belleza. Incluye reservas online, gestión de clientes, contenido
editable, blog, sistema de fidelidad y cobros manuales.

> Versión actual: **0.2.0** — landing + booking + admin (clientes, citas,
> horarios, servicios, paquetes). En desarrollo: fidelización, promociones,
> blog, cobros.

---

## Stack

- **Framework**: Next.js 15 (App Router) + TypeScript estricto
- **Estilos**: Tailwind CSS v4 + design tokens custom
- **UI base**: shadcn/ui (Radix primitives + Tailwind)
- **DB**: MySQL 8 + Prisma ORM 6
- **Auth**: NextAuth v5 (credenciales admin) + magic link (clientes)
- **i18n**: next-intl (es / en)
- **Tema**: next-themes (light / dark / system)
- **Email**: Nodemailer + SMTP
- **Tests**: Vitest (unit) + Playwright (E2E)
- **Deploy objetivo**: Node.js + MySQL (Hostinger Business+, PM2)

---

## Requisitos

- Node.js 18+ (probado en 24)
- Docker Desktop (para MySQL local)
- Git

## Setup local (primera vez)

```bash
# 1. Clonar repo e instalar deps
git clone https://github.com/melocotron/makeup.git
cd makeup
npm install

# 2. Levantar MySQL en Docker
npm run db:up

# 3. Copiar variables de entorno
cp .env.example .env
# (editar .env; los defaults ya funcionan para dev)

# 4. Generar cliente Prisma y aplicar migración inicial
npx prisma migrate deploy

# 5. (Opcional) Cargar datos seed
npm run db:seed
# Si no defines SEED_ADMIN_PASSWORD en .env, se genera una aleatoria
# y se imprime por consola la primera vez.

# 6. Arrancar dev server
npm run dev
```

- App: <http://localhost:3000>
- phpMyAdmin: <http://localhost:8080>
- Admin login: `admin@radiant-beauty.local` / (ver consola tras `db:seed`)

## Tests

```bash
npm test           # 56 unit tests (Vitest)
npm run test:cov   # con reporte de coverage
npm run test:e2e   # 3 E2E specs (Playwright, requiere DB levantada)
```

Los E2E corren serializados con `workers=1` y `timeout=60s`. Antes de
correrlos, asegúrate de tener MySQL levantado y los datos seed cargados.

---

## Estructura del proyecto

```
.
├── docker-compose.dev.yml      # MySQL + phpMyAdmin local
├── openspec/                    # SDD (Specification-Driven Development)
│   ├── README.md
│   ├── specs/                  # Specs VIVAS (estado actual)
│   └── changes/                # Features en progreso / archive
├── prisma/
│   ├── schema.prisma           # Modelos de DB
│   ├── migrations/             # SQL versionado
│   └── seed.ts                 # Datos iniciales
├── messages/                    # i18n (es.json, en.json)
├── public/                      # Assets estáticos + uploads
├── e2e/                         # Playwright specs
└── src/
    ├── app/                     # Next.js App Router
    │   ├── [locale]/            # Routing por idioma
    │   │   ├── (admin)/admin/   # Panel admin
    │   │   ├── (public)/        # Landing pública
    │   │   └── (auth)/          # Login, etc.
    │   └── globals.css
    ├── components/
    │   ├── ui/                  # shadcn/ui copiados
    │   ├── admin/               # específicos admin
    │   ├── public/              # específicos landing
    │   └── theme/               # ThemeToggle, LanguageSwitcher
    ├── lib/                     # utils, prisma client
    ├── server/                  # Backend por bounded contexts
    │   ├── auth/                # NextAuth, login, sessions
    │   ├── catalog/             # servicios, paquetes
    │   ├── booking/             # reservas, scheduling
    │   ├── clients/
    │   ├── billing/             # facturas (en desarrollo)
    │   ├── promotions/          # cupones (en desarrollo)
    │   ├── loyalty/             # puntos (en desarrollo)
    │   ├── content/             # perfil, media, carrusel
    │   ├── blog/                # (en desarrollo)
    │   ├── media/               # biblioteca de medios
    │   ├── notifications/       # emails, magic links
    │   └── system/              # settings, maintenance
    ├── i18n/                    # next-intl config
    └── types/                   # tipos compartidos
```

---

## Scripts npm

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con Turbopack |
| `npm run build` | Build de producción (prisma generate + next build) |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run format` | Prettier |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright) |
| `npm run db:up` | Levanta MySQL + phpMyAdmin |
| `npm run db:down` | Para los contenedores |
| `npm run db:reset` | Borra volumen y reaplica migraciones |
| `npm run db:migrate` | Crea/aplica migración en dev |
| `npm run db:migrate:deploy` | Aplica migraciones en prod |
| `npm run db:studio` | GUI de Prisma |
| `npm run db:seed` | Carga datos seed |

---

## OpenSpec (SDD)

Este proyecto usa **OpenSpec** como metodología de specification-driven
development. Cada feature pasa por:

```
proposal → specs → tasks → archive
```

- Documentación: [`openspec/README.md`](./openspec/README.md)
- Specs vivas: [`openspec/specs/`](./openspec/specs/)
- Cambios (en progreso / archive): [`openspec/changes/`](./openspec/changes/)

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Lee [`CONTRIBUTING.md`](./CONTRIBUTING.md) para el flujo de Gitflow y
   convenciones de commits (Conventional Commits).
2. Lee [`AGENTS.md`](./AGENTS.md) si vas a usar un agente AI para contribuir.
3. Para reportes de seguridad, ver [`SECURITY.md`](./SECURITY.md).

## Licencia

[MIT](./LICENSE) © 2026 Melocotron.
