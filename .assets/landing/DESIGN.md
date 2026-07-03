---
name: Kinetic Enterprise
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464554'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#515f74'
  on-secondary: '#ffffff'
  secondary-container: '#d5e3fc'
  on-secondary-container: '#57657a'
  tertiary: '#006c49'
  on-tertiary: '#ffffff'
  tertiary-container: '#00885d'
  on-tertiary-container: '#000703'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#d5e3fc'
  secondary-fixed-dim: '#b9c7df'
  on-secondary-fixed: '#0d1c2e'
  on-secondary-fixed-variant: '#3a485b'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  code:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  container-max: 1440px
  gutter: 20px
---

## Brand & Style

The design system is engineered for high-efficiency professional service management. It prioritizes clarity, systematic organization, and a sense of "calm productivity." The brand personality is authoritative yet approachable, aiming to reduce the cognitive load of managing complex schedules and administrative data.

The aesthetic follows a **Corporate / Modern** direction with subtle **Minimalist** influences. It utilizes a refined structural grid, generous whitespace to prevent information density fatigue, and a systematic approach to depth. The interface feels intentional and engineered, favoring crisp edges, purposeful color application, and functional motion.

## Colors

The palette is anchored by a vibrant Indigo primary color, used for high-intent actions and active states. The system relies heavily on a sophisticated range of Slates to provide structural hierarchy without visual noise.

- **Primary (#6366f1):** Used for primary buttons, active navigation states, and progress indicators.
- **Secondary / Neutrals:** A range of Slate grays (`#f8fafc` to `#0f172a`) defines the surface-container architecture.
- **Success/Tertiary (#10b981):** Reserved for positive status updates, completed services, and growth metrics.
- **High Contrast:** Text contrast ratios are strictly maintained at 4.5:1 for body and 7:1 for headings to ensure WCAG AA/AAA compliance across both themes.
- **Dark Mode:** In dark mode, surfaces use a tiered elevation system where higher-elevation components receive lighter slate tints rather than pure black, maintaining depth.

## Typography

This design system uses **Inter** for all UI elements to leverage its exceptional legibility and systematic weight distribution. 

The type scale is optimized for data density. **Body-md (14px)** is the workhorse for data tables and form inputs, while **Label-md** uses a slight tracking increase and uppercase styling for non-content UI elements like table headers and sidebar categories. For large-scale dashboards, the **Display** style provides clear visual anchoring.

## Layout & Spacing

The system employs a **Fluid Grid** model with a 12-column structure for desktop and a single-column reflow for mobile.

- **The Shell:** A fixed-width sidebar (256px) persists on desktop, collapsing to a hamburger menu on mobile.
- **Rhythm:** An 8px base grid governs all spatial relationships. Internal component padding typically uses `sm` (8px) or `md` (16px), while layout-level margins use `lg` (24px) or `xl` (32px).
- **Breakpoints:**
  - Mobile: < 640px (16px margins)
  - Tablet: 640px - 1024px (24px margins)
  - Desktop: > 1024px (32px margins)

## Elevation & Depth

This design system uses **Tonal Layers** combined with **Low-contrast outlines** to define hierarchy.

1.  **Level 0 (Background):** The base canvas (`#f8fafc` Light / `#0f172a` Dark).
2.  **Level 1 (Cards/Sidebar):** Pure white (Light) or Slate-900 (Dark) with a 1px border in Slate-200/Slate-800. No shadow.
3.  **Level 2 (Dropdowns/Modals):** Floating elements use a subtle ambient shadow (0px 10px 15px -3px rgba(0,0,0,0.1)) and a slightly more pronounced border to differentiate from the background.

Avoid heavy shadows; depth should be felt through color shifts and crisp borders rather than artificial light sources.

## Shapes

The shape language is **Soft (Level 1)**. 

- **Standard Elements:** 0.25rem (4px) radius for inputs, small buttons, and tags.
- **Large Elements:** 0.5rem (8px) radius for cards, modals, and containers.
- **Circular:** Used exclusively for avatars and icon-only buttons to provide a distinct visual break from the rectangular data grid.

This subtle rounding maintains a professional "engineered" feel while avoiding the harshness of sharp corners.

## Components

### AdminShell & Navigation
- **Sidebar:** High-contrast background (Slate-900) with Indigo active-state indicators. Use a vertical stripe on the left of the active nav item.
- **Topbar:** Minimalist height (64px), containing breadcrumbs and a global search input.

### Form Inputs
- **Text/Select:** 1px border (Slate-300). On focus, use a 2px Indigo ring with 0% offset.
- **DatePicker:** Calendar popover must follow the elevation Level 2 rules. Highlight current date with a subtle Slate circle and selected date with a Primary solid circle.

### Data Displays
- **StatCard:** Large Display typography for the metric, with a small trend indicator (Tertiary for growth, Red for decline) in the bottom right.
- **Service/Appointment Cards:** Use a left-side color-coded border (4px width) to indicate service type or urgency.
- **DataTables:** Zebra-striping is omitted. Use thin Slate-100/800 dividers. Row hover states should use a subtle Slate-50/900 tint.

### Calendars
- **Month/Week Views:** Grid lines should be 1px Slate-200. "Today" is highlighted with a light Indigo background wash. Events are rendered as pill-shaped blocks with high-contrast text.