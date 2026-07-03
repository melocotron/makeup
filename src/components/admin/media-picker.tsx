"use client";

import { ImageIcon, X } from "lucide-react";
import Image from "next/image";
import * as React from "react";

import { MediaBrowser } from "@/components/admin/media-browser";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MediaPickerProps {
  value?: { id: string; url: string } | null;
  onChange: (media: { id: string; url: string } | null) => void;
  folder?: string;
  label?: string;
  className?: string;
}

export function MediaPicker({
  value,
  onChange,
  folder = "general",
  label = "Imagen",
  className,
}: MediaPickerProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        {label}
      </p>

      {value ? (
        <div className="relative aspect-video w-full max-w-md overflow-hidden rounded-lg border border-outline-variant bg-surface-container">
          <Image
            src={value.url}
            alt={label}
            fill
            sizes="(max-width: 768px) 100vw, 448px"
            className="object-cover"
          />
          <div className="absolute right-2 top-2 flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setOpen(true)}
            >
              Cambiar
            </Button>
            <Button
              type="button"
              size="icon"
              variant="destructive"
              onClick={() => onChange(null)}
              aria-label="Quitar imagen"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex aspect-video w-full max-w-md flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low transition-colors hover:border-primary hover:bg-surface-container"
        >
          <div className="rounded-full bg-surface p-3">
            <ImageIcon className="h-5 w-5 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-on-surface">Seleccionar imagen</p>
            <p className="text-xs text-on-surface-variant">Desde la biblioteca</p>
          </div>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Seleccionar imagen</DialogTitle>
            <DialogDescription>
              Elige una imagen de la biblioteca o sube una nueva.
            </DialogDescription>
          </DialogHeader>
          <MediaBrowser
            selectable
            onSelect={(item) => {
              onChange({ id: item.id, url: item.url });
              setOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}