"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { applyCouponToInvoice } from "@/server/billing/actions";

export interface ApplyCouponDialogProps {
  invoiceId: string;
  trigger?: React.ReactNode;
}

/**
 * Mapea el mensaje de error retornado por la action a su key i18n.
 * Como los mensajes vienen en español plano de la action, hacemos
 * match por substring contra los mensajes conocidos.
 */
function localizeCouponError(
  error: string,
  t: (key: string) => string,
): string {
  if (error.includes("no existe")) return t("notFound");
  if (error.includes("inactivo")) return t("inactive");
  if (error.includes("fuera de vigencia")) return t("expired");
  if (error.includes("máximo de usos")) return t("exhausted");
  if (error.includes("ya está aplicado")) return t("alreadyApplied");
  if (error.includes("no aplica a este servicio"))
    return t("notApplicableToService");
  if (error.includes("compra mínima")) return t("minPurchaseNotReached");
  return error;
}

export function ApplyCouponDialog({
  invoiceId,
  trigger,
}: ApplyCouponDialogProps) {
  const t = useTranslations("admin.billing.coupon");
  const tDialogs = useTranslations("admin.billing.dialogs");
  const tActions = useTranslations("admin.billing.actions");
  const tCommon = useTranslations("common");
  const tBilling = useTranslations("admin.billing");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [isPending, startTransition] = useTransition();

  function onApply() {
    if (!code.trim()) return;
    startTransition(async () => {
      const result = await applyCouponToInvoice({
        invoiceId,
        couponCode: code,
      });
      if (!result.success) {
        toast.error(localizeCouponError(result.error, t));
        return;
      }
      toast.success(t("applied"));
      setOpen(false);
      setCode("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline">{tActions("applyCoupon")}</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tDialogs("applyCouponTitle")}</DialogTitle>
          <DialogDescription>
            {tDialogs("applyCouponDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="couponCode" className="text-sm font-medium">
              {t("placeholder")}
            </label>
            <Input
              id="couponCode"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("placeholder")}
              disabled={isPending}
              autoFocus
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={isPending}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            type="button"
            onClick={onApply}
            disabled={isPending || !code.trim()}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {tCommon("loading")}
              </>
            ) : (
              tBilling("actions.applyCoupon")
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
