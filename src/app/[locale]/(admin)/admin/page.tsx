import Link from "next/link";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { StatCard } from "@/components/admin/stat-card";

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
        <h1 className="font-display text-display text-on-surface">{t("dashboardTitle")}</h1>
        <p className="mt-2 max-w-3xl text-on-surface-variant">{t("dashboardSubtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("kpi.appointmentsToday")} value="—" />
        <StatCard label={t("kpi.revenueMonth")} value="—" />
        <StatCard label={t("kpi.newClientsMonth")} value="—" />
        <StatCard label={t("kpi.topService")} value="—" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
          <h2 className="font-headline-md text-headline-md text-on-surface">{t("quickSummary")}</h2>
          <div className="mt-4 space-y-4">
            <SummaryRow label={t("kpi.pendingInvoices")} value="—" />
            <SummaryRow label={t("kpi.loyaltyMembers")} value="—" />
            <SummaryRow label={t("kpi.activeCoupons")} value="—" />
            <SummaryRow label={t("kpi.postsPublished")} value="—" />
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

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <h2 className="font-headline-md text-headline-md text-on-surface">{t("projectProgress")}</h2>
        <ul className="mt-4 space-y-2 text-sm text-on-surface-variant">
          <li>✅ Fase 0 — Foundation (completada)</li>
          <li>✅ Fase 1 — Auth admin + Dashboard base (esta fase)</li>
          <li>⏭️ Fase 2 — Contenido editable base</li>
          <li>⏭️ Fase 3 — Landing pública completa</li>
          <li>⏭️ Fase 4 — Servicios y paquetes</li>
          <li>⏭️ Fase 5 — Sistema de reservas</li>
          <li>⏭️ Fase 6 — Clientes</li>
          <li>⏭️ Fase 7 — Promociones, descuentos y fidelidad</li>
          <li>⏭️ Fase 8 — Cobros manuales</li>
          <li>⏭️ Fase 9 — Blog</li>
          <li>⏭️ Fase 10 — Pulido + deploy</li>
        </ul>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant pb-3 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-wider text-on-surface-variant">{label}</span>
      <span className="font-display text-lg text-on-surface">{value}</span>
    </div>
  );
}
