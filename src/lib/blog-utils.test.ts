import { describe, expect, it } from "vitest";

import {
  calculateReadingTime,
  extractTextFromTiptap,
  formatPostDate,
  formatPostDateLong,
  parseTagsClient,
} from "./blog-utils";

describe("parseTagsClient", () => {
  it("devuelve [] para null, undefined o empty", () => {
    expect(parseTagsClient(null)).toEqual([]);
    expect(parseTagsClient(undefined)).toEqual([]);
    expect(parseTagsClient("")).toEqual([]);
    expect(parseTagsClient("   ")).toEqual([]);
  });

  it("parsea CSV simple", () => {
    expect(parseTagsClient("tutorial, nextjs, prisma")).toEqual([
      "tutorial",
      "nextjs",
      "prisma",
    ]);
  });

  it("ignora tags vacíos entre comas", () => {
    expect(parseTagsClient("a,,b,  ,c")).toEqual(["a", "b", "c"]);
  });

  it("acepta un array de strings y filtra vacíos", () => {
    expect(parseTagsClient(["a", "", "b", "c"])).toEqual(["a", "b", "c"]);
  });
});

describe("extractTextFromTiptap", () => {
  it("devuelve '' para input no-objeto", () => {
    expect(extractTextFromTiptap(null)).toBe("");
    expect(extractTextFromTiptap(undefined)).toBe("");
    expect(extractTextFromTiptap("string")).toBe("");
    expect(extractTextFromTiptap(42)).toBe("");
  });

  it("extrae texto de nodos text anidados en paragraph", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hola mundo" }] },
      ],
    };
    expect(extractTextFromTiptap(doc)).toBe("Hola mundo");
  });

  it("concatena texto de múltiples paragraphs", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Párrafo 1" }] },
        { type: "paragraph", content: [{ type: "text", text: "Párrafo 2" }] },
      ],
    };
    const text = extractTextFromTiptap(doc);
    expect(text).toContain("Párrafo 1");
    expect(text).toContain("Párrafo 2");
  });

  it("soporta marks (bold, italic) sin perder texto", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Hola " },
            {
              type: "text",
              text: "mundo",
              marks: [{ type: "bold" }],
            },
          ],
        },
      ],
    };
    expect(extractTextFromTiptap(doc)).toBe("Hola mundo");
  });

  it("ignora nodos image (no tienen text)", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Antes" }] },
        { type: "image", attrs: { src: "https://example.com/x.jpg" } },
        { type: "paragraph", content: [{ type: "text", text: "Después" }] },
      ],
    };
    const text = extractTextFromTiptap(doc);
    expect(text).toContain("Antes");
    expect(text).toContain("Después");
  });

  it("maneja listas anidadas", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Item 1" }] },
              ],
            },
            {
              type: "listItem",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Item 2" }] },
              ],
            },
          ],
        },
      ],
    };
    const text = extractTextFromTiptap(doc);
    expect(text).toContain("Item 1");
    expect(text).toContain("Item 2");
  });
});

describe("calculateReadingTime", () => {
  it("devuelve 1 para doc vacío o inválido", () => {
    expect(calculateReadingTime(null)).toBe(1);
    expect(calculateReadingTime({})).toBe(1);
    expect(calculateReadingTime({ type: "doc" })).toBe(1);
  });

  it("devuelve 1 para posts cortos (< 200 palabras)", () => {
    const doc = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "Hola mundo" }] },
      ],
    };
    expect(calculateReadingTime(doc)).toBe(1);
  });

  it("devuelve minutos >= 1 para posts largos", () => {
    // 500 palabras: 500/200 = 2.5 → ceil = 3
    const words = Array.from({ length: 500 }, (_, i) => `word${i}`).join(" ");
    const doc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: words }] }],
    };
    expect(calculateReadingTime(doc)).toBe(3);
  });

  it("devuelve 1 exacto en el límite (≤200 palabras)", () => {
    const words = Array.from({ length: 200 }, (_, i) => `w${i}`).join(" ");
    const doc = {
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: words }] }],
    };
    // 200/200 = 1.0 → ceil = 1
    expect(calculateReadingTime(doc)).toBe(1);
  });
});

describe("formatPostDate", () => {
  it("devuelve '' para null, undefined o empty", () => {
    expect(formatPostDate(null, "es")).toBe("");
    expect(formatPostDate(undefined, "es")).toBe("");
    expect(formatPostDate("", "es")).toBe("");
  });

  it("devuelve el string original si la fecha es inválida", () => {
    expect(formatPostDate("not-a-date", "es")).toBe("not-a-date");
  });

  it("formatea fecha ISO a string legible en español", () => {
    const out = formatPostDate("2026-01-15T10:00:00Z", "es");
    // No validamos el string exacto (depende de la zona horaria del runner)
    // pero sí el formato: día 2 dígitos + mes abreviado + año.
    expect(out).toMatch(/^\d{2}\s.+\s\d{4}$/);
  });

  it("acepta locale 'en'", () => {
    const out = formatPostDate("2026-01-15T10:00:00Z", "en");
    // En inglés el formato es "Jan 15, 2026" (con coma).
    expect(out).toMatch(/\d{4}/);
    expect(out).toContain("Jan");
  });
});

describe("formatPostDateLong", () => {
  it("devuelve '' para null", () => {
    expect(formatPostDateLong(null, "es")).toBe("");
  });

  it("usa nombre de mes completo", () => {
    const out = formatPostDateLong("2026-01-15T10:00:00Z", "es");
    // Mes largo en español: "enero" (1) o "ene" (corto).
    // Long → "enero".
    expect(out.toLowerCase()).toContain("enero");
  });
});
