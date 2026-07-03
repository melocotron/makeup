"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { MediaPicker } from "@/components/admin/media-picker";
import {
  PackageItemsPicker,
  type AvailableService,
  type ItemDraft,
} from "@/components/admin/package-items-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  createPackageAction,
  updatePackageAction,
} from "@/server/catalog/packages";
import { packageSchema, type PackageFormData } from "@/server/catalog/validators";

interface PackageFormProps {
  locale: string;
  availableServices: AvailableService[];
  initialData?: {
    id: string;
    nameEs: string;
    nameEn: string;
    descriptionEs: string;
    descriptionEn: string;
    totalPrice: number;
    image: string | null;
    order: number;
    isActive: boolean;
    items: ItemDraft[];
  };
}

export function PackageForm({ locale, availableServices, initialData }: PackageFormProps) {
  const t = useTranslations("admin.catalog.packages");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const isEditing = !!initialData;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<PackageFormData>({
    resolver: zodResolver(packageSchema),
    defaultValues: {
      nameEs: initialData?.nameEs ?? "",
      nameEn: initialData?.nameEn ?? "",
      descriptionEs: initialData?.descriptionEs ?? "",
      descriptionEn: initialData?.descriptionEn ?? "",
      totalPrice: initialData?.totalPrice ?? 0,
      image: initialData?.image ?? "",
      order: initialData?.order ?? 0,
      isActive: initialData?.isActive ?? true,
      items: initialData?.items ?? [],
    },
  });

  const imageValue = watch("image");
  const itemsValue = watch("items");
  const isActive = watch("isActive");

  async function onSubmit(data: PackageFormData) {
    try {
      const formData = new FormData();
      formData.append("nameEs", data.nameEs);
      formData.append("nameEn", data.nameEn);
      formData.append("descriptionEs", data.descriptionEs ?? "");
      formData.append("descriptionEn", data.descriptionEn ?? "");
      formData.append("totalPrice", String(data.totalPrice));
      formData.append("image", data.image ?? "");
      formData.append("order", String(data.order));
      formData.append("isActive", data.isActive ? "true" : "false");
      formData.append("items", JSON.stringify(data.items));

      const result = isEditing && initialData
        ? await updatePackageAction(initialData.id, formData)
        : await createPackageAction(formData);

      if (result.success) {
        toast.success(isEditing ? t("updated") : t("created"));
        router.push(`/${locale}/admin/packages`);
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
          <CardDescription>Información básica del paquete</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="nameEs">{t("nameEs")} *</Label>
              <Input id="nameEs" {...register("nameEs")} placeholder="Paquete Novia" />
              {errors.nameEs && <p className="text-xs text-error">{errors.nameEs.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nameEn">{t("nameEn")} *</Label>
              <Input id="nameEn" {...register("nameEn")} placeholder="Bridal Package" />
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

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="totalPrice">{t("totalPrice")} *</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-on-surface-variant">$</span>
                <Input
                  id="totalPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register("totalPrice")}
                />
              </div>
              {errors.totalPrice && (
                <p className="text-xs text-error">{errors.totalPrice.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order">{t("order")}</Label>
              <Input id="order" type="number" min="0" {...register("order")} />
            </div>
            <div className="flex items-end">
              <div className="flex items-center justify-between rounded-lg border border-outline-variant bg-surface-container-low p-3 w-full">
                <Label htmlFor="isActive" className="cursor-pointer">
                  {t("active")}
                </Label>
                <Switch
                  id="isActive"
                  checked={isActive}
                  onCheckedChange={(v) => setValue("isActive", v, { shouldDirty: true })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("image")}</CardTitle>
          <CardDescription>Imagen principal del paquete</CardDescription>
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
          <CardTitle>{t("itemsTitle")}</CardTitle>
          <CardDescription>{t("itemsDescriptionCard")}</CardDescription>
        </CardHeader>
        <CardContent>
          <PackageItemsPicker
            available={availableServices}
            value={itemsValue}
            onChange={(items) => setValue("items", items, { shouldDirty: true })}
          />
          {errors.items && (
            <p className="mt-2 text-xs text-error">
              {errors.items.message ?? "Revisa los servicios incluidos"}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push(`/${locale}/admin/packages`)}
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