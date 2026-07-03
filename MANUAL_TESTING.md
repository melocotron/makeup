# Manual Testing Checklist — Makeup Site

> **Objetivo**: Verificar manualmente cada feature implementada antes de pasar a producción.
> **Entorno**: Docker MySQL corriendo, app en `http://localhost:3000`

---

## 📋 Pre-requisitos

| # | Paso | Comando / Acción | Resultado esperado |
|---|---|---|---|
| 0.1 | Verificar Node.js | `node --version` | v18+ (probado en v24) |
| 0.2 | Verificar Docker | `docker --version` | Docker Desktop corriendo |
| 0.3 | Levantar MySQL | `npm run db:up` | Container `makeup-mysql` healthy |
| 0.4 | Verificar conexión | `docker ps` | `makeup-mysql` con puerto `3306` |
| 0.5 | Sync schema | `npx prisma db push` | "Database is now in sync" |
| 0.6 | Cargar seed | `npm run db:seed` | "Admin created", "Settings created" |
| 0.7 | Verificar phpMyAdmin | Abrir `http://localhost:8080` | Login `makeup`/`makeup` funciona |
| 0.8 | Iniciar app | `npm run dev` | "Ready in Xs" |
| 0.9 | Verificar home pública | Abrir `http://localhost:3000/es` | Status 200, hero visible |
| 0.10 | Limpiar cookies | DevTools → Application → Cookies → Clear | Listo para probar login |

### Variables de entorno mínimas (en `.env`)
```
DATABASE_URL="mysql://makeup:makeup@localhost:3306/makeup_dev"
NEXTAUTH_SECRET="cualquier-string-seguro-de-32-chars"
NEXTAUTH_URL="http://localhost:3000"
AUTH_TRUST_HOST="true"
```

### Credenciales seed
```
Email:    admin@radiant-beauty.local
Password: admin123
```

---

## 🔐 Sección 1 — Autenticación

### 1.1 Login con credenciales correctas

| Paso | Acción |
|---|---|
| a | Abrir `http://localhost:3000/es/admin/login` |
| b | Ingresar `admin@radiant-beauty.local` |
| c | Ingresar `admin123` |
| d | Click "Enviar" |

**Esperado en Network (DevTools → Network):**
- `POST /login` → status `200` (con `redirect: false`)
- Request URL: `/login` con headers Content-Type: application/x-www-form-urlencoded
- Response: redirect URL to `/es/admin`

**Esperado en Consola:**
```
✓ [next-auth][warn] No warning messages
✓ Sin errores rojos
```

**Esperado en UI:**
- Redirige a `/es/admin` (status 200)
- Sidebar dark a la izquierda con items: Panel, Citas, Servicios, Paquetes, Clientes, Promociones, Fidelidad, Inicio, Medios, Blog, Reportes, Ajustes
- Topbar con breadcrumb "Inicio › Panel"
- Avatar circular con "AD" en la esquina superior derecha
- Theme toggle visible (sol/luna)
- Language switcher visible

- [ ] ✅ Pasa

---

### 1.2 Login con credenciales inválidas (password incorrecto)

| Paso | Acción |
|---|---|
| a | Logout (avatar → Cerrar sesión) |
| b | Abrir `/es/admin/login` |
| c | Email correcto + password `wrongpassword` |
| d | Submit |

**Esperado en Network:**
- `POST /login` → status `200`
- Response body contiene error (en JSON o redirect con error param)

**Esperado en UI:**
- Toast rojo: "Credenciales inválidas"
- Permanece en `/es/admin/login`
- Password field muestra mensaje de error
- Sin redirección

- [ ] ✅ Pasa

---

### 1.3 Login con email que no existe

| Paso | Acción |
|---|---|
| a | Email: `noexiste@test.com` + cualquier password |

**Esperado:**
- Toast: "Credenciales inválidas" (idéntico a 1.2, no revela si existe)
- Permanece en login

- [ ] ✅ Pasa

---

### 1.4 Validación de email con formato inválido

