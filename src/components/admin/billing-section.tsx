import "server-only";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CreateInvoiceButton } from "@/components/admin/create-invoice-button";
import { Card } from "@/components/ui/card";
import { getInvoiceForAppointment } from "@/server/billing/queries";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const FACTURABLE_STATUSES = new Set(["CONFIRMED", "COMPLETED"]);

export interface BillingSectionProps {
  appointmentId: string;
  appointmentStatus: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  locale: string;
}

/**
 * Sección "Facturación" en la página de detalle de cita.
 * Server component que consulta si ya hay invoice y decide qué mostrar.
 *
 * Estados:
 * - La cita tiene invoice → resumen + link al detalle.
 * - La cita no tiene invoice y es facturable (CONFIRMED/COMPLETED) →
 *   botón "Crear factura".
 * - La cita es PENDING/CANCELLED/NO_SHOW → mensaje "no facturable".
 */
export async function BillingSection({
  appointmentId,
  appointmentStatus,
  locale,
}: BillingSectionProps) {
  const t = await getTranslations({ locale, namespace: "admin.billing" });
  const existingInvoice = await getInvoiceForAppointment(appointmentId);

  if (existingInvoice) {
    return (
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-on-surface-variant" />
          <h3 className="text-lg font-semibold text-on-surface">
            {t("title")}
          </h3>
        </div>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
              Número
            </dt>
            <dd className="mt-0.5 font-mono font-semibold">
              {existingInvoice.number}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
              Total
            </dt>
            <dd className="mt-0.5 font-mono tabular-nums">
              {new Intl.NumberFormat(locale, {
                style: "currency",
                currency: "USD",
              }).format(existingInvoice.total)}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
              Estado
            </dt>
            <dd className="mt-0.5">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[existingInvoice.status]}`}
              >
                {t(`status.${existingInvoice.status}`)}
              </span>
            </dd>
          </div>
        </dl>
        <div>
          <Link
            href={`/${locale}/admin/facturas/${existingInvoice.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("actions.viewInvoice")} →
          </Link>
        </div>
      </Card>
    );
  }

  // No hay invoice todavía
  if (FACTURABLE_STATUSES.has(appointmentStatus)) {
    return (
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-on-surface-variant" />
          <h3 className="text-lg font-semibold text-on-surface">
            {t("title")}
          </h3>
        </div>
        <p className="text-sm text-on-surface-variant">
          Esta cita aún no tiene factura.
        </p>
        <CreateInvoiceButton appointmentId={appointmentId} />
      </Card>
    );
  }

  // PENDING, CANCELLED, NO_SHOW: no facturable
  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-2">
        <Receipt className="h-5 w-5 text-on-surface-variant" />
        <h3 className="text-lg font-semibold text-on-surface">
          {t("title")}
        </h3>
      </div>
      <p className="text-sm text-on-surface-variant">
        {t("empty.notFacturable")}
      </p>
      <p className="text-xs text-on-surface-variant">
        {t("empty.notFacturableDesc")}
      </p>
    </Card>
  );
}
