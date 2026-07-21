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
import { Label } from "@/components/ui/label";
import { cancelInvoice } from "@/server/billing/actions";
import {
  cancelInvoiceSchema,
  type CancelInvoiceInput,
} from "@/server/billing/validators";

export interface CancelInvoiceDialogProps {
  invoiceId: string;
  trigger?: React.ReactNode;
}

export function CancelInvoiceDialog({
  invoiceId,
  trigger,
}: CancelInvoiceDialogProps) {
  const t = useTranslations("admin.billing");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CancelInvoiceInput>({
    resolver: zodResolver(cancelInvoiceSchema),
    defaultValues: { invoiceId, reason: "" },
  });

  async function onSubmit(data: CancelInvoiceInput) {
    const result = await cancelInvoice(data);
    if (!result.success) {
      toast.error(result.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" className="text-error hover:text-error">
            {t("actions.cancel")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("dialogs.cancelTitle")}</DialogTitle>
          <DialogDescription>{t("dialogs.cancelDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("invoiceId")} />

          <div className="space-y-1.5">
            <Label htmlFor="reason">
              {t("dialogs.cancelDesc")} *
            </Label>
            <textarea
              id="reason"
              rows={3}
              className="flex w-full rounded-lg border border-outline bg-surface-container-lowest px-3 py-2 text-sm transition-colors focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              placeholder={t("dialogs.cancelDesc")}
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
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-error text-on-error hover:opacity-90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tCommon("loading")}
                </>
              ) : (
                t("actions.cancel")
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
