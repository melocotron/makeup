"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adjustPointsAction } from "@/server/loyalty/actions";
import {
  adjustPointsSchema,
  ADJUSTMENT_REASONS,
  type AdjustPointsInput,
} from "@/server/loyalty/validators";
import { useTranslations } from "next-intl";

export interface AdjustPointsDialogProps {
  clientId: string;
  clientName: string;
  currentBalance: number;
  trigger?: React.ReactNode;
}

export function AdjustPointsDialog({
  clientId,
  clientName,
  currentBalance,
  trigger,
}: AdjustPointsDialogProps) {
  const t = useTranslations("admin.loyalty.adjust");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AdjustPointsInput>({
    resolver: zodResolver(adjustPointsSchema),
    defaultValues: {
      clientId,
      points: 10,
      reason: "",
    },
  });

  async function onSubmit(data: AdjustPointsInput) {
    const result = await adjustPointsAction(data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(t("success"));
    reset({ clientId, points: 10, reason: "" });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button variant="outline">{t("trigger")}</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("description", {
              name: clientName,
              balance: currentBalance,
            })}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("clientId")} />

          <div className="space-y-1.5">
            <Label htmlFor="points">{t("points")} *</Label>
            <Input
              id="points"
              type="number"
              step="1"
              {...register("points", { valueAsNumber: true })}
            />
            {errors.points && (
              <p className="text-xs text-error">{errors.points.message}</p>
            )}
            <p className="text-xs text-on-surface-variant">{t("pointsHint")}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reasonPreset">{t("reasonPreset")}</Label>
            <select
              id="reasonPreset"
              className="flex h-10 w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              onChange={(e) => {
                if (e.target.value) {
                  reset((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }));
                }
              }}
              defaultValue=""
            >
              <option value="">{t("selectReason")}</option>
              {ADJUSTMENT_REASONS.map((r) => (
                <option key={r} value={r}>
                  {t(`reasons.${r}`)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">{t("reason")} *</Label>
            <Input
              id="reason"
              placeholder={t("reasonPlaceholder")}
              {...register("reason")}
            />
            {errors.reason && (
              <p className="text-xs text-error">{errors.reason.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
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
                tCommon("save")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
