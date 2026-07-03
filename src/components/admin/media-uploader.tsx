"use client";

import { ImageIcon, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadMediaAction } from "@/server/media/actions";

interface MediaUploaderProps {
  folder?: string;
  onUploadComplete?: (media: { id: string; url: string; filename: string }) => void;
  accept?: string;
  className?: string;
}

export function MediaUploader({
  folder = "general",
  onUploadComplete,
  accept = "image/jpeg,image/png,image/webp,image/avif",
  className,
}: MediaUploaderProps) {
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [preview, setPreview] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (uploading) return;
    setUploading(true);

    // Preview local
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const result = await uploadMediaAction(formData);

      if (!result.success) {
        toast.error(result.error);
        setPreview(null);
        return;
      }

      toast.success("Imagen subida correctamente");
      onUploadComplete?.(result.media);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al subir");
      setPreview(null);
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function onDragLeave() {
    setDragging(false);
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed transition-colors",
        dragging ? "border-primary bg-primary/5" : "border-outline-variant bg-surface-container-low",
        className,
      )}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={onChange}
        className="hidden"
        disabled={uploading}
      />

      {preview ? (
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <Image
            src={preview}
            alt="Preview"
            fill
            className="object-contain"
            unoptimized
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-2 text-on-primary">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm font-semibold">Procesando...</p>
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="absolute right-2 top-2 rounded-full bg-surface-container-lowest p-1.5 text-on-surface shadow-[var(--shadow-level-2)] hover:bg-surface-container"
            aria-label="Cancelar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center gap-3 px-6 py-12 text-center"
        >
          {uploading ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <div className="rounded-full bg-surface-container p-3">
              <Upload className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <p className="text-sm font-semibold text-on-surface">
              {uploading ? "Subiendo..." : "Arrastra una imagen o haz click"}
            </p>
            <p className="mt-1 text-xs text-on-surface-variant">
              JPEG, PNG, WebP o AVIF · máximo 10MB
            </p>
          </div>
        </button>
      )}

      {!preview && (
        <div className="flex justify-center border-t border-outline-variant p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <ImageIcon className="h-4 w-4" />
            Seleccionar archivo
          </Button>
        </div>
      )}
    </div>
  );
}