| Paso | Acción |
|---|---|
| a | Email: `no-es-un-email` |
| b | Password: cualquier cosa |
| c | Submit |

**Esperado en UI:**
- Error inline bajo el campo email: "Email inválido"
- NO se envía el form
- NO toast

- [ ] ✅ Pasa

---

### 1.5 Validación de campos vacíos

| Paso | Acción |
|---|---|
| a | Submit sin llenar nada |

**Esperado:**
- Error inline en ambos campos
- NO submit

- [ ] ✅ Pasa

---

### 1.6 Acceso sin sesión a ruta protegida

| Paso | Acción |
|---|---|
| a | Logout |
| b | Ir directamente a `http://localhost:3000/es/admin/services` |

**Esperado en Network:**
- `GET /es/admin/services` → status `307` (redirect)
- Location header: `http://localhost:3000/es/admin/login?callbackUrl=%2Fes%2Fadmin%2Fservices`

**Esperado en UI:**
- Redirige a `/es/admin/login`
- Después de login, va a `/es/admin/services` (respeta callbackUrl)

- [ ] ✅ Pasa

---

### 1.7 Login cuando ya hay sesión

| Paso | Acción |
|---|---|
| a | Logueado |
| b | Ir a `http://localhost:3000/es/admin/login` |

**Esperado:**
- Redirige automáticamente a `/es/admin`
- NO muestra el form

- [ ] ✅ Pasa

---

### 1.8 Logout

| Paso | Acción |
|---|---|
| a | Logueado, click en avatar (esquina sup. derecha) |
| b | Dropdown se abre con opciones |
| c | Click "Cerrar sesión" |

**Esperado en Network:**
- Request POST al endpoint de logout
- Cookies de sesión eliminadas

**Esperado en UI:**
- Redirige a `/es/admin/login`
- Intentar ir a `/es/admin` ahora redirige de vuelta a login

- [ ] ✅ Pasa

---

### 1.9 Cambio de idioma en admin

| Paso | Acción |
|---|---|
| a | Logueado en `/es/admin` |
| b | Click en "EN" en el switcher de idioma (topbar) |

**Esperado:**
- URL cambia a `/en/admin`
- Textos del sidebar cambian a inglés: Dashboard, Appointments, Services, etc.
- Recarga de página preserva la sesión

**Esperado en Consola:**
- Sin errores de hidratación

- [ ] ✅ Pasa

---

### 1.10 Theme toggle

| Paso | Acción |
|---|---|
| a | Click en icono sol/luna (topbar) |

**Esperado en UI:**
- Toda la UI cambia de tema
- Persiste después de refrescar (localStorage)
- Sin parpadeo (FOUC) al cargar

- [ ] ✅ Pasa

---

### 1.11 Mobile sidebar (responsive)

| Paso | Acción |
|---|---|
| a | DevTools → Toggle device toolbar (Ctrl+Shift+M) |
| b | Seleccionar iPhone / ancho < 1024px |
| c | Verificar que sidebar está oculto |
| d | Click en hamburguesa (topbar) |

**Esperado:**
- Drawer se abre desde la izquierda
- Overlay oscuro detrás
- Click fuera del drawer o en un nav item cierra el drawer

- [ ] ✅ Pasa

---

## 🖼️ Sección 2 — Media Library

### 2.1 Upload drag&drop de imagen

| Paso | Acción |
|---|---|
| a | Login → ir a `/es/admin/media` |
| b | Arrastra un .jpg/.png/.webp desde tu escritorio al área de upload |

**Esperado en Network:**
- `POST /api/media/upload` → status `200`
- Response JSON: `{ id, url, width, height, size, ... }`

**Esperado en UI:**
- Aparece preview inmediato
- Spinner durante procesamiento
- Toast: "Imagen subida correctamente"
- Imagen aparece en el grid

- [ ] ✅ Pasa

---

### 2.2 Upload por click

| Paso | Acción |
|---|---|
| a | Click en "Seleccionar archivo" o click en el área |
| b | Elige una imagen |

**Esperado:**
- Mismo flujo que 2.1

- [ ] ✅ Pasa

