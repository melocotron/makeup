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
