import { setRequestLocale, getTranslations } from "next-intl/server";

import { ClientForm } from "@/components/admin/client-form";
import { PageHeader } from "@/components/admin/page-header";

export default async function NewClientPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "admin" });

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title={t("clients.newClient")}
        description={t("clients.newClientDesc")}
      />
      <ClientForm mode="create" />
    </div>
  );
}
