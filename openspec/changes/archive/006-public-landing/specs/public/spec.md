# Capability: Landing Pública

## Purpose

La landing `/[locale]` es el sitio público que ven los clientes. Debe mostrar en vivo los servicios, paquetes, contenido "sobre mí" y carrusel que el admin configura en las Fases 0–3.

## Requirements

### Requirement: Layout público con chrome

The system shall render a sticky navbar at the top and footer at the bottom of every public page. The navbar contains: logo, navigation links (Servicios, Paquetes, Sobre Mí, Agendar cita), language switcher, theme toggle, login link, and Book Now CTA.

#### Scenario: Visit landing en español
Given the user navigates to `/es`
When the page loads
Then a sticky navbar appears at the top with the brand "Radiant Beauty" and menu items in Spanish
And a footer appears at the bottom with copyright and policy links

#### Scenario: Visit landing en inglés
Given the user navigates to `/en`
When the page loads
Then the navbar and footer show English translations
And the URL stays `/en`

### Requirement: Hero con CTA

The system shall render a hero section at the top of the landing with a large title, subtitle, and primary CTA button that scrolls to the booking anchor.

#### Scenario: Hero renderiza título y CTA
Given the user visits `/es`
When the hero loads
Then the title "Belleza Radiante & Cuidado Profesional de la Piel" is visible
And a CTA button "Reservar un tratamiento" is shown
And clicking the CTA scrolls to the `#booking` anchor

### Requirement: Grid de servicios activos

The system shall fetch all services where `isActive = true` and render them in a responsive grid below the hero. Each card shows: image (or fallback), name, duration, base price, and description preview.

#### Scenario: Servicios activos se renderizan
Given there are 3 active services in the database
When the user visits `/es`
Then the "Servicios" section shows 3 cards
And each card displays the service name, duration in minutes, and "Desde $X.XX"

#### Scenario: Servicios con extras muestran badge
Given a service has 2 extras
When its card renders
Then a badge "+ 2 extras" is visible

#### Scenario: Sin servicios activos
Given there are 0 active services
When the user visits `/es`
Then the "Servicios" section shows an empty state message "Pronto publicaremos nuestros servicios"

### Requirement: Grid de paquetes activos

The system shall fetch all packages where `isActive = true` and render them in a grid below the services. Each card shows: image, name, list of included services with quantities, and total price.

#### Scenario: Paquetes activos se renderizan
Given there are 2 active packages
When the user visits `/es`
Then the "Paquetes" section shows 2 cards
And each card shows the items included (e.g., "2× Maquillaje Social")

### Requirement: Sección Sobre mí

The system shall render an "About" section with the bio, signature, and image from the `AboutContent` singleton, localized to the current locale.

#### Scenario: Sobre mí renderiza bio localizada
Given the admin has set bio ES="Soy María..." and bio EN="I'm María..."
When the user visits `/es`
Then the About section shows the Spanish bio
And when visiting `/en` it shows the English bio

#### Scenario: Sobre mí sin contenido
Given the admin has not set a bio
When the user visits `/es`
Then the About section shows an empty state message

### Requirement: Modo mantenimiento bloquea pública

The system shall redirect public pages to `/[locale]/maintenance` when `settings.maintenanceMode = true`. The admin panel remains accessible.

#### Scenario: Mantenimiento activo redirige pública
Given `settings.maintenanceMode = true`
When the user visits `/es`
Then the user is redirected to `/es/maintenance`
And the maintenance page shows the message from `settings.maintenanceMessage`

#### Scenario: Mantenimiento no afecta admin
Given `settings.maintenanceMode = true`
When the admin visits `/es/admin`
Then the admin panel loads normally (no redirect)

### Requirement: Responsive mobile-first

The system shall render all public pages responsively: 1 column on mobile, 2 on tablet, 3-4 on desktop. The navbar collapses to a hamburger menu below 768px.

#### Scenario: Mobile muestra hamburger
Given the viewport is < 768px
When the user visits `/es`
Then the desktop menu is hidden
And a hamburger icon is visible
And clicking it opens a drawer with the menu items

## Out of scope

- Páginas individuales de servicio/paquete (detalle) — fase posterior
- Formulario de reserva — Fase 5
- Blog público, galería, testimonios — fases posteriores
- SEO metadata dinámico, sitemap.xml, robots.txt
- Analytics
