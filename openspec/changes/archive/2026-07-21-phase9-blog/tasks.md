# Tasks: Fase 9 — Blog (gestión de posts + UI pública)

## 1. Backend: validators (`src/server/blog/validators.ts`)

- [ ] `createPostSchema` — `{ slug, title, excerpt, content, image?, status, publishedAt?, categoryId?, tags?, metaTitle?, metaDesc? }`. slug lowercase, max 80. title/excerpt son `{ es, en }` con min 1, max 200/500. content es JSON con shape `{ type: "doc", content: [...] }` (validación de shape mínimo). status enum `DRAFT|PUBLISHED|ARCHIVED`. publishedAt coerced a Date opcional.
- [ ] `updatePostSchema` — `{ id, slug?, title?, excerpt?, content?, image?, status?, publishedAt?, categoryId?, tags?, metaTitle?, metaDesc? }`. `id` required, resto opcional.
- [ ] `changePostStatusSchema` — `{ id, status }`.
- [ ] `deletePostSchema` — `{ id, force? }`. force default false.
- [ ] `bulkActionSchema` — `{ postIds: string[] }`. min 1, max 50.
- [ ] `createCategorySchema` — `{ slug, name: { es, en } }`. slug lowercase max 40, name min 1 max 60.
- [ ] `updateCategorySchema` — `{ id, slug?, name? }`.
- [ ] `postFilterSchema` — `{ search?, status?, categoryId?, skip?, take? }`. take max 100, default 50.
- [ ] Tests unitarios: valid input, slug normalizado a lowercase, content JSON inválido rechazado, slug duplicado via DB (no en schema, pero cubrimos el path), excerpt demasiado largo, etc.

## 2. Backend: queries (`src/server/blog/queries.ts`)

- [ ] Tipo `PostListItem` — id, slug, title (i18n del locale), excerpt (i18n), image, status, publishedAt, category (id, slug, name i18n), tags (string[] parsed del CSV), createdAt, updatedAt.
- [ ] Tipo `PostDetail` — incluye content (JSON completo), metaTitle, metaDesc.
- [ ] Tipo `PostListPublicItem` — versión pública: solo PUBLISHED, sin internalNotes, etc.
- [ ] Tipo `PostStats` — totalDrafts, totalPublished, totalArchived, totalCategories.
- [ ] `listPostsAdmin({ search?, status?, categoryId?, skip?, take? })` — paginada, search en slug/title (case insensitive), status filter, categoryId filter, orden por `updatedAt desc`.
- [ ] `listPostsPublic({ locale, categorySlug?, skip?, take? })` — solo PUBLISHED, orden por `publishedAt desc`. Devuelve excerpt y title en el locale.
- [ ] `getPostById(id, locale)` — detail completo con relations. null si no existe.
- [ ] `getPostBySlug(slug, locale)` — para público. Solo PUBLISHED. null si no existe o no publicado.
- [ ] `getRelatedPosts(postId, locale, limit=3)` — misma category, excluye el actual, solo PUBLISHED.
- [ ] `getPostStats()` — count por status + count de categories.
- [ ] `listCategories()` — todas las categorías, orden por `order asc, name asc`.
- [ ] `getCategoryBySlug(slug)` — para lookup público.
- [ ] Tests unitarios con Prisma mockeado: list (empty, filtros, search), getById (null, full), getBySlug (null si draft, full si published), getRelatedPosts (excluye el actual), stats.

## 3. Backend: actions (`src/server/blog/actions.ts`)

- [ ] Helper `requireAdmin()` (mismo patrón que en otros actions).
- [ ] `createPost(input)` — en transacción:
  1. Verificar slug único (cuenta con `where: { slug }`).
  2. Si categoryId provisto, verificar que la categoría existe.
  3. Si status === "PUBLISHED" y publishedAt no provisto, setear a now().
  4. Crear el Post.
  5. revalidatePath para `/admin/blog` y `/blog` (si PUBLISHED).
