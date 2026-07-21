"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

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
import { markInvoicePaid } from "@/server/billing/actions";
import {
  markInvoicePaidSchema,
  PAYMENT_METHODS,
  type MarkInvoicePaidInput,
} from "@/server/billing/validators";

export interface MarkInvoicePaidDialogProps {
  invoiceId: string;
  trigger?: React.ReactNode;
}

export function MarkInvoicePaidDialog({
  invoiceId,
  trigger,
}: MarkInvoicePaidDialogProps) {
  const t = useTranslations("admin.billing");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MarkInvoicePaidInput>({
    resolver: zodResolver(markInvoicePaidSchema),
    defaultValues: {
      invoiceId,
      paymentMethod: "efectivo",
      paidAt: new Date(),
    },
  });

  async function onSubmit(data: MarkInvoicePaidInput) {
    const result = await markInvoicePaid(data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(t("actions.markPaid"));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>{t("actions.markPaid")}</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogs.markPaidTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.markPaidDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("invoiceId")} />

          <div className="space-y-1.5">
            <Label htmlFor="paymentMethod">
              {t("detail.paymentMethod")} *
            </Label>
            <select
              id="paymentMethod"
              className="flex h-10 w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              {...register("paymentMethod")}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            {errors.paymentMethod && (
              <p className="text-xs text-error">
                {errors.paymentMethod.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paidAt">{t("detail.paidAt")}</Label>
            <Input
              id="paidAt"
              type="date"
              {...register("paidAt")}
            />
            {errors.paidAt && (
              <p className="text-xs text-error">{errors.paidAt.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t("detail.notes")}</Label>
            <textarea
              id="notes"
              rows={3}
              className="flex w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              {...register("notes")}
            />
            {errors.notes && (
              <p className="text-xs text-error">{errors.notes.message}</p>
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
                t("actions.markPaid")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
