# Proposal — Fase 9: Blog (gestión de posts + UI pública)

## Why

La landing pública (Fase 6) muestra un placeholder "Coming soon" en `/blog`, y la página admin `/admin/blog` también. La capa de persistencia de posts ya está migrada desde Fase 5: los modelos `Post`, `PostCategory` y el enum `PostStatus` existen en `prisma/schema.prisma`. Pero no hay lógica de servidor, ni UI admin, ni UI pública. Sin blog, perdemos una herramienta clave de marketing de contenidos (SEO orgánico, autoridad de marca, embudo de adquisición).

Esta fase cierra la ausencia con un CMS básico: admin puede crear/editar/publicar posts; el público puede leerlos en `/blog` y `/blog/[slug]`.

## What Changes

### 1. Backend: capa de servidor para blog (`src/server/blog/`)

- **`validators.ts`** — Zod schemas:
  - `createPostSchema` — `{ slug, title, excerpt, content, image?, status, publishedAt?, categoryId?, tags?, metaTitle?, metaDesc? }`. slug se normaliza a lowercase; title/excerpt son `{ es, en }` con min/max; content es el JSON de Tiptap (validado con shape mínimo: debe ser un objeto con `type: 'doc'`).
  - `updatePostSchema` — todos los campos opcionales excepto el id; mismo shape.
  - `postFilterSchema` — `{ search?, status?, categoryId?, skip?, take? }` para el listado.
  - `createCategorySchema` / `updateCategorySchema` — slug + name (i18n).

- **`queries.ts`** — funciones de lectura:
  - `listPostsAdmin({ search?, status?, categoryId?, skip?, take? })` — paginada, con relations (category, count de comentarios si se agregan en una fase posterior). Devuelve `PostListItem[]` y total.
  - `listPostsPublic({ locale, categorySlug?, skip?, take? })` — solo `status=PUBLISHED`, ordenado por `publishedAt desc`, con el nombre de la categoría en el locale correcto.
  - `getPostById(id, locale)` — detail con category y todo el shape de Tiptap. Devuelve null si no existe.
  - `getPostBySlug(slug, locale)` — para la página pública. Devuelve null si no existe o no está publicado.
  - `getRelatedPosts(postId, locale, limit=3)` — misma categoría, excluye el actual.
  - `getPostStats()` — `totalDrafts`, `totalPublished`, `totalArchived`, `totalCategories`.

- **`actions.ts`** — Server Actions (auth-gated, `requireAdmin`):
  - `createPost(input)` — en transacción: validar slug único, validar que categoryId existe si se provee, generar excerpt del content si no se provee, crear el Post.
  - `updatePost(id, input)` — solo modifica los campos provistos. Si se cambia slug, valida unicidad.
  - `deletePost(id)` — hard delete. Bloqueado si el post está publicado y no se provee `force: true` (defensa contra borrado accidental de contenido público).
  - `changePostStatus(id, status)` — `DRAFT`/`PUBLISHED`/`ARCHIVED`. Auto-set `publishedAt` cuando pasa a `PUBLISHED` por primera vez.
  - `upsertCategory(input)` — crea o actualiza categoría.
  - `deleteCategory(id)` — bloqueado si hay posts usándola (defensa en profundidad; el FK ya está con `onDelete: SetNull`).
  - `bulkPublish(postIds[])` y `bulkArchive(postIds[])` — acciones en lote desde el listado admin.

### 2. Frontend admin: rutas y UI (`src/app/[locale]/(admin)/admin/blog/`)

- **`/admin/blog`** — lista de posts con filtros (status, categoría, búsqueda). Tabla con columnas: título, categoría, status (badge), fecha publicación, autor (placeholder si no hay multi-user), acciones. Botón "Nuevo post".
- **`/admin/blog/nuevo`** — formulario de creación con Tiptap editor.
- **`/admin/blog/[id]`** — formulario de edición (mismo componente, modo edit).
- **`/admin/blog/categorias`** — gestión de categorías (lista + crear/editar/eliminar).
- Componentes auxiliares:
  - `PostForm` (client) — usa Tiptap, integra `react-hook-form` + Zod, valida en submit, sube imagen vía `media` library.
  - `TiptapEditor` (client) — wrapper de Tiptap con StarterKit + Link + Image, toolbar (bold, italic, link, heading, list, image), output JSON.
  - `PostsList` (client) — tabla + búsqueda con debounce + filtros.
  - `CategoriesManager` (client) — formulario inline + lista.

