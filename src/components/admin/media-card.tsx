"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { deleteMediaAction } from "@/server/media/actions";

export interface MediaItem {
  id: string;
  url: string;
  filename: string;
  width: number | null;
  height: number | null;
  size: number;
  folder: string | null;
  createdAt: Date;
}

interface MediaCardProps {
  item: MediaItem;
  onDelete?: (id: string) => void;
  onSelect?: (item: MediaItem) => void;
  selected?: boolean;
  selectable?: boolean;
}

export function MediaCard({
  item,
  onDelete,
  onSelect,
  selected,
  selectable,
}: MediaCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      setTimeout(() => setConfirming(false), 3000);
      return;
    }
    setDeleting(true);
    const result = await deleteMediaAction(item.id);
    if (result.success) {
      toast.success("Imagen eliminada");
      onDelete?.(item.id);
    } else {
      toast.error(result.error);
      setDeleting(false);
    }
  }

  const sizeKB = Math.round(item.size / 1024);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-surface-container-lowest transition-all",
        selected ? "border-primary ring-2 ring-primary" : "border-outline-variant",
        selectable && "cursor-pointer hover:border-primary",
      )}
      onClick={() => selectable && onSelect?.(item)}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-container">
        <Image
          src={item.url}
          alt={item.filename}
          fill
          sizes="(max-width: 768px) 33vw, (max-width: 1280px) 20vw, 240px"
          className="object-cover transition-transform group-hover:scale-105"
        />
      </div>

      <div className="border-t border-outline-variant p-2">
        <p className="truncate text-xs font-medium text-on-surface" title={item.filename}>
          {item.filename}
        </p>
        <p className="text-[10px] text-on-surface-variant">
          {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
          {sizeKB} KB
        </p>
      </div>

      {onDelete && (
        <div className="absolute right-1 top-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            size="icon"
            variant={confirming ? "destructive" : "secondary"}
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={deleting}
            className="h-7 w-7"
            aria-label={confirming ? "Confirmar eliminación" : "Eliminar"}
            title={confirming ? "Click de nuevo para confirmar" : "Eliminar"}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}