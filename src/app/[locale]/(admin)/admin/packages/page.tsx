import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { PageHeader } from "@/components/admin/page-header";
import { PackageList } from "@/components/admin/package-list";
import { listAllPackages } from "@/server/catalog/queries";

export default async function PackagesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const packages = await listAllPackages();
  return <PackagesContent locale={locale} packages={packages} />;
}

function PackagesContent({
  locale,
  packages,
}: {
  locale: string;
  packages: Awaited<ReturnType<typeof listAllPackages>>;
}) {
  const t = useTranslations("admin.catalog");
  return (
    <div className="space-y-6">
      <PageHeader title={t("packages.title")} description={t("packages.description")} />
      <PackageList locale={locale} initialData={packages as never} />
    </div>
  );
}