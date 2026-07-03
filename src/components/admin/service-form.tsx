"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { ExtrasManager, type ExtraDraft } from "@/components/admin/extras-manager";
import { MediaPicker } from "@/components/admin/media-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createServiceAction,
  updateServiceAction,
} from "@/server/catalog/services";
import { serviceSchema, type ServiceFormData } from "@/server/catalog/validators";

interface ServiceFormProps {
  locale: string;
  initialData?: {
    id: string;
    nameEs: string;
    nameEn: string;
    descriptionEs: string;
    descriptionEn: string;
    durationMin: number;
    basePrice: number;
    image: string | null;
    category: string;
    order: number;
    isActive: boolean;
    extras: ExtraDraft[];
  };
}

export function ServiceForm({ locale, initialData }: ServiceFormProps) {
  const t = useTranslations("admin.catalog.services");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      nameEs: initialData?.nameEs ?? "",
      nameEn: initialData?.nameEn ?? "",
      descriptionEs: initialData?.descriptionEs ?? "",
      descriptionEn: initialData?.descriptionEn ?? "",
      durationMin: initialData?.durationMin ?? 60,
      basePrice: initialData?.basePrice ?? 0,
      image: initialData?.image ?? "",
      category: initialData?.category ?? "",
      order: initialData?.order ?? 0,
      isActive: initialData?.isActive ?? true,
      extras: initialData?.extras ?? [],
    },
  });

  const imageValue = watch("image");
  const extrasValue = watch("extras");
  const isActive = watch("isActive");

  async function onSubmit(data: ServiceFormData) {
    try {
      const formData = new FormData();
      formData.append("nameEs", data.nameEs);
      formData.append("nameEn", data.nameEn);
      formData.append("descriptionEs", data.descriptionEs ?? "");
      formData.append("descriptionEn", data.descriptionEn ?? "");
      formData.append("durationMin", String(data.durationMin));
      formData.append("basePrice", String(data.basePrice));
      formData.append("image", data.image ?? "");
      formData.append("category", data.category ?? "");
      formData.append("order", String(data.order));
      formData.append("isActive", data.isActive ? "true" : "false");
      formData.append("extras", JSON.stringify(data.extras));

      const result = isEditing && initialData
        ? await updateServiceAction(initialData.id, formData)
        : await createServiceAction(formData);

      if (result.success) {
        toast.success(isEditing ? t("updated") : t("created"));
        router.push(`/${locale}/admin/services`);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("basicInfo")}</CardTitle>
          <CardDescription>Información básica del servicio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nameEs">{t("nameEs")} *</Label>
              <Input id="nameEs" {...register("nameEs")} placeholder="Maquillaje profesional" />
              {errors.nameEs && <p className="text-xs text-error">{errors.nameEs.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nameEn">{t("nameEn")} *</Label>
              <Input id="nameEn" {...register("nameEn")} placeholder="Professional makeup" />
              {errors.nameEn && <p className="text-xs text-error">{errors.nameEn.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="descriptionEs">{t("descriptionEs")}</Label>
              <Textarea id="descriptionEs" rows={3} {...register("descriptionEs")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="descriptionEn">{t("descriptionEn")}</Label>
              <Textarea id="descriptionEn" rows={3} {...register("descriptionEn")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="durationMin">{t("duration")} *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="durationMin"
                  type="number"
                  min="5"
                  step="5"
                  {...register("durationMin")}
                />
                <span className="text-sm text-on-surface-variant">{t("minutes")}</span>
              </div>
              {errors.durationMin && (
                <p className="text-xs text-error">{errors.durationMin.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="basePrice">{t("basePrice")} *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-on-surface-variant">$</span>
                <Input
                  id="basePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("basePrice")}
                />
              </div>
              {errors.basePrice && (
                <p className="text-xs text-error">{errors.basePrice.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">{t("category")}</Label>
              <Input id="category" {...register("category")} placeholder="Maquillaje" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order">{t("order")}</Label>
              <Input id="order" type="number" min="0" {...register("order")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("image")}</CardTitle>
          <CardDescription>Imagen principal del servicio</CardDescription>
        </CardHeader>
        <CardContent>
          <MediaPicker
            value={imageValue ? { id: imageValue, url: imageValue } : null}
            onChange={(m) => setValue("image", m?.url ?? "")}
            folder="servicios"
            label={t("image")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("extrasTitle")}</CardTitle>
          <CardDescription>{t("extrasDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ExtrasManager
            value={extrasValue}
            onChange={(extras) => setValue("extras", extras, { shouldDirty: true })}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-4">
            <div>
              <p className="text-sm font-semibold text-on-surface">{t("active")}</p>
              <p className="text-xs text-on-surface-variant">
                {isActive ? "Visible en la landing" : "Oculto en la landing"}
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/${locale}/admin/services`)}
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
      </div>
    </form>
  );
}