### 3. Frontend público: rutas y UI (`src/app/[locale]/(public)/blog/`)

- **`/blog`** — listado de posts publicados con paginación. Cada post muestra: cover image (si tiene), título, excerpt, fecha, categoría. Click → detail.
- **`/blog/[slug]`** — página de post individual: cover image, título, meta (fecha + categoría + tiempo de lectura), contenido renderizado desde Tiptap JSON, "Posts relacionados" al final.
- Componentes públicos:
  - `PostCard` (server o client) — preview del post en el listado.
  - `PostContent` (client) — renderiza Tiptap JSON a HTML. Como el admin produce JSON válido vía Tiptap, el público lo lee con `generateHTML(json, extensions)`. No hay XSS porque solo renderizamos lo que el admin escribió.
  - `RelatedPosts` (server) — sección al final del detail.

### 4. SEO y metadata

- `/blog/[slug]` exporta `generateMetadata` con `metaTitle` y `metaDesc` (los del modelo, con fallback al title/excerpt).
- Open Graph tags: `og:title`, `og:description`, `og:image` (la cover), `og:type=article`, `og:locale`.
- Twitter cards: `summary_large_image` con cover.
- JSON-LD: `BlogPosting` schema con `headline`, `datePublished`, `author`, `image`.
- Sitemap: extend `app/sitemap.ts` para incluir posts publicados.

### 5. i18n

Namespaces nuevos:
- `admin.blog.*` (es, en): lista, filtros, form (labels, placeholders, errores), Tiptap toolbar, categorías, status badges, mensajes de éxito.
- `public.blog.*` (es, en): títulos de página, labels de "Leer más", "Posts relacionados", "Volver al blog", "Tiempo de lectura: {min} min", "Por {category}", "Publicado el {date}".

### 6. E2E

- `e2e/blog-crud.spec.ts` — admin flow: login → crear post en draft → editar → publicar → verificar badge PUBLISHED → archivar → verificar badge ARCHIVED → eliminar.
- `e2e/blog-public.spec.ts` — público: ir a `/blog` (debe listar posts publicados) → click en un post → verificar título, contenido, posts relacionados.

## Architecture Decisions

### Tiptap JSON como formato de almacenamiento

Tiptap produce un JSON estructurado (no HTML) que se guarda en `Post.content` como `Json`. Para renderizarlo en el público, usamos `generateHTML(json, [...extensions])` con el mismo set de extensiones del editor. Ventajas:
- Storage agnóstico al framework (podemos cambiar Tiptap por otro editor sin migrar datos).
- HTML de salida es determinista (las mismas extensiones producen el mismo HTML).
- Sin XSS: el admin solo puede generar lo que las extensiones permiten (no `<script>`, no inline event handlers).
- El JSON es legible y editable a mano en la DB si hace falta.

Alternativa descartada: guardar HTML directo. Pierde la ventaja de "JSON editable" y abre XSS si no se sanitiza en cada render.

Alternativa descartada: Markdown. El admin tendría que aprender sintaxis, y el render público requiere `react-markdown` + sanitización. Menos WYSIWYG que Tiptap.

### Multi-autor (no implementado)

El modelo no tiene `authorId`. Esto queda para una fase posterior si se quiere multi-user. Por ahora todos los posts son del "admin" (sin atribución visible al público; solo fecha + categoría).

### Tiempo de lectura calculado

Tiempo de lectura = `Math.ceil(contentWordCount / 200)` (200 palabras por minuto, estándar). Calculado en el server al renderizar (no se almacena). Para contenido Tiptap JSON, el word count se calcula concatenando los nodos de tipo `text`.

