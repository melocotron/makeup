"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { ApplyCouponDialog } from "@/components/admin/apply-coupon-dialog";
import { CancelInvoiceDialog } from "@/components/admin/cancel-invoice-dialog";
import { MarkInvoicePaidDialog } from "@/components/admin/mark-invoice-paid-dialog";
import { Button } from "@/components/ui/button";
import { removeCouponFromInvoice } from "@/server/billing/actions";

export interface InvoiceActionsProps {
  invoiceId: string;
  couponUsages: { id: string; couponId: string }[];
  isPending: boolean;
  isPaid: boolean;
  isCancelled: boolean;
}

export function InvoiceActions({
  invoiceId,
  couponUsages,
  isPending,
  isPaid,
  isCancelled,
}: InvoiceActionsProps) {
  const t = useTranslations("admin.billing");
  const router = useRouter();
  const [isPendingRemove, startRemoveTransition] = useTransition();

  function onRemoveCoupon(couponUsageId: string) {
    if (!confirm("¿Quitar este cupón?")) return;
    startRemoveTransition(async () => {
      const result = await removeCouponFromInvoice({
        invoiceId,
        couponUsageId,
      });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(t("coupon.removed"));
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Acciones para PENDING */}
      {isPending && (
        <>
          <MarkInvoicePaidDialog invoiceId={invoiceId} />
          <CancelInvoiceDialog invoiceId={invoiceId} />
          {couponUsages.length === 0 && <ApplyCouponDialog invoiceId={invoiceId} />}
        </>
      )}

      {/* Lista de cupones aplicados con botón quitar (solo en PENDING) */}
      {isPending && couponUsages.length > 0 && (
        <div className="ml-auto flex flex-col gap-2">
          {couponUsages.map((cu) => (
            <Button
              key={cu.id}
              variant="ghost"
              size="sm"
              onClick={() => onRemoveCoupon(cu.id)}
              disabled={isPendingRemove}
              className="text-error hover:text-error"
            >
              <Trash2 className="h-4 w-4" />
              {t("actions.removeCoupon")}
            </Button>
          ))}
        </div>
      )}

      {/* PAID y CANCELLED: solo lectura, sin acciones */}
      {(isPaid || isCancelled) && null}
    </div>
  );
}
