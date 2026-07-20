"use client";

import { Loader2, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createCouponAction,
  deactivateCouponAction,
  deleteCouponAction,
  updateCouponAction,
} from "@/server/promotions/actions";
import {
  createCouponSchema,
  updateCouponSchema,
  type CreateCouponInput,
  type UpdateCouponInput,
} from "@/server/promotions/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Locale } from "@/i18n/routing";

export interface CouponFormProps {
  mode: "create" | "edit";
  initialData?: {
    id: string;
    code: string;
    description: { es: string; en: string };
    type: "PERCENTAGE" | "FIXED";
    value: number;
    minPurchase: number | null;
    maxUses: number | null;
    validFrom: string;
    validUntil: string;
    isActive: boolean;
    usedCount: number;
    serviceIds: string[] | null;
  };
  availableServices: { id: string; name: string }[];
}

type FormData = CreateCouponInput & { id?: string };

function fromDateInputValue(value: string): Date {
  // Parse as local date at midnight to avoid timezone shift.
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function CouponForm({
  mode,
  initialData,
  availableServices,
}: CouponFormProps) {
  const t = useTranslations("admin.promotions");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const locale = useLocale() as Locale;
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(mode === "create" ? createCouponSchema : updateCouponSchema),
    defaultValues: {
      code: initialData?.code ?? "",
      description: {
        es: initialData?.description?.es ?? "",
        en: initialData?.description?.en ?? "",
      },
      type: (initialData?.type ?? "PERCENTAGE") as "PERCENTAGE" | "FIXED",
      value: initialData?.value ?? 10,
      minPurchase: initialData?.minPurchase ?? null,
      maxUses: initialData?.maxUses ?? null,
      validFrom: initialData
        ? fromDateInputValue(initialData.validFrom)
        : new Date(),
      validUntil: initialData
        ? fromDateInputValue(initialData.validUntil)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      isActive: initialData?.isActive ?? true,
      serviceIds: initialData?.serviceIds ?? null,
      id: initialData?.id,
    },
  });

  const selectedServiceIds = watch("serviceIds") ?? [];
  const selectedType = watch("type");

  async function onSubmit(data: FormData) {
    if (mode === "create") {
      // Data already matches CreateCouponInput (without id).
      const result = await createCouponAction(data as CreateCouponInput);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("created"));
      window.location.assign(`/${locale}/admin/promotions/${result.id}`);
    } else {
      // Update: build a partial update payload.
      const updatePayload: UpdateCouponInput = {
        id: data.id!,
        description: data.description,
        value: data.value,
        minPurchase: data.minPurchase ?? null,
        maxUses: data.maxUses ?? null,
        validFrom: data.validFrom,
        validUntil: data.validUntil,
        isActive: data.isActive,
        serviceIds: data.serviceIds ?? null,
      };
      const result = await updateCouponAction(updatePayload);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("updated"));
      router.refresh();
    }
  }

  async function onDeactivate() {
    if (!initialData) return;
    if (!confirm(t("confirmDeactivate"))) return;
    setIsDeleting(true);
    const result = await deactivateCouponAction(initialData.id);
    setIsDeleting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(t("deactivated"));
    router.refresh();
  }

  async function onDelete() {
    if (!initialData) return;
    if (!confirm(t("confirmDelete"))) return;
    setIsDeleting(true);
    const result = await deleteCouponAction(initialData.id);
    setIsDeleting(false);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(t("deleted"));
    window.location.assign(`/${locale}/admin/promotions`);
  }

  const canDelete = initialData?.usedCount === 0;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="code">{t("form.code")} *</Label>
          <Input
            id="code"
            disabled={mode === "edit"}
            placeholder="SUMMER20"
            {...register("code")}
          />
          {errors.code && (
            <p className="text-xs text-error">{errors.code.message}</p>
          )}
          {mode === "edit" && (
            <p className="text-xs text-on-surface-variant">
              {t("form.codeImmutable")}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="type">{t("form.type")} *</Label>
          <select
            id="type"
            disabled={mode === "edit"}
            className="flex h-10 w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            {...register("type")}
          >
            <option value="PERCENTAGE">{t("type.PERCENTAGE")}</option>
            <option value="FIXED">{t("type.FIXED")}</option>
          </select>
          {errors.type && (
            <p className="text-xs text-error">{errors.type.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="value">
            {t("form.value")} *{" "}
            <span className="text-xs text-on-surface-variant">
              ({selectedType === "PERCENTAGE" ? "%" : "USD"})
            </span>
          </Label>
          <Input
            id="value"
            type="number"
            step="0.01"
            min="0"
            max={selectedType === "PERCENTAGE" ? 100 : undefined}
            {...register("value", { valueAsNumber: true })}
          />
          {errors.value && (
            <p className="text-xs text-error">{errors.value.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="minPurchase">{t("form.minPurchase")}</Label>
          <Input
            id="minPurchase"
            type="number"
            step="0.01"
            min="0"
            {...register("minPurchase", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
          />
          {errors.minPurchase && (
            <p className="text-xs text-error">{errors.minPurchase.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="maxUses">{t("form.maxUses")}</Label>
          <Input
            id="maxUses"
            type="number"
            min="1"
            step="1"
            {...register("maxUses", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
          />
          {errors.maxUses && (
            <p className="text-xs text-error">{errors.maxUses.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="validFrom">{t("form.validFrom")} *</Label>
          <Input
            id="validFrom"
            type="date"
            {...register("validFrom", {
              setValueAs: (v) => (v ? fromDateInputValue(v) : undefined),
            })}
          />
          {errors.validFrom && (
            <p className="text-xs text-error">{errors.validFrom.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="validUntil">{t("form.validUntil")} *</Label>
          <Input
            id="validUntil"
            type="date"
            {...register("validUntil", {
              setValueAs: (v) => (v ? fromDateInputValue(v) : undefined),
            })}
          />
          {errors.validUntil && (
            <p className="text-xs text-error">{errors.validUntil.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>{t("form.description.es")} *</Label>
        <Input
          placeholder="Promo de verano"
          {...register("description.es")}
        />
        {errors.description?.es && (
          <p className="text-xs text-error">
            {errors.description.es.message as string}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>{t("form.description.en")} *</Label>
        <Input
          placeholder="Summer sale"
          {...register("description.en")}
        />
        {errors.description?.en && (
          <p className="text-xs text-error">
            {errors.description.en.message as string}
          </p>
        )}
      </div>

      {availableServices.length > 0 && (
        <div className="space-y-2">
          <Label>{t("form.serviceIds")}</Label>
          <p className="text-xs text-on-surface-variant">
            {t("form.serviceIdsHint")}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {availableServices.map((s) => {
              const checked = selectedServiceIds.includes(s.id);
              return (
                <label
                  key={s.id}
                  className="flex items-center gap-2 rounded border border-outline-variant bg-surface-container-lowest p-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      const set = new Set(selectedServiceIds);
                      if (e.target.checked) set.add(s.id);
                      else set.delete(s.id);
                      const value = Array.from(set);
                      // RHF: setValue triggers re-render so the watch() above
                      // sees the new array.
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (register("serviceIds") as any).onChange({
                        target: { name: "serviceIds", value: value.length ? value : null },
                      });
                    }}
                  />
                  <span>{s.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <input
          id="isActive"
          type="checkbox"
          {...register("isActive")}
        />
        <Label htmlFor="isActive" className="cursor-pointer">
          {t("form.isActive")}
        </Label>
      </div>

      <div className="flex justify-end gap-3">
        {mode === "edit" && canDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={isDeleting}
            className="text-error hover:text-error"
          >
            <Trash2 className="h-4 w-4" />
            {tCommon("delete")}
          </Button>
        )}
        {mode === "edit" && !canDelete && (
          <Button
            type="button"
            variant="ghost"
            onClick={onDeactivate}
            disabled={isDeleting}
          >
            {t("deactivate")}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {tCommon("loading")}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === "create" ? tCommon("create") : tCommon("save")}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