### Status y publishedAt

- `DRAFT` → `publishedAt: null`. No aparece en `/blog`.
- `PUBLISHED` → al primer cambio desde `DRAFT`, `publishedAt` se setea a `now()` si era null. Cambios posteriores a `PUBLISHED` no modifican `publishedAt` (es la fecha de primera publicación).
- `ARCHIVED` → no aparece en `/blog` pero la URL directa sigue accesible (decisión: archive = oculto del listado pero no 404; permite compartir links viejos).

Alternativa descartada: archive = 404. Demasiado agresivo para un blog donde links viejos pueden seguir circulando.

### Categorías: SetNull en delete

Si se borra una categoría, los posts quedan con `categoryId: null` (no se borran). Esto es intencional: el contenido sobrevive a cambios en taxonomía. El público muestra "Sin categoría" en ese caso.

### SEO: sitemap + JSON-LD + meta dinámico

No implemento `generateStaticParams` (SSG) ni ISR. Uso SSR estándar con `revalidatePath` en cada action. Para un blog con ~10-50 posts está bien. Si el blog crece a cientos de posts, se puede agregar `revalidate = 3600` después.

### Renderizado público: Tiptap → HTML server-side

El `PostContent` es client component (porque Tiptap renderiza en cliente), pero el JSON viene del server (de `getPostBySlug`). Hidratación: el server puede pre-renderizar el HTML estático si quisiéramos, pero la complejidad no vale la pena para v0.5.0. Decisión: client render con `useEffect` para que solo corra en el browser.

Alternativa: instalar `react-markdown` y guardar Markdown en DB en vez de Tiptap JSON. Descartado porque el usuario eligió Tiptap.

## Impact

- **Áreas afectadas**: `blog` (nueva), `admin` (rutas), `public` (rutas), `i18n` (namespace nuevo), `seo` (metadata + sitemap).
- **Archivos nuevos estimados**:
  - Backend: 3 (validators, queries, actions).
  - Admin: ~6 (lista, detail/new, form, editor, list, categories manager).
  - Público: ~4 (lista, detail, post card, post content, related posts).
  - i18n: 2 (es, en).
  - SEO: 1 (sitemap update) + metadata en cada ruta.
  - Tests: 2 unit test files (validators + actions con Prisma mockeado) + 2 E2E specs.
  - OpenSpec: 1 proposal + 1 tasks.
- **Riesgo**: MEDIO. Tiptap en client component puede tener fricciones de hidratación (mismo bug que vimos en Fase 7 con RHF). Mitigación: el editor se monta client-side solo en rutas admin (no afecta el público). El render público del JSON es trivial y no debería tener problemas.
- **Performance**: queries con `findMany` + includes, índices en `status, publishedAt` (ya existen en el schema). Para un blog con <100 posts el listado es trivial.

## Out of scope (fases futuras)

- **Comentarios** (modelo Comment + threading + moderación) — Fase 10+.
- **Multi-autor** (campo `authorId` en Post, modelo User extendido) — Fase 10+.
- **Búsqueda full-text** — Fase 10+.
- **Newsletter signup** — Fase 10+.
- **AMP / Accelerated Mobile Pages** — probablemente nunca (Next.js nativo es suficiente).
- **Categorías jerárquicas** (parent/child) — si se quiere, en una fase posterior.
- **Tags como modelo propio** (muchos-a-muchos) — actual `tags: String? CSV` es suficiente para v0.5.0.
- **Programación de publicación** (`scheduledFor: DateTime` + worker que publica automáticamente) — Fase 10+.
- **SSG con generateStaticParams** — si el blog crece, se agrega en una fase posterior.
- **Markdown alternative** (algunos bloggers lo prefieren) — si se pide.
- **Image optimization** (Next/Image con el Media library) — se puede agregar pero el campo `image: String?` actual permite URLs directos.
- **AMP / RSS / Atom** — RSS se menciona en la propuesta pero se puede dejar para fase posterior si no se prioriza.
