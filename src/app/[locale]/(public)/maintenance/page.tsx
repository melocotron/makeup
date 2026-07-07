import { Construction } from "lucide-react";
import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { getSettings } from "@/server/system/queries";
import { routing, type Locale } from "@/i18n/routing";

export default async function MaintenancePage({
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
  if (!settings.maintenanceMode) {
    redirect(`/${locale}`);
  }

  return <MaintenanceContent customMessage={settings.maintenanceMessage} />;
}

function MaintenanceContent({ customMessage }: { customMessage: string | null }) {
  const t = useTranslations("public.maintenance");
  const message = customMessage?.trim() || t("fallbackMessage");

  return (
    <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-16">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-primary">
          <Construction className="h-8 w-8" />
        </div>
        <h1 className="font-serif-display mb-4 text-3xl text-on-surface md:text-4xl">
          {t("title")}
        </h1>
        <p className="mb-2 text-sm uppercase tracking-widest text-on-surface-variant">
          {t("subtitle")}
        </p>
        <p className="text-base text-on-surface-variant">{message}</p>
      </div>
    </div>
  );
}
