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

## codebase-memory-mcp (inteligencia de código)

Este proyecto está indexado en [codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp),
un servidor MCP que mantiene un grafo de conocimiento persistente del repo (funciones, clases, call
chains, rutas HTTP). Permite responder preguntas estructurales con una sola llamada al MCP en vez de
explorar archivos manualmente.

### Instalación local

El binario (`codebase-memory-mcp.exe`) ya está instalado en `%LOCALAPPDATA%\Programs\codebase-memory-mcp\`
y disponible en `PATH` del usuario. Si se reinstala el sistema o se trabaja desde otra máquina:

```powershell
irm https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.ps1 -OutFile install.ps1
Unblock-File .\install.ps1
.\install.ps1          # binario + auto-configura agentes detectados
.\install.ps1 --ui     # variante con UI 3D (puerto 9749)
```

Después: reiniciar el agente (OpenCode, Claude Code, etc.).

### Archivos de configuración (en este repo)

| Archivo | Propósito |
|---|---|
| `opencode.json` | Registra el MCP server para OpenCode (`type: "local"`, `command: ["codebase-memory-mcp"]`). |
| `AGENTS.md` | Reglas para agentes AI: cuándo usar el grafo antes que `Grep`/`Read`, tabla de decisión, flujo canónico de diagnóstico de bugs. |
| `.cbmignore` | Exclusiones por capa (gitignore syntax) — `.next/`, `node_modules/`, `public/uploads/`, `prisma/dev.db`, etc. |
| `.gitignore` (modificado) | Añade `.codebase-memory/` para no commitear el cache local del grafo. |

### Uso básico

```powershell
# Verificar que el proyecto está indexado
codebase-memory-mcp cli list_projects

# Buscar funciones del módulo booking
codebase-memory-mcp cli search_graph --project C-00-Cursos-000-SDD-makeup --file_pattern "*booking*" --label Function

# Trazar quién llama a una función
codebase-memory-mcp cli trace_path --project C-00-Cursos-000-SDD-makeup --function_name "cn" --direction inbound --depth 2

# Ejecutar Cypher directamente
codebase-memory-mcp cli query_graph --project C-00-Cursos-000-SDD-makeup --query "MATCH (f:Function) WHERE NOT EXISTS { (f)<-[:CALLS]-() } RETURN f.name LIMIT 20"
```

### UI 3D (opcional)

Si se instaló la variante `--ui`, el grafo se puede explorar visualmente en `http://localhost:9749`
(proceso detached, sobrevive entre sesiones).

### Re-indexado

- **Cambios chicos**: el watcher (`auto_watch=true`) detecta vía git y re-indexa incremental.
- **Cambios grandes** (refactor, nuevo módulo): forzar con `index_repository(repo_path="C:/00-Cursos/000-SDD/makeup")` desde el chat, o por CLI:

```powershell
codebase-memory-mcp cli index_repository --repo_path "C:\00-Cursos\000-SDD\makeup"
```

Más detalles y la tabla de decisión completa: ver [`AGENTS.md`](./AGENTS.md).

## Soporte

- Issues: https://github.com/anomalyco/opencode/issues
- Documentación OpenSpec: https://openspec.dev