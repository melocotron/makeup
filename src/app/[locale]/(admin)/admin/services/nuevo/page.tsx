import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { ServiceForm } from "@/components/admin/service-form";

export default async function NewServicePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <NewServiceContent locale={locale} />;
}

function NewServiceContent({ locale }: { locale: string }) {
  const t = useTranslations("admin.catalog");
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("services.newService")}
        description={t("services.createDescription")}
      />
      <ServiceForm locale={locale} />
    </div>
  );
}