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
import {
  createCredentialAction,
  updateCredentialAction,
} from "@/server/content/credentials";
import { credentialSchema, type CredentialFormData } from "@/server/content/validators";

interface CredentialFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credential?: {
    id: string;
    titleEs: string;
    titleEn: string;
    institution: string;
    year: number | null;
    image: string | null;
    order: number;
  } | null;
  onSuccess?: () => void;
}

export function CredentialFormDialog({
  open,
  onOpenChange,
  credential,
  onSuccess,
}: CredentialFormDialogProps) {
  const t = useTranslations("admin.credentials");
  const tCommon = useTranslations("common");

  const isEditing = !!credential;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<CredentialFormData>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      titleEs: "",
      titleEn: "",
      institution: "",
      year: "" as unknown as number,
      image: "",
      order: 0,
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        titleEs: credential?.titleEs ?? "",
        titleEn: credential?.titleEn ?? "",
        institution: credential?.institution ?? "",
        year: (credential?.year ?? "") as unknown as number,
        image: credential?.image ?? "",
        order: credential?.order ?? 0,
      });
    }
  }, [open, credential, reset]);

  const imageValue = watch("image");

  async function onSubmit(data: CredentialFormData) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(data)) {
      if (v !== null && v !== undefined) fd.append(k, String(v));
    }

    const result = isEditing && credential
      ? await updateCredentialAction(credential.id, fd)
      : await createCredentialAction(fd);

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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? t("editTitle") : t("createTitle")}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("editDescription") : t("createDescription")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="institution">{t("institution")} *</Label>
              <Input id="institution" {...register("institution")} />
              {errors.institution && (
                <p className="text-xs text-error">{errors.institution.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="year">{t("year")}</Label>
              <Input
                id="year"
                type="number"
                min="1900"
                max="2100"
                {...register("year")}
              />
              {errors.year && (
                <p className="text-xs text-error">{errors.year.message}</p>
              )}
            </div>
          </div>

          <MediaPicker
            value={imageValue ? { id: imageValue, url: imageValue } : null}
            onChange={(m) => setValue("image", m?.url ?? "", { shouldDirty: true })}
            folder="perfil"
            label={t("image")}
          />

          <div className="space-y-1.5">
            <Label htmlFor="order">{t("order")}</Label>
            <Input
              id="order"
              type="number"
              min="0"
              {...register("order")}
            />
            <p className="text-xs text-on-surface-variant">{t("orderHint")}</p>
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