import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { StatCard } from "@/components/admin/stat-card";
import { prisma } from "@/lib/prisma";
import {
  getAppointmentsSummary,
  getCustomersSummary,
  getLoyaltySummary,
  getRevenueSummary,
} from "@/server/reports/queries";
import { resolveDateRange } from "@/server/reports/validators";
import { listAppointments } from "@/server/booking/queries";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  COMPLETED: "Completada",
  CANCELLED: "Cancelada",
  NO_SHOW: "No-show",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-rose-100 text-rose-800",
  NO_SHOW: "bg-slate-100 text-slate-800",
};

function extractSpanishName(name: unknown): string {
  if (!name || typeof name !== "object") return "—";
  const obj = name as Record<string, unknown>;
  const es = obj.es;
  if (typeof es === "string" && es.length > 0) return es;
  const en = obj.en;
  if (typeof en === "string" && en.length > 0) return en;
  return "—";
}

const CURRENCY = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

const DATE_FMT = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, tCommon] = await Promise.all([
    getTranslations({ locale, namespace: "admin" }),
    getTranslations({ locale, namespace: "common" }),
  ]);

  // Rango fijo: últimos 30 días para los KPIs principales.
  const range = resolveDateRange({ preset: "last30" });
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const now = new Date();
  // Próximas citas: desde ahora, orden ascendente, máximo 5.
  const upcomingLimit = 5;

  const [
    revenue,
    appointments,
    customers,
    loyalty,
    pendingInvoices,
    loyaltyMembers,
    activeCoupons,
    postsPublished,
    upcomingAppointments,
  ] = await Promise.all([
    getRevenueSummary(range),
    getAppointmentsSummary(range),
    getCustomersSummary(range),
    getLoyaltySummary(range),
    prisma.invoice.count({ where: { status: "PENDING" } }),
    prisma.client.count({ where: { loyaltyPoints: { gt: 0 } } }),
    prisma.coupon.count({
      where: {
        isActive: true,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    }),
    prisma.post.count({ where: { status: "PUBLISHED" } }),
    listAppointments({ from: now }).then((rows) =>
      rows
        .filter(
          (a) =>
            a.status === "PENDING" ||
            a.status === "CONFIRMED",
        )
        .slice(0, upcomingLimit),
    ),
  ]);

  const quickAccess = [
    { href: "appointments", labelKey: "quickAccess.newAppointment" },
    { href: "services", labelKey: "quickAccess.newService" },
    { href: "packages", labelKey: "quickAccess.newPackage" },
    { href: "clients", labelKey: "quickAccess.newClient" },
    { href: "promotions", labelKey: "quickAccess.newPromotion" },
    { href: "blog", labelKey: "quickAccess.newPost" },
  ];

  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      <div>
        <h1 className="font-display text-display text-on-surface">
          {t("dashboardTitle")}
        </h1>
        <p className="mt-2 max-w-3xl text-on-surface-variant">
          {t("dashboardSubtitle")}
        </p>
      </div>

      {/* 4 KPIs reales con números de los últimos 30 días */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t("kpi.revenueMonth")}
          value={CURRENCY.format(revenue.totalRevenue)}
          footer={
            <span className="text-xs text-on-surface-variant">
              {appointments.total} {t("kpi.appointmentsToday").toLowerCase()}
            </span>
          }
        />
        <StatCard
          label={t("kpi.appointmentsToday")}
          value={String(appointments.total)}
          footer={
            <span className="text-xs text-on-surface-variant">
              {pct(appointments.completionRate)} {t("kpi.revenueMonth").toLowerCase().includes("ingresos") ? "completado" : "completado"}
            </span>
          }
        />
        <StatCard
          label={t("kpi.newClientsMonth")}
          value={String(customers.newCustomers)}
          footer={
            <span className="text-xs text-on-surface-variant">
              {customers.returningCustomers} {t("kpi.loyaltyMembers").toLowerCase().includes("fidelidad") ? "recurrentes" : "recurrentes"}
            </span>
          }
        />
        <StatCard
          label={t("kpi.topService")}
          value="—"
          footer={
            <span className="text-xs text-on-surface-variant">
              <Link
                href={`/${locale}/admin/reports`}
                className="text-primary hover:underline"
              >
                Ver en reportes →
              </Link>
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Próximas citas: feed real */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-md text-headline-md text-on-surface">
              {t("upcomingAppointments")}
            </h2>
            <Link
              href={`/${locale}/admin/appointments`}
              className="text-xs font-semibold uppercase tracking-wider text-primary hover:underline"
            >
              {tCommon("next")} →
            </Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="mt-6 flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-outline-variant bg-surface-container-low py-12 text-center">
              <p className="mt-4 text-sm font-semibold text-on-surface">
                {t("emptyStates.noUpcoming")}
              </p>
              <p className="mt-1 max-w-sm text-xs text-on-surface-variant">
                {t("emptyStates.noUpcomingDesc")}
              </p>
              <Link
                href={`/${locale}/admin/appointments`}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary hover:underline"
              >
                {t("quickAccess.viewAll")} →
              </Link>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {upcomingAppointments.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between gap-4 rounded-md border border-outline-variant p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface">
                      {a.client.name}
                    </p>
                    <p className="truncate text-xs text-on-surface-variant">
                      {extractSpanishName(a.service.name)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-on-surface">
                      {DATE_FMT.format(new Date(a.scheduledAt))}
                    </p>
                    <span
                      className={`mt-1 inline-flex rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                        STATUS_BADGE[a.status] ?? "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {STATUS_LABELS[a.status] ?? a.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Resumen derecho: 4 contadores reales */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h2 className="font-headline-md text-headline-md text-on-surface">
            {t("quickSummary")}
          </h2>
          <div className="mt-4 space-y-4">
            <SummaryRow
              label={t("kpi.pendingInvoices")}
              value={String(pendingInvoices)}
            />
            <SummaryRow
              label={t("kpi.loyaltyMembers")}
              value={String(loyaltyMembers)}
            />
            <SummaryRow
              label={t("kpi.activeCoupons")}
              value={String(activeCoupons)}
            />
            <SummaryRow
              label={t("kpi.postsPublished")}
              value={String(postsPublished)}
            />
            <div className="border-t border-outline-variant pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">
                Fidelidad (últimos 30 días)
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Puntos canjeados: <span className="font-semibold text-on-surface">{LoyaltyValue(loyalty)}</span>
              </p>
              <p className="mt-1 text-xs text-on-surface-variant">
                Valor canjeado: <span className="font-semibold text-on-surface">{CURRENCY.format(loyalty.redemptionValue)}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-4 font-headline-md text-headline-md text-on-surface">
          {t("quickAccess.title")}
        </h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {quickAccess.map((item) => (
            <Link
              key={item.href}
              href={`/${locale}/admin/${item.href}`}
              className="flex flex-col items-center justify-center gap-2 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-center transition-colors hover:border-primary hover:bg-surface-container-low"
            >
              <span className="text-xs font-semibold uppercase tracking-wider text-on-surface">
                {t(item.labelKey)}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoyaltyValue(loyalty: { pointsRedeemed: number; redemptionCount: number }): string {
  if (loyalty.redemptionCount === 0) return "0";
  return `${loyalty.pointsRedeemed} pts (${loyalty.redemptionCount} canjes)`;
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant pb-3 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <span className="font-display text-lg text-on-surface">{value}</span>
    </div>
  );
}
