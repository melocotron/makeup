"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Quote,
  Redo,
  Undo,
} from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TiptapEditorProps {
  value: JSONContent | null;
  onChange: (json: JSONContent) => void;
  className?: string;
  placeholder?: string;
  editable?: boolean;
}

/**
 * Wrapper client de Tiptap para el editor de posts del blog.
 *
 * Configuración:
 * - StarterKit (Tiptap 3.x): paragraph, bold, italic, headings h2/h3,
 *   lists, blockquote, code, codeBlock, hard break, horizontal rule,
 *   link (configurable), undo/redo.
 * - Image con inline: false (block images) y allowBase64 (para
 *   previews sin upload).
 *
 * Output: el JSON de Tiptap via editor.getJSON(). El admin produce
 * JSON válido que se guarda en Post.content y se renderiza en el
 * público con generateHTML usando el mismo set de extensiones.
 *
 * Decisión: el componente se monta con `immediatelyRender: false`
 * para evitar el warning de Next.js sobre renderizado inmediato
 * en SSR. El editor solo funciona en cliente.
 *
 * Importante: en Tiptap 3.x el StarterKit ya incluye la extension
 * `link` (importarla por separado causa el warning "Duplicate
 * extension names found"). Por eso configuramos link vía la opción
 * `link` de StarterKit, no vía un import aparte.
 */
export function TiptapEditor({
  value,
  onChange,
  className,
  placeholder = "Empieza a escribir tu post...",
  editable = true,
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: {
          openOnClick: false,
          autolink: true,
          HTMLAttributes: { class: "text-primary underline" },
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
        HTMLAttributes: { class: "rounded-md my-4" },
      }),
    ],
    content: value ?? { type: "doc", content: [] },
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none min-h-[300px] focus:outline-none px-4 py-3",
          className,
        ),
        "data-placeholder": placeholder,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getJSON());
    },
  });

  // Sync external value changes (e.g. when switching posts to edit).
  useEffect(() => {
    if (!editor) return;
    const current = editor.getJSON();
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value ?? { type: "doc", content: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="rounded-md border border-outline bg-surface-container-lowest">
        <div className="border-b border-outline-variant bg-surface-container-low p-2">
          <div className="text-xs text-on-surface-variant">Cargando editor...</div>
        </div>
        <div className="min-h-[300px] px-4 py-3 text-sm text-on-surface-variant">
          {placeholder}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-outline bg-surface-container-lowest">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: ReturnType<typeof useEditor> }) {
  if (!editor) return null;

  function setLink() {
    const previousUrl = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del enlace:", previousUrl ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }

  function setImage() {
    const url = window.prompt(
      "URL de la imagen (https://... o data:image/...):",
      "",
    );
    if (!url) return;
    const alt = window.prompt("Texto alternativo:", "") ?? "";
    editor!.chain().focus().setImage({ src: url, alt }).run();
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-outline-variant bg-surface-container-low p-2">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        aria-label="Negrita"
      >
        <Bold className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        aria-label="Cursiva"
      >
        <Italic className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        active={editor.isActive("heading", { level: 2 })}
        aria-label="Encabezado 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        active={editor.isActive("heading", { level: 3 })}
        aria-label="Encabezado 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        aria-label="Lista"
      >
        <List className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        aria-label="Lista numerada"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        aria-label="Cita"
      >
        <Quote className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton onClick={setLink} active={editor.isActive("link")} aria-label="Enlace">
        <LinkIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton onClick={setImage} aria-label="Imagen">
        <ImageIcon className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarDivider />
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        aria-label="Deshacer"
      >
        <Undo className="h-4 w-4" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        aria-label="Rehacer"
      >
        <Redo className="h-4 w-4" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "h-8 w-8 p-0",
        active && "bg-primary/10 text-primary",
      )}
      {...rest}
    >
      {children}
    </Button>
  );
}

function ToolbarDivider() {
  return (
    <div
      aria-hidden
      className="mx-1 h-6 w-px bg-outline-variant"
    />
  );
}
