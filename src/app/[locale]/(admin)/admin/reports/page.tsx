import { getTranslations, setRequestLocale } from "next-intl/server";
import { type ReactNode, Suspense } from "react";

import { DateRangePicker } from "@/components/admin/reports/date-range-picker";
import { ExportButtons } from "@/components/admin/reports/export-buttons";
import {
  RevenueChart,
  ServicesChart,
  StatusChart,
  type StatusChartDatum,
} from "@/components/admin/reports/charts";
import {
  CouponRedemptionsTable,
  RecentAppointmentsTable,
  RecentInvoicesTable,
  TopClientsTable,
  TopServicesTable,
} from "@/components/admin/reports/tables";
import { PageHeader } from "@/components/admin/page-header";
import { StatCard } from "@/components/admin/stat-card";
import {
  type AppointmentsFilterInput,
  type CouponRedemptionsFilterInput,
  type InvoicesFilterInput,
  type TopClientsFilterInput,
  reportFiltersSchema,
  resolveDateRange,
  topClientsFilterSchema,
  appointmentsFilterSchema,
  invoicesFilterSchema,
  couponRedemptionsFilterSchema,
} from "@/server/reports/validators";
import {
  getAppointmentsSummary,
  getCouponRedemptions,
  getCustomersSummary,
  getDailyRevenueSeries,
  getLoyaltySummary,
  getRecentAppointments,
  getRecentInvoices,
  getRevenueSummary,
  getTopClients,
  getTopServices,
} from "@/server/reports/queries";

import type { Locale } from "@/i18n/routing";