---

### 2.3 Rechazo de tipo no permitido

| Paso | Acción |
|---|---|
| a | Intenta subir un .pdf o .exe |

**Esperado en Network:**
- `POST /api/media/upload` → status `415` (Unsupported Media Type)
- Response: `{ "error": "Tipo no permitido: application/pdf..." }`

**Esperado en UI:**
- Toast rojo: "Tipo no permitido: application/pdf"
- No se guarda

- [ ] ✅ Pasa

---

### 2.4 Rechazo de archivo > 10MB

| Paso | Acción |
|---|---|
| a | Intenta subir un video grande o imagen > 10MB |

**Esperado:**
- Status `413` (Payload Too Large)
- Toast: "Archivo excede 10MB"

- [ ] ✅ Pasa

---

### 2.5 Filtro por folder

| Paso | Acción |
|---|---|
| a | Sube imágenes en diferentes folders (general, perfil, blog) |
| b | Selecciona "Perfil" en el dropdown de folders |

**Esperado en UI:**
- Grid muestra solo imágenes del folder "perfil"
- Contador actualizado ("X imágenes")

- [ ] ✅ Pasa

---

### 2.6 Búsqueda por nombre

| Paso | Acción |
|---|---|
| a | Escribe "logo" en el campo de búsqueda |
| b | Click "Buscar" |

**Esperado:**
- Grid filtra por nombre que contenga "logo"

- [ ] ✅ Pasa

---

### 2.7 Eliminar imagen (con confirmación)

| Paso | Acción |
|---|---|
| a | Hover sobre una imagen en el grid |
| b | Aparece icono papelera (esquina sup. der.) |
| c | Click → botón cambia a "Confirmar" |
| d | Click de nuevo dentro de 3s |

**Esperado en Network:**
- `DELETE /api/media/[id]` → status `200`
- Response: `{ success: true }`

**Esperado en UI:**
- Toast: "Imagen eliminada"
- Imagen desaparece del grid
- Contador decrementa

**Verificación adicional en phpMyAdmin:**
- Tabla `media`: registro eliminado
- Carpeta `public/uploads/.../`: archivo físico eliminado

- [ ] ✅ Pasa

---

### 2.8 Cancelar eliminación

| Paso | Acción |
|---|---|
| a | Click papelera |
| b | Esperar 4 segundos sin click de nuevo |

**Esperado:**
- Botón vuelve a estado normal (no se elimina)

- [ ] ✅ Pasa

---

## ⚙️ Sección 3 — Settings

### 3.1 Guardar configuración general

| Paso | Acción |
|---|---|
| a | Login → `/es/admin/settings` → tab "General" |
| b | Cambiar "Nombre del sitio" a "Mi Salón de Belleza" |
| c | Click "Guardar" |

**Esperado en Network:**
- `POST` a Server Action → status `200`

**Esperado en UI:**
- Toast verde: "Ajustes guardados correctamente"
- Botón "Guardar" se deshabilita (no hay cambios pendientes)

**Verificación phpMyAdmin:**
```sql
SELECT siteName FROM settings;
-- Debe mostrar: 'Mi Salón de Belleza'
```

- [ ] ✅ Pasa

---

### 3.2 Tab Contacto

| Paso | Acción |
|---|---|
| a | Tab "Contacto" |
| b | Llenar email `contacto@misitio.com`, phone `+34 612 345 678`, whatsapp, address |
| c | Guardar |

**Esperado:**
- Toast éxito
- Datos persisten tras refresh

- [ ] ✅ Pasa

---

### 3.3 Tab Redes Sociales

| Paso | Acción |
|---|---|
| a | Tab "Redes sociales" |
| b | Pegar URLs completas (ej: `https://instagram.com/mi-salon`) |
| c | Guardar |

**Esperado:**
- Toast éxito
- URLs persisten

- [ ] ✅ Pasa

---

### 3.4 URL inválida en redes

| Paso | Acción |
|---|---|
| a | En Instagram: `no-es-url` |

