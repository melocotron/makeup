import { setRequestLocale, getTranslations } from "next-intl/server";

import { InvoicesList } from "@/components/admin/invoices-list";
import { PageHeader } from "@/components/admin/page-header";
import type { Locale } from "@/i18n/routing";
import { getInvoiceStats, listInvoices } from "@/server/billing/queries";

export default async function InvoicesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "admin" });
  const tBilling = await getTranslations({
    locale,
    namespace: "admin.billing",
  });
  const statusParam = (sp.status ?? "all") as
    | "all"
    | "PENDING"
    | "PAID"
    | "CANCELLED";

  const [{ items, total }, stats] = await Promise.all([
    listInvoices({ search: sp.q, status: statusParam, locale: locale as Locale }),
    getInvoiceStats(),
  ]);

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader
        title={t("nav.billing")}
        description={tBilling("description")}
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={tBilling("kpi.pending")}
          value={String(stats.totalPending)}
        />
        <KpiCard
          label={tBilling("kpi.paidThisMonth")}
          value={String(stats.totalPaidThisMonth)}
        />
        <KpiCard
          label={tBilling("kpi.revenueThisMonth")}
          value={new Intl.NumberFormat(locale, {
            style: "currency",
            currency: "USD",
          }).format(stats.revenueThisMonth)}
        />
        <KpiCard
          label={tBilling("kpi.couponsRedeemedThisMonth")}
          value={String(stats.couponsRedeemedThisMonth)}
        />
      </div>

      <InvoicesList invoices={items} />
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-on-surface-variant">
        {label}
      </p>
      <p className="mt-1 font-headline-md text-headline-md text-on-surface">
        {value}
      </p>
    </div>
  );
}
