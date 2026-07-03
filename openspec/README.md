# OpenSpec — Guía rápida

OpenSpec es nuestra metodología de **Specification-Driven Development (SDD)**. Cada feature del proyecto pasa por tres estados bien definidos:

```
proposal  →  specs (qué debe cumplir)  →  tasks (cómo se hace)  →  archive
```

## Estructura de carpetas

```
openspec/
├── README.md                       ← este archivo
├── specs/                          ← Especificaciones VIVAS (estado actual del sistema)
│   ├── design-system/
│   │   └── spec.md                 ← tokens, paleta, type, spacing, componentes
│   ├── auth/
│   │   └── spec.md
│   └── ...
├── changes/                        ← Features EN PROGRESO (cada carpeta = un cambio)
│   ├── 001-foundation/
│   │   ├── proposal.md             ← Por qué y qué
│   │   ├── tasks.md                ← Checklist de implementación
│   │   ├── design.md               ← Decisiones técnicas
│   │   └── specs/                  ← Deltas (qué cambia en /specs/)
│   │       └── design-system/
│   │           └── spec.md
│   └── 002-...
└── changes/archive/                ← Cambios COMPLETADOS
    └── 001-foundation/
```

## Workflow por feature

1. **Crear carpeta** en `changes/` con el siguiente número correlativo (ej: `002-auth-admin`)
2. **Escribir `proposal.md`** con: contexto, qué cambia, impacto, áreas afectadas
3. **Definir deltas en `specs/`** — qué partes del sistema se modifican
4. **Implementar siguiendo `tasks.md`** (checkboxes que se van marcando)
5. **Validar** contra los scenarios definidos en los specs
6. **Archivar** el cambio → mover carpeta a `changes/archive/`, los specs quedan en `specs/` como fuente de verdad

## Formato de un `spec.md`

```markdown
# Capability: <Nombre corto>

## Purpose
<Una línea que explica para qué existe esta capability>

## Requirements

### Requirement: <Nombre descriptivo>
The system shall/must <comportamiento esperado>.

#### Scenario: <Contexto del escenario>
Given <contexto inicial>
When <acción>
Then <resultado esperado>
```

## Convención de áreas

- `design-system` — tokens, componentes UI base, temas
- `auth` — login admin y cliente
- `admin` — todo lo del panel `/admin/*`
- `public` — todo lo del sitio público `/`
- `booking` — flujo de reservas
- `billing` — facturas, cobros
- `loyalty` — programa de fidelidad
- `blog` — posts
- `content` — contenido editable (carrusel, sobre mí, etc.)
- `catalog` — servicios y paquetes
- `media` — biblioteca de imágenes
- `notifications` — emails
- `system` — settings, backups, auditoría

## Comandos útiles

```powershell
# Ver cambios pendientes
Get-ChildItem openspec\changes -Directory | Where-Object { $_.Name -ne 'archive' }

# Archivar cambio completado
Move-Item openspec\changes\001-foundation openspec\changes\archive\
```

## ¿Por qué OpenSpec?

- **Trazabilidad**: cada decisión tiene un "por qué"
- **Onboarding rápido**: cualquier dev (o tú en 6 meses) entiende el sistema leyendo specs
- **Revisión antes de código**: reducimos retrabajos
- **Validación contra escenarios**: no implementamos cosas que no necesitamos