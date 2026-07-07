import { setRequestLocale, getTranslations } from "next-intl/server";

import { BookingWizard } from "@/components/booking/wizard";
import { listServices } from "@/server/catalog/queries";
import { type Locale } from "@/i18n/routing";

export default async function ReservarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "booking" });
  const servicesRaw = await listServices();
  const services = servicesRaw.map((s) => ({
    id: s.id,
    name: (s.name as Record<string, string>)[locale] ?? s.id,
    description: (s.description as Record<string, string>)[locale],
    durationMin: s.durationMin,
    basePrice: s.basePrice,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 md:px-8 md:py-16">
      <div className="mx-auto max-w-2xl space-y-2 pb-8 text-center">
        <h1 className="font-serif-display text-3xl text-on-surface md:text-4xl">
          {t("title")}
        </h1>
        <p className="text-on-surface-variant">{t("subtitle")}</p>
      </div>
      <BookingWizard services={services} />
    </div>
  );
}