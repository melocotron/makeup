# Capability: Design System

## Purpose
Provee una base visual consistente para toda la UI (admin y landing), con tokens extraídos de los system designs generados en Stitch, soporte nativo de temas light/dark, y componentes accesibles construidos sobre shadcn/ui.

## Requirements

### Requirement: Paleta de colores unificada
El sistema MUST usar la paleta extraída de `dashboard_system_design/DESIGN.md` y `landing/DESIGN.md` (idéntica en ambos).

The system must define los siguientes colores como CSS variables y como utilidades de Tailwind:
- **Primary**: `#4648d4` (Indigo) — CTAs principales, estados activos, indicadores de progreso
- **Primary container**: `#6063ee`
- **Secondary**: `#515f74`
- **Tertiary**: `#006c49` (verde) — success, métricas de crecimiento
- **Error**: `#ba1a1a`
- **Surface tiers**: `#f7f9fb`, `#f2f4f6`, `#eceef0`, `#e6e8ea`, `#e0e3e5`, `#ffffff`
- **On surface**: `#191c1e` (texto principal)
- **On surface variant**: `#464554` (texto secundario)
- **Outline**: `#767586`
- **Inverse surface**: `#2d3133` (sidebar dark)

#### Scenario: Aplicar color primary a un botón
Given un componente Button en el admin
When se renderiza con `variant="default"`
Then debe usar `bg-primary` y `text-on-primary` de las variables CSS
And debe pasar el contraste WCAG AA (4.5:1 mínimo)

#### Scenario: Cambio de tema preserva identidad
Given la paleta primary indigo
When el usuario activa dark mode
Then el primary se mantiene como acento (no se invierte)
And las surfaces cambian a tonos slate oscuros manteniendo jerarquía visual

### Requirement: Tipografía dual por contexto
El sistema MUST usar Inter en admin y Playfair Display + Inter en landing, según el design.

The system must definir:
- **Display**: Inter 36/44/700 (admin) o Playfair Display 64/72/500 (landing)
- **Headline lg**: Inter 28/36/600 (admin) o Playfair Display 36/44/600 (landing)
- **Headline md**: Inter 20/28/600 (admin) o Playfair Display 24/32/500 (landing)
- **Body lg**: Inter 16/24/400 (admin) o Inter 16/28/300 (landing)
- **Body md**: Inter 14/20/400 (universal)
- **Label md**: Inter 12/16/600 UPPERCASE (universal, table headers, sidebar categories)
- **Code**: JetBrains Mono 13/18 (universal)

#### Scenario: Renderizar título en landing
Given una página pública
When se renderiza un `<h1>` con clase `font-display text-display`
Then debe usar Playfair Display 64px/72px con weight 500

#### Scenario: Renderizar etiqueta en sidebar admin
Given el sidebar del panel admin
When se renderiza un nav item label
Then debe usar Inter 12px UPPERCASE con letter-spacing 0.05em

### Requirement: Espaciado en grilla 8px
El sistema MUST basar todo el espaciado en múltiplos de 8px (4px para casos muy finos).

The system must definir tokens:
- `xs`: 4px (chips, separadores pequeños)
- `sm`: 8px (padding interno de inputs, botones pequeños)
- `md`: 16px (padding interno de cards)
- `lg`: 24px (margen entre secciones)
- `xl`: 32px (margen layout-level)
- `xxl`: 64px (espaciado editorial en landing)
- `3xl`: 96px (hero padding)
- `gutter`: 20px (mobile)
- `container-max`: 1440px

#### Scenario: Padding interno de card
Given un componente Card
When se renderiza
Then debe usar `p-md` (16px) o `p-lg` (24px) según jerarquía
And nunca debe romper la grilla 8px (no usar 13px, 17px, etc.)

### Requirement: Border radius suave
El sistema MUST usar bordes suavemente redondeados, sin esquinas afiladas ni completamente circulares (excepto avatares e icon-buttons).

The system must definir:
- `DEFAULT`: 0.125rem (2px) — elementos muy pequeños
- `md`: 0.375rem (6px) — inputs
- `lg`: 0.5rem (8px) — cards, modals, containers
- `xl`: 0.75rem (12px) — emphasis
- `full`: 9999px — avatares, icon-only buttons, badges pill

#### Scenario: Card con radius correcto
Given un componente Card
When se renderiza con `rounded-xl`
Then debe tener 0.5rem (8px) de border radius
And NO debe tener sombra pesada

