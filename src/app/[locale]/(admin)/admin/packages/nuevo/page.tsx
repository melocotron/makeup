import { setRequestLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { PackageForm } from "@/components/admin/package-form";
import { listAllServices } from "@/server/catalog/queries";

export default async function NewPackagePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [services, t] = await Promise.all([
    listAllServices(),
    getTranslations({ locale, namespace: "admin.catalog" }),
  ]);

  const availableServices = services.map((s) => ({
    id: s.id,
    name: (s.name as Record<string, string>) ?? {},
    durationMin: s.durationMin,
    basePrice: Number(s.basePrice),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("packages.newPackage")}
        description={t("packages.createDescription")}
      />
      <PackageForm locale={locale} availableServices={availableServices} />
    </div>
  );
}
