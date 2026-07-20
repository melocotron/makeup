import { setRequestLocale, getTranslations } from "next-intl/server";

import { CredentialsList } from "@/components/admin/credentials-list";
import { PageHeader } from "@/components/admin/page-header";
import { listCredentials } from "@/server/content/credentials";

export default async function CredentialsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const items = await listCredentials();
  const t = await getTranslations({ locale, namespace: "admin.credentials" });

  const serialized = items.map((c) => ({
    ...c,
    createdAt: c.createdAt.toISOString(),
  })) as unknown as Parameters<typeof CredentialsList>[0]["initialData"];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("description")} />
      <CredentialsList initialData={serialized} />
    </div>
  );
}
