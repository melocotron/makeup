# AGENTS.md — Reglas para agentes AI en este proyecto

## Idioma y registro

- **Español neutro** por defecto. **Prohibido el voseo rioplatense**: nada de "vos", "tenés",
  "ejecutá", "avisale", "dale", "che", ni conjugaciones imperativas agudas.
- Si el usuario escribe en otro idioma, responder en ese idioma.
- Respuestas breves por defecto; sin preámbulos ni posdata recapitulativa.
- Más detalles y reglas globales: `~/.config/opencode/AGENTS.md`.

## codebase-memory-mcp: SIEMPRE primero

Este proyecto está indexado en `codebase-memory-mcp` (proyecto `C-00-Cursos-000-SDD-makeup`,
2,407 nodos / 3,815 aristas). **Antes de cualquier `Grep`/`Glob`/`Read` para entender código existente,
ejecutá las herramientas del MCP.** El grafo ya tiene el mapa — re-mapearlo leyendo archivos duplica
el trabajo y quema contexto.

### Verificación inicial

Si no estás seguro de que el proyecto está indexado:

```
list_projects   → debe aparecer "C-00-Cursos-000-SDD-makeup"
```

Si no aparece, ejecutá `index_repository(repo_path="C:/00-Cursos/000-SDD/makeup")` y avisale al usuario.

### Tabla de decisión

| Si la pregunta es…                          | Usá primero…                                              | Recién después…                |
|---------------------------------------------|-----------------------------------------------------------|--------------------------------|
| "¿qué llama a X?" / "¿quién usa X?"        | `trace_path(direction="inbound")`                         | `get_code_snippet` de los hits |
| "¿qué hace la página / módulo X?"           | `search_graph(file_pattern="*x*", label="Function")`      | `get_architecture`             |
| "mostrame el código de X"                   | `get_code_snippet(qualified_name="...")`                  | (suele bastar)                 |
| "¿qué hay en el módulo X?"                  | `get_architecture(aspects=["packages","hotspots","routes"])` | `Read` solo del entry point |
| "encontrá funciones que …"                  | `search_graph(label, name_pattern, file_pattern)`         | `search_code` si hace falta    |
| "qué falla / está roto / no funciona"       | `search_graph` + `trace_path` + `query_graph` (Cypher)     | `get_code_snippet` sospechoso  |
| "muéstrame ciclos / dependencias / callers" | `query_graph` con Cypher                                  | `get_architecture`             |
| "qué rompe si cambio X?"                    | `detect_changes` (con `git diff`)                         | `Read` del diff                |
| "hay código muerto / funciones sin uso"     | `query_graph("MATCH (f:Function) WHERE NOT EXISTS...")`   | (nada más)                     |
| "qué endpoints HTTP existen"                | `get_architecture(aspects=["routes"])`                    | `search_graph(label="Route")`  |

### Flujo canónico: diagnosticar un bug ("X no funciona")

Cuando el usuario reporte un bug o feature rota, seguí este orden **antes de leer archivos**:

1. **Mapa estructural** (1-2 calls)
   - `search_graph(file_pattern="*<módulo>*", label="Function", limit=40)`
   - `get_architecture(aspects=["packages","hotspots","routes"])`

2. **Trazar el flujo** (1-2 calls)
   - Identificá el/los entry points del flujo (página, ruta API, server action)
   - `trace_path(entry_point, direction="both", depth=2-3)`

3. **Sospechosos** (1-2 calls)
   - `query_graph` con Cypher para encontrar patrones de riesgo:
     - Funciones con fan-in alto (muchos callers) → un cambio rompe muchos
     - Funciones con fan-out alto (muchos callees) → orquestadoras, posibles N+1
     - Funciones sin `try/catch` en server actions (no detectable, leer código después)
     - Async sin `await`
   - `get_code_snippet(qualified_name="...")` de los 3-5 candidatos

4. **Hipótesis y fix**
   - Formular 2-3 hipótesis concretas con `archivo:línea` exacto
   - Recién entonces `Read` del rango pequeño y `Edit`
   - Opcional: `detect_changes` post-edit para ver blast radius

### Cuándo SÍ usar Grep/Read directamente (sin pasar por el MCP)

- Editar un archivo cuya ruta ya conozco y cuyo contenido necesito modificar.
- Verificar output literal (logs, mensajes de error del usuario, contenido de archivos de config).
- Buscar un string exacto sin contexto estructural (ej: un mensaje de error pegado).
- Debugging de runtime que requiere leer logs/stack traces.

