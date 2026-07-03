# Spec Delta — Auth (ADDED)

Esta delta define lo que el change `002-auth-admin` añade a la spec viva de auth.

## ADDED Requirements

### Requirement: Estructura de archivos auth
El sistema MUST organizar el código de auth en archivos específicos bajo `src/server/auth/`.

The system must definir:
- `src/server/auth/config.ts` — configuración de NextAuth (providers, callbacks, pages)
- `src/server/auth/index.ts` — exports principales (auth, signIn, signOut)
- `src/server/auth/actions.ts` — Server Actions (logout)
- `src/types/next-auth.d.ts` — type augmentation para Session y User
- `src/app/api/auth/[...nextauth]/route.ts` — handler HTTP

#### Scenario: Importar auth en middleware
Given un dev quiere proteger una ruta
When importa `auth` desde `@/server/auth`
Then obtiene una función compatible con Next.js middleware
And funciona en Edge runtime

### Requirement: Avatar con iniciales
El sistema MUST generar un avatar con iniciales cuando el admin no tiene imagen.

The system must:
- Calcular iniciales del nombre (primer nombre + primer apellido)
- Renderizar círculo con bg-primary text-on-primary
- Tamaño 32px en topbar, 96px en perfil

#### Scenario: Admin sin foto
Given el admin tiene name "María Pérez"
When se renderiza su avatar
Then muestra "MP" en un círculo indigo
And NO rompe la UI si name tiene 1 sola palabra

### Requirement: User menu
El sistema MUST mostrar un dropdown con opciones de usuario en el topbar.

The system must incluir:
- Avatar + nombre + email (header del dropdown)
- Link "Mi cuenta" (placeholder por ahora)
- Separador
- Botón "Cerrar sesión" (rojo o destructive)

#### Scenario: Click en avatar
Given el admin está autenticado
When hace click en su avatar en el topbar
Then se abre un dropdown con sus datos y opciones
And click fuera cierra el dropdown

#### Scenario: Click en "Cerrar sesión"
Given el dropdown está abierto
When hace click en "Cerrar sesión"
Then se ejecuta la Server Action de logout
And se redirige a `/login`

### Requirement: Sidebar responsive
El sistema MUST adaptar el sidebar según el tamaño de pantalla.

The system must:
- Desktop (≥1024px): sidebar fixed siempre visible, 256px ancho
- Mobile (<1024px): sidebar oculto, hamburger en topbar abre drawer desde la izquierda
- Drawer mobile: overlay oscuro detrás, animación slide-in

#### Scenario: Abrir sidebar en mobile
Given el usuario está en mobile < 1024px
When hace click en el hamburger
Then se abre el drawer desde la izquierda
And aparece overlay oscuro detrás
And el contenido se desplaza visualmente

#### Scenario: Cerrar sidebar en mobile
Given el drawer está abierto en mobile
When el usuario hace click en el overlay o en un nav item
Then el drawer se cierra
And el usuario navega al item seleccionado

### Requirement: Dashboard placeholder
El sistema MUST mostrar KPIs placeholder en `/admin` hasta que existan datos reales.

The system must:
- Mostrar 4 StatCards con valor "—"
- Mostrar sección "Próximas citas" con empty state
- Mostrar sección "Accesos rápidos" con botones a las secciones principales
- Todo navegable, sin errores 404

#### Scenario: Primera visita al dashboard
Given el admin acaba de hacer login
When llega a `/admin`
Then ve KPIs en "—", "Próximas citas" vacío, y 6 accesos rápidos
And la página renderiza en menos de 500ms