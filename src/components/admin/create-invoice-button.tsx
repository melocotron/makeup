"use client";

import { Loader2, Receipt } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { createInvoiceForAppointment } from "@/server/billing/actions";
import type { Locale } from "@/i18n/routing";

export interface CreateInvoiceButtonProps {
  appointmentId: string;
}

/**
 * Botón "Crear factura" en la página de cita. Llama a
 * createInvoiceForAppointment y redirige al detalle de la invoice
 * recién creada.
 *
 * Usa useTransition para deshabilitar el botón mientras procesa.
 * Errores se muestran como toast.
 */
export function CreateInvoiceButton({ appointmentId }: CreateInvoiceButtonProps) {
  const t = useTranslations("admin.billing");
  const router = useRouter();
  const locale = useLocale() as Locale;
  const [isPending, startTransition] = useTransition();

  function onClick() {
    startTransition(async () => {
      const result = await createInvoiceForAppointment({ appointmentId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Factura creada");
      // Navigate to the new invoice detail page
      router.push(`/${locale}/admin/facturas/${result.id}`);
    });
  }

  return (
    <Button onClick={onClick} disabled={isPending}>
      {isPending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("actions.createInvoice")}
        </>
      ) : (
        <>
          <Receipt className="h-4 w-4" />
          {t("actions.createInvoice")}
        </>
      )}
    </Button>
  );
}