### Requirement: Elevación por capas tonales
El sistema MUST definir profundidad por capas de color (tonal layers) y bordes sutiles, evitando sombras pesadas.

The system must definir tres niveles:
- **Level 0** (background): `#f7f9fb` light / `#0f172a` dark
- **Level 1** (cards, sidebar): pure white (light) / slate-900 (dark) + border 1px slate-200/slate-800, sin sombra
- **Level 2** (dropdowns, modals, popovers): shadow `0px 10px 15px -3px rgba(0,0,0,0.1)` + border más visible

#### Scenario: Renderizar un modal
Given un Dialog (modal) en el admin
When se abre
Then debe tener shadow Level 2 aplicada
And el backdrop debe tener opacidad para enfocar el contenido

#### Scenario: Card normal sin sombra
Given un componente Card estándar
When se renderiza
Then NO debe tener shadow
And debe diferenciarse del background por color (white vs surface-light) y por border 1px

### Requirement: Tema light/dark con persistencia
El sistema MUST soportar dos temas (light, dark) con cambio sin parpadeo (FOUC) y persistencia en localStorage.

The system must:
- Usar `next-themes` para gestión
- Aplicar clase `dark` en `<html>` antes de hidratar (vía script inline)
- Permitir override del sistema operativo
- Sincronizar entre pestañas

#### Scenario: Primera visita con preferencia del sistema dark
Given el usuario accede por primera vez con OS en dark mode
When carga la página
Then el tema debe renderizarse en dark ANTES de mostrar contenido (no flash blanco)

#### Scenario: Toggle manual
Given el usuario hace click en el botón theme toggle
When cambia el tema
Then la clase `dark` se aplica/quita del `<html>`
And la elección se guarda en localStorage
And otras pestañas abiertas reflejan el cambio

#### Scenario: Persistencia entre sesiones
Given el usuario eligió dark mode
When cierra el navegador y vuelve al día siguiente
Then la página debe cargar en dark mode sin preguntar

### Requirement: Componentes accesibles (WCAG AA)
Todos los componentes UI MUST cumplir WCAG AA mínimo, apoyándose en Radix UI primitives de shadcn.

The system must:
- Contraste de texto ≥ 4.5:1 para body, ≥ 7:1 para headings
- Focus visible con ring primary
- Labels asociados a inputs (`<label htmlFor>` o `aria-label`)
- Roles ARIA correctos en dialogs, popovers, tooltips
- Navegación por teclado funcional (tab, escape, arrows)

#### Scenario: Input con label
Given un formulario
When el usuario tabula entre campos
Then debe ver un focus ring visible (primary)
And el screen reader debe anunciar el label + valor

#### Scenario: Modal cerrable con teclado
Given un Dialog abierto
When el usuario presiona Escape
Then el modal debe cerrarse
And el focus debe volver al elemento que lo abrió

### Requirement: Iconografía consistente
El sistema MUST usar `lucide-react` para todos los iconos del admin, manteniendo un tamaño y stroke consistentes.

The system must:
- Tamaño por defecto: 16px (inline), 20px (button), 24px (standalone)
- Stroke width: 1.75 (default de lucide)
- Color: heredar del texto padre (`currentColor`)

#### Scenario: Icon button en tabla
Given una fila de tabla con acciones
When se renderiza el botón de "more actions"
Then debe usar un icono `MoreHorizontal` de lucide, tamaño 16px
And heredar color del texto on-surface-variant

### Requirement: Responsive mobile-first
El sistema MUST funcionar 100% responsive con breakpoints definidos.

The system must definir breakpoints:
- Mobile: < 640px (padding 16px)
- Tablet: 640-1024px (padding 24px)
- Desktop: > 1024px (padding 32px)

#### Scenario: Sidebar colapsa en mobile
Given el usuario accede desde móvil
When carga el admin
Then el sidebar debe ocultarse tras un hamburger menu
And el contenido principal debe ocupar todo el ancho

#### Scenario: Cards en grid responsive
Given una grilla de ServiceCard
When se renderiza en desktop
Then debe mostrar 3 columnas
And en tablet 2 columnas
And en mobile 1 columna

## Out of scope

- Iconos Material Symbols: solo se mantienen donde Stitch los usa (dashboard topbar); shadcn/lucide es el estándar nuevo
- Animaciones complejas: transiciones suaves están permitidas pero no se requiere librería de motion dedicada
- Temas adicionales (alto contraste, color custom por cliente): se podrían añadir después si la clienta lo pide