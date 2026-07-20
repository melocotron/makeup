import { setRequestLocale, getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { ServiceList } from "@/components/admin/service-list";
import { listAllServices } from "@/server/catalog/queries";

export default async function ServicesPage({
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

  return (
    <div className="space-y-6">
      <PageHeader title={t("services.title")} description={t("services.description")} />
      <ServiceList locale={locale} initialData={services as never} />
    </div>
  );
}
