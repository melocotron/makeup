import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <DashboardContent locale={locale} />;
}

function DashboardContent({ locale }: { locale: string }) {
  const tAdmin = useTranslations("admin");

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <nav className="fixed left-0 top-0 hidden h-full w-64 flex-col bg-inverse-surface text-surface-container-lowest lg:flex">
        <div className="p-6">
          <h1 className="text-xl font-bold">{tAdmin("title")}</h1>
          <p className="mt-1 text-xs uppercase tracking-wider text-surface-variant">
            {tAdmin("subtitle")}
          </p>
        </div>
        <ul className="mt-2 flex flex-1 flex-col gap-1 px-3">
          {[
            { label: tAdmin("dashboard"), active: true },
            { label: tAdmin("appointments"), active: false },
            { label: tAdmin("serviceFleet"), active: false },
            { label: tAdmin("analytics"), active: false },
            { label: tAdmin("settings"), active: false },
          ].map((item) => (
            <li key={item.label}>
              <a
                href="#"
                className={`block rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
                  item.active
                    ? "border-l-4 border-primary bg-on-secondary-fixed-variant/20 text-primary-fixed"
                    : "text-surface-variant hover:bg-primary/10 hover:text-primary-fixed"
                }`}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-auto border-t border-surface-variant/20 p-3">
          <Link
            href={`/${locale}`}
            className="block rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-surface-variant hover:bg-primary/10 hover:text-primary-fixed"
          >
            ← Volver al sitio
          </Link>
        </div>
      </nav>

      {/* Main content */}
      <main className="flex-1 lg:ml-64">
        <div className="mx-auto max-w-[1440px] p-8 lg:p-12">
          <h2 className="font-display text-display text-on-surface">
            Dashboard
          </h2>
          <p className="mt-2 max-w-3xl text-on-surface-variant">
            Vista previa del panel. La implementación completa con KPIs, calendario, atajos y métricas se desarrolla en la Fase 1 (changes/002-auth-admin + changes/003-admin-dashboard).
          </p>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { label: "Citas activas", value: "—", trend: "+12%" },
              { label: "Ingresos del mes", value: "—", trend: "+8%" },
              { label: "Clientes nuevos", value: "—", trend: "+24%" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                  {stat.label}
                </p>
                <p className="font-display text-display text-on-surface">{stat.value}</p>
                <p className="mt-2 text-xs text-tertiary">{stat.trend}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 rounded-xl border border-outline-variant bg-surface-container-lowest p-8">
            <h3 className="text-lg font-semibold text-on-surface">Próximos pasos</h3>
            <ul className="mt-4 space-y-2 text-sm text-on-surface-variant">
              <li>
                ✅ Fase 0 — Foundation (en curso): tokens, i18n, tema, Docker, Prisma
              </li>
              <li>⏭️ Fase 1 — Auth admin + Dashboard base (siguiente)</li>
              <li>⏭️ Fase 2 — Contenido editable base (perfil, contacto, media)</li>
              <li>⏭️ Fase 3 — Landing pública completa</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}