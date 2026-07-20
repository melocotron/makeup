"use client";

import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertLoyaltyRuleAction } from "@/server/loyalty/actions";
import {
  upsertLoyaltyRuleSchema,
  type UpsertLoyaltyRuleInput,
} from "@/server/loyalty/validators";

export interface LoyaltyRuleFormProps {
  initialData?: {
    id: string;
    name: string;
    pointsPerAmount: number;
    pointsToRedeem: number;
    redeemValue: number;
  };
}

export function LoyaltyRuleForm({ initialData }: LoyaltyRuleFormProps) {
  const t = useTranslations("admin.loyalty");
  const tCommon = useTranslations("common");
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpsertLoyaltyRuleInput>({
    resolver: zodResolver(upsertLoyaltyRuleSchema),
    defaultValues: initialData ?? {
      name: "",
      pointsPerAmount: 1,
      pointsToRedeem: 100,
      redeemValue: 10,
    },
  });

  async function onSubmit(data: UpsertLoyaltyRuleInput) {
    const result = await upsertLoyaltyRuleAction(data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(t(isDirty ? "updated" : "created"));
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input type="hidden" {...register("id")} />

      <div className="space-y-1.5">
        <Label htmlFor="name">{t("form.name")} *</Label>
        <Input
          id="name"
          placeholder="Regla 2026"
          {...register("name")}
        />
        {errors.name && (
          <p className="text-xs text-error">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="pointsPerAmount">{t("form.pointsPerAmount")} *</Label>
          <Input
            id="pointsPerAmount"
            type="number"
            step="0.01"
            min="0.01"
            {...register("pointsPerAmount", { valueAsNumber: true })}
          />
          {errors.pointsPerAmount && (
            <p className="text-xs text-error">{errors.pointsPerAmount.message}</p>
          )}
          <p className="text-xs text-on-surface-variant">
            {t("form.pointsPerAmountHint")}
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pointsToRedeem">{t("form.pointsToRedeem")} *</Label>
          <Input
            id="pointsToRedeem"
            type="number"
            min="1"
            step="1"
            {...register("pointsToRedeem", { valueAsNumber: true })}
          />
          {errors.pointsToRedeem && (
            <p className="text-xs text-error">{errors.pointsToRedeem.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="redeemValue">{t("form.redeemValue")} *</Label>
          <Input
            id="redeemValue"
            type="number"
            step="0.01"
            min="0.01"
            {...register("redeemValue", { valueAsNumber: true })}
          />
          {errors.redeemValue && (
            <p className="text-xs text-error">{errors.redeemValue.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
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