**Esperado:**
- Error inline bajo el campo: "Debe ser una URL válida o estar vacío"
- NO se guarda
- NO toast

- [ ] ✅ Pasa

---

### 3.5 Toggle de features

| Paso | Acción |
|---|---|
| a | Tab "Funcionalidades" |
| b | Toggle OFF "Mostrar blog" |
| c | Guardar |

**Esperado:**
- Toast éxito
- Recargar y el toggle sigue OFF

- [ ] ✅ Pasa

---

### 3.6 Tab Mantenimiento

| Paso | Acción |
|---|---|
| a | Activar toggle "Activar mantenimiento" |
| b | Mensaje: "Sitio en construcción" |
| c | Guardar |

**Esperado:**
- Toast éxito
- (Próxima fase) Modo mantenimiento afecta la pública

- [ ] ✅ Pasa

---

## 👤 Sección 4 — Perfil Profesional

### 4.1 Subir foto de perfil

| Paso | Acción |
|---|---|
| a | `/es/admin/profile` |
| b | Click "Seleccionar imagen" |
| c | Abre MediaPicker con Dialog |
| d | Selecciona imagen existente o sube nueva |
| e | Se cierra Dialog, aparece preview |

**Esperado en Network:**
- `POST /api/media/upload` si subes nueva
- Al guardar form: Server Action con status 200

**Esperado en UI:**
- Preview con la imagen
- Botón "Quitar" para deseleccionar

- [ ] ✅ Pasa

---

### 4.2 Editar bio

| Paso | Acción |
|---|---|
| a | Llenar bio ES: "Soy María, maquilladora profesional..." |
| b | Llenar bio EN: "I'm María, professional makeup artist..." |
| c | Guardar |

**Esperado:**
- Toast: "Perfil guardado"

**Verificación phpMyAdmin:**
```sql
SELECT bio FROM about_content;
-- bio es JSON con keys es y en
```

- [ ] ✅ Pasa

---

### 4.3 Firma

| Paso | Acción |
|---|---|
| a | Firma: "Con amor, María" |
| b | Guardar |

**Esperado:**
- Toast éxito
- Campo persiste tras refresh

- [ ] ✅ Pasa

---

## 🎓 Sección 5 — Credenciales (Preparación)

### 5.1 Crear credencial

| Paso | Acción |
|---|---|
| a | `/es/admin/profile/preparacion` |
| b | Click "+ Nueva credencial" |
| c | Llenar: Título ES="Maquillaje Profesional", Título EN="Professional Makeup", Institución="Academia X", Año=2020 |
| d | (Opcional) Subir imagen |
| e | Orden: 0 |
| f | Guardar |

**Esperado en Network:**
- Server Action → 200

**Esperado en UI:**
- Dialog se cierra
- Credencial aparece en tabla
- Imagen thumbnail visible (si subiste)

- [ ] ✅ Pasa

---

### 5.2 Editar credencial

| Paso | Acción |
|---|---|
| a | Click ícono lápiz en fila |
| b | Modificar algún campo |
| c | Guardar |

**Esperado:**
- Cambios reflejados en tabla
- Toast éxito

- [ ] ✅ Pasa

---

### 5.3 Eliminar credencial

| Paso | Acción |
|---|---|
| a | Click papelera → confirmar |

**Esperado en Network:**
- Server Action → 200

**Esperado:**
- Toast: "Credencial eliminada"
- Fila desaparece

- [ ] ✅ Pasa

---

### 5.4 Año inválido

| Paso | Acción |
|---|---|
| a | Crear credencial con año `3000` |

**Esperado:**
- Error inline: "Año inválido"
- NO se guarda

- [ ] ✅ Pasa

---

### 5.5 Sin título

| Paso | Acción |
|---|---|
| a | Crear credencial sin llenar Título (ES) |

**Esperado:**
- Error: "Título requerido"
- NO se guarda

- [ ] ✅ Pasa

---

## 🎠 Sección 6 — Carrusel

### 6.1 Crear slide

