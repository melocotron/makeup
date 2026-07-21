import { generateHTML } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";

/**
 * Componente server que renderiza el contenido Tiptap JSON como HTML.
 *
 * Decisión: usamos `generateHTML` de @tiptap/core en lugar de un
 * Client Component con `Editor` porque:
 * 1. Funciona en SSR — el HTML sale listo en la primera respuesta.
 * 2. No requiere hydration ni Tiptap en el bundle del cliente.
 * 3. Es determinista — el mismo JSON produce siempre el mismo HTML.
 *
 * El set de extensiones debe coincidir EXACTAMENTE con el del editor
 * admin (`tiptap-editor.tsx`). Si agregamos una extensión nueva,
 * hay que actualizarla en ambos lados.
 *
 * Importante: en Tiptap 3.x el StarterKit ya incluye la extension
 * `link`. No la importamos por separado para evitar duplicados.
 *
 * Caveat: algunas extensiones de Tiptap (e.g. extension-image) leen
 * `window` en su `addProseMirrorPlugins`. Eso significa que
 * `generateHTML` lanza `ReferenceError: window is not defined` en
 * algunos entornos (e.g. tests jsdom, algunas configuraciones de
 * serverless). El catch de abajo degrada con un fallback legible
 * en lugar de romper la página entera.
 */
const tiptapExtensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    link: {
      openOnClick: true,
      autolink: true,
      HTMLAttributes: { class: "text-primary underline" },
    },
  }),
  Image.configure({
    inline: false,
    allowBase64: true,
    HTMLAttributes: { class: "rounded-md my-6 w-full h-auto" },
  }),
];

export function PostContent({ json }: { json: unknown }) {
  // Defensive: si el JSON no es un objeto válido, no renderizamos nada.
  if (!json || typeof json !== "object") {
    return null;
  }

  let html: string;
  try {
    html = generateHTML(json as never, tiptapExtensions);
  } catch {
    // Si por alguna razón Tiptap no puede parsear el doc (versión
    // incompatible, JSON corrupto, o un entorno sin `window`),
    // evitamos romper la página con un fallback legible.
    return (
      <div className="rounded-md border border-outline-variant bg-surface-container-low p-6 text-sm text-on-surface-variant">
        El contenido de este post no está disponible temporalmente.
      </div>
    );
  }

  return (
    <div
      // El HTML sale de Tiptap con un set fijo y determinista de
      // nodos/marks. No es input de usuario en crudo — Tiptap escapa
      // atributos y texto. Sanitizar aquí rompería el formato.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
      className="prose prose-lg max-w-none
        prose-headings:font-serif-display prose-headings:text-on-surface
        prose-h2:mt-10 prose-h2:mb-4 prose-h2:text-3xl
        prose-h3:mt-8 prose-h3:mb-3 prose-h3:text-2xl
        prose-p:my-4 prose-p:leading-relaxed prose-p:text-on-surface
        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-l-primary prose-blockquote:text-on-surface-variant
        prose-blockquote:not-italic prose-blockquote:font-normal
        prose-strong:text-on-surface prose-strong:font-semibold
        prose-ul:my-4 prose-ol:my-4
        prose-li:my-1
        prose-img:rounded-lg prose-img:my-8
        dark:prose-invert"
    />
  );
}
