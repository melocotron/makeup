# Capability: Authentication (Admin)

## Purpose
Permite a la única administradora del sitio autenticarse de forma segura para acceder al panel de gestión. Protege todas las rutas `/admin/**` excepto `/admin/login`.

## Requirements

### Requirement: Login con credenciales
The system must permitir al admin iniciar sesión con email y password hasheado.

#### Scenario: Login exitoso
Given el admin existe en la DB con email "admin@radiant-beauty.local" y password "admin123" hasheado
When el usuario envía el formulario de login con credenciales correctas
Then se crea una sesión JWT
And el usuario es redirigido a `/admin`
And la cookie de sesión se persiste por 7 días

#### Scenario: Credenciales inválidas
Given el admin existe en la DB
When el usuario envía el formulario con password incorrecto
Then se muestra un toast de error "Credenciales inválidas"
And NO se revela si el email existe o no
And NO se crea sesión
And el formulario permanece visible

#### Scenario: Email no existe
Given el email NO está registrado como admin
When el usuario intenta login con ese email
Then se muestra el mismo error genérico "Credenciales inválidas"
And NO se distingue de "password incorrecto" (previene enumeración)

#### Scenario: Validación de campos vacíos
Given el usuario está en `/admin/login`
When intenta enviar el formulario con email o password vacíos
Then se muestran errores inline en cada campo
And el formulario NO se envía

#### Scenario: Email con formato inválido
Given el usuario escribe "no-es-un-email" en el campo email
When intenta enviar
Then se muestra error "Email inválido"
And el formulario NO se envía

### Requirement: Protección de rutas admin
The system must bloquear el acceso a rutas `/admin/**` para usuarios no autenticados.

#### Scenario: Acceso sin sesión
Given el usuario NO tiene sesión activa
When navega a `/admin` (cualquier sub-ruta excepto `/login`)
Then es redirigido a `/admin/login?callbackUrl=<ruta-original>`
And la URL de callback se preserva para redirigir después del login

#### Scenario: Acceso con sesión activa
Given el usuario tiene sesión activa
When navega a cualquier `/admin/**`
Then el contenido se renderiza normalmente
And NO se redirige a login

#### Scenario: Login cuando ya hay sesión
Given el usuario tiene sesión activa
When navega a `/admin/login`
Then es redirigido automáticamente a `/admin`
And NO ve el formulario de login

### Requirement: Logout
The system must permitir al admin cerrar su sesión activa.

#### Scenario: Logout desde user menu
Given el admin está autenticado en cualquier página `/admin/**`
When hace click en "Cerrar sesión" en el user menu
Then la sesión se destruye (cookie eliminada)
And el usuario es redirigido a `/admin/login`
And NO puede navegar a `/admin/**` sin volver a autenticarse

### Requirement: Persistencia de sesión
The system must persistir la sesión entre recargas del navegador.

#### Scenario: Reload de página
Given el admin está autenticado
When recarga la página o cierra y abre el navegador
Then la sesión persiste (cookie httpOnly)
And NO se le pide volver a login (dentro de los 7 días)

#### Scenario: Sesión expirada
Given pasaron más de 7 días desde el último login
When el usuario navega a `/admin`
Then es redirigido a `/admin/login`
And el mensaje "Tu sesión expiró" se muestra (opcional)

### Requirement: Password security
The system must almacenar passwords de forma segura.

#### Scenario: Almacenamiento de password
Given el admin es creado o cambia su password
Then el password se hashea con bcrypt (10 rounds mínimo)
And NUNCA se almacena en plain text
And NUNCA se loguea en consola o respuestas

#### Scenario: Comparación de password
Given el usuario envía un password en login
Then bcrypt compara contra el hash almacenado
And la comparación toma ~100ms (intencional para prevenir brute force)

### Requirement: Mensajes de error traducibles
The system must mostrar mensajes de error en el idioma del usuario.

#### Scenario: Error en español
Given el usuario está en `/es/admin/login`
When ocurre un error de login
Then el mensaje aparece en español (ej: "Credenciales inválidas")

#### Scenario: Error en inglés
Given el usuario está en `/en/admin/login`
When ocurre un error de login
Then el mensaje aparece en inglés (ej: "Invalid credentials")

### Requirement: Internacionalización del admin
The system must traducir toda la UI del admin (login, user menu, navegación) a es/en.

#### Scenario: Sidebar en español
Given el admin está autenticado y el locale es "es"
When ve el sidebar
Then los items están en español (Citas, Servicios, Paquetes, etc.)

#### Scenario: Sidebar en inglés
Given el admin está autenticado y el locale es "en"
When ve el sidebar
Then los items están en inglés (Appointments, Services, Packages, etc.)

## Out of scope

- Multi-admin con diferentes roles
- OAuth (Google, etc.)
- 2FA
- Password recovery por email
- Rate limiting en login (1 admin, poco riesgo, documentado como follow-up)
- Auditoría de logins