| Paso | Acción |
|---|---|
| a | `/es/admin/content/home` |
| b | Click "+ Nuevo slide" |
| c | **Imagen obligatoria**: seleccionar del MediaPicker |
| d | Título ES="Bienvenida", Título EN="Welcome" |
| e | Subtítulo (opcional) |
| f | (Opcional) CTA label + URL |
| g | Orden: 0, Activo: ON |
| h | Guardar |

**Esperado en Network:**
- Server Action → 200

**Esperado en UI:**
- Dialog se cierra
- Card aparece en el grid con imagen, título y badge "Activo"

- [ ] ✅ Pasa

---

### 6.2 Toggle activo inline

| Paso | Acción |
|---|---|
| a | Click switch en una card |

**Esperado en Network:**
- Server Action → 200

**Esperado:**
- Badge cambia de "Activo" a "Inactivo" sin recargar
- Sin toast (cambio silencioso)

- [ ] ✅ Pasa

---

### 6.3 Editar slide

| Paso | Acción |
|---|---|
| a | Click lápiz en card |
| b | Modificar título |
| c | Guardar |

**Esperado:**
- Cambios en card

- [ ] ✅ Pasa

---

### 6.4 Eliminar slide

| Paso | Acción |
|---|---|
| a | Click papelera → confirmar |

**Esperado:**
- Toast: "Slide eliminado"
- Card desaparece

- [ ] ✅ Pasa

---

### 6.5 Sin imagen

| Paso | Acción |
|---|---|
| a | Intentar guardar sin seleccionar imagen |

**Esperado:**
- Error: "Imagen requerida"
- NO se guarda

- [ ] ✅ Pasa

---

### 6.6 CTA URL inválida

| Paso | Acción |
|---|---|
| a | CTA URL: `no-es-url` |

**Esperado:**
- Error inline: "Debe ser una URL válida o estar vacío"

- [ ] ✅ Pasa

---

## ✂️ Sección 7 — Servicios

### 7.1 Crear servicio básico

| Paso | Acción |
|---|---|
| a | `/es/admin/services` |
| b | Click "+ Nuevo servicio" |
| c | Nombre ES="Maquillaje Social", Nombre EN="Social Makeup" |
| d | Descripción ES="Maquillaje para eventos sociales" |
| e | Duración: 60, Precio base: 85.00 |
| f | Categoría: "Maquillaje" (opcional) |
| g | (Opcional) Imagen |
| h | Guardar |

**Esperado:**
- Toast: "Servicio creado"
- Redirige a `/admin/services`
- Servicio aparece en tabla

**Verificación phpMyAdmin:**
```sql
SELECT id, name, basePrice, durationMin FROM service;
-- debe haber un registro nuevo
```

- [ ] ✅ Pasa

---

### 7.2 Crear servicio CON extras

| Paso | Acción |
|---|---|
| a | Click "+ Nuevo servicio" |
| b | Llenar datos básicos |
| c | En sección Extras: click "+ Agregar extra" |
| d | Llenar: nombre ES="Peinado extra", EN="Extra hairstyle", precio=30 |
| e | Agregar otro: nombre ES="Pestañas postizas", EN="False lashes", precio=20 |
| f | Guardar |

**Verificación phpMyAdmin:**
```sql
SELECT * FROM service_extra WHERE serviceId = 'ID_DEL_SERVICIO';
-- 2 registros
```

**Esperado:**
- Toast éxito
- Servicio tiene 2 extras en la DB

- [ ] ✅ Pasa

---

### 7.3 Editar servicio (modificar extras)

| Paso | Acción |
|---|---|
| a | Click lápiz en un servicio |
| b | Agregar un tercer extra |
| c | Quitar uno existente (botón X) |
| d | Guardar |

**Esperado:**
- Servicio actualizado con 2 extras (después de quitar uno)

- [ ] ✅ Pasa

---

### 7.4 Toggle activo inline

| Paso | Acción |
|---|---|
| a | Click switch en fila |

**Esperado:**
- Sin recargar, estado cambia

- [ ] ✅ Pasa

---

### 7.5 Eliminar servicio

| Paso | Acción |
|---|---|
| a | Click papelera → confirmar |

