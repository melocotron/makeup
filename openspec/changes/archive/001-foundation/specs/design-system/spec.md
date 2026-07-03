# Spec Delta — Design System (ADDED)

Esta delta define lo que el change `001-foundation` añade a la spec viva de design-system.

## ADDED Requirements

### Requirement: Tooling de design system
El proyecto MUST configurar las herramientas para soportar los tokens definidos.

The system must:
- Tailwind CSS v4 con CSS variables
- shadcn/ui como base de componentes (configurado con CSS variables)
- next-themes para light/dark con class strategy
- Carga de fuentes vía `next/font/google`: Inter, Playfair Display, JetBrains Mono

#### Scenario: Configuración inicial correcta
Given un dev clona el repo y ejecuta `npm install && npm run dev`
When el dev abre `http://localhost:3000`
Then debe ver la home con los tokens aplicados (colores, fuentes, spacing)
And el theme toggle debe funcionar

### Requirement: Estructura de archivos de tokens
Los tokens MUST vivir en archivos dedicados para fácil mantenimiento.

The system must definir:
- `src/styles/tokens.css` — CSS variables (paleta, type scale, spacing)
- `tailwind.config.ts` — mapeo de variables a utilidades Tailwind
- `src/styles/themes.css` — variantes light/dark

#### Scenario: Cambiar color primary globalmente
Given un dev quiere cambiar el indigo a otro color
When modifica la variable `--primary` en `tokens.css`
Then TODOS los componentes que usan `bg-primary` reflejan el cambio automáticamente
And no requiere tocar cada componente