- [ ] `updatePost(id, input)` — en transacción:
  1. Verificar que el post existe.
  2. Si slug cambia, verificar unicidad.
  3. Si status cambia a PUBLISHED por primera vez (era DRAFT antes), setear publishedAt a now().
  4. Update solo con los campos provistos (usar Zod partial).
  5. revalidatePath.
- [ ] `changePostStatus(id, status)` — atajo para solo cambiar status. Si pasa a PUBLISHED y no tiene publishedAt, setearlo.
- [ ] `deletePost(id, force?)` — si el post está PUBLISHED y force !== true, error "no se puede borrar un post publicado sin force". Si force o no está publicado, hard delete.
- [ ] `upsertCategory(input)` — crea o actualiza. Si slug cambia, verificar unicidad.
- [ ] `deleteCategory(id)` — verifica que no haya posts usándola. Si hay, error con count.
- [ ] `bulkPublish(postIds[])` y `bulkArchive(postIds[])` — updateMany en transacción, setea publishedAt si corresponde.
- [ ] Tests unitarios con Prisma + auth mockeados: cada action con happy + 2-3 errores. Críticos: slug duplicado, delete de post publicado, bulk con lista vacía, status transition PUBLISHED primer vez.

## 4. Dependencias y config (frontend setup)

- [ ] Confirmar Tiptap instalado: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-link`, `@tiptap/extension-image`, `@tiptap/pm` (ya hecho).
- [ ] No requiere config extra; Tiptap funciona client-side sin provider global.

## 5. Componentes Tiptap (`src/components/admin/tiptap-editor.tsx`)

- [ ] `TiptapEditor` (client) — wrap `useEditor` de Tiptap con:
  - `StarterKit` (paragraph, bold, italic, headings h2/h3, lists, blockquote, code, codeBlock, hard break, horizontal rule, undo/redo).
  - `Link.configure({ openOnClick: false, autolink: true })`.
  - `Image.configure({ inline: false, allowBase64: true })`.
  - Toolbar: Bold, Italic, H2, H3, BulletList, OrderedList, Link (prompt), Image (prompt URL + alt), Undo, Redo.
  - Output: `editor.getJSON()` (Tiptap JSON).
  - Props: `value: JSON | null`, `onChange: (json: JSON) => void`. Si `value` es null, el editor empieza con un doc vacío.
- [ ] Estilo: usar `prose prose-sm` de Tailwind typography para el contenido editable (next ya tiene esto disponible? verificar).

## 6. Frontend admin: lista y form (`src/app/[locale]/(admin)/admin/blog/`)

- [ ] `page.tsx` (server): carga `getPostStats()` y `listPostsAdmin()` + searchParams. Reemplaza el placeholder "Coming soon".
- [ ] `nuevo/page.tsx` (server): form vacío.
- [ ] `[id]/page.tsx` (server): carga el post y renderiza el form en modo edit.
- [ ] `categorias/page.tsx` (server): gestión de categorías.
- [ ] Componentes:
  - `posts-list.tsx` (client): tabla + búsqueda con debounce + filtros (status, categoryId) + bulk select para acciones en lote.
  - `post-form.tsx` (client): RHF + Zod + TiptapEditor. Submit por status (Guardar borrador / Publicar).
  - `post-status-badge.tsx` (server o client): badge coloreado según status.
  - `categories-manager.tsx` (client): lista + form inline para crear/editar/eliminar.

## 7. Frontend público (`src/app/[locale]/(public)/blog/`)

- [ ] `page.tsx` (server): `listPostsPublic()` paginada. Renderiza grid de PostCard.
- [ ] `[slug]/page.tsx` (server):
  - `generateMetadata` con metaTitle/metaDesc.
  - `getPostBySlug()`.
  - Si null, notFound().
  - Render: cover image, título, meta (fecha + categoría + tiempo de lectura), PostContent, RelatedPosts.
- [ ] Componentes:
  - `post-card.tsx` (server): preview card.
  - `post-content.tsx` (client): usa `generateHTML(json, [...extensions])` para renderizar el JSON de Tiptap.
  - `related-posts.tsx` (server): grid de 3 posts.
  - `reading-time.tsx` (server o client): calcula tiempo de lectura del content.

## 8. SEO y sitemap

- [ ] `app/sitemap.ts`: agregar entries para cada post publicado.
- [ ] `app/[locale]/(public)/blog/[slug]/page.tsx`: `generateMetadata` con Open Graph + Twitter Cards + JSON-LD.
- [ ] JSON-LD como `<script type="application/ld+json">` en el body del post.

## 9. i18n (`messages/es.json`, `messages/en.json`)

- [ ] `admin.blog.*` (es, en): lista (columns), filtros, form (labels), Tiptap toolbar, status, categorías, mensajes.
- [ ] `public.blog.*` (es, en): "Blog", "Leer más", "Posts relacionados", "Volver al blog", "Tiempo de lectura: {min} min", "Por {category}", "Publicado el {date}".
- [ ] `public.blog.empty.title`, `public.blog.empty.desc` para cuando no hay posts.

## 10. E2E

- [ ] `e2e/blog-crud.spec.ts`:
  1. Login admin.
  2. Ir a `/admin/blog` (puede tener posts del seed o estar vacío).
  3. Click "Nuevo post" → completar form (título, slug, excerpt, contenido) → Guardar borrador.
  4. Verificar que aparece en la lista con badge DRAFT.
  5. Abrir el post → cambiar a PUBLISHED → guardar.
  6. Verificar badge PUBLISHED en la lista.
  7. Archivar el post → verificar badge ARCHIVED.
  8. Eliminar → verificar que ya no aparece.
  - Self-contained: usa Prisma en beforeAll para cleanup si es necesario.

- [ ] `e2e/blog-public.spec.ts`:
  1. Setup: crear un post PUBLISHED via Prisma en beforeAll.
  2. Ir a `/es/blog` (público) sin login.
  3. Verificar que el post aparece en el listado.
  4. Click en el post → verificar que la URL es `/es/blog/[slug]`.
  5. Verificar título, contenido (algún texto del excerpt o content).
  6. Cleanup en afterAll.
  - Como Fase 7, si el bug de hidratación reaparece con Tiptap, simplificar a read-only check.

## 11. Commit + merge + tag

- [ ] Commits por bloque:
  - `chore(deps): add Tiptap dependencies for Fase 9 blog editor` (si no se hizo antes)
  - `feat(blog): validators + queries + actions with tests (block 1-3)`
  - `feat(blog): admin UI for posts list, form, and categories`
  - `feat(blog): public blog listing and post detail with Tiptap renderer`
  - `feat(blog): SEO metadata, sitemap, JSON-LD for blog posts`
  - `feat(i18n): admin.blog.* and public.blog.* namespaces`
  - `test(blog): E2E for admin CRUD and public reading`
  - `chore(openspec): archive phase9-blog after release`
- [ ] Pre-merge: `npm run typecheck && npm run lint && npm test && npm run test:e2e` (1-2 corridas).
- [ ] Merge `--no-ff` a develop.
- [ ] Push a origin/develop.
- [ ] Release v0.5.0: merge develop → main con `--no-ff` + tag + push `--follow-tags`.
- [ ] Archivar con `openspec archive phase9-blog --yes --skip-specs`.

## 12. Verificación final

- [ ] `npm run typecheck` limpio.
- [ ] `npm run lint` limpio.
- [ ] `npm test` — los 249 previos + ~80 nuevos de blog = ~330 unit tests passing.
- [ ] `npm run test:e2e` — 8 specs previos + 2 nuevos de blog = 10 specs.
- [ ] Smoke manual: crear un post con Tiptap, publicar, ir a `/blog` (público) y leerlo.
- [ ] Actualizar `docs/handoff-YYYY-MM-DD.md` con el resumen.