### Cuándo re-indexar

- Cambios grandes (refactor, nuevo módulo, rename de carpeta): `index_repository` manual.
- Cambios chicos: el watcher automático (`auto_watch=true`) detecta vía git y re-indexa incremental.
- Si el grafo parece desactualizado: `index_status` para verificar.

## Reglas específicas del proyecto

### Stack
- **Next.js 15** (App Router) con `src/app/[locale]/...` — las páginas van bajo el segmento `[locale]`.
- **TypeScript estricto** — `npm run typecheck` debe pasar antes de cerrar cambios grandes.
- **Prisma + MySQL** — modelos en `prisma/schema.prisma`; nunca edites `prisma/migrations/` a mano.
- **NextAuth v5 (beta)** — server actions de auth en `src/server/auth/`.
- **next-intl** — mensajes en `messages/{es,en}/...`; nunca hardcodear strings de UI.
- **Tailwind v4** — sin `tailwind.config.ts` clásico; config en CSS.

### Convenciones
- kebab-case para archivos y carpetas (regla de OpenSpec).
- Server actions terminan en `Action` (`createAppointmentAction`, `loginAction`).
- Validación con **Zod** en archivos `validators.ts` por módulo.
- Componentes UI base en `src/components/ui/` (shadcn-style, no agregar dependencias nuevas acá sin consultar).
- Forms con **react-hook-form** + `@hookform/resolvers/zod`.

### Áreas (de `openspec.json`)
`design-system`, `auth`, `admin`, `public`, `booking`, `billing`, `loyalty`, `blog`, `content`,
`catalog`, `media`, `notifications`, `system`. Usá `file_pattern="*<area>*"` para acotar queries.

## OpenSpec — flujo de cambios

Este proyecto usa [OpenSpec](https://openspec.dev/) para gestionar cambios.

- Cambios chicos (1 archivo, sin impacto arquitectónico): editá directo + `npm run typecheck` + `npm run lint`.
- Cambios medios (nueva función, server action, página): abrí propuesta bajo `openspec/changes/<nombre>/`.
- Cambios grandes (nueva área, cambio de schema Prisma, breaking change): propuesta + ADR vía `manage_adr`.

Antes de implementar una propuesta grande, usá el grafo para validar impacto:
- `detect_changes` sobre el branch de trabajo.
- `trace_path` sobre las funciones que vas a tocar.

## Anti-patrones

- ❌ `Read src/...` antes de `search_graph` para entender código.
- ❌ Múltiples `Grep` para mapear un módulo entero.
- ❌ Inventar rutas de archivo sin antes validar con `search_graph(file_pattern="...")`.
- ❌ Leer `prisma/schema.prisma` de un saque — primero `get_architecture(aspects=["packages"])` + `search_graph` para entender qué modelos se usan.
- ❌ Pedirle al usuario que pegue código que ya está en el repo — el grafo lo tiene.

## Comandos útiles

```bash
# CLI directo (sin agente)
codebase-memory-mcp cli list_projects
codebase-memory-mcp cli search_graph --project C-00-Cursos-000-SDD-makeup --label Function --name_pattern ".*Booking.*"
codebase-memory-mcp cli trace_path --project C-00-Cursos-000-SDD-makeup --function_name "cn" --direction inbound --depth 2
codebase-memory-mcp cli get_code_snippet --project C-00-Cursos-000-SDD-makeup --qualified_name "..."
codebase-memory-mcp cli get_architecture --project C-00-Cursos-000-SDD-makeup --aspects overview

# UI 3D
# http://localhost:9749 (si está corriendo)
```

## Watcher vs re-index manual (importante)

El `auto_watch` del binario detecta commits vía git y actualiza la metadata
(`head_sha`) del proyecto, pero **es incremental**: solo procesa diffs. Si en
un commit se agregan **archivos nuevos** (no solo se modifican existentes),
el watcher no los indexa — el grafo queda con el `head_sha` actualizado pero
sin los nodos de los archivos nuevos.

Síntoma: `search_graph` por nombre de archivo nuevo devuelve `total: 0`
aunque el archivo existe en disco y el `head_sha` del proyecto coincide con
el commit.

Solución:

```bash
codebase-memory-mcp cli index_repository \
  --repo_path "C:/00-Cursos/000-SDD/makeup" \
  --mode fast
```

`--mode fast` es suficiente cuando solo se quieren recoger archivos nuevos
que el watcher se saltó. Usar `full` solo después de un refactor grande o
rename de carpeta.