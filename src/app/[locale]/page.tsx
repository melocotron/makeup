import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { routing, type Locale } from "@/i18n/routing";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(routing.locales as readonly string[]).includes(locale)) {
    return null;
  }
  setRequestLocale(locale as Locale);

  return <HomeContent />;
}

function HomeContent() {
  const t = useTranslations("home");

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-[85vh] items-center overflow-hidden bg-surface-container-lowest">
        <div className="from-primary/5 absolute inset-0 z-0 bg-gradient-to-br to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-[1440px] px-4 md:px-16">
          <div className="bg-surface/95 max-w-2xl p-8 shadow-2xl backdrop-blur-md md:p-12">
            <h1 className="font-serif-display mb-6 text-4xl leading-tight text-on-surface md:text-6xl">
              {t("heroTitle")}
              <br />
              {t("heroTitleLine2")}
            </h1>
            <p className="mb-8 text-base leading-7 text-on-surface-variant md:text-lg">
              {t("heroSubtitle")}
            </p>
            <a
              href="#booking"
              className="inline-flex items-center gap-2 border-2 border-primary px-8 py-4 font-semibold uppercase tracking-widest text-primary transition-colors hover:bg-primary hover:text-on-primary"
            >
              {t("heroCta")} →
            </a>
          </div>
        </div>
      </section>

      {/* Services placeholder */}
      <section id="services" className="mx-auto max-w-[1440px] px-4 py-20 md:px-16 md:py-24">
        <h2 className="font-serif-display mb-4 text-4xl text-on-surface md:text-5xl">
          {t("servicesTitle")}
        </h2>
        <p className="max-w-xl text-base text-on-surface-variant md:text-lg">
          {t("servicesSubtitle")}
        </p>
        <div className="mt-12 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-on-surface-variant">
          <p className="text-sm">
            ✨ Servicios reales se renderizarán aquí en la Fase 4 (catálogo desde el admin).
          </p>
        </div>
      </section>

      {/* Packages placeholder */}
      <section id="packages" className="bg-surface-container-lowest px-4 py-20 md:px-16 md:py-24">
        <div className="mx-auto max-w-[1440px]">
          <h2 className="font-serif-display mb-4 text-center text-4xl text-on-surface md:text-5xl">
            {t("packagesTitle")}
          </h2>
          <p className="text-center text-on-surface-variant">{t("packagesSubtitle")}</p>
        </div>
      </section>

      {/* About placeholder */}
      <section id="about" className="px-4 py-20 md:px-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-serif-display mb-8 text-4xl text-on-surface md:text-5xl">
            {t("aboutTitle")}
          </h2>
          <p className="leading-relaxed text-on-surface-variant">
            Con más de una década de experiencia en dermocosmética y maquillaje artístico, me dedico a realzar tu belleza natural.
          </p>
        </div>
      </section>
    </>
  );
}