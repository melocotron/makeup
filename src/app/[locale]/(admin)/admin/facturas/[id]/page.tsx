import "server-only";

import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { ApplyCouponDialog } from "@/components/admin/apply-coupon-dialog";
import { CancelInvoiceDialog } from "@/components/admin/cancel-invoice-dialog";
import { InvoiceActions } from "@/components/admin/invoice-actions";
import { MarkInvoicePaidDialog } from "@/components/admin/mark-invoice-paid-dialog";
import { PageHeader } from "@/components/admin/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { getInvoiceById } from "@/server/billing/queries";

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  CANCELLED: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  otro: "Otro",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const invoice = await getInvoiceById(id, locale as Locale);
  if (!invoice) notFound();

  const isPending = invoice.status === "PENDING";
  const isPaid = invoice.status === "PAID";
  const isCancelled = invoice.status === "CANCELLED";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={invoice.number}
        description={`${invoice.clientName} · ${invoice.clientEmail}`}
        actions={
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${STATUS_BADGE[invoice.status]}`}
          >
            {invoice.status}
          </span>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>Desglose de la factura.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                Subtotal
              </dt>
              <dd className="mt-0.5 font-mono tabular-nums">
                {formatCurrency(invoice.subtotal, locale)}
              </dd>
            </div>
            {invoice.discountAmount > 0 && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Descuento
                </dt>
                <dd className="mt-0.5 font-mono tabular-nums text-error">
                  −{formatCurrency(invoice.discountAmount, locale)}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                Total
              </dt>
              <dd className="mt-0.5 font-headline-md text-headline-md">
                {formatCurrency(invoice.total, locale)}
              </dd>
            </div>
            {isPaid && invoice.paymentMethod && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Método de pago
                </dt>
                <dd className="mt-0.5">
                  {PAYMENT_METHOD_LABEL[invoice.paymentMethod] ??
                    invoice.paymentMethod}
                </dd>
              </div>
            )}
            {isPaid && invoice.paidAt && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Fecha de pago
                </dt>
                <dd className="mt-0.5">
                  {new Date(invoice.paidAt).toLocaleString(locale)}
                </dd>
              </div>
            )}
            {invoice.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                  Notas
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-sm">
                  {invoice.notes}
                </dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cita asociada</CardTitle>
          <CardDescription>
            Detalles de la cita que originó esta factura.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                Fecha y hora
              </dt>
              <dd className="mt-0.5">
                {new Date(invoice.appointmentDate).toLocaleString(locale)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                Servicio
              </dt>
              <dd className="mt-0.5">{invoice.serviceName}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
                Duración
              </dt>
              <dd className="mt-0.5">
                {invoice.appointment.durationMin} min
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cupones aplicados</CardTitle>
          <CardDescription>
            Cupones canjeados en esta factura y sus descuentos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoice.couponUsages.length === 0 ? (
            <p className="text-sm text-on-surface-variant">
              Esta factura no tiene cupones aplicados.
            </p>
          ) : (
            <ul className="space-y-2">
              {invoice.couponUsages.map((cu) => (
                <li
                  key={cu.id}
                  className="flex items-center justify-between rounded border border-outline-variant bg-surface-container-low p-3 text-sm"
                >
                  <div>
                    <p className="font-mono font-semibold">{cu.coupon.code}</p>
                    <p className="text-xs text-on-surface-variant">
                      {cu.coupon.type === "PERCENTAGE"
                        ? `${cu.coupon.value}%`
                        : formatCurrency(cu.coupon.value, locale)}
                    </p>
                  </div>
                  <p className="font-mono font-semibold tabular-nums text-error">
                    −{formatCurrency(cu.amount, locale)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Acciones según status */}
      <InvoiceActions
        invoiceId={invoice.id}
        couponUsages={invoice.couponUsages.map((cu) => ({
          id: cu.id,
          couponId: cu.couponId,
        }))}
        isPending={isPending}
        isPaid={isPaid}
        isCancelled={isCancelled}
      />
    </div>
  );
}

function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
  }).format(value);
}