**Esperado en Network:**
- Server Action → 200

**Esperado en UI:**
- Toast: "Servicio eliminado"
- Fila desaparece
- Extras también eliminados (cascade)

**Verificación phpMyAdmin:**
```sql
SELECT * FROM service_extra WHERE serviceId = 'ID_ELIMINADO';
-- 0 registros
```

- [ ] ✅ Pasa

---

### 7.6 Validación precio negativo

| Paso | Acción |
|---|---|
| a | Precio: `-50` |

**Esperado:**
- Error: "Precio no puede ser negativo"

- [ ] ✅ Pasa

---

### 7.7 Validación duración

| Paso | Acción |
|---|---|
| a | Duración: `2` (minutos) |

**Esperado:**
- Error: "Mínimo 5 minutos"

- [ ] ✅ Pasa

---

### 7.8 Sin nombre en español

| Paso | Acción |
|---|---|
| a | Nombre ES vacío + Nombre EN lleno |

**Esperado:**
- Error: "Nombre requerido"

- [ ] ✅ Pasa

---

## 📦 Sección 8 — Paquetes

### 8.1 Crear paquete sin servicios (debe fallar)

| Paso | Acción |
|---|---|
| a | `/es/admin/packages` → "+ Nuevo paquete" |
| b | Llenar nombre y precio pero NO seleccionar servicios |
| c | Guardar |

**Esperado:**
- Error: "Agrega al menos un servicio"
- NO se guarda

- [ ] ✅ Pasa

---

### 8.2 Crear paquete completo

| Paso | Acción |
|---|---|
| a | Nombre ES="Paquete Novia", Nombre EN="Bridal Package" |
| b | Precio total: 250 |
| c | Servicio picker: seleccionar "Maquillaje Social" (cantidad 1) |
| d | Agregar también "Peinado" (cantidad 1) si existe |
| e | (Opcional) Imagen |
| f | Guardar |

**Esperado:**
- Toast: "Paquete creado"
- Card aparece en grid

**Verificación phpMyAdmin:**
```sql
SELECT * FROM package_item WHERE packageId = 'ID';
-- 2 items
```

- [ ] ✅ Pasa

---

### 8.3 Editar paquete (cambiar cantidad)

| Paso | Acción |
|---|---|
| a | Click lápiz en un paquete |
| b | Cambiar cantidad de un item de 1 a 2 |
| c | Guardar |

**Esperado:**
- Item actualizado

- [ ] ✅ Pasa

---

### 8.4 Quitar item de paquete

| Paso | Acción |
|---|---|
| a | Click X en un item |
| b | Guardar |

**Esperado:**
- Item removido
- Si era el último, mostrar error de validación

- [ ] ✅ Pasa

---

### 8.5 Toggle activo

| Paso | Acción |
|---|---|
| a | Click switch en card |

**Esperado:**
- Badge cambia

- [ ] ✅ Pasa

---

### 8.6 Eliminar paquete

| Paso | Acción |
|---|---|
| a | Click papelera → confirmar |

**Esperado en Network:**
- Server Action → 200

**Esperado:**
- Toast: "Paquete eliminado"
- Card desaparece
- Items eliminados (cascade)

- [ ] ✅ Pasa

---

## 🌐 Sección 9 — Landing Pública

### 9.1 Home en español

| Paso | Acción |
|---|---|
| a | Logout (ir a `/es` sin sesión) |

**Esperado:**
- Status 200
- Navbar transparente arriba con: logo "Radiant Beauty", menú (Servicios, Paquetes, Sobre Mí, Agendar cita), Login, Book Now
- Hero con título grande "Belleza Radiante & Cuidado Profesional de la Piel"
- Secciones: Servicios, Paquetes, Sobre mí
- Footer con copyright y links

- [ ] ✅ Pasa

---

### 9.2 Home en inglés

| Paso | Acción |
|---|---|
| a | Ir a `/en` |

**Esperado:**
- Mismo contenido en inglés
- Navbar con: "Home", "Services", "Packages", "About", "Book appointment", "Login", "Book Now"

