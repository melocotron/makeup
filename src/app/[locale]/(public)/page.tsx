import { Package as PackageIcon, Scissors } from "lucide-react";
import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { AboutSection, type PublicAboutData } from "@/components/public/about-section";
import { EmptyState } from "@/components/public/empty-state";
import {
  PackageCard,
  type PublicPackageCardData,
} from "@/components/public/package-card";
import {
  ServiceCard,
  type PublicServiceCardData,
} from "@/components/public/service-card";
import { listPackages } from "@/server/catalog/queries";
import { listServices } from "@/server/catalog/queries";
import { getAboutContent } from "@/server/content/profile.queries";
import { getSettings } from "@/server/system/queries";
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

  const settings = await getSettings();
  if (settings.maintenanceMode) {
    redirect(`/${locale}/maintenance`);
  }

  const [services, packages, about] = await Promise.all([
    listServices(),
    listPackages(),
    getAboutContent(),
  ]);

  return (
    <HomeContent
      locale={locale}
      services={services as unknown as PublicServiceCardData[]}
      packages={packages as unknown as PublicPackageCardData[]}
      about={about as unknown as PublicAboutData}
    />
  );
}

function HomeContent({
  locale,
  services,
  packages,
  about,
}: {
  locale: string;
  services: PublicServiceCardData[];
  packages: PublicPackageCardData[];
  about: PublicAboutData;
}) {
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

      {/* Servicios */}
      <section
        id="services"
        className="mx-auto max-w-[1440px] px-4 py-20 md:px-16 md:py-24"
      >
        <div className="mb-12">
          <h2 className="font-serif-display mb-4 text-4xl text-on-surface md:text-5xl">
            {t("servicesTitle")}
          </h2>
          <p className="max-w-xl text-base text-on-surface-variant md:text-lg">
            {t("servicesSubtitle")}
          </p>
        </div>
        {services.length === 0 ? (
          <EmptyState
            namespace="services"
            messageKey="emptyTitle"
            icon={<Scissors className="h-12 w-12" />}
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                locale={locale}
              />
            ))}
          </div>
        )}
      </section>

      {/* Paquetes */}
      <section
        id="packages"
        className="bg-surface-container-lowest px-4 py-20 md:px-16 md:py-24"
      >
        <div className="mx-auto max-w-[1440px]">
          <div className="mb-12 text-center">
            <h2 className="font-serif-display mb-4 text-4xl text-on-surface md:text-5xl">
              {t("packagesTitle")}
            </h2>
            <p className="text-on-surface-variant">{t("packagesSubtitle")}</p>
          </div>
          {packages.length === 0 ? (
            <EmptyState
              namespace="packages"
              messageKey="emptyTitle"
              icon={<PackageIcon className="h-12 w-12" />}
            />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} pkg={pkg} locale={locale} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Sobre mí */}
      <AboutSection about={about} locale={locale} />

      {/* Booking anchor target (placeholder) */}
      <section
        id="booking"
        className="bg-surface-container-low py-20 text-center md:py-24"
      >
        <p className="text-sm text-on-surface-variant">
          ✨ El sistema de reservas llega en la siguiente fase.
        </p>
      </section>
    </>
  );
}
