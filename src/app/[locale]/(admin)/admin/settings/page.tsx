import { setRequestLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { getSettings } from "@/server/system/queries";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [settings, t] = await Promise.all([
    getSettings(),
    getTranslations({ locale, namespace: "admin.settings" }),
  ]);

  const extractString = (v: unknown): string => {
    if (typeof v === "string") return v;
    if (v && typeof v === "object") {
      const obj = v as Record<string, unknown>;
      if (typeof obj.es === "string") return obj.es;
    }
    return "";
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <SettingsForm
        initialData={{
          siteName: settings.siteName ?? "Radiant Beauty",
          email: settings.email ?? "",
          phone: settings.phone ?? "",
          whatsapp: settings.whatsapp ?? "",
          address: settings.address ?? "",
          instagram: settings.instagram ?? "",
          facebook: settings.facebook ?? "",
          tiktok: settings.tiktok ?? "",
          youtube: settings.youtube ?? "",
          metaTitle: extractString(settings.metaTitle),
          metaDesc: extractString(settings.metaDesc),
          blogEnabled: settings.blogEnabled,
          offersEnabled: settings.offersEnabled,
          loyaltyEnabled: settings.loyaltyEnabled,
          minAdvanceHours: settings.minAdvanceHours,
          cancelHours: settings.cancelHours,
          maintenanceMode: settings.maintenanceMode,
          maintenanceMessage: settings.maintenanceMessage ?? "",
        }}
      />
    </div>
  );
}
