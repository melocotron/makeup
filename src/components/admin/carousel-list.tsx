"use client";

import { Image as ImageIcon, Pencil, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";

import { SlideFormDialog } from "./carousel-form-dialog";
import { deleteSlideAction, toggleSlideActiveAction } from "@/server/content/carousel.actions";

export interface CarouselSlide {
  id: string;
  image: string;
  title: Record<string, string>;
  subtitle: Record<string, string> | null;
  ctaLabel: Record<string, string> | null;
  ctaUrl: string | null;
  order: number;
  isActive: boolean;
}

interface CarouselListProps {
  initialData: CarouselSlide[];
}

export function CarouselList({ initialData }: CarouselListProps) {
  const t = useTranslations("admin.carousel");
  const [items, setItems] = useState(initialData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CarouselSlide | null>(null);

  function handleNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function handleEdit(slide: CarouselSlide) {
    setEditing(slide);
    setDialogOpen(true);
  }

  function handleSuccess() {
    window.location.reload();
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    const result = await deleteSlideAction(id);
    if (result.success) {
      toast.success(t("deleted"));
      setItems((prev) => prev.filter((i) => i.id !== id));
    } else {
      toast.error(result.error);
    }
  }

  async function handleToggle(id: string, isActive: boolean) {
    const result = await toggleSlideActiveAction(id, isActive);
    if (result.success) {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, isActive } : i)),
      );
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleNew}>
          <Plus className="h-4 w-4" />
          {t("newSlide")}
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
          <ImageIcon className="h-12 w-12 text-outline" />
          <p className="mt-4 text-sm font-semibold text-on-surface">{t("emptyTitle")}</p>
          <p className="mt-1 max-w-sm text-xs text-on-surface-variant">{t("emptyDesc")}</p>
          <Button onClick={handleNew} className="mt-4" variant="outline">
            <Plus className="h-4 w-4" />
            {t("addFirst")}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map((slide) => (
            <div
              key={slide.id}
              className="overflow-hidden rounded-lg border border-outline-variant bg-surface-container-lowest"
            >
              <div className="relative aspect-video w-full bg-surface-container">
                <Image
                  src={slide.image}
                  alt={slide.title.es ?? ""}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
                <div className="absolute right-2 top-2">
                  <Badge variant={slide.isActive ? "success" : "default"}>
                    {slide.isActive ? t("active") : t("inactive")}
                  </Badge>
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                    {t("titleEs")}
                  </p>
                  <p className="font-headline-md text-headline-md text-on-surface">
                    {slide.title.es ?? "—"}
                  </p>
                </div>
                {slide.subtitle?.es && (
                  <p className="text-sm text-on-surface-variant">{slide.subtitle.es}</p>
                )}
                <div className="flex items-center justify-between border-t border-outline-variant pt-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={slide.isActive}
                      onCheckedChange={(v) => handleToggle(slide.id, v)}
                    />
                    <span className="text-xs text-on-surface-variant">{t("order")}: {slide.order}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(slide)}
                      aria-label={t("edit")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(slide.id)}
                      aria-label={t("delete")}
                      className="text-error hover:text-error"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SlideFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        slide={
          editing
            ? {
                id: editing.id,
                image: editing.image,
                titleEs: editing.title.es ?? "",
                titleEn: editing.title.en ?? "",
                subtitleEs: editing.subtitle?.es ?? "",
                subtitleEn: editing.subtitle?.en ?? "",
                ctaLabelEs: editing.ctaLabel?.es ?? "",
                ctaLabelEn: editing.ctaLabel?.en ?? "",
                ctaUrl: editing.ctaUrl ?? "",
                order: editing.order,
                isActive: editing.isActive,
              }
            : null
        }
        onSuccess={handleSuccess}
      />
    </div>
  );
}