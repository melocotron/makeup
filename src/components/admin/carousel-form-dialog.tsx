"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createSlideAction,
  updateSlideAction,
} from "@/server/content/carousel.actions";
import { carouselSlideSchema, type CarouselSlideFormData } from "@/server/content/validators";

interface SlideFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slide?: {
    id: string;
    image: string;
    titleEs: string;
    titleEn: string;
    subtitleEs: string;
    subtitleEn: string;
    ctaLabelEs: string;
    ctaLabelEn: string;
    ctaUrl: string;
    order: number;
    isActive: boolean;
  } | null;
  onSuccess?: () => void;
}

export function SlideFormDialog({
  open,
  onOpenChange,
  slide,
  onSuccess,
}: SlideFormDialogProps) {
  const t = useTranslations("admin.carousel");
  const tCommon = useTranslations("common");
  const isEditing = !!slide;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<CarouselSlideFormData>({
    resolver: zodResolver(carouselSlideSchema),
    defaultValues: {
      image: "",
      titleEs: "",
      titleEn: "",
      subtitleEs: "",
      subtitleEn: "",
      ctaLabelEs: "",
      ctaLabelEn: "",
      ctaUrl: "",
      order: 0,
      isActive: true,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        image: slide?.image ?? "",
        titleEs: slide?.titleEs ?? "",
        titleEn: slide?.titleEn ?? "",
        subtitleEs: slide?.subtitleEs ?? "",
        subtitleEn: slide?.subtitleEn ?? "",
        ctaLabelEs: slide?.ctaLabelEs ?? "",
        ctaLabelEn: slide?.ctaLabelEn ?? "",
        ctaUrl: slide?.ctaUrl ?? "",
        order: slide?.order ?? 0,
        isActive: slide?.isActive ?? true,
      });
    }
  }, [open, slide, reset]);

  const imageValue = watch("image");
  const isActive = watch("isActive");

  async function onSubmit(data: CarouselSlideFormData) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) {
      if (v !== null && v !== undefined) fd.append(k, String(v));
    }

    const result = isEditing && slide
      ? await updateSlideAction(slide.id, fd)
      : await createSlideAction(fd);

    if (result.success) {
      toast.success(isEditing ? t("updated") : t("created"));
      onOpenChange(false);
      onSuccess?.();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("editDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <MediaPicker
            value={imageValue ? { id: imageValue, url: imageValue } : null}
            onChange={(m) => setValue("image", m?.url ?? "", { shouldDirty: true })}
            folder="carrusel"
            label={t("image") + " *"}
          />
          {errors.image && (
            <p className="text-xs text-error">{errors.image.message}</p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="titleEs">{t("titleEs")} *</Label>
              <Input id="titleEs" {...register("titleEs")} />
              {errors.titleEs && (
                <p className="text-xs text-error">{errors.titleEs.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="titleEn">{t("titleEn")} *</Label>
              <Input id="titleEn" {...register("titleEn")} />
              {errors.titleEn && (
                <p className="text-xs text-error">{errors.titleEn.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="subtitleEs">{t("subtitleEs")}</Label>
              <Input id="subtitleEs" {...register("subtitleEs")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subtitleEn">{t("subtitleEn")}</Label>
              <Input id="subtitleEn" {...register("subtitleEn")} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="ctaLabelEs">{t("ctaLabelEs")}</Label>
              <Input id="ctaLabelEs" {...register("ctaLabelEs")} placeholder="Reservar" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ctaLabelEn">{t("ctaLabelEn")}</Label>
              <Input id="ctaLabelEn" {...register("ctaLabelEn")} placeholder="Book now" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ctaUrl">{t("ctaUrl")}</Label>
              <Input
                id="ctaUrl"
                {...register("ctaUrl")}
                placeholder="/reservar o https://..."
              />
              {errors.ctaUrl && (
                <p className="text-xs text-error">{errors.ctaUrl.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="order">{t("order")}</Label>
              <Input id="order" type="number" min="0" {...register("order")} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-3">
              <Label htmlFor="isActive">{t("active")}</Label>
              <Switch
                id="isActive"
                checked={isActive}
                onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tCommon("loading")}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {tCommon("save")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}