- [ ] ✅ Pasa

---

### 9.3 Theme toggle persiste en landing

| Paso | Acción |
|---|---|
| a | En `/es/admin`, click theme toggle (dark mode) |
| b | Logout |
| c | Ir a `/es` |

**Esperado:**
- Landing aparece en dark mode sin flash de light mode

- [ ] ✅ Pasa

---

### 9.4 Language switcher en pública

| Paso | Acción |
|---|---|
| a | En `/es`, click "EN" en switcher |

**Esperado:**
- URL cambia a `/en`
- Textos en inglés
- Theme se preserva

- [ ] ✅ Pasa

---

### 9.5 Click "Reservar" en nav (placeholder)

| Paso | Acción |
|---|---|
| a | Click "Reservar" / "Book Now" |

**Esperado:**
- Va a `#booking` (que aún no existe contenido, solo anchor)

- [ ] ✅ Pasa (es OK por ahora)

---

## 🛡️ Sección 10 — Seguridad

### 10.1 API upload sin auth

**Comando (PowerShell):**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/media/upload" -Method POST -UseBasicParsing
```

**Esperado:**
- Status `401`
- Body: `{"error":"No autenticado"}`

- [ ] ✅ Pasa

---

### 10.2 API delete sin auth

**Comando:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/media/FAKE_ID" -Method DELETE -UseBasicParsing
```

**Esperado:**
- Status `401`

- [ ] ✅ Pasa

---

### 10.3 Login con SQL injection

| Paso | Acción |
|---|---|
| a | Email: `admin@radiant-beauty.local'; DROP TABLE admins; --` |
| b | Password: cualquiera |

**Esperado:**
- Error de validación Zod (email inválido)
- Tabla `admins` intacta (verificar en phpMyAdmin)

- [ ] ✅ Pasa

---

### 10.4 Acceso a ID inexistente

| Paso | Acción |
|---|---|
| a | Logueado, ir a `/es/admin/services/ID_FALSO` |

**Esperado:**
- Página 404

- [ ] ✅ Pasa

---

### 10.5 Cookie de sesión manipulada

| Paso | Acción |
|---|---|
| a | DevTools → Application → Cookies |
| b | Modificar valor de la cookie de sesión |
| c | Refrescar página |

**Esperado:**
- Cookie inválida → redirige a login

- [ ] ✅ Pasa

---

## 📊 Resumen de resultados

Una vez completadas todas las pruebas, llena este resumen:

```
Total tests:           65
Passed:                __ / 65
Failed:                __
Skipped (futuras):     __

Bugs críticos:          __
Bugs menores:           __
Notas adicionales:
_________________________________________________________________
_________________________________________________________________
```

---

## 🔧 Cómo debuggear problemas comunes

### Errores de hidratación
- Refresca con Ctrl+Shift+R (limpia caché)
- Verifica que uses el namespace correcto en `useTranslations()`

### Datos no se guardan
- Abre DevTools → Network → busca la Server Action
- Verifica el status code (200 = OK)
- Mira la Response para errores de validación

### Imágenes no se ven
- Verifica que `public/uploads/` tenga el archivo
- phpMyAdmin → tabla `media` → verifica `url` y `filename`

### Theme no persiste
- DevTools → Application → Local Storage → busca el item de next-themes
- Si no existe, el provider no está montando

### Login loop infinito
- Verifica que `NEXTAUTH_SECRET` esté en `.env`
- Verifica `AUTH_TRUST_HOST=true` en dev

### Errores i18n
- Abre la consola del navegador
- `MISSING_MESSAGE`: clave no existe en messages/[locale].json
- `INSUFFICIENT_PATH`: la clave es un objeto pero la usas como string

---

## ✅ Cuando todo pasa

Marcar Fase 0-3 como completas:
- [x] Foundation
- [x] Auth + Dashboard
- [x] Settings + Media
- [x] Profile + Credentials + Carousel
- [x] Services + Packages

**Listo para**: Fase 4 (Landing pública dinámica) y Fase 5 (Sistema de reservas).