const STATUS_KEYS = [
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

type SearchParams = {
  preset?: string;
  from?: string;
  to?: string;
  groupBy?: string;
  topClientsSort?: string;
  apptStatus?: string;
  invoiceStatus?: string;
  couponSort?: string;
  page?: string;
  topClientsPage?: string;
  apptPage?: string;
  invoicePage?: string;
  couponPage?: string;
};

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default async function ReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale);

  // 1) Validar y resolver el rango de fechas
  const filters = reportFiltersSchema.parse({
    preset: sp.preset,
    from: sp.from,
    to: sp.to,
    groupBy: sp.groupBy,
  });
  const range = resolveDateRange(filters);

  // 2) Parsear filtros de cada tabla con su propio schema
  const topClientsInput: TopClientsFilterInput = topClientsFilterSchema.parse({
    preset: sp.preset,
    from: sp.from,
    to: sp.to,
    groupBy: sp.groupBy,
    sortBy: sp.topClientsSort,
    page: sp.topClientsPage,
    pageSize: undefined,
  });
  const apptInput: AppointmentsFilterInput = appointmentsFilterSchema.parse({
    preset: sp.preset,
    from: sp.from,
    to: sp.to,
    groupBy: sp.groupBy,
    status: sp.apptStatus,
    sortBy: undefined,
    page: sp.apptPage,
    pageSize: undefined,
  });
  const invoiceInput: InvoicesFilterInput = invoicesFilterSchema.parse({
    preset: sp.preset,
    from: sp.from,
    to: sp.to,
    groupBy: sp.groupBy,
    status: sp.invoiceStatus,
    sortBy: undefined,
    page: sp.invoicePage,
    pageSize: undefined,
  });
  const couponInput: CouponRedemptionsFilterInput =
    couponRedemptionsFilterSchema.parse({
      preset: sp.preset,
      from: sp.from,
      to: sp.to,
      groupBy: sp.groupBy,
      sortBy: sp.couponSort,
      page: sp.couponPage,
      pageSize: undefined,
    });

  // 3) Cargar todo en paralelo
  const [
    revenue,
    appointments,
    customers,
    loyalty,
    dailyRevenue,
    topServices,
    topClients,
    recentAppointments,
    recentInvoices,
    couponRedemptions,
  ] = await Promise.all([
    getRevenueSummary(range),
    getAppointmentsSummary(range),
    getCustomersSummary(range),
    getLoyaltySummary(range),
    getDailyRevenueSeries(range),
    getTopServices(range, 5),
    getTopClients(range, {
      sortBy: topClientsInput.sortBy,
      page: topClientsInput.page,
      pageSize: topClientsInput.pageSize,
    }),
    getRecentAppointments(range, {
      status: apptInput.status,
      page: apptInput.page,
      pageSize: apptInput.pageSize,
    }),
    getRecentInvoices(range, {
      status: invoiceInput.status,
      page: invoiceInput.page,
      pageSize: invoiceInput.pageSize,
    }),
    getCouponRedemptions(range, {
      sortBy: couponInput.sortBy,
      page: couponInput.page,
      pageSize: couponInput.pageSize,
    }),
  ]);

  // 4) Traducciones
  const t = await getTranslations({ locale, namespace: "admin.reports" });
  const tCols = await getTranslations({
    locale,
    namespace: "admin.reports.columns",
  });
  const tTables = await getTranslations({
    locale,
    namespace: "admin.reports.tables",
  });

  // Helpers de formato de etiquetas (locales)
  const labels = {
    showing: (from: number, to: number, total: number) =>
      tTables("showing", { from, to, total }),
    pageOf: (page: number, total: number) =>
      tTables("pageOf", { page, total }),
    prev: tTables("prev"),
    next: tTables("next"),
    empty: tTables("empty"),
  };

  // 5) Construir data del pie de status
  const statusData: StatusChartDatum[] = STATUS_KEYS.map((s) => ({
    status: s,
    count: appointments[s.toLowerCase() as keyof typeof appointments] as number,
  }));

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Suspense
            fallback={
              <div className="h-9 w-44 rounded-md border border-outline-variant bg-surface-container-lowest" />
            }
          >
            <ExportButtons />
          </Suspense>
        }
      />

      {/* Date range picker */}
      <Suspense
        fallback={<div className="h-24 rounded-md border border-outline-variant bg-surface-container-lowest" />}
      >
        <DateRangePicker />
      </Suspense>

      {/* KPIs principales */}
      <KpiGrid
        revenueLabel={t("kpis.totalRevenue")}
        revenueHint={t("kpis.totalRevenueHint")}
        couponLabel={t("kpis.couponDiscount")}
        loyaltyLabel={t("kpis.loyaltyDiscount")}
        avgLabel={t("kpis.averageTicket")}
        newClientsLabel={t("kpis.newCustomers")}
        pointsRedeemedLabel={t("kpis.pointsRedeemed")}
        redemptionValueLabel={t("kpis.redemptionValue")}
        completionLabel={t("kpis.completionRate")}
        cancelledLabel={t("kpis.cancellationRate")}
        totalAppointmentsLabel={t("kpis.appointmentsTotal")}
        returningLabel={t("kpis.returningCustomers")}
        data={{
          revenue: revenue.totalRevenue,
          coupon: revenue.couponDiscount,
          loyalty: revenue.loyaltyDiscount,
          avg: revenue.averageTicket,
          newClients: customers.newCustomers,
          pointsRedeemed: loyalty.pointsRedeemed,
          redemptionValue: loyalty.redemptionValue,
          completionRate: appointments.completionRate,
          cancelled: appointments.cancelled,
          totalAppointments: appointments.total,
          returning: customers.returningCustomers,
        }}
      />

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title={t("charts.revenueTitle")}>
          <RevenueChart
            data={dailyRevenue}
            emptyLabel={t("charts.revenueEmpty")}
          />
        </ChartCard>
        <ChartCard title={t("charts.servicesTitle")}>
          <ServicesChart
            data={topServices}
            emptyLabel={t("charts.servicesEmpty")}
          />
        </ChartCard>
        <ChartCard title={t("charts.statusTitle")}>
          <StatusChart
            data={statusData}
            emptyLabel={t("charts.statusEmpty")}
          />
        </ChartCard>
      </div>

      {/* Tablas de detalle */}
      <div className="space-y-6">
        <TopClientsTable
          data={topClients}
          sortKey={topClientsInput.sortBy}
          labels={{
            title: t("tables.topClients"),
            empty: labels.empty,
            showing: labels.showing,
            pageOf: labels.pageOf,
            prev: labels.prev,
            next: labels.next,
            client: tCols("client"),
            email: tCols("email"),
            revenue: tCols("revenue"),
            appointments: tCols("appointments"),
            invoices: tCols("invoices"),
            points: tCols("loyaltyPoints"),
          }}
        />

        <TopServicesTable
          data={topServices}
          labels={{
            title: t("tables.topServices"),
            empty: labels.empty,
            service: tCols("service"),
            revenue: tCols("revenue"),
            appointments: tCols("appointments"),
            invoices: tCols("invoices"),
          }}
        />

        <RecentAppointmentsTable
          data={recentAppointments}
          statusFilter={apptInput.status}
          labels={{
            title: t("tables.recentAppointments"),
            empty: labels.empty,
            showing: labels.showing,
            pageOf: labels.pageOf,
            prev: labels.prev,
            next: labels.next,
            scheduledAt: tCols("scheduledAt"),
            client: tCols("client"),
            service: tCols("service"),
            status: tCols("status"),
            duration: tCols("duration"),
          }}
        />

        <RecentInvoicesTable
          data={recentInvoices}
          statusFilter={invoiceInput.status}
          labels={{
            title: t("tables.recentInvoices"),
            empty: labels.empty,
            showing: labels.showing,
            pageOf: labels.pageOf,
            prev: labels.prev,
            next: labels.next,
            number: tCols("number"),
            client: tCols("client"),
            service: tCols("service"),
            total: tCols("total"),
            status: tCols("status"),
            createdAt: tCols("createdAt"),
          }}
        />

        <CouponRedemptionsTable
          data={couponRedemptions}
          sortKey={couponInput.sortBy}
          labels={{
            title: t("tables.couponRedemptions"),
            empty: labels.empty,
            showing: labels.showing,
            pageOf: labels.pageOf,
            prev: labels.prev,
            next: labels.next,
            code: tCols("code"),
            client: tCols("client"),
            invoice: tCols("number"),
            amount: tCols("amount"),
            usedAt: tCols("usedAt"),
          }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Sub-componentes
// ============================================================================

function KpiGrid({
  revenueLabel,
  revenueHint,
  couponLabel,
  loyaltyLabel,
  avgLabel,
  newClientsLabel,
  pointsRedeemedLabel,
  redemptionValueLabel,
  completionLabel,
  cancelledLabel,
  totalAppointmentsLabel,
  returningLabel,
  data,
}: {
  revenueLabel: string;
  revenueHint: string;
  couponLabel: string;
  loyaltyLabel: string;
  avgLabel: string;
  newClientsLabel: string;
  pointsRedeemedLabel: string;
  redemptionValueLabel: string;
  completionLabel: string;
  cancelledLabel: string;
  totalAppointmentsLabel: string;
  returningLabel: string;
  data: {
    revenue: number;
    coupon: number;
    loyalty: number;
    avg: number;
    newClients: number;
    pointsRedeemed: number;
    redemptionValue: number;
    completionRate: number;
    cancelled: number;
    totalAppointments: number;
    returning: number;
  };
}) {
  const CURRENCY = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  });

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label={revenueLabel}
        value={CURRENCY.format(data.revenue)}
        footer={<span className="text-xs text-on-surface-variant">{revenueHint}</span>}
      />
      <StatCard
        label={avgLabel}
        value={CURRENCY.format(data.avg)}
      />
      <StatCard
        label={couponLabel}
        value={CURRENCY.format(data.coupon)}
      />
      <StatCard
        label={loyaltyLabel}
        value={CURRENCY.format(data.loyalty)}
      />
      <StatCard
        label={totalAppointmentsLabel}
        value={String(data.totalAppointments)}
        footer={
          <span className="text-xs text-on-surface-variant">
            {completionLabel}: {pct(data.completionRate)} · {cancelledLabel}: {data.cancelled}
          </span>
        }
      />
      <StatCard
        label={newClientsLabel}
        value={String(data.newClients)}
        footer={
          <span className="text-xs text-on-surface-variant">
            {returningLabel}: {data.returning}
          </span>
        }
      />
      <StatCard
        label={pointsRedeemedLabel}
        value={String(data.pointsRedeemed)}
      />
      <StatCard
        label={redemptionValueLabel}
        value={CURRENCY.format(data.redemptionValue)}
      />
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-outline-variant bg-surface-container-lowest p-4">
      <h3 className="mb-3 text-sm font-semibold text-on-surface">{title}</h3>
      {children}
    </section>
  );
}
