/**
 * Helpers de tags compartidos entre server y client.
 * Los tags se almacenan en DB como CSV string.
 */

export function parseTagsClient(raw: string[] | string | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((t) => t.length > 0);
  if (raw.trim().length === 0) return [];
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Tipo mínimo de un nodo de Tiptap. Lo definimos localmente para
 * no importar @tiptap/react en código de servidor (evita arrastrar
 * dependencias cliente al build de server components).
 */
type TiptapNode = {
  type: string;
  text?: string;
  content?: TiptapNode[];
  attrs?: Record<string, unknown>;
};

/**
 * Extrae el texto plano de un documento Tiptap (JSON recursivo).
 *
 * Recorre el árbol de nodos concatenando el campo `text` de los
 * nodos de tipo `text`. Para nodos con bloque, agrega un separador
 * (espacio) entre los hijos para que el conteo de palabras refleje
 * el contenido real.
 *
 * No aplica a nodos de tipo `image` ni `hardBreak` (estos últimos
 * ya se manejan por el espacio entre hermanos).
 */
export function extractTextFromTiptap(doc: unknown): string {
  if (!doc || typeof doc !== "object") return "";
  const parts: string[] = [];

  function walk(node: TiptapNode) {
    if (node.type === "text" && typeof node.text === "string") {
      parts.push(node.text);
      return;
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child);
      }
      // Separador entre bloques (paragraph, heading, listItem, etc.)
      parts.push(" ");
    }
  }

  walk(doc as TiptapNode);
  return parts.join("").trim();
}

/**
 * Velocidad de lectura promedio en palabras por minuto.
 * 200 WPM es el estándar para contenido general (Medium, Nielsen Norman).
 */
const WORDS_PER_MINUTE = 200;

/**
 * Calcula el tiempo de lectura estimado en minutos a partir de un
 * documento Tiptap. Devuelve al menos 1 minuto para que la UI nunca
 * muestre "0 min" en posts cortos.
 */
export function calculateReadingTime(doc: unknown): number {
  const text = extractTextFromTiptap(doc);
  if (text.length === 0) return 1;
  const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length;
  if (wordCount === 0) return 1;
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}

/**
 * Formatea una fecha ISO a un string legible en el locale del proyecto.
 * Usa Intl.DateTimeFormat con opciones pensadas para listados de blog:
 * día numérico, mes corto, año numérico.
 *
 * Si el input es inválido, devuelve el string original sin lanzar.
 */
export function formatPostDate(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

/**
 * Formatea una fecha ISO a un string de fecha completa.
 * Usado en JSON-LD (Article schema) y en la metadata OG article:published_time.
 */
export function formatPostDateLong(
  iso: string | null | undefined,
  locale: string,
): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}
